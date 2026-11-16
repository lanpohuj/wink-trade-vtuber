"""Apply sampled scene/audio acceptance without fabricating personal listening or activating."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS
from tools.import_conversation_voice_review import import_review
from tools.autonomous_voice_probe import save
from tools.review_autonomous_production import binding


def apply(path,bank=BANK,docs=DOCS):
    review=json.loads(path.read_text())
    before=json.loads((bank/'manifest.json').read_text())
    if review.get('sampled_bank_accepted') is True or review.get('scene_accepted') is True:
        expected=binding(bank,docs)
        if any(review.get(k)!=v for k,v in expected.items()):raise ValueError('Review refers to another bank or scene')
        if review.get('scene_accepted') is True and expected['scene_timeline_sha256'] is None:
            raise ValueError('No reviewable scene')
        for row in [r for group in before['categories'].values() for r in group]:
            media=(bank/row['file']).resolve()
            if not media.is_relative_to(bank.resolve()) or hashlib.sha256(media.read_bytes()).hexdigest()!=row['sha256']:
                raise ValueError('A bank waveform changed before sampled acceptance')
            if review.get('scene_accepted') is True and row.get('performance',{}).get('audio_sha256')!=row['sha256']:
                raise ValueError('Performance waveform changed')
    result=import_review(path,bank=bank,docs=docs,kind='autonomous_production_voice_review_v1',
                         review_filename='owner-autonomous-production-review.json')
    manifest=json.loads((bank/'manifest.json').read_text())
    rows=[r for group in manifest['categories'].values() for r in group]
    # Sampled acceptance cannot override a failed technical check or an explicit rejection.
    if review.get('sampled_bank_accepted') is True:
        for row in rows:
            if row.get('status')=='rejected_delivery':continue
            if not row.get('automatic_qc_passed'):
                if row.get('auditory_verified') and row.get('review_accepted'):row['qc_override_accepted']=True
                continue
            if not row.get('auditory_verified'):
                row.update(status='ready',review_accepted=True,review_method='owner_sampled',
                           review_basis='owner_sampled_production_scene',auditory_verified=False)
        manifest.update(review_method='owner_sampled',review_accepted=True)
    if review.get('scene_accepted') is True:
        for row in rows:
            if row.get('status')!='ready':continue
            performance=row.get('performance')
            if not performance:continue
            if hashlib.sha256((bank/row['file']).read_bytes()).hexdigest()!=performance['audio_sha256']:
                raise ValueError('Performance waveform changed')
            performance.update(review_accepted=True,review_scope='owner_sampled_scene')
        manifest['scene_review_accepted']=True
    manifest['activated']=False
    save(bank/'manifest.json',manifest)
    return dict(ready=sum(r.get('status')=='ready' for r in rows),
                pending=sum(r.get('status')=='review_pending' for r in rows),activated=False,
                scene_accepted=manifest.get('scene_review_accepted') is True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('review',type=Path)
    print(json.dumps(apply(parser.parse_args().review)))
