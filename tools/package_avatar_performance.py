"""Copy an explicitly reviewed lab snapshot into the local avatar adapter."""
import hashlib
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'experiments/winky_avatar'
OUT=ROOT/'winky/web/performance'

def main():
    source=(LAB/'candidate.mjs').read_text()
    source=source.replace('const director = new Director();', 'export function installPerformance(controller) {\nconst director = new Director();',1)
    source=source.replace('const controller = window.vtuber;\n','',1)
    source=source[:source.index("window.addEventListener('message',e=>{")]
    source=source.replace('window.avatarLabState', 'window.avatarPerformanceState').replace('winkyLabHeart','winkyPerformanceHeart').replace('winky-lab-heart','winky-performance-heart')
    source+='return {receive,director,get state(){return window.avatarPerformanceState;}};\n}\n'
    source='// Reviewed visual result reactions, close framing and contextual idle.\n'+source
    (OUT/'controller.mjs').write_text(source)
    for name in ['policy','sync-event','motion-tracks','extra-motions','framing','idle','celebration','victory-motions']:
        (OUT/(name+'.mjs')).write_bytes((LAB/(name+'.mjs')).read_bytes())
    release=json.loads((OUT/'release.json').read_text())
    release['source_revision']=subprocess.check_output(['git','rev-parse','--short','HEAD'],cwd=ROOT,text=True).strip()
    release.update(feature_revision='trade-celebration-v1',notes='Five-motion result bag; immediate read-only WIN reaction independent of audio, with protected portrait.')
    release['files']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.glob('*.mjs'))}
    (OUT/'release.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')
    print('Packaged',len(release['files']),'reviewed modules')
if __name__=='__main__':main()
