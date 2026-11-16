"""Apply a text review to its exact catalog; unmarked approval needs an explicit CLI flag."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from tools.import_winky_editorial import import_review
from winky.speech_rotation import fingerprint

DOCS=ROOT/'docs/voice-audit/conversation-v1'


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def merge_reviews(previous,incoming):
    """An omitted earlier rejection stays rejected; an explicit newer verdict wins."""
    merged={r['id']:r for r in previous.get('items',[])}
    for row in incoming['items']:
        merged.pop(row['id'],None);merged[row['id']]=row
    return {**incoming,'items':list(merged.values())}


def resolve(catalog,review,*,approve_unmarked=False):
    if review.get('kind')!='autonomous_bank_text_review':
        raise ValueError('Not an autonomous text review')
    rows=catalog['records'];by_id={r['id']:r for r in rows}
    if len(by_id)!=len(rows):
        raise ValueError('Duplicate catalog IDs')
    for row in rows:
        if row['text_sha256']!=sha(row['text']):
            raise ValueError('Changed catalog text: '+row['id'])
    explicit={};seen=set()
    for decision in review['items']:
        identity=decision['id']
        if identity not in by_id or identity in seen:
            raise ValueError('Unknown or duplicate reviewed ID: '+identity)
        seen.add(identity);row=by_id[identity]
        if (decision.get('text')!=row['text'] or decision.get('text_sha256')!=row['text_sha256']
                or decision.get('category')!=row['category']):
            raise ValueError('Review refers to another text: '+identity)
        if decision.get('status') not in ('good','ref','bad','change'):
            raise ValueError('Unsupported review verdict')
        # Text-only review of identical direction words applies to all their takes.
        explicit[fingerprint(row['text'])]=decision
    accepted=[];removed=[];effective=[];unreviewed=[]
    for original in rows:
        row=dict(original);decision=explicit.get(fingerprint(row['text']))
        status=decision['status'] if decision else 'good' if approve_unmarked else None
        if status is None:
            unreviewed.append(row);continue
        source='explicit_export' if decision else 'explicit_owner_instruction_approve_unmarked'
        effective.append(dict(id=row['id'],text=row['text'],text_sha256=row['text_sha256'],category=row['category'],
                              status=status,comment=decision.get('comment','') if decision else '',decision_source=source))
        row.update(text_review_accepted=status in ('good','ref'),owner_text_decision_source=source)
        if row['text_review_accepted']:
            row['status']='text_approved';accepted.append(row)
        else:
            row['status']='rejected_text';removed.append(row)
    signature=sha(json.dumps([(r['id'],r['text_sha256'],r['category']) for r in rows],ensure_ascii=False))
    return dict(version=1,status='texts_approved_audio_pending',activated=False,paid_generation_authorized=False,
                lang=catalog.get('lang','ru'),reviewed_text_set_sha256=signature,
                records=accepted,removed_records=removed,unreviewed_records=unreviewed,
                effective_decisions=effective,counts=dict(accepted=len(accepted),removed=len(removed),unreviewed=len(unreviewed)),
                note='Тексты приняты. Приёмка озвучки и поведения в сцене выполняется отдельно.')


def apply(path,destination=DOCS,*,approve_unmarked=False):
    source_path=destination/'autonomous-bank-ru-80.json'
    catalog=json.loads(source_path.read_text());incoming=json.loads(path.read_text())
    resolve(catalog,incoming,approve_unmarked=False)  # Reject stale/duplicate exports before merging.
    previous_path=destination/'owner-autonomous-bank-review.json'
    review=merge_reviews(json.loads(previous_path.read_text()),incoming) if previous_path.exists() else incoming
    result=resolve(catalog,review,approve_unmarked=approve_unmarked)
    decision=dict(version=1,approve_unmarked=approve_unmarked,
                  instruction='Неоценённые фразы оставить; отмеченные четыре убрать без замены.' if approve_unmarked else 'Apply only explicit export verdicts.',
                  source_catalog_sha256=hashlib.sha256(source_path.read_bytes()).hexdigest(),
                  reviewed_text_set_sha256=result['reviewed_text_set_sha256'],
                  review_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                  recorded_at=datetime.now(timezone.utc).isoformat())
    destination.mkdir(parents=True,exist_ok=True)
    def save(name,value):
        (destination/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    save('owner-autonomous-bank-review.json',review)
    save('owner-autonomous-bank-latest-export.json',incoming)
    save('owner-autonomous-bank-decision.json',decision)
    expanded=dict(version=1,created_at=review['created_at'],items=result['effective_decisions'])
    save('owner-autonomous-bank-review-expanded.json',expanded)
    import_review(destination/'owner-autonomous-bank-review-expanded.json',destination,supplement=True)
    save('autonomous-bank-ru-approved.json',result)
    return result['counts']


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('review',type=Path)
    parser.add_argument('--approve-unmarked',action='store_true',help='Only when explicitly instructed by the owner in the conversation')
    args=parser.parse_args()
    print(json.dumps(apply(args.review,approve_unmarked=args.approve_unmarked),ensure_ascii=False))
