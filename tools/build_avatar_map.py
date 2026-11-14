"""Build a complete ID-bound animation sidecar without changing accepted voice banks."""
import hashlib
import json
from pathlib import Path
from winky.avatar_performance import describe


def build():
    root=Path(__file__).resolve().parent.parent
    voices=root/'assets/voices'; bank=voices/json.loads((voices/'commentary-bank.json').read_text())['path']
    manifest_path=bank/'manifest.json'; manifest=json.loads(manifest_path.read_text())
    records={}
    for group in manifest['categories'].values():
        for row in group:
            annotation=describe(row['text'],row['category'],row.get('conditions'),row.get('tone',''))
            qc=bank/row['file']; qc=qc.with_suffix('.qc.json')
            report=json.loads(qc.read_text()) if qc.exists() else {}
            segments=report.get('segments',[])
            # Use sentence starts from existing ASR; body gestures follow these cues and RMS.
            offsets=[round(max(.15,float(s['start'])),3) for s in segments if str(s.get('text','')).strip()]
            annotation.update(cue_offsets=offsets or [.25],text_sha256=hashlib.sha256(row['text'].encode()).hexdigest())
            records[row.get('phrase_id',row['id'])]=annotation
    assert len(records)==1500
    out=root/'winky/web/avatar-phrases.json'
    out.write_text(json.dumps(dict(version=1,bank=bank.name,manifest_sha256=hashlib.sha256(manifest_path.read_bytes()).hexdigest(),records=records),ensure_ascii=False,indent=2)+'\n')
    print('Mapped',len(records),'recordings')


if __name__=='__main__':build()
