"""Load independently authored bilingual lines, validate the 1000-slot expansion."""
from __future__ import annotations
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from tools.streamer_catalog import VOICES

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs/voice-audit/lively-v3'


def catalog():
    rows = []
    counts = Counter()
    category, conditions = '', {}
    for line in (DOCS / 'new-lines.txt').read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('@'):
            category, raw = line[1:].split(' ', 1)
            conditions = json.loads(raw)
            continue
        parts = line.split(' | ')
        if len(parts) not in (2, 3):
            raise ValueError('Expected RU | EN: ' + line)
        counts[category] += 1
        n = counts[category]
        for lang, text in zip(('ru', 'en'), parts[:2]):
            tone = ('conversational', 'playful', 'sarcastic', 'warm')[n % 4]
            cue = {'conversational': 'natural, conversational', 'playful': 'lightly playful, smiling',
                   'sarcastic': 'gently sarcastic, conversational', 'warm': 'warm, relaxed'}[tone]
            if category.startswith('OPEN_') or category in ('NARRATE_EXPIRY', 'NARRATE_RESULT'):
                tone, cue = 'conversational', 'clear, conversational'
            if category == 'TRADE_LOSS':
                tone, cue = 'warm', 'calm, mildly disappointed'
            identity = f'lively3_{lang}_{category.lower()}_{n:03}'
            group = parts[2] if len(parts) == 3 else f'{category.lower()}_{n:03}'
            rows.append(dict(id=identity, phrase_id=identity, lang=lang, category=category,
                             text=text.strip(), tts_text=f'[{cue}] {text.strip()}',
                             conditions=dict(conditions), voice_id=VOICES[lang], text_version=1,
                             text_sha256=hashlib.sha256(text.strip().encode()).hexdigest(),
                             delivery=cue, tone=tone, topic=category,
                             max_duration_sec=8 if category == 'CHAT_REACTION' else 10,
                             semantic_group=lang + ':' + group))
    revisions = {}
    editorial = '\n'.join((DOCS / name).read_text() for name in ('style-revision.txt', 'mature-revision.txt'))
    for line in editorial.splitlines():
        if not line or line.startswith('#'):
            continue
        key, ru, en = line.split(' | ')
        category, number = key.split()
        for lang, text in (('ru', ru), ('en', en)):
            revisions[f'lively3_{lang}_{category.lower()}_{int(number):03}'] = text
    for row in rows:
        if row['id'] in revisions:
            row.update(text=revisions.pop(row['id']), delivery='casual', tone='playful')
            row['tts_text'] = '[casual] ' + row['text']
            row['text_sha256'] = hashlib.sha256(row['text'].encode()).hexdigest()
        if not row['category'].startswith('OPEN_') and row['category'] not in ('NARRATE_EXPIRY', 'NARRATE_RESULT'):
            themes = [('aura', r'аур|aura'), ('tilt', r'тильт|tilt'),
                      ('chill', r'чилл|chill|nonchalant'), ('skip', r'скип|skip'),
                      ('yapping', r'душн|yap'), ('crown', r'корон|crown'),
                      ('voice_meta', r'голос|микрофон|microphone|voice')]
            for theme, pattern in themes:
                if re.search(pattern, row['text'], re.I):
                    row['semantic_group'] = row['lang'] + ':' + theme
                    break
    if revisions:
        raise ValueError('Unknown editorial revision slots: ' + str(revisions.keys()))
    pilots = {'NARRATE_ENGAGE': 'casual, teasing', 'NARRATE_SCAN': 'casual',
              'NARRATE_CTA': 'casual, amused', 'OPEN_TRADE_CALL': 'conversational',
              'TRADE_WIN': 'excited, conversational', 'TRADE_LOSS': 'mildly frustrated, conversational'}
    for row in rows:
        if row['category'] in pilots and row['id'].endswith('_001'):
            row['delivery'] = pilots[row['category']]
            row['tts_text'] = '[' + row['delivery'] + '] ' + row['text']
        # Owner accepted probe B: the approved Marin voice, unchanged sampling,
        # conversational delivery. Personality comes from the text, not strain.
        if row['lang'] == 'ru':
            row['delivery'] = 'conversational'
            row['tts_text'] = '[conversational] ' + row['text']
    return rows


def preflight():
    from winky.censor import check_phrase
    from winky.speech_rotation import fingerprint
    rows = catalog()
    expected = {'NARRATE_CTA': 50, 'NARRATE_SCAN': 70, 'NARRATE_PAIR': 25,
                'NARRATE_LESSON': 45, 'NARRATE_ENGAGE': 30, 'CHAT_REACTION': 30,
                'NARRATE_TRADE': 45, 'NARRATE_EXPIRY': 32, 'OPEN_TRADE_CALL': 40,
                'OPEN_TRADE_PUT': 40, 'TRADE_WIN': 30, 'TRADE_LOSS': 20,
                'TRADE_REFUND': 15, 'NARRATE_RESULT': 20, 'NARRATE_VOLATILITY': 8}
    for lang in ('ru', 'en'):
        actual = Counter(r['category'] for r in rows if r['lang'] == lang)
        if actual != expected:
            raise ValueError(f'{lang} counts differ: {actual - Counter(expected)}; missing: {Counter(expected) - actual}')
    old = json.loads((ROOT / 'docs/voice-audit/streamer-v2/catalog-500.json').read_text())['records']
    hashes = [fingerprint(r['text']) for r in old + rows]
    if len(hashes) != len(set(hashes)):
        raise ValueError('Duplicate text across banks')
    for row in rows:
        if not check_phrase(row['text'])[0] or len(row['tts_text'].encode()) > 500:
            raise ValueError('Content preflight: ' + row['id'])
    return rows


def pilot_rows():
    rows = preflight()
    # Humour, sarcasm, CTA, opening, WIN and LOSS on both approved voices.
    categories = ('NARRATE_ENGAGE', 'NARRATE_SCAN', 'NARRATE_CTA', 'OPEN_TRADE_CALL', 'TRADE_WIN', 'TRADE_LOSS')
    return [next(r for r in rows if r['lang'] == lang and r['category'] == c)
            for lang in ('ru', 'en') for c in categories]
