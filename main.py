import json
import asyncio
from typing import Optional

import decky


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 4830
RECONNECT_BASE_DELAY = 1.0
RECONNECT_MAX_DELAY = 30.0
COMMAND_TIMEOUT = 5.0


class Plugin:
    _reader: Optional[asyncio.StreamReader] = None
    _writer: Optional[asyncio.StreamWriter] = None
    _connected: bool = False
    _response_queue: Optional[asyncio.Queue[str]] = None
    _listen_task: Optional[asyncio.Task[None]] = None
    _reconnect_task: Optional[asyncio.Task[None]] = None
    _host: str = DEFAULT_HOST
    _port: int = DEFAULT_PORT
    _auto_reconnect: bool = True
    _reconnect_delay: float = RECONNECT_BASE_DELAY
    _loop: Optional[asyncio.AbstractEventLoop] = None

    # ── Connection management ──────────────────────────────────────────

    async def connect(self, host: str = "", port: int = 0) -> str:
        """Connect to Dolphin IPC server. Returns JSON."""
        if host:
            self._host = host
        if port > 0:
            self._port = port

        await self._disconnect_internal()
        self._cancel_reconnect()

        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self._host, self._port),
                timeout=COMMAND_TIMEOUT,
            )
            self._reader = reader
            self._writer = writer
            self._connected = True
            self._reconnect_delay = RECONNECT_BASE_DELAY

            # Drain the response queue of any stale data
            while not self._response_queue.empty():
                try:
                    self._response_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

            # Start background listener
            self._listen_task = self._loop.create_task(self._listen_loop())  # type: ignore

            # Handshake with VERSION
            resp = await self._send_and_recv('{"cmd":"version"}')
            parsed = self._try_parse(resp)
            if parsed.get("ok"):
                version = parsed.get("version", "?")
                decky.logger.info(f"Connected to Dolphin IPC v{version} at {self._host}:{self._port}")
                return json.dumps({"ok": True, "version": version})
            else:
                await self._disconnect_internal()
                return json.dumps({"ok": False, "error": f"Unexpected handshake: {resp}"})
        except Exception as e:
            await self._disconnect_internal()
            self._schedule_reconnect()
            return json.dumps({"ok": False, "error": str(e)})

    async def disconnect(self) -> str:
        """Disconnect from Dolphin IPC server."""
        self._auto_reconnect = False
        self._cancel_reconnect()
        await self._disconnect_internal()
        return json.dumps({"ok": True})

    async def is_connected(self) -> str:
        """Check connection status. Returns JSON with connected bool."""
        return json.dumps({"connected": self._connected})

    # ── IPC command proxies ────────────────────────────────────────────

    async def get_status(self) -> str:
        return await self._send_and_recv('{"cmd":"status"}')

    async def list_games(self) -> str:
        return await self._send_and_recv('{"cmd":"list_games"}')

    async def boot_game(self, path: str) -> str:
        return await self._send_and_recv(json.dumps({"cmd": "boot", "path": path}))

    async def boot_nand(self, title_id: str) -> str:
        return await self._send_and_recv(json.dumps({"cmd": "boot_nand", "title_id": title_id}))

    async def stop(self) -> str:
        return await self._send_and_recv('{"cmd":"stop"}')

    async def pause(self) -> str:
        return await self._send_and_recv('{"cmd":"pause"}')

    async def resume(self) -> str:
        return await self._send_and_recv('{"cmd":"resume"}')

    async def screenshot(self) -> str:
        return await self._send_and_recv('{"cmd":"screenshot"}')

    async def fullscreen_toggle(self) -> str:
        return await self._send_and_recv('{"cmd":"fullscreen_toggle"}')

    async def get_fullscreen(self) -> str:
        return await self._send_and_recv('{"cmd":"get_fullscreen"}')

    async def get_config(self, system: str, section: str, key: str) -> str:
        return await self._send_and_recv(json.dumps({
            "cmd": "get_config", "system": system, "section": section, "key": key,
        }))

    async def set_config_batch(self, settings_json: str) -> str:
        """Batch set_config. settings_json is a JSON array of {system,section,key,value}."""
        settings = json.loads(settings_json)
        return await self._send_and_recv(json.dumps({
            "cmd": "set_config", "settings": settings,
        }))

    async def gc_change_device(self, channel: int, device_type: int) -> str:
        return await self._send_and_recv(json.dumps({
            "cmd": "gc_change_device", "channel": channel, "device_type": device_type,
        }))

    async def gc_adapter_status(self) -> str:
        return await self._send_and_recv('{"cmd":"gc_adapter_status"}')

    async def wiimote_sync(self) -> str:
        return await self._send_and_recv('{"cmd":"wiimote_sync"}')

    async def wiimote_refresh(self) -> str:
        return await self._send_and_recv('{"cmd":"wiimote_refresh"}')

    async def get_system_info(self) -> str:
        return await self._send_and_recv('{"cmd":"get_system_info"}')

    async def list_save_states(self) -> str:
        return await self._send_and_recv('{"cmd":"list_save_states"}')

    async def save_state(self, slot: int) -> str:
        return await self._send_and_recv(json.dumps({"cmd": "save_state", "slot": slot}))

    async def load_state(self, slot: int) -> str:
        return await self._send_and_recv(json.dumps({"cmd": "load_state", "slot": slot}))

    # ── Lifecycle ──────────────────────────────────────────────────────

    async def _main(self):
        self._loop = asyncio.get_event_loop()
        self._response_queue = asyncio.Queue()
        self._auto_reconnect = True
        decky.logger.info("Dolphin Remote starting")
        # Try default connection on startup
        await self.connect()

    async def _unload(self):
        decky.logger.info("Dolphin Remote unloading")
        self._auto_reconnect = False
        self._cancel_reconnect()
        await self._disconnect_internal()

    # ── Internal helpers ───────────────────────────────────────────────

    async def _listen_loop(self):
        """Background task: reads lines from IPC, routes events vs responses."""
        try:
            while self._connected and self._reader:
                line_bytes = await self._reader.readline()
                if not line_bytes:
                    # Connection closed
                    break
                text = line_bytes.decode("utf-8", errors="replace").strip()
                if not text:
                    continue
                if text.startswith("EVENT "):
                    state = text[6:]
                    decky.logger.info(f"Dolphin event: {state}")
                    await decky.emit("dolphin_event", state)
                else:
                    await self._response_queue.put(text)
        except asyncio.CancelledError:
            return
        except Exception as e:
            decky.logger.warning(f"Listen loop error: {e}")

        # If we reach here, connection was lost
        if self._connected:
            self._connected = False
            await decky.emit("dolphin_event", "disconnected")
            decky.logger.info("Dolphin IPC connection lost")
            self._schedule_reconnect()

    async def _send_and_recv(self, cmd_json: str) -> str:
        """Send a JSON command and await the response."""
        if not self._connected or not self._writer:
            return json.dumps({"ok": False, "error": "Not connected"})
        try:
            self._writer.write((cmd_json + "\n").encode("utf-8"))
            await self._writer.drain()
            resp = await asyncio.wait_for(
                self._response_queue.get(), timeout=COMMAND_TIMEOUT
            )
            return resp
        except asyncio.TimeoutError:
            return json.dumps({"ok": False, "error": "Timeout"})
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    async def _disconnect_internal(self):
        """Close the TCP connection."""
        self._connected = False
        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        self._listen_task = None
        if self._writer:
            try:
                self._writer.close()
                await self._writer.wait_closed()
            except Exception:
                pass
        self._reader = None
        self._writer = None

    def _schedule_reconnect(self):
        """Schedule auto-reconnect with exponential backoff."""
        if not self._auto_reconnect:
            return
        if self._reconnect_task and not self._reconnect_task.done():
            return  # Already scheduled
        self._reconnect_task = self._loop.create_task(self._reconnect_loop())  # type: ignore

    async def _reconnect_loop(self):
        """Try to reconnect with exponential backoff."""
        while self._auto_reconnect and not self._connected:
            decky.logger.info(f"Reconnecting in {self._reconnect_delay:.0f}s...")
            await asyncio.sleep(self._reconnect_delay)
            if not self._auto_reconnect:
                break
            result = json.loads(await self.connect())
            if result.get("ok"):
                decky.logger.info("Reconnected to Dolphin IPC")
                return
            # Exponential backoff
            self._reconnect_delay = min(
                self._reconnect_delay * 2, RECONNECT_MAX_DELAY
            )

    def _cancel_reconnect(self):
        if self._reconnect_task and not self._reconnect_task.done():
            self._reconnect_task.cancel()
        self._reconnect_task = None

    @staticmethod
    def _try_parse(text: str) -> dict:
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return {}
