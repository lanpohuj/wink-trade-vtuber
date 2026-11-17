"""Release only the reviewed pilot that passed the matching two-hour queue check."""
import hashlib
import json
from pathlib import Path
from datetime import datetime,timezone
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS
from winky.editorial import approved
from winky.voice_bank import recording_reviewed
from tools.rehearse_autonomous_queue import RUNTIME_FILES

POINTER=ROOT/'assets/voices/commentary-bank.json'
RECEIPT=DOCS/'autonomous-pilot-release-v1.json'


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def atomic(path,value):
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temp.replace(path)


def validate(bank,docs):
    path=bank/'manifest.json';manifest=json.loads(path.read_text())
    proof=json.loads((docs/'autonomous-two-hour-queue-verification.json').read_text())
    if (not proof.get('passed') or proof.get('duration_sec',0)<7200 or not proof.get('real_queue')
            or proof.get('remaining_speech_queue')!=0 or proof.get('max_concurrent_voices')!=1):
        raise ValueError('The complete two-hour queue verification is required')
    if proof.get('bank_manifest_sha256')!=sha(path):raise ValueError('Bank changed after the queue rehearsal')
    if set(proof.get('runtime_sources',{}))!=set(RUNTIME_FILES):raise ValueError('Incomplete runtime source binding')
    for name,digest in proof.get('runtime_sources',{}).items():
        if sha(ROOT/name)!=digest:raise ValueError('Runtime changed after the queue rehearsal: '+name)
    if manifest.get('evaluation_only') or not manifest.get('review_accepted') or not manifest.get('scene_review_accepted'):
        raise ValueError('Owner scene and delivery acceptance required')
    rows=[r for group in manifest['categories'].values() for r in group]
    if len(rows)!=76:raise ValueError('Unexpected pilot composition')
    ready=[r for r in rows if r.get('status')=='ready']
    for row in ready:
        media=(bank/row['file']).resolve()
        if not media.is_relative_to(bank.resolve()) or sha(media)!=row['sha256']:raise ValueError('Changed audio')
        if not approved(row['text']) or not recording_reviewed(manifest,row):raise ValueError('Unreviewed voice or text')
        if not row.get('automatic_qc_passed') and not (row.get('auditory_verified') and row.get('qc_override_accepted')):
            raise ValueError('Unresolved audio QC')
        performance=row.get('performance',{})
        if not performance.get('review_accepted') or performance.get('audio_sha256')!=row['sha256']:
            raise ValueError('Unreviewed timing or changed waveform')
    categories={r['category'] for r in ready}
    expected={'TRADE_WIN','TRADE_LOSS','TRADE_REFUND','OPEN_TRADE_CALL','OPEN_TRADE_PUT',
              'NARRATE_SCAN','NARRATE_MOMENT','NARRATE_CTA','CHAT_REACTION','CHAT_REPLY'}
    if not expected<=categories:raise ValueError('Required pilot roles missing')
    if not {'gift','follow','like'}<={r.get('conditions',{}).get('chat_kind') for r in ready if r['category']=='CHAT_REACTION'}:
        raise ValueError('Missing real social event coverage')
    return manifest,proof,ready


def release():
    current=json.loads(POINTER.read_text());manifest_path=BANK/'manifest.json'
    if RECEIPT.exists():
        receipt=json.loads(RECEIPT.read_text())
        if current.get('path')=='autonomous_v1' and receipt.get('active_manifest_sha256')==sha(manifest_path):
            return dict(already_active=True,ready=receipt['ready'],held=receipt['held'])
    manifest,proof,ready=validate(BANK,DOCS)
    before=sha(manifest_path)
    manifest.update(activated=True,release_scope='owner_reviewed_ru_pilot',active_count=len(ready),
                    held_count=sum(r.get('status')!='ready' for group in manifest['categories'].values() for r in group))
    atomic(manifest_path,manifest)
    receipt=dict(version=1,released_at=datetime.now(timezone.utc).isoformat(),previous_pointer=current,
                 previous_pointer_sha256=sha(POINTER),source_manifest_sha256=before,active_manifest_sha256=sha(manifest_path),
                 queue_proof_sha256=sha(DOCS/'autonomous-two-hour-queue-verification.json'),
                 ready=len(ready),held=manifest['held_count'],native_two_hour_playback=False,
                 live_pocket_verified=False,live_tiktok_verified=False)
    atomic(RECEIPT,receipt)
    atomic(POINTER,dict(version=1,path='autonomous_v1',release='owner_reviewed_ru_pilot',acceptance='owner_sampled_scene'))
    return dict(activated=True,ready=len(ready),held=manifest['held_count'],previous_bank=current.get('path'))


if __name__=='__main__':print(json.dumps(release()))
