"""Context-aware recorded speech. No arbitrary audio fallbacks."""
from __future__ import annotations

import json
import random
import re
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'assets/voices/lumean'
ALIASES = {
    'start_stream': 'START_STREAM_READY', 'stream_ready': 'START_STREAM_READY',
    'analyzing': 'ANALYZING_CHART', 'analyzing_chart': 'ANALYZING_CHART',
    'flat_skip': 'WEAK_SIGNAL_SWITCH_PAIR', 'switch_pair': 'PAIR_SWITCHED_NEW_SCAN',
    'prepare_entry': 'PREPARE_ENTRY', 'in_trade': 'IN_TRADE_WAITING',
    'trade_win': 'TRADE_WIN', 'trade_win_recovery': 'TRADE_WIN',
    'trade_loss': 'TRADE_LOSS', 'trade_loss_recovery': 'TRADE_LOSS',
    'trade_loss_reset': 'TRADE_LOSS', 'trade_refund': 'TRADE_REFUND',
    'pause': 'PAUSE_BETWEEN_TRADES', 'ask_chat': 'CHAT_ACK', 'stream_insight': 'STREAM_INSIGHT',
}

CATEGORY_COUNTS = {
    'START_STREAM_READY': 6, 'ANALYZING_CHART': 12, 'WEAK_SIGNAL_SWITCH_PAIR': 10,
    'PAIR_SWITCHED_NEW_SCAN': 8, 'PREPARE_ENTRY': 6, 'OPEN_TRADE_CALL': 12,
    'OPEN_TRADE_PUT': 12, 'IN_TRADE_WAITING': 10, 'TRADE_WIN': 12,
    'TRADE_LOSS': 10, 'TRADE_REFUND': 6, 'PAUSE_BETWEEN_TRADES': 6,
    'CHAT_ACK': 4, 'STREAM_INSIGHT': 6,
}

def category_name(value: str) -> str:
    value = str(value or '').strip()
    if value.lower().startswith('trade_loss'):
        return 'TRADE_LOSS'
    return ALIASES.get(value.lower(), value.upper())

def priority(category: str) -> int:
    if category in ('TRADE_WIN', 'TRADE_LOSS', 'TRADE_REFUND'):
        return 0
    if category in ('OPEN_TRADE_CALL', 'OPEN_TRADE_PUT'):
        return 1
    return 4 if category in ('STREAM_INSIGHT', 'CHAT_ACK') else 2

class VoiceBank:
    def __init__(self, root: Path = ROOT, history_path: Path | None = None):
        self.root = root
        self.history_path = history_path or Path.home() / '.winky_voice_decks.json'
        self.lock = threading.RLock()
        try:
            self.history = json.loads(self.history_path.read_text())
        except (OSError, ValueError):
            self.history = {}
        self.reserved: set[str] = set()

    def candidates(self, event: dict) -> list[dict]:
        from winky.censor import check_phrase
        try:
            manifest = json.loads((self.root / 'manifest.json').read_text())
        except (OSError, ValueError):
            return []
        if str(manifest.get('version', '')).startswith('3'):
            if manifest.get('activated') is not True:
                return []
            for required, count in CATEGORY_COUNTS.items():
                records = manifest.get('categories', {}).get(required, [])
                for language in ('ru', 'en'):
                    bank = [r for r in records if r.get('lang') == language]
                    if len(bank) != count or any(not r.get('auditory_verified') or r.get('status') != 'ready' or not (self.root / r.get('file', '')).is_file() for r in bank):
                        return []
        category = category_name(event.get('category'))
        lang = event.get('lang', 'ru')
        items = manifest.get('categories', {}).get(category, [])
        try:
            eligibility = json.loads((self.root / 'legacy-eligibility.json').read_text())
        except (OSError, ValueError):
            eligibility = {}
        result = []
        for original in items:
            item = dict(original)
            item.update(eligibility.get(item.get("id"), {}))
            if str(manifest.get('version', '')).startswith('3') and not item.get('auditory_verified', False):
                continue
            if item.get('lang', 'ru') != lang or item.get('status', 'ready') != 'ready':
                continue
            media = (self.root / item.get('file', '')).resolve()
            if not media.is_relative_to(self.root.resolve()) or not media.is_file():
                continue
            if event.get('file_id') and item.get('id') != event['file_id']:
                continue
            if event.get('file_path') and item.get('file') != event['file_path']:
                continue
            if not check_phrase(item.get('text', ''))[0] or not check_phrase(item.get('transcript', ''))[0]:
                continue
            conditions = item.get('conditions', {})
            if any(event.get(k) not in (v if isinstance(v, list) else [v]) for k, v in conditions.items()):
                continue
            # Legacy recordings have no verified context annotations. Do not
            # invent an expiry or technical reason for an arbitrary strategy.
            if 'conditions' not in item and re.search(r'тридцать|пятнадцать|RSI|перепродан|перекуплен|половина|уровень|уровня|минимум|максимум|вершин|объем|нейросеть', item.get('text', ''), re.I):
                continue
            item['path'] = media
            result.append(item)
        return result

    def reserve(self, event: dict) -> dict | None:
        with self.lock:
            pool = self.candidates(event)
            key = event.get('lang', 'ru') + ':' + category_name(event.get('category'))
            used = self.history.get(key, [])
            available = [i for i in pool if i['id'] not in used and i['id'] not in self.reserved]
            if not available and pool and not any(i['id'] in self.reserved for i in pool):
                last = used[-1:] or []
                self.history[key] = []
                available = [i for i in pool if len(pool) == 1 or i['id'] not in last]
            if not available:
                return None
            item = random.choice(available)
            self.reserved.add(item['id'])
            return item

    def release(self, item_id: str, event: dict, played: bool = False) -> None:
        with self.lock:
            self.reserved.discard(item_id)
            if not played:
                return
            key = event.get('lang', 'ru') + ':' + category_name(event.get('category'))
            self.history.setdefault(key, []).append(item_id)
            self.history[key] = self.history[key][-500:]
            self.history_path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.history_path.with_suffix('.tmp')
            temp.write_text(json.dumps(self.history, ensure_ascii=False))
            temp.replace(self.history_path)
