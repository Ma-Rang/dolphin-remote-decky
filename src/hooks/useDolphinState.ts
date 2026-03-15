import { useState, useEffect, useCallback, useRef } from "react";
import { addEventListener, removeEventListener } from "@decky/api";
import { isConnected, getStatus, parseResponse } from "../lib/backend";

export interface DolphinState {
  connected: boolean;
  emuState: string;   // "uninitialized" | "running" | "paused" | "starting" | "stopping" | ""
  platform: string;   // "wii" | "gamecube" | "triforce" | ""
  gameId: string;
  gameTitle: string;
}

export function useDolphinState() {
  const [state, setState] = useState<DolphinState>({
    connected: false,
    emuState: "",
    platform: "",
    gameId: "",
    gameTitle: "",
  });

  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const raw = await getStatus();
      const resp = parseResponse(raw);
      if (!mountedRef.current) return;
      if (resp.ok) {
        setState((prev) => ({
          ...prev,
          emuState: (resp.state as string) || "",
          platform: (resp.platform as string) || "",
          gameId: (resp.game_id as string) || "",
          gameTitle: (resp.title as string) || "",
        }));
      }
    } catch {
      // Ignore fetch errors
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const raw = await isConnected();
      const resp = parseResponse(raw);
      if (!mountedRef.current) return;
      const conn = resp.connected as boolean;
      setState((prev) => ({ ...prev, connected: conn }));
      if (conn) {
        await fetchStatus();
      } else {
        setState((prev) => ({
          ...prev,
          connected: false,
          emuState: "",
          platform: "",
          gameId: "",
          gameTitle: "",
        }));
      }
    } catch {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          connected: false,
          emuState: "",
          platform: "",
          gameId: "",
          gameTitle: "",
        }));
      }
    }
  }, [fetchStatus]);

  useEffect(() => {
    mountedRef.current = true;
    checkConnection();

    const listener = addEventListener<[state: string]>(
      "dolphin_event",
      (eventState: string) => {
        if (!mountedRef.current) return;

        if (eventState === "disconnected") {
          setState({
            connected: false,
            emuState: "",
            platform: "",
            gameId: "",
            gameTitle: "",
          });
          return;
        }

        // Update emu state immediately
        setState((prev) => ({
          ...prev,
          connected: true,
          emuState: eventState,
        }));

        // If running or paused, fetch full status for platform/game info
        if (eventState === "running" || eventState === "paused") {
          fetchStatus();
        } else if (eventState === "uninitialized") {
          setState((prev) => ({
            ...prev,
            platform: "",
            gameId: "",
            gameTitle: "",
          }));
        }
      },
    );

    return () => {
      mountedRef.current = false;
      removeEventListener("dolphin_event", listener);
    };
  }, [checkConnection, fetchStatus]);

  return {
    ...state,
    refresh: checkConnection,
  };
}
