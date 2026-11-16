"""Build a four-clip listening page. Preserve all owner-reviewed waveforms."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_direction_probe import BANK, BANK_V3, DOCS, KIND


def build(version=2):
    bank=BANK if version==2 else BANK_V3
    basename=f'autonomous-directions-v{version}'
    kind=KIND if version==2 else 'autonomous_direction_delivery_review_v3'
    manifest=json.loads((bank/'manifest.json').read_text())
    rows=sorted([r for group in manifest['categories'].values() for r in group],key=lambda r:r['id'])
    if len(rows)!=4 or not manifest.get('evaluation_only') or manifest.get('activated'):
        raise ValueError('Expected four inactive evaluation clips')
    timeline=[];at=0
    with tempfile.TemporaryDirectory() as tmp:
        wav=Path(tmp)/'directions.wav'
        with wave.open(str(wav),'wb') as audio:
            audio.setparams((1,2,44100,0,'NONE','not compressed'))
            for i,r in enumerate(rows):
                path=bank/r['file']
                if hashlib.sha256(path.read_bytes()).hexdigest()!=r['sha256']:raise ValueError('Changed audio')
                pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-ar','44100','-ac','1','pipe:1'])
                timeline.append(dict(id=r['id'],text=r['text'],sha256=r['sha256'],start=round(at,3),
                                     audio='../../../'+path.relative_to(ROOT).as_posix()))
                audio.writeframes(pcm);at+=len(pcm)/88200
                if i<3:audio.writeframes(b'\0'*88200);at+=1
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','libmp3lame','-b:a','128k',
                        str(DOCS/(basename+'.mp3'))],check=True)
    page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Винки · четыре исправленных направления</title>
<style>body{background:#121826;color:#edf0fa;font:17px system-ui;margin:0}main{max-width:850px;margin:auto;padding:28px}section{background:#202a3e;border:1px solid #596582;border-radius:14px;padding:20px;margin:16px 0}audio,textarea{width:100%;margin:12px 0}button,select,textarea{font:inherit;background:#303d58;color:inherit;border:1px solid #71809f;border-radius:8px;padding:10px}textarea{box-sizing:border-box}p{line-height:1.5}.note{color:#bdc7da;font-size:14px}</style>
<main><h1>Четыре исправленных направления</h1><p>Твои точные формулировки. Марин, отдельная бесплатная проба. Шесть ранее принятых дублей сохранены; здесь оцениваются только эти четыре. Новые пробы в эфир не включены.</p><audio controls src="autonomous-directions-v2.mp3"></audio><button id="export">Скачать оценки четырёх дублей</button><div id="rows"></div><p class="note">Технические проверки пройдены. Естественность и подачу оцениваешь ты. Бесплатные пробы служат для оценки; выпуск рабочего банка принимается отдельно.</p></main>
<script>const rows=DATA,kind=KIND;let marks={};const key='winky-directions-free-v2';try{marks=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}const save=()=>localStorage.setItem(key,JSON.stringify(marks));
for(const r of rows){const box=document.createElement('section'),h=document.createElement('h2'),a=document.createElement('audio'),heard=document.createElement('input'),label=document.createElement('label'),select=document.createElement('select'),note=document.createElement('textarea');h.textContent=r.text;a.controls=true;a.preload='none';a.src=r.audio;heard.type='checkbox';heard.checked=marks[r.id]?.listened===true;label.append(heard,' Прослушал');heard.onchange=()=>{marks[r.id]??={};marks[r.id].listened=heard.checked;save()};for(const [value,text] of [['','Не оценено'],['yes','Подходит'],['no','Доработать']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o)}select.value=marks[r.id]?.accepted===true?'yes':marks[r.id]?.accepted===false?'no':'';select.onchange=()=>{marks[r.id]??={};marks[r.id].accepted=select.value==='yes'?true:select.value==='no'?false:null;save()};note.rows=2;note.placeholder='Замечание к подаче';note.value=marks[r.id]?.note||'';note.oninput=()=>{marks[r.id]??={};marks[r.id].note=note.value;save()};box.append(h,a,label,' ',select,note);document.getElementById('rows').append(box)}document.addEventListener('play',e=>{for(const a of document.querySelectorAll('audio'))if(a!==e.target)a.pause()},true);document.getElementById('export').onclick=()=>{const records=rows.filter(r=>typeof marks[r.id]?.accepted==='boolean').map(r=>({id:r.id,sha256:r.sha256,accepted:marks[r.id].accepted,listened:marks[r.id].listened===true,note:marks[r.id].note||'',offset_sec:null}));const blob=new Blob([JSON.stringify({version:2,kind,created_at:new Date().toISOString(),records},null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='winky-autonomous-directions-v2-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};</script></html>'''
    page=page.replace('const rows=DATA,kind=KIND;', 'const rows='+json.dumps(timeline,ensure_ascii=False).replace('</','<\\/')+',kind='+json.dumps(kind)+';')
    if version==3:
        page=page.replace('autonomous-directions-v2','autonomous-directions-v3').replace('winky-directions-free-v2','winky-directions-free-v3')
        page=page.replace('Твои точные формулировки.', 'Новые дубли после замечания о посторонних звуках и интонации. Предыдущие четыре отклонены и сохранены отдельно. Твои точные формулировки.')
    (DOCS/(basename+'-review.html')).write_text(page)
    (DOCS/(basename+'-timeline.json')).write_text(json.dumps(dict(duration_sec=round(at,3),records=timeline),ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(takes=4,duration_sec=round(at,3))))


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--version',type=int,choices=(2,3),default=2)
    build(parser.parse_args().version)
