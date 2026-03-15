import { useState, useEffect, useCallback } from "react";
import {
  PanelSection,
  PanelSectionRow,
  Dropdown,
  DropdownItem,
  ToggleField,
  Focusable,
  DialogButton,
} from "@decky/ui";
import { FaSync } from "react-icons/fa";
import { WIIMOTE_SOURCES } from "../lib/constants";
import {
  getConfig,
  setConfigBatch,
  wiimoteSync,
  wiimoteRefresh,
  parseResponse,
} from "../lib/backend";

export function WiiControllers() {
  const [sources, setSources] = useState([0, 0, 0, 0]);
  const [showIndividual, setShowIndividual] = useState(false);
  const [btPassthrough, setBtPassthrough] = useState(false);

  const fetchSources = useCallback(async () => {
    const [s1, s2, s3, s4, btRaw] = await Promise.all([
      getConfig("WiiPad", "Wiimote1", "Source"),
      getConfig("WiiPad", "Wiimote2", "Source"),
      getConfig("WiiPad", "Wiimote3", "Source"),
      getConfig("WiiPad", "Wiimote4", "Source"),
      getConfig("Main", "BluetoothPassthrough", "Enabled"),
    ]);
    const newSources = [s1, s2, s3, s4].map((raw) => {
      const resp = parseResponse(raw);
      return resp.ok ? parseInt(resp.value as string, 10) || 0 : 0;
    });
    setSources(newSources);

    const btResp = parseResponse(btRaw);
    setBtPassthrough(Boolean(btResp.ok && String(btResp.value).toLowerCase() === "true"));
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleSetAll = async (opt: { data: number }) => {
    const value = String(opt.data);
    const settings = [1, 2, 3, 4].map((i) => ({
      system: "WiiPad",
      section: `Wiimote${i}`,
      key: "Source",
      value,
    }));
    const raw = await setConfigBatch(JSON.stringify(settings));
    const resp = parseResponse(raw);
    if (resp.ok) {
      setSources([opt.data, opt.data, opt.data, opt.data]);
    }
  };

  const handleSetOne = async (index: number, opt: { data: number }) => {
    const settings = [
      {
        system: "WiiPad",
        section: `Wiimote${index + 1}`,
        key: "Source",
        value: String(opt.data),
      },
    ];
    const raw = await setConfigBatch(JSON.stringify(settings));
    const resp = parseResponse(raw);
    if (resp.ok) {
      setSources((prev) => {
        const next = [...prev];
        next[index] = opt.data;
        return next;
      });
    }
  };

  const handleSyncRefresh = () => {
    if (btPassthrough) {
      wiimoteSync();
    } else {
      wiimoteRefresh();
    }
  };

  const allSame = sources.every((s) => s === sources[0]);
  const anyReal = sources.some((s) => s === 2);

  const dropdownOptions = WIIMOTE_SOURCES.map((s) => ({ label: s.label, data: s.data }));

  return (
    <PanelSection title="Wii Controllers">
      <PanelSectionRow>
        <ToggleField
          label="Individual Wiimotes"
          checked={showIndividual}
          onChange={setShowIndividual}
        />
      </PanelSectionRow>
      {!showIndividual && (
        <PanelSectionRow>
          <Focusable
            //@ts-ignore
            flow-children="horizontal"
            style={{ display: "flex", gap: "8px", padding: 0 }}
          >
            <div style={{ flexGrow: 1 }}>
              <Dropdown
                rgOptions={dropdownOptions}
                selectedOption={allSame ? sources[0] : undefined}
                strDefaultLabel="Mixed"
                onChange={handleSetAll}
              />
            </div>
            {anyReal && (
              <DialogButton
                onClick={handleSyncRefresh}
                style={{ minWidth: 0, width: "15%", padding: 0 }}
              >
                <FaSync />
              </DialogButton>
            )}
          </Focusable>
        </PanelSectionRow>
      )}
      {showIndividual && (
        <>
          {anyReal && (
            <PanelSectionRow>
              <DialogButton onClick={handleSyncRefresh} style={{ minWidth: 0 }}>
                <FaSync style={{ marginRight: "8px" }} />
                {btPassthrough ? "Sync" : "Refresh"}
              </DialogButton>
            </PanelSectionRow>
          )}
          {[0, 1, 2, 3].map((i) => (
            <PanelSectionRow key={`wii-${i}`}>
              <DropdownItem
                label={`Wiimote ${i + 1}`}
                rgOptions={dropdownOptions}
                selectedOption={sources[i]}
                onChange={(opt) => handleSetOne(i, opt)}
              />
            </PanelSectionRow>
          ))}
        </>
      )}
    </PanelSection>
  );
}
