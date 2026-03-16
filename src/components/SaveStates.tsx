import { useState, useEffect, useCallback } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
  Field,
  Focusable,
  DialogButton,
} from "@decky/ui";
import { FaSave, FaFolderOpen } from "react-icons/fa";
import { listSaveStates, saveState, loadState, parseResponse } from "../lib/backend";

interface SlotInfo {
  slot: number;
  empty: boolean;
  info?: string;
}

export function SaveStates() {
  const [expanded, setExpanded] = useState(false);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const raw = await listSaveStates();
      const resp = parseResponse(raw);
      if (resp.ok && Array.isArray(resp.slots)) {
        setSlots(resp.slots as SlotInfo[]);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (expanded) refresh();
  }, [expanded, refresh]);

  const handleSave = async (slot: number) => {
    setBusy(true);
    try {
      await saveState(slot);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async (slot: number) => {
    setBusy(true);
    try {
      await loadState(slot);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection title="Save States">
      <PanelSectionRow>
        <ToggleField
          label="Show Save States"
          checked={expanded}
          onChange={setExpanded}
        />
      </PanelSectionRow>
      {expanded &&
        slots.map((s) => (
          <PanelSectionRow key={s.slot}>
            <Field
              label={`Slot ${s.slot}`}
              description={s.empty ? "Empty" : s.info}
              childrenLayout="below"
              bottomSeparator="none"
            >
              <Focusable
                //@ts-ignore
                flow-children="horizontal"
                style={{ display: "flex", gap: "8px" }}
              >
                <DialogButton
                  disabled={busy}
                  onClick={() => handleSave(s.slot)}
                  style={{ minWidth: 0, padding: "10px 12px", flex: 1 }}
                >
                  <FaSave />
                </DialogButton>
                <DialogButton
                  disabled={busy || s.empty}
                  onClick={() => handleLoad(s.slot)}
                  style={{
                    minWidth: 0,
                    padding: "10px 12px",
                    flex: 1,
                    opacity: s.empty ? 0.3 : 1,
                  }}
                >
                  <FaFolderOpen />
                </DialogButton>
              </Focusable>
            </Field>
          </PanelSectionRow>
        ))}
    </PanelSection>
  );
}
