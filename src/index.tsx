import { staticClasses, PanelSection } from "@decky/ui";
import { definePlugin, addEventListener, removeEventListener } from "@decky/api";
import { FaGamepad } from "react-icons/fa";

import { useDolphinState } from "./hooks/useDolphinState";
import { PlaybackButtons, StatusLine } from "./components/ConnectionStatus";
import { WiiControllers } from "./components/WiiControllers";
import { GCControllers } from "./components/GCControllers";
import { GameLauncher } from "./components/GameLauncher";
import { AdvancedSettings } from "./components/AdvancedSettings";

function Content() {
  const dolphin = useDolphinState();
  const { connected, emuState, platform } = dolphin;

  const isActive = emuState === "running" || emuState === "paused";
  const isGcOrTriforce = platform === "gamecube" || platform === "triforce";

  return (
    <>
      <PanelSection>
        {connected && isActive && <PlaybackButtons state={dolphin} />}
        {connected && <GameLauncher />}
        <StatusLine state={dolphin} />
      </PanelSection>
      {connected && !(isActive && isGcOrTriforce) && <WiiControllers />}
      {connected && <GCControllers />}
      <AdvancedSettings connected={connected} onReconnect={dolphin.refresh} />
    </>
  );
}

export default definePlugin(() => {
  const listener = addEventListener<[state: string]>(
    "dolphin_event",
    (state: string) => {
      console.log("[Dolphin Remote] Event:", state);
    },
  );

  return {
    name: "Dolphin Remote",
    titleView: <div className={staticClasses.Title}>Dolphin Remote</div>,
    content: <Content />,
    icon: <FaGamepad />,
    onDismount() {
      removeEventListener("dolphin_event", listener);
    },
  };
});
