"""Compile the accepted cards for the guarded runtime; no audio generation or activation."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from winky.phrase_context import CONTRACT
from winky.editorial import approved

DOCS = ROOT / 'docs/voice-audit/conversation-v1'


def compile_catalog(source):
    if source.get('counts', {}).get('unreviewed') or source.get('unreviewed_records'):
        raise ValueError('Unreviewed text remains')
    rows = []
    for original in source['records']:
        if (not original.get('text_review_accepted') or original.get('status') != 'text_approved'
                or not approved(original['text'])
                or hashlib.sha256(original['text'].encode()).hexdigest() != original['text_sha256']):
            raise ValueError('Text decision changed: ' + original['id'])
        row = {**original, 'speech_contract': CONTRACT, 'status': 'text_approved'}
        # An editorial prototype must never be mistaken for a generated, ready bank.
        row.pop('file', None)
        row['runtime_route'] = ('written_greeting_reply' if row['purpose'] == 'chat_greeting'
                                else 'automatic_cta' if row['purpose'] == 'bot'
                                else 'confirmed_social_event' if row['purpose'] == 'social'
                                else 'episode_observation' if row['purpose'] == 'observation'
                                else 'confirmed_trade_event' if row['category'].startswith(('TRADE_', 'OPEN_'))
                                else 'search_episode')
        rows.append(row)
    return dict(version=1, speech_contract=CONTRACT, status='texts_approved_audio_and_scene_pending',
                activated=False, records=rows, new_paid_requests=0,
                note='This is a runtime catalog, not an activated audio manifest. Existing audio remains unchanged.')


def main():
    path = DOCS / 'autonomous-bank-ru-approved.json'
    result = compile_catalog(json.loads(path.read_text()))
    result['source_catalog_sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    (DOCS / 'autonomous-bank-runtime.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(dict(cards=len(result['records']), activated=False, new_paid_requests=0)))


if __name__ == '__main__':
    main()
