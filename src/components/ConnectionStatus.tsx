import {
  PanelSectionRow,
  Field,
  Focusable,
  DialogButton,
} from "@decky/ui";
import {
  sendPause,
  sendResume,
  sendStop,
  sendScreenshot,
  sendFullscreenToggle,
} from "../lib/backend";
import { FaPlay, FaPause, FaStop, FaCamera, FaExpand } from "react-icons/fa";
import type { DolphinState } from "../hooks/useDolphinState";

interface Props {
  state: DolphinState;
}

export function PlaybackButtons({ state }: Props) {
  const { emuState } = state;
  const isPaused = emuState === "paused";

  return (
    <PanelSectionRow>
      <Field childrenLayout="below" bottomSeparator="none">
        <Focusable style={{ display: "flex", gap: "4px" }}>
          <DialogButton
            onClick={() => isPaused ? sendResume() : sendPause()}
            style={{ minWidth: 0, padding: "10px 12px" }}
          >
            {isPaused ? <FaPlay /> : <FaPause />}
          </DialogButton>
          <DialogButton
            onClick={() => sendStop()}
            style={{ minWidth: 0, padding: "10px 12px" }}
          >
            <FaStop />
          </DialogButton>
          <DialogButton
            onClick={() => sendScreenshot()}
            style={{ minWidth: 0, padding: "10px 12px" }}
          >
            <FaCamera />
          </DialogButton>
          <DialogButton
            onClick={() => sendFullscreenToggle()}
            style={{ minWidth: 0, padding: "10px 12px" }}
          >
            <FaExpand />
          </DialogButton>
        </Focusable>
      </Field>
    </PanelSectionRow>
  );
}

export function StatusLine({ state }: Props) {
  const { connected, emuState, platform, gameTitle } = state;

  const isActive = emuState === "running" || emuState === "paused";
  const isPaused = emuState === "paused";

  let statusLine: string;
  if (!connected) {
    statusLine = "Not connected to Dolphin";
  } else if (!emuState || emuState === "uninitialized") {
    statusLine = "Connected — idle";
  } else if (isActive) {
    const platformLabel = platform
      ? platform.charAt(0).toUpperCase() + platform.slice(1)
      : "";
    const title = gameTitle || "Unknown game";
    const pauseLabel = isPaused ? " (Paused)" : "";
    statusLine = `${platformLabel}: ${title}${pauseLabel}`;
  } else {
    statusLine = `Connected — ${emuState}`;
  }

  return (
    <PanelSectionRow>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: connected ? "#4caf50" : "#f44336",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "12px" }}>{statusLine}</span>
      </div>
    </PanelSectionRow>
  );
}
