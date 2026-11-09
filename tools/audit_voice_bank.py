"""Reproducible audio measurements; never substitutes for listening approval."""
from __future__ import annotations
import argparse, array, difflib, hashlib, json, math, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def normalize(text):
    return re.sub(r'[^a-zа-я0-9]', '', text.lower().replace('ё','е'))

def measure(path):
    run = subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ar','16000','-ac','1','pipe:1'],capture_output=True)
    if run.returncode:
        return {'decode_ok':False}
    samples = array.array('f',run.stdout)
    if not samples:
        return {'decode_ok':False}
    n=len(samples); chunks=[math.sqrt(sum(x*x for x in samples[i:i+320])/len(samples[i:i+320])) for i in range(0,n,320)]
    audible=[i for i,r in enumerate(chunks) if r>0.008]
    return {'decode_ok':True,'duration':round(n/16000,3),'rms':round(math.sqrt(sum(x*x for x in samples)/n),5),
        'peak':round(max(abs(x) for x in samples),5),'clipped_fraction':round(sum(abs(x)>=0.999 for x in samples)/n,7),
        'leading_silence':round((audible[0]*.02) if audible else n/16000,3),
        'trailing_silence':round(max(0,n/16000-(audible[-1]+1)*.02) if audible else n/16000,3),
        'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

def audit(transcript_path, output):
    manifest=json.loads((ROOT/'assets/voices/lumean/manifest.json').read_text())
    transcripts={r['file']:r['segments'] for r in json.loads(transcript_path.read_text())} if transcript_path else {}
    rows=[]
    for category,items in manifest['categories'].items():
        for item in items:
            row=dict(item,category=category,language=item.get('lang','ru'),listening_verified=False)
            path=ROOT/'assets/voices/lumean'/item['file']
            row['review_notes']=[]
            if not path.exists():
                row.update(decision='missing',reason='File absent before voice repair',metrics={})
            else:
                metrics=measure(path); row['metrics']=metrics
                segments=transcripts.get(item['file'],[]); row['asr_segments']=segments
                transcript=' '.join(s['text'].strip() for s in segments);row['transcript']=transcript
                similarity=difflib.SequenceMatcher(None,normalize(item['text']),normalize(transcript)).ratio()
                row['text_similarity']=round(similarity,3)
                row.update(decision='review',reason='Listening approval pending; ASR and signal metrics are supporting evidence only')
                if not metrics['decode_ok']:
                    row.update(decision='replace',reason='Audio decoding failed')
                if similarity<.90:
                    row['review_notes'].append({'at':segments[0]['start'] if segments else None,'issue':'ASR differs from script; check pronunciation by listening'})
                if metrics.get('duration',0)>5:
                    row['review_notes'].append({'at':5,'issue':'Longer than preferred live commentary window; restrict to a suitable gap'})
                if metrics.get('clipped_fraction',0)>.001:
                    row['review_notes'].append({'at':None,'issue':'Possible clipping; listening required'})
            rows.append(row)
    output.write_text(json.dumps({'schema_version':1,'auditory_review_complete':False,'records':rows},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'records':len(rows),'missing':sum(r['decision']=='missing' for r in rows),'decoded':sum(r['metrics'].get('decode_ok',False) for r in rows),'listening_verified':0}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--transcripts',type=Path);parser.add_argument('--output',type=Path,default=ROOT/'docs/voice-audit/existing-recordings.json')
    args=parser.parse_args();audit(args.transcripts,args.output)
