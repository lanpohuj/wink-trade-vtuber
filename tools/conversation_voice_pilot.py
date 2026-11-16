"""Prepare a small delivery pilot from accepted texts; paid generation is gated."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from tools import build_commentary_bank as build
from winky.editorial import approved
from winky.fish_tts import FishAudioTTS

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs/voice-audit/conversation-v1'
CATALOG = DOCS / 'voice-pilot-10.json'
BANK = ROOT / 'assets/voices/conversation_pilot_v1'
PRICE_PER_MILLION_BYTES = 15
SOURCES = (
    'conversation_ru_quiet_04', 'conversation_ru_flirt_01',
    'conversation_ru_flirt_03', 'conversation_ru_flirt_04',
    'conversation_reference_v2_flirt_01', 'conversation_reference_v2_flirt_02',
    'conversation_reference_v2_banter_01', 'conversation_reference_v2_banter_02',
)


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)


def prepare():
    review = json.loads((DOCS / 'owner-review.json').read_text())['items']
    by_id = {r['id']: r for r in review}
    refs = json.loads((DOCS / 'delivery-references.json').read_text())['references']
    rows = []
    # Two alternate deliveries compare the very same accepted wording.
    for n, source_id in enumerate((*SOURCES, SOURCES[4], SOURCES[6]), 1):
        source = by_id[source_id]
        if source['status'] not in ('good', 'ref') or not approved(source['text']):
            raise ValueError('Text acceptance missing or revoked: ' + source_id)
        delivery = 'conversational' if n <= 8 else 'curious, conversational'
        rows.append(dict(
            id=f'conversation_pilot_ru_{n:02}', lang='ru', category=source['category'],
            text=source['text'], tts_text=f'[{delivery}] ' + source['text'],
            voice_id=refs[0]['request_payload']['reference_id'], delivery=delivery,
            text_version=1, text_sha256=hashlib.sha256(source['text'].encode()).hexdigest(),
            conditions={}, max_duration_sec=15, requires_listening=True,
            text_review_accepted=True, owner_text_source=source_id,
            delivery_reference_ids=[r['id'] for r in refs], auditory_verified=False,
        ))
    save(CATALOG, dict(version=1, status='awaiting_spend_approval', records=rows))
    return rows


def validate(rows):
    for row in rows:
        if not approved(row['text']) or row.get('text_review_accepted') is not True:
            raise ValueError('Text acceptance missing or revoked: ' + row['id'])
        if row['text_sha256'] != hashlib.sha256(row['text'].encode()).hexdigest():
            raise ValueError('Changed pilot text: ' + row['id'])
        if row['tts_text'] != f"[{row['delivery']}] " + row['text']:
            raise ValueError('Changed pilot delivery: ' + row['id'])


def catalog_hash():
    return hashlib.sha256(CATALOG.read_bytes()).hexdigest()


def estimate():
    from config import settings
    rows = json.loads(CATALOG.read_text())['records']
    validate(rows)
    engine = FishAudioTTS()
    try:
        reference = json.loads((DOCS / 'delivery-references.json').read_text())['references'][0]['request_payload']
        if engine.voices['ru'] != reference['reference_id']:
            raise ValueError('The live RU slot differs from the accepted Marin voice')
        tuning = engine.get_tuning('ru')
        for key in ('temperature', 'top_p', 'latency', 'sample_rate', 'normalize'):
            if tuning[key] != reference[key]:
                raise ValueError('Reference tuning differs: ' + key)
        if tuning['speed'] != reference['prosody']['speed'] or tuning['normalize_volume'] != reference['prosody']['normalize_loudness']:
            raise ValueError('Reference prosody differs')
        pending = [r for r in rows if not engine.is_cached(r['tts_text'], r['lang'])]
        byte_count = sum(len(engine.payload(r['tts_text'], r['lang'])['text'].encode()) for r in pending)
        ledger = engine.root / 'budget.json'
        spent = json.loads(ledger.read_text())['reserved_usd'] if ledger.exists() else 0
        amount = byte_count * PRICE_PER_MILLION_BYTES / 1_000_000
        return dict(
            catalog_sha256=catalog_hash(), takes=len(rows), unique_texts=len(SOURCES),
            new_requests=len(pending), cached=len(rows)-len(pending), utf8_bytes=byte_count,
            estimate_usd=round(amount, 6), suggested_max_new_usd=0.05,
            reserved_usd=round(spent, 6), cumulative_limit_usd=settings.FISHAUDIO_BUDGET_USD,
            fits_cumulative_limit=spent + amount <= settings.FISHAUDIO_BUDGET_USD,
            rate_usd_per_million_utf8_bytes=PRICE_PER_MILLION_BYTES,
            pricing_source='https://fish.audio/app/developers/',
            model='s2.1-pro', voice_id=engine.voices['ru'],
        )
    finally:
        engine._client.close()


def verify_approval(approval, quote):
    if approval.get('approved') is not True or approval.get('catalog_sha256') != quote['catalog_sha256']:
        raise ValueError('Explicit approval for this exact pilot is required')
    cap = float(approval.get('max_new_usd', 0))
    if 'baseline_reserved_usd' not in approval:
        raise ValueError('An approved budget baseline is required')
    baseline = float(approval['baseline_reserved_usd'])
    if not math.isfinite(cap) or not math.isfinite(baseline) or baseline < 0:
        raise ValueError('Invalid spending approval')
    used = max(0, quote['reserved_usd'] - baseline)
    if not 0 < cap <= 0.05 or used + quote['estimate_usd'] > cap + 1e-9:
        raise ValueError('Pilot spending cap exceeded')
    if not quote['fits_cumulative_limit']:
        raise ValueError('Existing cumulative budget exceeded')


def generate(approval_path):
    approval = json.loads(approval_path.read_text())
    quote = estimate()
    verify_approval(approval, quote)
    # Use the tested project adapter: connector TTS has no speed/sampling controls.
    build.BANK, build.CATALOG = BANK, CATALOG
    build.MAX_DURATION_SEC = 15
    build.generate()
    # This produces review_pending files in an inactive pilot, never a live bank.


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('prepare', 'quote', 'generate'))
    parser.add_argument('--approval', type=Path)
    args = parser.parse_args()
    if args.action == 'prepare':
        prepare()
    if args.action == 'generate':
        if not args.approval:
            parser.error('--approval is required for paid generation')
        generate(args.approval)
    else:
        quote = estimate()
        save(DOCS / 'voice-pilot-quote.json', quote)
        print(json.dumps(quote, ensure_ascii=False))
