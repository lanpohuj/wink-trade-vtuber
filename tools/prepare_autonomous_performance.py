"""Draft waveform-bound beats using only restored gestures; never approves a scene."""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS
from tools.autonomous_voice_probe import save

SAFE={'nod','tilt','ponder','wave','joy','hand_heart','explain_right','listen'}


def beats(row):
    duration=row['duration'];gesture=row.get('gesture','nod')
    if gesture not in SAFE:raise ValueError('Unknown restored gesture')
    if duration<2.6 and gesture in ('wave','hand_heart','ponder','joy','explain_right'):gesture='nod'
    length=min(3.2,duration-.25)
    if length<.6:return []
    result=[dict(start=.1,duration=round(length,3),gesture=gesture)]
    if duration>=6.5:result.append(dict(start=4.2,duration=round(min(2,duration-4.4),3),gesture='nod'))
    return result


def prepare():
    path=BANK/'manifest.json';manifest=json.loads(path.read_text())
    if manifest.get('activated'):raise ValueError('Do not rewrite an active performance plan')
    plan=[]
    for row in [r for group in manifest['categories'].values() for r in group]:
        if row.get('performance',{}).get('review_accepted') is True:
            if row['performance']['audio_sha256']!=row['sha256']:raise ValueError('Changed accepted timing')
            continue
        performance=dict(review_accepted=False,audio_sha256=row['sha256'],beats=beats(row),
                         review_scope='draft_for_staged_rehearsal',physical_motion_source='restored_existing_set')
        row['performance']=performance
        plan.append(dict(id=row['id'],sha256=row['sha256'],duration=row['duration'],performance=performance,
                         automatic_qc_passed=row.get('automatic_qc_passed') is True))
    save(path,manifest)
    save(DOCS/'autonomous-performance-draft-v1.json',dict(version=1,scene_review_accepted=False,new_physical_motions=False,records=plan))
    print(json.dumps(dict(records=len(plan),accepted=False,new_physical_motions=False)))


if __name__=='__main__':prepare()
