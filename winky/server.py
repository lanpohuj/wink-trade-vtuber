"""Локальный HTTP-сервер ассетов Winky (страницы, модель, текстуры, медиа).

Встроенный сервер pywebview капризен к ассетам WebGL в WKWebView, поэтому
раздаём файлы сами: корректные MIME, CORS-заголовки и no-store, чтобы правки
файлов подхватывались мгновенно.
"""

from __future__ import annotations

import logging
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

logger = logging.getLogger(__name__)

WEB_DIR = Path(__file__).parent / "web"


class _AssetsHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:  # noqa: N802 — сигнатура http.server
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

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
