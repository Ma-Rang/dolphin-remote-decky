import { callable } from "@decky/api";

// Connection
export const connect = callable<[host: string, port: number], string>("connect");
export const disconnect = callable<[], string>("disconnect");
export const isConnected = callable<[], string>("is_connected");

// State queries
export const getStatus = callable<[],string>("get_status");
export const listGames = callable<[], string>("list_games");
export const getSystemInfo = callable<[], string>("get_system_info");

// Emulation control
export const bootGame = callable<[path: string], string>("boot_game");
export const bootNand = callable<[titleId: string], string>("boot_nand");
export const sendStop = callable<[], string>("stop");
export const sendPause = callable<[], string>("pause");
export const sendResume = callable<[], string>("resume");

// Media / display
export const sendScreenshot = callable<[], string>("screenshot");
export const sendFullscreenToggle = callable<[], string>("fullscreen_toggle");
export const getFullscreen = callable<[], string>("get_fullscreen");

// Config
export const getConfig = callable<[system: string, section: string, key: string], string>("get_config");
export const setConfigBatch = callable<[settingsJson: string], string>("set_config_batch");

// GC controllers
export const gcChangeDevice = callable<[channel: number, deviceType: number], string>("gc_change_device");
export const gcAdapterStatus = callable<[], string>("gc_adapter_status");

// Save states
export const listSaveStates = callable<[], string>("list_save_states");
export const saveState = callable<[slot: number], string>("save_state");
export const loadState = callable<[slot: number], string>("load_state");

// Wii controllers
export const wiimoteSync = callable<[], string>("wiimote_sync");
export const wiimoteRefresh = callable<[], string>("wiimote_refresh");

// Helper to parse JSON responses from the backend
export function parseResponse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ok: false, error: raw };
  }
}
