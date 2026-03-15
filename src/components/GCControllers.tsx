import { useState, useEffect, useCallback } from "react";
import {
  PanelSection,
  PanelSectionRow,
  DropdownItem,
  ToggleField,
} from "@decky/ui";
import { GC_DEVICES } from "../lib/constants";
import {
  getConfig,
  setConfigBatch,
  gcChangeDevice,
  gcAdapterStatus,
  parseResponse,
} from "../lib/backend";

export function GCControllers() {
  const [devices, setDevices] = useState([0, 0, 0, 0]);
  const [adapterDetected, setAdapterDetected] = useState<boolean | null>(null);
  const [showIndividual, setShowIndividual] = useState(false);

  const fetchDevices = useCallback(async () => {
    const results = await Promise.all(
      [0, 1, 2, 3].map((i) =>
        getConfig("Main", "Core", `SIDevice${i}`),
      ),
    );
    const newDevices = results.map((raw) => {
      const resp = parseResponse(raw);
      return resp.ok ? parseInt(resp.value as string, 10) || 0 : 0;
    });
    setDevices(newDevices);

    if (newDevices.some((d) => d === 12)) {
      checkAdapter();
    }
  }, []);

  const checkAdapter = async () => {
    const raw = await gcAdapterStatus();
    const resp = parseResponse(raw);
    if (resp.ok) {
      setAdapterDetected((resp.response as string)?.includes("DETECTED") &&
        !(resp.response as string)?.includes("NOT_DETECTED"));
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSetAll = async (opt: { data: number }) => {
    const value = String(opt.data);
    const settings = [0, 1, 2, 3].map((i) => ({
      system: "Main",
      section: "Core",
      key: `SIDevice${i}`,
      value,
    }));
    const raw = await setConfigBatch(JSON.stringify(settings));
    const resp = parseResponse(raw);
    if (resp.ok) {
      setDevices([opt.data, opt.data, opt.data, opt.data]);
      for (let i = 0; i < 4; i++) {
        await gcChangeDevice(i, opt.data);
      }
      if (opt.data === 12) checkAdapter();
      else setAdapterDetected(null);
    }
  };

  const handleSetOne = async (index: number, opt: { data: number }) => {
    const settings = [
      {
        system: "Main",
        section: "Core",
        key: `SIDevice${index}`,
        value: String(opt.data),
      },
    ];
    const raw = await setConfigBatch(JSON.stringify(settings));
    const resp = parseResponse(raw);
    if (resp.ok) {
      setDevices((prev) => {
        const next = [...prev];
        next[index] = opt.data;
        return next;
      });
      await gcChangeDevice(index, opt.data);
      if (opt.data === 12) checkAdapter();
    }
  };

  const allSame = devices.every((d) => d === devices[0]);
  const anyAdapter = devices.some((d) => d === 12);

  return (
    <PanelSection title="GC Controllers">
      <PanelSectionRow>
        <ToggleField
          label="Individual Ports"
          checked={showIndividual}
          onChange={setShowIndividual}
        />
      </PanelSectionRow>
      {!showIndividual && (
        <PanelSectionRow>
          <DropdownItem
            label="Set All Ports"
            rgOptions={GC_DEVICES.map((d) => ({ label: d.label, data: d.data }))}
            selectedOption={allSame ? devices[0] : undefined}
            onChange={handleSetAll}
          />
        </PanelSectionRow>
      )}
      {showIndividual && [0, 1, 2, 3].map((i) => (
        <PanelSectionRow key={`gc-${i}`}>
          <DropdownItem
            label={`Port ${i + 1}`}
            rgOptions={GC_DEVICES.map((d) => ({ label: d.label, data: d.data }))}
            selectedOption={devices[i]}
            onChange={(opt) => handleSetOne(i, opt)}
          />
        </PanelSectionRow>
      ))}
      {anyAdapter && adapterDetected !== null && (
        <PanelSectionRow>
          <div style={{ fontSize: "12px", opacity: 0.7, padding: "4px 0" }}>
            GC Adapter: {adapterDetected ? "Detected" : "Not Detected"}
          </div>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}
