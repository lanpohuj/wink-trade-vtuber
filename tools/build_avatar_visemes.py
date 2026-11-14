"""Offline, hash-bound mouth timing from accepted MP3s. No TTS calls."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parent.parent


def build(ids, executable):
    bank=ROOT/'assets/voices/lively_v3'
    rows={r['id']:r for g in json.loads((bank/'manifest.json').read_text())['categories'].values() for r in g}
    cache=ROOT/'voice_cache/avatar-visemes';cache.mkdir(parents=True,exist_ok=True)
    records={}
    for identity in ids:
        row=rows[identity];audio=bank/row['file'];sha=hashlib.sha256(audio.read_bytes()).hexdigest()
        recognizer='phonetic' if row['lang']=='ru' else 'pocketSphinx'
        result=cache/(sha+'-'+recognizer+'.json')
        if not result.exists():
            wave=cache/(sha+'.wav');text=cache/(sha+'.txt')
            text.write_text(row['text'])
            subprocess.run(['ffmpeg','-v','error','-i',str(audio),'-ar','16000','-ac','1','-c:a','pcm_s16le','-y',str(wave)],check=True)
            subprocess.run([str(executable),'-r',recognizer,'-f','json','--extendedShapes','X','-d',str(text),'-o',str(result),str(wave)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        data=json.loads(result.read_text())
        cues=data['mouthCues'];assert cues and all(c['end']>=c['start'] for c in cues)
        records[identity]=dict(sha256=sha,duration=data['metadata']['duration'],mouthCues=cues,recognizer=recognizer,visual_acceptance='pending')
        print(identity,len(cues),'mouth cues',flush=True)
    output=ROOT/'winky/web/avatar-viseme-probes.json'
    output.write_text(json.dumps(dict(version=1,records=records),ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--id',action='append',required=True);p.add_argument('--rhubarb',type=Path,required=True);a=p.parse_args();build(a.id,a.rhubarb)
