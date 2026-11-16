"""One comparison album and hash-bound listening page; existing references remain intact."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import wave

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from tools.autonomous_voice_probe import FREE_BANK as BANK, DOCS


def build():
    manifest=json.loads((BANK/'manifest.json').read_text())
    rows={r['source_probe_id'].rsplit('_',1)[1]:r for group in manifest['categories'].values() for r in group}
    if len(rows)!=8 or not manifest.get('evaluation_only') or manifest.get('activated'):
        raise ValueError('Expected the inactive eight-recording evaluation probe')
    primary=json.loads((DOCS/'delivery-references.json').read_text())['references']
    legacy=json.loads((DOCS/'legacy-delivery-references.json').read_text())['references']
    refs={r['id']:r for r in primary+legacy}
    qc_path=DOCS/'autonomous-voice-probe-free-qc.json'
    qc={r['id']:r for r in json.loads(qc_path.read_text())['records']} if qc_path.exists() else {}
    labels={'01':'Победа','02':'Проигрыш','03':'Возврат','04':'Вверх','05':'Вниз','06':'Поиск','07':'Приветствие','08':'Бот'}
    def sample(n):
        row=rows[n];return {**row,'path':BANK/row['file'],'reference':False,'label':labels[n]}
    def ref(identity,label):
        row=refs[identity];return {**row,'path':ROOT/row['file'],'reference':True,'label':label}
    order=[ref('legacy_panel_greeting_1','Пульт · приветствие'),sample('07'),
           ref('streamer2_ru_narrate_scan_01','Выбранный образец · поиск'),sample('06'),
           ref('legacy_panel_trade_win_1','Пульт · победа'),sample('01'),sample('02'),sample('03'),
           sample('04'),sample('05'),sample('08'),
           ref('lively3_ru_narrate_engage_009','Выбранный образец · разговорная подача')]
    timeline=[];position=0
    with tempfile.TemporaryDirectory() as tmp:
        wav=Path(tmp)/'listening.wav'
        with wave.open(str(wav),'wb') as output:
            output.setparams((1,2,44100,0,'NONE','not compressed'))
            for i,row in enumerate(order):
                digest=hashlib.sha256(row['path'].read_bytes()).hexdigest()
                if digest!=row['sha256']:raise ValueError('Changed source audio: '+row['id'])
                pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(row['path']),'-f','s16le','-ar','44100','-ac','1','pipe:1'])
                duration=len(pcm)/88200
                timeline.append(dict(id=row['id'],label=row['label'],number=row.get('source_probe_id',row['id']).rsplit('_',1)[1],text=re.sub(r'^\[[^]]+\]\s*','',row['text']),
                                     sha256=digest,reference=row['reference'],start=round(position,3),end=round(position+duration,3),
                                     file=row['path'].relative_to(ROOT).as_posix(),issues=qc.get(row['id'],{}).get('issues',[]),
                                     transcript=qc.get(row['id'],{}).get('transcript','')))
                output.writeframes(pcm);position+=duration
                if i<len(order)-1:output.writeframes(b'\0'*88200);position+=1
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','libmp3lame','-b:a','128k',str(DOCS/'autonomous-voice-probe-listening.mp3')],check=True)
    data=dict(records=timeline,gap_sec=1,duration_sec=round(position,3),evaluation_only=True)
    (DOCS/'autonomous-voice-probe-timeline.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    lines=['# Голосовая проба Винки: восемь новых дублей и четыре ориентира','',
           'Принятые тексты, Марин, S2.1 Pro Free. Только для оценки, без включения в эфир. Платных TTS-запросов нет. Четыре старые записи служат ориентирами подачи. Между записями одна секунда тишины.','',
           '| Начало | Запись | Текст |','|---|---|---|']
    for row in timeline:
        start=int(row['start']);lines.append(f"| {start//60}:{start%60:02} | {'Ориентир' if row['reference'] else 'Проба '+row['number']} · {row['label']} | {row['text']} |")
    (DOCS/'autonomous-voice-probe-listening.md').write_text('\n'.join(lines)+'\n')
    page=(DOCS/'voice-pilot-review.html').read_text()
    start=page.index('<main>');end=page.index('</main>')+len('</main>')
    main='''<main><h1>Винки: восемь новых голосовых проб</h1><p>Тексты уже приняты. Оцениваем подачу рядом со старыми записями пульта и выбранными образцами. Голос Марин, та же S2.1 Pro в бесплатном режиме для оценки. Новые файлы в эфир не включены.</p><audio controls preload="none" src="autonomous-voice-probe-listening.mp3"></audio><p class="note">В общей подборке восемь новых дублей и четыре старых ориентира; между ними секунда тишины. Можно прослушать каждый файл отдельно. Автоматические проверки не заменяют твою оценку естественности и характера.</p><button id="export">Скачать оценки голоса</button><div id="rows"></div></main>'''
    page=page[:start]+main+page[end:]
    start=page.index('const rows=');end=page.index(';let marks',start)
    page=page[:start]+'const rows='+json.dumps(timeline,ensure_ascii=False).replace('</','<\\/')+page[end:]
    page=page.replace("'winky-voice-pilot-v1'","'winky-autonomous-voice-free-v1'")
    page=page.replace("(r.reference?'Эталон':'Дубль '+r.id.split('_').pop())", "(r.reference?'Ориентир · '+r.label:'Проба '+r.number+' · '+r.label)")
    page=page.replace("kind:'voice_pilot_delivery_review'","kind:'autonomous_voice_probe_delivery_review'")
    page=page.replace("'winky-voice-pilot-review.json'","'winky-autonomous-voice-review.json'")
    page=page.replace('box.append(h,t,audio);if(!r.reference)',"box.append(h,t,audio);if(r.issues?.length){let n=document.createElement('p');n.className='note';n.textContent='Распознавание неуверенно: «'+r.transcript+'». Проверь на слух, нет ли лишних или пропущенных слов.';box.append(n)}if(!r.reference)")
    page=page.replace('</script>',"document.addEventListener('play',e=>{for(const a of document.querySelectorAll('audio'))if(a!==e.target)a.pause()},true);</script>")
    (DOCS/'autonomous-voice-probe-review.html').write_text(page)
    print(json.dumps(dict(new_takes=8,references=4,duration_sec=round(position,3),new_paid_cost_usd=0)))


if __name__=='__main__':build()
