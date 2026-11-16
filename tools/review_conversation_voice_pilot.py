"""Assemble a lossless-timing listening order and an owner review page; no TTS."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import wave

from tools.conversation_voice_pilot import ROOT, DOCS, BANK, save


def build():
    manifest = json.loads((BANK / 'manifest.json').read_text())
    rows = {r['id']: r for group in manifest['categories'].values() for r in group}
    refs = json.loads((DOCS / 'delivery-references.json').read_text())['references']
    records = []
    for ref in refs:
        records.append(dict(ref, path=ROOT / ref['file'], reference=True))
    a, b = records
    order = [a, *[dict(rows[f'conversation_pilot_ru_{n:02}'], path=BANK / rows[f'conversation_pilot_ru_{n:02}']['file'], reference=False)
                  for n in (1, 2, 3, 4)], b,
             *[dict(rows[f'conversation_pilot_ru_{n:02}'], path=BANK / rows[f'conversation_pilot_ru_{n:02}']['file'], reference=False)
               for n in (5, 9, 6, 7, 10, 8)]]
    timeline = []
    position = 0
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'listening.wav'
        with wave.open(str(wav), 'wb') as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(44100)
            for i, row in enumerate(order):
                sha = hashlib.sha256(row['path'].read_bytes()).hexdigest()
                if sha != row['sha256']:
                    raise ValueError('Changed recording: ' + row['id'])
                pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(row['path']),
                                      '-f', 's16le', '-ar', '44100', '-ac', '1', 'pipe:1'],
                                     check=True, capture_output=True).stdout
                duration = len(pcm) / 88200
                timeline.append(dict(id=row['id'], text=row['text'], sha256=sha,
                                     reference=row['reference'], start=round(position, 3),
                                     end=round(position+duration, 3),
                                     file=row['path'].relative_to(ROOT).as_posix()))
                output.writeframes(pcm)
                position += duration
                if i < len(order)-1:
                    output.writeframes(b'\x00' * 88200)
                    position += 1
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-c:a', 'libmp3lame',
                        '-b:a', '128k', str(DOCS / 'voice-pilot-listening.mp3')], check=True)
    save(DOCS / 'voice-pilot-timeline.json', dict(records=timeline, gap_sec=1,
                                               duration_sec=round(position, 3)))
    lines = ['# Прослушивание малой пробы', '',
             'Два эталона и десять новых дублей. Между записями одна секунда тишины. '
             'Новые дубли ещё не приняты по подаче и не подключены к эфиру.', '',
             '| Начало | Запись | Текст |', '|---|---|---|']
    for row in timeline:
        start = int(row['start'])
        label = 'Эталон' if row['reference'] else row['id'].rsplit('_', 1)[1]
        lines.append(f"| {start//60}:{start%60:02} | {label} | {row['text']} |")
    (DOCS / 'voice-pilot-listening.md').write_text('\n'.join(lines)+'\n')
    page = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Винки — голосовая проба</title><style>body{font:17px system-ui;background:#121622;color:#eff2ff;margin:0}main{max-width:900px;margin:auto;padding:24px}h1{font-size:28px}p{line-height:1.5}.row{padding:18px;margin:16px 0;background:#232b3e;border:1px solid #48546d;border-radius:12px}.ref{border-color:#ac93df}.text{font-size:20px;line-height:1.5}button,select,textarea,input{font:inherit;background:#303b54;color:#fff;border:1px solid #687995;border-radius:7px;padding:8px}button{cursor:pointer}textarea{width:100%;box-sizing:border-box;margin-top:8px}audio{display:block;width:100%;margin:12px 0}.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.note{color:#b9c5df;font-size:14px}#export{position:sticky;top:10px;background:#6643ac}label{display:inline-flex;gap:6px;align-items:center}</style><main><h1>Винки: голосовая проба</h1><p>Оцениваем подачу на уже принятых текстах. Дубли 05 и 09 — одни слова с разной подачей; такая же пара — 07 и 10. Эталоны отмечены отдельно.</p><audio controls preload="none" src="voice-pilot-listening.mp3"></audio><p class="note">Можно прослушать всю подборку или отдельные записи ниже. После прослушивания отметьте, какие дубли подходят. Для проблемного места можно указать секунду внутри отдельного файла и комментарий.</p><button id="export">Скачать оценки</button><div id="rows"></div></main><script>const rows=DATA;let marks={};const key='winky-voice-pilot-v1';try{marks=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}function persist(){localStorage.setItem(key,JSON.stringify(marks))}for(const r of rows){let box=document.createElement('section');box.className='row'+(r.reference?' ref':'');let h=document.createElement('h2');h.textContent=(r.reference?'Эталон':'Дубль '+r.id.split('_').pop())+' · '+Math.floor(r.start/60)+':'+String(Math.floor(r.start%60)).padStart(2,'0');let t=document.createElement('div');t.className='text';t.textContent=r.text;let audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src='../../../'+r.file;box.append(h,t,audio);if(!r.reference){let controls=document.createElement('div');controls.className='controls';let choice=document.createElement('select');for(const [v,label]of [['','Не оценено'],['accept','Подача подходит'],['reject','Подача не подходит']]){let o=document.createElement('option');o.value=v;o.textContent=label;choice.append(o)}choice.value=marks[r.id]?.choice||'';choice.onchange=()=>{marks[r.id]??={};marks[r.id].choice=choice.value;persist()};let label=document.createElement('label');let heard=document.createElement('input');heard.type='checkbox';heard.checked=marks[r.id]?.listened||false;heard.onchange=()=>{marks[r.id]??={};marks[r.id].listened=heard.checked;persist()};label.append(heard,document.createTextNode('Прослушал(а)'));let offset=document.createElement('input');offset.type='number';offset.min=0;offset.step=.1;offset.placeholder='Секунда дефекта';offset.value=marks[r.id]?.offset??'';offset.oninput=()=>{marks[r.id]??={};marks[r.id].offset=offset.value;persist()};controls.append(choice,label,offset);let note=document.createElement('textarea');note.placeholder='Интонация, хрип, обрыв или что именно понравилось';note.value=marks[r.id]?.note||'';note.oninput=()=>{marks[r.id]??={};marks[r.id].note=note.value;persist()};box.append(controls,note)}document.getElementById('rows').append(box)}document.getElementById('export').onclick=()=>{let records=[];for(const r of rows){let m=marks[r.id];if(r.reference||!m?.choice)continue;if(!m.listened){alert('Отметьте прослушивание оценённых записей');return}records.push({id:r.id,sha256:r.sha256,accepted:m.choice==='accept',listened:true,note:m.note||'',offset_sec:m.offset===''||m.offset==null?null:Number(m.offset)})}let blob=new Blob([JSON.stringify({version:1,kind:'voice_pilot_delivery_review',created_at:new Date().toISOString(),records},null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='winky-voice-pilot-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};</script></html>'''
    page = page.replace('DATA', json.dumps(timeline, ensure_ascii=False).replace('</', '<\\/'))
    (DOCS / 'voice-pilot-review.html').write_text(page)
    print(json.dumps(dict(new_takes=len(rows), reference_clips=2,
                          listening_duration_sec=round(position, 3))))


if __name__ == '__main__':
    build()
