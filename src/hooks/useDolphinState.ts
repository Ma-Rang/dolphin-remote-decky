import { useState, useEffect, useCallback, useRef } from "react";
import { addEventListener, removeEventListener } from "@decky/api";
import { connect, isConnected, getStatus, getFullscreen, parseResponse } from "../lib/backend";

export interface DolphinState {
  connected: boolean;
  emuState: string;   // "uninitialized" | "running" | "paused" | "starting" | "stopping" | ""
  platform: string;   // "wii" | "gamecube" | "triforce" | ""
  gameId: string;
  gameTitle: string;
  fullscreen: boolean;
}

export function useDolphinState() {
  const [state, setState] = useState<DolphinState>({
    connected: false,
    emuState: "",
    platform: "",
    gameId: "",
    gameTitle: "",
    fullscreen: false,
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
      // Fetch fullscreen state separately
      const fsRaw = await getFullscreen();
      const fsResp = parseResponse(fsRaw);
      if (!mountedRef.current) return;
      if (fsResp.ok) {
        setState((prev) => ({ ...prev, fullscreen: fsResp.fullscreen as boolean }));
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
        // Try to reconnect when panel is opened
        const retryRaw = await connect("", 0);
        const retryResp = parseResponse(retryRaw);
        if (!mountedRef.current) return;
        if (retryResp.ok) {
          setState((prev) => ({ ...prev, connected: true }));
          await fetchStatus();
          return;
        }
        setState((prev) => ({
          ...prev,
          connected: false,
          emuState: "",
          platform: "",
          gameId: "",
          gameTitle: "",
          fullscreen: false,
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
          fullscreen: false,
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
            fullscreen: false,
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
