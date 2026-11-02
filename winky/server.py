"""Локальный HTTP-сервер ассетов Winky (страницы, модель, текстуры, медиа, Mini App).

Встроенный сервер pywebview капризен к ассетам WebGL в WKWebView, поэтому
раздаём файлы сами: корректные MIME, CORS-заголовки и no-store, чтобы правки
файлов подхватывались мгновенно.
Также раздаёт Mini App по адресу /webapp/ и локальные API для автономной работы оверлея.
"""

from __future__ import annotations

import json
import logging
import random
import time
from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)

WEB_DIR = Path(__file__).parent / "web"
VOICE_CACHE_DIR = Path(__file__).resolve().parent.parent / "voice_cache"
WEBAPP_DIR = Path(__file__).resolve().parent.parent / "webapp"
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

_winky_sync_callbacks: dict[str, Callable] = {}
_local_live_stats: dict[str, Any] = {
    "wins": 110,
    "losses": 1,
    "pair": "EUR/USD OTC",
}

_chat_requested_pairs: deque[dict[str, Any]] = deque(maxlen=20)
_last_ask_chat_time: float = time.time()
_last_extension_ping: float = 0.0


def register_winky_callback(event: str, fn: Callable) -> None:
    _winky_sync_callbacks[event] = fn


def push_chat_pair_request(pair: str, user: str) -> None:
    """Добавляет запрошенную зрителем из TikTok-чата валютную пару в очередь Winky."""
    _chat_requested_pairs.append({
        "pair": pair,
        "user": user,
        "timestamp": time.time(),
    })
    logger.info("В очередь добавлена пара от %s: %s", user, pair)


class _AssetsHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean.startswith("/assets/"):
            rel = clean[len("/assets/"):].lstrip("/")
            return str(ASSETS_DIR / rel)
        if clean.startswith("/voice_cache/"):
            rel = clean[len("/voice_cache/"):].lstrip("/")
            return str(VOICE_CACHE_DIR / rel)
        if clean.startswith("/webapp/"):
            rel = clean[len("/webapp/"):].lstrip("/")
            if not rel or rel.endswith("/"):
                rel += "index.html"
            return str(WEBAPP_DIR / rel)
        if clean == "/webapp":
            return str(WEBAPP_DIR / "index.html")
        return super().translate_path(path)

    def end_headers(self) -> None:  # noqa: N802 — сигнатура http.server
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(200)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        clean = self.path.split("?", 1)[0].split("#", 1)[0]
        if clean == "/api/history":
            self._send_json({
                "signals": [
                    {"pair": "EUR/USD OTC", "direction": "BUY", "accuracy": 96, "duration": "5s"},
                    {"pair": "GBP/USD OTC", "direction": "SELL", "accuracy": 94, "duration": "15s"},
                    {"pair": "AUD/USD OTC", "direction": "BUY", "accuracy": 95, "duration": "5s"},
                ],
                "today_traders": 128,
                "total_users": 1420,
            })
            return
        if clean.startswith("/api/me"):
            self._send_json({
                "points_this_week": 850,
                "rank": 3,
                "streak_days": 5,
                "signals_used_total": 42,
                "has_access": True,
            })
            return
        if clean == "/api/leaderboard":
            self._send_json({
                "top": [
                    {"rank": 1, "username": "Streamer Pro", "points": 1450},
                    {"rank": 2, "username": "Quantum Trader", "points": 1120},
                    {"rank": 3, "username": "Winky Fan", "points": 850},
                ],
            })
            return
        if clean == "/api/live_stats":
            w = int(_local_live_stats["wins"])
            l = int(_local_live_stats["losses"])
            total = w + l
            rate = f"{(w / total * 100):.1f}%" if total > 0 else "0.0%"
            self._send_json({
                "wins": w,
                "losses": l,
                "winrate": rate,
                "pair": str(_local_live_stats.get("pair", "EUR/USD OTC")),
            })
            return

        if clean == "/api/winky/ping":
            global _last_extension_ping
            _last_extension_ping = time.time()
            self._send_json({"ok": True, "connected": True, "timestamp": _last_extension_ping})
            return

        if clean in ("/api/winky/check_tts", "/api/winky/check_prefetch"):
            query_part = self.path.split("?", 1)[1] if "?" in self.path else ""
            import urllib.parse
            params = urllib.parse.parse_qs(query_part)
            intent_id = params.get("intent_id", [""])[0]
            cb = _winky_sync_callbacks.get("check_tts")
            res = {"status": "not_found", "ready": False, "intent_id": intent_id}
            if cb:
                try:
                    res = cb(intent_id)
                except Exception as e:
                    logger.warning("Ошибка callback check_tts: %s", e)
            self._send_json(res)
            return

        if clean == "/api/winky/voice_manifest":
            manifest_file = ASSETS_DIR / "voices" / "lumean" / "manifest.json"
            if manifest_file.exists():
                try:
                    self._send_json(json.loads(manifest_file.read_text(encoding="utf-8")))
                    return
                except Exception as e:
                    logger.warning("Ошибка чтения manifest.json: %s", e)
            self._send_json({"error": "manifest_not_found", "categories": {}})
            return

        if clean == "/api/winky/status":
            connected = (time.time() - _last_extension_ping) < 15.0
            self._send_json({
                "connected": connected,
                "last_ping": _last_extension_ping,
                "queue_len": len(_chat_requested_pairs),
            })
            return

        if clean == "/api/winky/next_command":
            global _last_ask_chat_time
            # 1. Запрос от зрителя в TikTok-чате
            if _chat_requested_pairs:
                req = _chat_requested_pairs.popleft()
                self._send_json({
                    "action": "switch_pair",
                    "pair": req["pair"],
                    "user": req["user"],
                    "reason": "chat_request",
                })
                return
            # 2. Каждые 150 секунд (2.5 мин) авто-запрос в чат
            now = time.time()
            if now - _last_ask_chat_time > 150:
                _last_ask_chat_time = now
                self._send_json({
                    "action": "ask_chat",
                    "reason": "cycle",
                })
                return
            self._send_json({"action": "continue"})
            return

        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        clean = self.path.split("?", 1)[0].split("#", 1)[0]

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            payload = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            payload = {}

        if clean == "/api/live_stats":
            if payload.get("reset"):
                _local_live_stats["wins"] = 110
                _local_live_stats["losses"] = 1
            else:
                if payload.get("wins") is not None:
                    _local_live_stats["wins"] = max(0, int(payload["wins"]))
                if payload.get("losses") is not None:
                    _local_live_stats["losses"] = max(0, int(payload["losses"]))
            if payload.get("pair"):
                _local_live_stats["pair"] = str(payload["pair"])
            w = int(_local_live_stats["wins"])
            l = int(_local_live_stats["losses"])
            total = w + l
            rate = f"{(w / total * 100):.1f}%" if total > 0 else "0.0%"
            self._send_json({
                "wins": w,
                "losses": l,
                "winrate": rate,
                "pair": str(_local_live_stats.get("pair", "EUR/USD OTC")),
            })
            return

        if clean == "/api/winky/launch_chrome":
            cb = _winky_sync_callbacks.get("launch_chrome")
            res = {"ok": True, "message": "Кабинет Pocket Option открыт в Google Chrome!"}
            if cb:
                try:
                    r = cb()
                    if isinstance(r, dict):
                        res = r
                except Exception as e:
                    logger.warning("Ошибка callback launch_chrome: %s", e)
            else:
                try:
                    import subprocess
                    subprocess.Popen(["open", "-a", "Google Chrome", "https://po.financial/ru/cabinet/demo-quick-high-low/"])
                except Exception as e:
                    logger.warning("Ошибка subprocess open Chrome: %s", e)
            self._send_json(res)
            return

        if clean == "/api/winky/ping":
            global _last_extension_ping
            _last_extension_ping = time.time()
            self._send_json({"ok": True, "connected": True})
            return

        if clean == "/api/winky/event":
            cb = _winky_sync_callbacks.get("event")
            if cb:
                try:
                    cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback event: %s", e)
            self._send_json({"ok": True})
            return

        if clean in ("/api/winky/prefetch_tts", "/api/winky/prefetch"):
            cb = _winky_sync_callbacks.get("prefetch_tts")
            res = {"ok": False, "intent_id": ""}
            if cb:
                try:
                    res = cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback prefetch_tts: %s", e)
            self._send_json(res)
            return

        if clean in ("/api/winky/play_tts", "/api/winky/play_prefetched"):
            cb = _winky_sync_callbacks.get("play_tts")
            res = {"ok": False}
            if cb:
                try:
                    res = cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback play_tts: %s", e)
            self._send_json(res)
            return

        if clean == "/api/winky/play_voice":
            cb = _winky_sync_callbacks.get("play_voice")
            res = {"ok": False}
            if cb:
                try:
                    res = cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback play_voice: %s", e)
            self._send_json(res)
            return

        if clean in ("/api/winky/speak_stream_category", "/api/winky/category_voice"):
            cb = _winky_sync_callbacks.get("speak_stream_category")
            res = {"ok": False}
            if cb:
                try:
                    res = cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback speak_stream_category: %s", e)
            self._send_json(res)
            return

        if clean in ("/api/signal/sync", "/api/winky/sync_signal"):
            cb = _winky_sync_callbacks.get("signal_sync")
            if cb:
                try:
                    cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback signal_sync: %s", e)
            try:
                import threading
                import urllib.request
                def _fwd():
                    try:
                        req = urllib.request.Request(
                            "https://winktrade-app.online/api/signal/sync",
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Content-Type": "application/json"},
                            method="POST",
                        )
                        urllib.request.urlopen(req, timeout=3.0)
                    except Exception:
                        pass
                threading.Thread(target=_fwd, daemon=True).start()
            except Exception:
                pass
            self._send_json({"ok": True})
            return

        if clean == "/api/winky/speak_signal":
            cb = _winky_sync_callbacks.get("speak_signal")
            if cb:
                try:
                    cb(payload)
                except Exception as e:
                    logger.warning("Ошибка callback speak_signal: %s", e)
            self._send_json({"ok": True})
            return

        if clean == "/api/winky/scan":
            cb = _winky_sync_callbacks.get("scan")
            if cb:
                try:
                    cb()
                except Exception as e:
                    logger.warning("Ошибка callback scan: %s", e)
            self._send_json({"ok": True})
            return

        if clean == "/api/winky/signal":
            cb = _winky_sync_callbacks.get("signal")
            if cb:
                try:
                    cb(
                        direction=payload.get("direction", "BUY"),
                        pair=payload.get("pair", "EUR/USD OTC"),
                        duration=payload.get("duration", "5s"),
                        model=payload.get("model", "claude-fable-5.1"),
                    )
                except Exception as e:
                    logger.warning("Ошибка callback signal: %s", e)
            self._send_json({"ok": True})
            return

        if clean == "/api/signal":
            pair = payload.get("pair", "EUR/USD OTC")
            duration = payload.get("duration", "5s")
            force_dir = payload.get("force_dir")
            model = payload.get("model", "claude-fable-5.1")
            direction = force_dir if force_dir in ("BUY", "SELL") else random.choice(["BUY", "SELL"])
            accuracy = random.randint(92, 98)

            dur_sec = 5
            if duration == "10s": dur_sec = 10
            elif duration == "15s": dur_sec = 15
            elif duration == "30s": dur_sec = 30
            elif duration == "1m": dur_sec = 60
            elif duration == "3m": dur_sec = 180
            elif duration == "5m": dur_sec = 300

            resp = {
                "direction": direction,
                "accuracy": accuracy,
                "pair": pair,
                "duration": duration,
                "model": model,
                "rationale_ru": [
                    "• Argon Radar: институциональный приток ликвидности в стакан",
                    "• Winky Quant v5: синхронная дивергенция на младшем таймфрейме",
                ],
                "rationale_en": [
                    "• Argon Radar: institutional liquidity inflow detected",
                    "• Winky Quant v5: synchronous micro-divergence confirmed",
                ],
                "entry_delay_sec": 3,
                "duration_sec": dur_sec,
                "is_vip": True,
                "free_signals_left": 999,
                "register_url": "https://po-ru4.click/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START",
                "deposit_url": "https://po-ru4.click/cabinet/deposit?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START&promo=50START",
                "promo_code": "50START",
            }
            self._send_json(resp)
            return

        self.send_error(404, "Not Found")

    def _send_json(self, data: dict) -> None:
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        logger.debug("assets: " + format % args)


def start_assets_server() -> tuple[str, int]:
    """Поднимает сервер winky/web на порту 8765 или 8790-8809 (демон-поток)."""
    handler = partial(_AssetsHandler, directory=str(WEB_DIR))
    server: ThreadingHTTPServer | None = None
    candidate_ports = [8765] + list(range(8790, 8810))
    for port in candidate_ports:
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            continue
    if server is None:
        raise RuntimeError("Не нашлось свободного порта для ассетов Winky (8765, 8790–8809)")
    server.daemon_threads = True
    import threading

    threading.Thread(target=server.serve_forever, name="winky-assets", daemon=True).start()
    host, port = server.server_address[:2]
    logger.info("Ассеты Winky: http://%s:%s", host, port)
    return host, port
