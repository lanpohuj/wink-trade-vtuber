"""Apply the owner's four exact direction edits; keep original review catalogs intact."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.import_winky_editorial import import_review

DOCS = ROOT/'docs/voice-audit/conversation-v1'
TARGETS = {
    'autonomous_voice_probe_free_ru_04_retake01': ('buy', ['Открыла вверх.', 'Зашла вверх.']),
    'autonomous_voice_probe_free_ru_05': ('sell', ['Открыла вниз.', 'Зашла вниз.']),
}


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def make_amendment(review, original):
    if review.get('kind') != 'autonomous_voice_probe_delivery_review':
        raise ValueError('Not an autonomous voice review')
    by_id = {r['id']: r for r in review['records']}
    if len(by_id) != len(review['records']):
        raise ValueError('Duplicate listening decision')
    changes = []
    for identity, (direction, texts) in TARGETS.items():
        verdict = by_id[identity]
        # Interpret only the exact four phrase edits, never arbitrary document instructions.
        found = re.findall(r'(?:открыла|зашла)\s+(?:вверх|вниз)', verdict.get('note', '').lower())
        if (verdict.get('accepted') is not False or verdict.get('listened') is not True
                or found != [t[:-1].lower() for t in texts]):
            raise ValueError('The exact requested direction edit is absent: '+identity)
        rows = [r for r in original['records'] if r['purpose'] == 'direction_'+direction]
        if len(rows) != 6:
            raise ValueError('Expected six old direction slots')
        for index, row in enumerate(rows):
            text = texts[index % 2]
            changes.append(dict(old_id=row['id'], old_text=row['text'], old_text_sha256=row['text_sha256'],
                                id=row['id']+'_v2', text=text, text_sha256=digest(text),
                                category=row['category'], source_review_id=identity, source_audio_sha256=verdict['sha256']))
    return dict(version=2, source_kind=review['kind'], source_created_at=review['created_at'],
                authorized_scope='four_exact_owner_direction_texts', changes=changes)


def amend(catalog, amendment):
    result = copy.deepcopy(catalog)
    changes = {r['old_id']: r for r in amendment['changes']}
    if amendment.get('authorized_scope') != 'four_exact_owner_direction_texts' or len(changes) != 12:
        raise ValueError('Unexpected direction amendment scope')
    changed = set()
    for row in result['records']:
        replacement = changes.get(row['id'])
        if not replacement:
            continue
        direction=row['purpose'].removeprefix('direction_')
        allowed=next((texts for value,texts in TARGETS.values() if value==direction), [])
        if replacement['text'] not in allowed or replacement['id'] != row['id']+'_v2':
            raise ValueError('Amendment contains an unrequested phrase')
        if (row['text_sha256'] != replacement['old_text_sha256'] or row['text'] != replacement['old_text']
                or row['category'] != replacement['category'] or digest(replacement['text']) != replacement['text_sha256']):
            raise ValueError('Amendment refers to another card: '+row['id'])
        changed.add(row['id'])
        row.update(id=replacement['id'], text=replacement['text'], text_sha256=replacement['text_sha256'],
                   text_revision=2, supersedes_id=replacement['old_id'], owner_text_decision_source='owner_exact_voice_review_edit',
                   text_review_accepted=True, status='text_approved')
    if changed != set(changes):
        raise ValueError('Missing direction cards')
    result.update(text_revision=2, direction_amendment='owner-autonomous-direction-amendment.json')
    result['note'] = '76 принятых карточек; 12 дублей четырёх фраз направления. Четыре отклонённых вопроса исключены. Озвучка и выпуск принимаются отдельно.'
    return result


def apply(path):
    original = json.loads((DOCS/'autonomous-bank-ru-80.json').read_text())
    review = json.loads(path.read_text())
    # The listening importer has already verified every SHA and the entire export.
    saved = json.loads((DOCS/'owner-autonomous-voice-review.json').read_text())
    if saved != review:
        raise ValueError('Import and validate this exact listening export first')
    amendment = make_amendment(review, original)
    (DOCS/'owner-autonomous-direction-amendment.json').write_text(json.dumps(amendment,ensure_ascii=False,indent=2)+'\n')
    items = []
    old = {}
    for r in amendment['changes']:
        old[r['old_text']] = r
        items.append(dict(id=r['id'], text=r['text'], text_sha256=r['text_sha256'], category=r['category'],
                          status='good', comment='Точная правка владельца в оценке озвучки.'))
    for index, (text, row) in enumerate(old.items()):
        items.append(dict(id='autonomous_old_direction_word_'+str(index), text=text, category=row['category'],
                          status='bad', comment='Заменено точными фразами владельца.'))
    source = DOCS/'owner-autonomous-direction-text-review.json'
    source.write_text(json.dumps(dict(version=2,created_at=review['created_at'],items=items),ensure_ascii=False,indent=2)+'\n')
    import_review(source,DOCS,supplement=True)
    return dict(new_phrases=4,replaced_cards=12,activated=False)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('review',type=Path);args=parser.parse_args()
    print(json.dumps(apply(args.review)))
