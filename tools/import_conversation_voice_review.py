"""Import hash-bound owner listening decisions without activating the pilot."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from tools.conversation_voice_pilot import BANK, DOCS, save


def import_review(path, bank=BANK, docs=DOCS):
    review = json.loads(path.read_text())
    if review.get('kind') != 'voice_pilot_delivery_review':
        raise ValueError('Not a pilot listening review')
    manifest = json.loads((bank / 'manifest.json').read_text())
    rows = {r['id']: r for group in manifest['categories'].values() for r in group}
    seen = set()
    decisions = []
    # Validate the entire export before changing a single record.
    for decision in review['records']:
        identity = decision['id']
        if identity in seen or identity not in rows:
            raise ValueError('Duplicate or unknown recording: ' + identity)
        seen.add(identity)
        row = rows[identity]
        media = (bank / row['file']).resolve()
        if not media.is_relative_to(bank.resolve()) or not media.is_file():
            raise ValueError('Recording unavailable: ' + identity)
        sha = hashlib.sha256(media.read_bytes()).hexdigest()
        if decision.get('sha256') != sha or row.get('sha256') != sha:
            raise ValueError('Recording changed since listening: ' + identity)
        if decision.get('listened') is not True or type(decision.get('accepted')) is not bool:
            raise ValueError('Explicit listening and a verdict are required: ' + identity)
        offset = decision.get('offset_sec')
        if offset is not None and (not isinstance(offset, (int, float)) or not math.isfinite(offset) or offset < 0):
            raise ValueError('Invalid audio offset')
        decisions.append((row, decision))
    for row, decision in decisions:
        accepted = decision['accepted']
        row.update(owner_listened=True, review_accepted=accepted,
                   auditory_verified=accepted, requires_listening=False,
                   review_method='owner_per_recording',
                   review_basis='owner_listened_sha256',
                   owner_review_note=str(decision.get('note') or ''),
                   status='ready' if accepted else 'rejected_delivery')
    manifest.update(activated=False, delivery_approved_for_expansion=False)
    accepted = sum(r.get('review_accepted') is True for r in rows.values())
    rejected = sum(r.get('status') == 'rejected_delivery' for r in rows.values())
    save(docs / 'owner-voice-pilot-review.json', review)
    save(bank / 'manifest.json', manifest)
    return dict(accepted=accepted, rejected=rejected, activated=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('review', type=Path)
    args = parser.parse_args()
    print(json.dumps(import_review(args.review)))
