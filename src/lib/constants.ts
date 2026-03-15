export const WII_MENU_TITLE_ID = "0000000100000002";

export const WIIMOTE_SOURCES = [
  { label: "None", data: 0 },
  { label: "Emulated", data: 1 },
  { label: "Real", data: 2 },
];

export const GC_DEVICES = [
  { label: "None", data: 0 },
  { label: "Standard Controller", data: 6 },
  { label: "GC Keyboard", data: 7 },
  { label: "Steering Wheel", data: 8 },
  { label: "Dance Mat", data: 9 },
  { label: "DK Bongos", data: 10 },
  { label: "AM Baseboard", data: 11 },
  { label: "GC Adapter", data: 12 },
];

// Maps LIST_GAMES platform field to string
export const PLATFORM_NAMES: Record<number, string> = {
  0: "GameCube",
  1: "Triforce",
  2: "Wii",
  3: "Wii",   // WiiWAD
  4: "Other", // ELF/DOL
};
