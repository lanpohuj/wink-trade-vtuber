"""Read-only audit of active recordings: two full rounds per language/context.

No playback or synthesis. All history writes are confined to a temporary folder.
"""
from __future__ import annotations

import itertools
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from winky.speech_rotation import SpeechRotation, fingerprint
from winky.voice_bank import VoiceBank


def main():
    report = {'scope': 'active_recordings_temporary_history_no_audio', 'pools': [], 'starts': 0}
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        bank = VoiceBank(history_path=root / 'unused.json')
        categories = {}
        for source in (bank.root, bank.overlay_root):
            if source and (source / 'manifest.json').is_file():
                for category, rows in json.loads((source / 'manifest.json').read_text()).get('categories', {}).items():
                    categories.setdefault(category, []).extend(rows)
        for category, records in sorted(categories.items()):
            if category == 'NARRATE_EXPIRY':
                continue  # Disabled at admission and playback, tested separately.
            contexts = [{}]
            for record in records:
                conditions = record.get('conditions', {})
                fields = list(conditions)
                domains = [v if isinstance(v, list) else [v] for v in conditions.values()]
                contexts.extend(dict(zip(fields, values)) for values in itertools.product(*domains))
            contexts = list({json.dumps(c, sort_keys=True): c for c in contexts}.values())
            seen = set()
            for lang, context in itertools.product(('ru', 'en'), contexts):
                event = dict(context, lang=lang, category=category, allow_banter=True)
                rows = bank.candidates(event)
                hashes = {fingerprint(r['text']) for r in rows}
                signature = (lang, tuple(sorted(hashes)))
                if not rows or signature in seen:
                    continue
                seen.add(signature)
                history = root / f'pool-{len(report["pools"])}.json'
                rotation = SpeechRotation(history)
                key = lang + ':' + category + ':' + json.dumps(context, sort_keys=True)
                rounds = []
                for cycle in range(2):
                    heard = []
                    for n in range(len(hashes)):
                        now = 100000 + (cycle * len(hashes) + n) * 700
                        # A restart in the middle must retain the same round.
                        if n == len(hashes) // 2:
                            rotation = SpeechRotation(history)
                        row = rotation.reserve(rows, key, now=now)
                        assert row is not None, (key, cycle, n)
                        rotation.release(row['id'], True, now=now)
                        heard.append(fingerprint(row['text']))
                    assert set(heard) == hashes and len(set(heard)) == len(heard), key
                    rounds.append(heard)
                    report['starts'] += len(heard)
                if len(hashes) > 1:
                    assert rounds[0][-1] != rounds[1][0], key
                report['pools'].append(dict(category=category, lang=lang, context=context,
                                            unique_phrases=len(hashes), rounds=2, restart=True,
                                            boundary_no_repeat=len(hashes) > 1))
    report['passed'] = True
    out = ROOT / 'docs/avatar-audit/speech-rotation-verification.json'
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(dict(pools=len(report['pools']), starts=report['starts'], passed=True)))


if __name__ == '__main__':
    main()
