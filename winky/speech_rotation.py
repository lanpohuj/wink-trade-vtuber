"""Persistent selection and playback history shared by recordings and chat.

Selection reserves a phrase; only a started player commits it to the history.
No credentials or incoming messages are persisted here.
"""
from __future__ import annotations

import hashlib
import json
import random
import re
import threading
import time
from pathlib import Path


def fingerprint(text):
    text = re.sub(r"\[[^\]]*\]", "", text.lower().replace("ё", "е"))
    return hashlib.sha256(re.sub(r"[^a-zа-я0-9]", "", text).encode()).hexdigest()


def mentions_bot(text):
    return bool(re.search(r"шапк|ссылк.{0,35}(?:бот|профил)|бот.{0,35}(?:ссылк|профил)|link in (?:my |the )?bio|bot.{0,35}bio", text, re.I))


class SpeechRotation:
    def __init__(self, path=None):
        self.path = path or Path.home() / '.winky_voice_decks.json'
        self.lock = threading.RLock()
        try:
            self.data = json.loads(self.path.read_text())
            if not isinstance(self.data, dict):
                self.data = {}
        except (OSError, ValueError):
            self.data = {}
        self.state = self.data.setdefault('_rotation_v2', {})
        self.decks = self.state.setdefault('decks', {})
        self.recent = self.state.setdefault('recent', [])
        self.groups = self.state.setdefault('groups', {})
        self.topics = self.state.setdefault('topics', {})
        self.pending = {}

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = self.path.with_suffix('.tmp')
        temp.write_text(json.dumps(self.data, ensure_ascii=False))
        temp.replace(self.path)

    def reserve(self, pool, key, *, universe=None, now=None):
        now = time.time() if now is None else now
        with self.lock:
            # Duplicated scripts in different banks are one choice.
            unique = {fingerprint(r['text']): r for r in reversed(pool)}
            rows = list(unique.values())
            universe = universe if universe is not None else rows
            full_rows = {fingerprint(r['text']): r for r in reversed(universe)}
            full_ids = {r.get('phrase_id', r['id']) for r in full_rows.values()}
            legacy = self.data.get(':'.join(key.split(':')[:2]), [])
            deck = self.decks.get(key, {'used': list(legacy), 'last': legacy[-1] if legacy else None})
            used = set(deck['used'])
            exhausted = bool(full_ids) and full_ids.issubset(used)
            pending_texts = {fingerprint(r['text']) for r in self.pending.values()}
            recent_texts = {r['hash'] for r in self.recent if now - r['at'] < 600}
            candidates = []
            for row in rows:
                logical = row.get('phrase_id', row['id'])
                if logical in used and not exhausted:
                    continue
                if exhausted and logical == deck['last'] and len(full_ids) > 1:
                    continue
                if row['id'] in self.pending or fingerprint(row['text']) in pending_texts:
                    continue
                group = row.get('semantic_group')
                if group and now - self.groups.get(group, -1e12) < 600:
                    continue
                # Tiny factual pools may cycle; conversational pools take a pause.
                if fingerprint(row['text']) in recent_texts and row.get('tone') in ('playful', 'sarcastic', 'flirty'):
                    continue
                if any(r['hash'] == fingerprint(row['text']) and r.get('deck') != key
                       and now - r['at'] < 600 for r in self.recent):
                    continue
                candidates.append(row)
            if not candidates:
                return None
            row = random.choice(candidates)
            self.pending[row['id']] = dict(row, _deck=key, _cycle=deck.get('cycle', 0) + int(exhausted),
                                          _initial_used=list(deck['used']))
            return row

    def release(self, item_id, played=False, now=None, spoken_text=None):
        now = time.time() if now is None else now
        with self.lock:
            row = self.pending.pop(item_id, None)
            if not row or not played:
                return
            key = row['_deck']
            deck = self.decks.setdefault(key, {'used': row['_initial_used'], 'last': None})
            if row['_cycle'] > deck.get('cycle', 0):
                deck['used'] = []
                deck['cycle'] = row['_cycle']
            logical = row.get('phrase_id', row['id'])
            if logical not in deck['used']:
                deck['used'].append(logical)
            deck['last'] = logical
            self._note(spoken_text or row['text'], row.get('lang', 'ru'), row.get('topic', key), row.get('semantic_group'), now)
            self.recent[-1]['deck'] = key
            self.save()

    def _note(self, text, lang, topic, group, now):
        self.recent.append({'hash': fingerprint(text), 'text': text, 'lang': lang, 'topic': topic, 'at': now})
        self.recent[:] = self.recent[-200:]
        if group:
            self.groups[group] = now
        stats = self.topics.setdefault(lang + ':' + topic, {'at': 0, 'count': 0})
        stats.update(at=now, count=stats['count'] + 1)
        if mentions_bot(text):
            self.state['next_cta_at'] = now + random.uniform(180, 300)

    def note(self, text, lang, topic='chat', now=None):
        with self.lock:
            self._note(text, lang, topic, None, time.time() if now is None else now)
            self.save()

    def recent_texts(self, limit=20):
        with self.lock:
            return [r['text'] for r in self.recent[-limit:]]

    def topic_order(self, choices, lang):
        # Least recently heard topic, then least used. Stable ties retain facts first.
        return sorted(choices, key=lambda c: (
            self.topics.get(lang + ':' + c[0], {}).get('at', 0),
            self.topics.get(lang + ':' + c[0], {}).get('count', 0)))

    def cta_due(self, now=None):
        now = time.time() if now is None else now
        with self.lock:
            if 'next_cta_at' not in self.state:
                self.state['next_cta_at'] = now + random.uniform(180, 300)
                self.save()
            return now >= self.state['next_cta_at']


_shared = None
_shared_lock = threading.Lock()


def shared_rotation():
    global _shared
    with _shared_lock:
        if _shared is None:
            _shared = SpeechRotation()
        return _shared
