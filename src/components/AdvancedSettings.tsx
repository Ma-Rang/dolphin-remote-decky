import { useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  ToggleField,
} from "@decky/ui";
import { connect as connectBackend, getSystemInfo, parseResponse } from "../lib/backend";

interface Props {
  connected: boolean;
  onReconnect: () => void;
}

export function AdvancedSettings({ connected, onReconnect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [info, setInfo] = useState("");

  const handleReconnect = async () => {
    const h = host.trim() || "127.0.0.1";
    const p = port.trim() ? parseInt(port.trim(), 10) : 4830;
    await connectBackend(h, p);
    onReconnect();

    // Fetch system info after reconnect
    const raw = await getSystemInfo();
    const resp = parseResponse(raw);
    if (resp.ok) {
      setInfo(`v${resp.version || "?"} (${resp.os || "?"}) IPC v${resp.ipc_version || "?"}`);
    }
  };

  return (
    <PanelSection title="Advanced">
      <PanelSectionRow>
        <ToggleField
          label="Show Advanced Options"
          checked={expanded}
          onChange={setExpanded}
        />
      </PanelSectionRow>
      {expanded && (
        <>
          <PanelSectionRow>
            <TextField
              label="Host (blank = localhost)"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Port (blank = 4830)"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              mustBeNumeric
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleReconnect}>
              Reconnect
            </ButtonItem>
          </PanelSectionRow>
          {connected && info && (
            <PanelSectionRow>
              <div style={{ fontSize: "11px", opacity: 0.6, padding: "4px 0" }}>
                {info}
              </div>
            </PanelSectionRow>
          )}
        </>
      )}
    </PanelSection>
  );
}
