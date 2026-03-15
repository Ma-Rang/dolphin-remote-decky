import { useState, useEffect, useCallback } from "react";
import { PanelSectionRow, DropdownItem } from "@decky/ui";
import { WII_MENU_TITLE_ID } from "../lib/constants";
import { listGames, bootGame, bootNand, parseResponse } from "../lib/backend";

interface GameEntry {
  path: string;
  title: string;
  game_id: string;
  platform: number;
}

const BOOT_PLACEHOLDER = "__placeholder__";
const WII_MENU_KEY = "__wii_menu__";

export function GameLauncher() {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [selectedOption, setSelectedOption] = useState(BOOT_PLACEHOLDER);

  const fetchGames = useCallback(async () => {
    const raw = await listGames();
    const resp = parseResponse(raw);
    if (resp.ok && Array.isArray(resp.games)) {
      const entries = (resp.games as GameEntry[]).sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      setGames(entries);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const options = [
    { label: "Boot game...", data: BOOT_PLACEHOLDER },
    { label: "Wii Menu", data: WII_MENU_KEY },
    ...games.map((g) => ({
      label: g.title || g.game_id || g.path,
      data: g.path,
    })),
  ];

  const handleChange = async (opt: { data: string }) => {
    if (opt.data === BOOT_PLACEHOLDER) return;

    if (opt.data === WII_MENU_KEY) {
      await bootNand(WII_MENU_TITLE_ID);
    } else {
      await bootGame(opt.data);
    }

    // Reset to placeholder after boot
    setSelectedOption(BOOT_PLACEHOLDER);
  };

  return (
    <PanelSectionRow>
      <DropdownItem
        label="Launch Game"
        rgOptions={options}
        selectedOption={selectedOption}
        strDefaultLabel="Boot game..."
        onChange={handleChange}
      />
    </PanelSectionRow>
  );
}
