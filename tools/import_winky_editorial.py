"""Import the owner's exported phrase decisions, without touching any audio."""
import argparse
import ast
from collections import Counter
import json
from pathlib import Path
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from winky.speech_rotation import fingerprint


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from strings(item)


def import_review(path, destination, supplement=False):
    source = json.loads(path.read_text())
    items = [{k: v for k, v in row.items() if k != 'audio'} for row in source['items']]
    if supplement:
        previous = json.loads((destination / 'owner-review.json').read_text())['items']
        merged = {row['id']: row for row in previous}
        for row in items:
            merged.pop(row['id'], None)
            merged[row['id']] = row
        items = list(merged.values())
    ids = [row['id'] for row in items]
    if len(ids) != len(set(ids)) or any(row.get('status') not in {'good', 'ref', 'change', 'bad'} for row in items):
        raise ValueError('Duplicate IDs or unsupported decisions')
    # A later review can reject wording previously accepted under another ID.
    # Keep both audit rows, but apply the latest verdict to that exact wording.
    latest = {fingerprint(row['text']): row for row in items}
    approved = {key for key, row in latest.items() if row['status'] in ('good', 'ref')}
    try:
        legacy = set(json.loads((destination / 'editorial.json').read_text())['legacy'])
    except (OSError, ValueError, KeyError):
        legacy = set()
    for manifest in (ROOT / 'assets/voices').glob('*/manifest.json'):
        data = json.loads(manifest.read_text())
        for rows in data.get('categories', {}).values():
            legacy.update(fingerprint(row['text']) for row in rows if row.get('text'))
    legacy.update(fingerprint(t) for t in strings(yaml.safe_load((ROOT / 'winky/scenarios.yaml').read_text())))
    # Include embedded stock pools and f-string templates on compatibility routes.
    for name in ('app.py', 'chat_router.py', 'chat_style.py', 'tts.py', 'scenarios.py'):
        for node in ast.walk(ast.parse((ROOT / 'winky' / name).read_text())):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                for text in node.value.splitlines():
                    for variant in text.strip().split(' | '):
                        if len(variant) > 10:
                            legacy.add(fingerprint(variant))
    legacy.update(fingerprint(row['text']) for row in items)
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'owner-review.json').write_text(json.dumps({
        'version': source['version'], 'created_at': source['created_at'], 'items': items,
    }, ensure_ascii=False, indent=2) + '\n')
    result = dict(version=1, approved=sorted(approved), legacy=sorted(legacy),
                  rejected=sorted({key for key, row in latest.items() if row['status'] in ('bad', 'change')}),
                  counts=dict(Counter(row['status'] for row in items)),
                  english_status='pending_adaptation_after_russian_acceptance')
    (destination / 'editorial.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result['counts']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('review', type=Path)
    parser.add_argument('--supplement', action='store_true', help='Merge a later pilot review with existing owner decisions')
    args = parser.parse_args()
    print(import_review(args.review, ROOT / 'docs/voice-audit/conversation-v1', args.supplement))
