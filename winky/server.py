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
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)

WEB_DIR = Path(__file__).parent / "web"
VOICE_CACHE_DIR = Path(__file__).resolve().parent.parent / "voice_cache"
WEBAPP_DIR = Path(__file__).resolve().parent.parent / "webapp"

_winky_sync_callbacks: dict[str, Callable] = {}


def register_winky_callback(event: str, fn: Callable) -> None:
    _winky_sync_callbacks[event] = fn


class _AssetsHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        clean = path.split("?", 1)[0].split("#", 1)[0]
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

        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        clean = self.path.split("?", 1)[0].split("#", 1)[0]

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            payload = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            payload = {}

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
                        model=payload.get("model", "winky-v5"),
                    )
                except Exception as e:
                    logger.warning("Ошибка callback signal: %s", e)
            self._send_json({"ok": True})
            return

        if clean == "/api/signal":
            pair = payload.get("pair", "EUR/USD OTC")
            duration = payload.get("duration", "5s")
            force_dir = payload.get("force_dir")
            model = payload.get("model", "winky-v5")
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
    """Поднимает сервер winky/web на свободном локальном порту (демон-поток)."""
    handler = partial(_AssetsHandler, directory=str(WEB_DIR))
    server: ThreadingHTTPServer | None = None
    for port in range(8790, 8810):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            continue
    if server is None:
        raise RuntimeError("Не нашлось свободного порта для ассетов Winky (8790–8809)")
    server.daemon_threads = True
    import threading

    threading.Thread(target=server.serve_forever, name="winky-assets", daemon=True).start()
    host, port = server.server_address[:2]
    logger.info("Ассеты Winky: http://%s:%s", host, port)
    return host, port
