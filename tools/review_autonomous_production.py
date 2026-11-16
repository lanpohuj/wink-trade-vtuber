"""Review actual pilot waveforms and the staged scene, without auto-approving either."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS


def binding(bank=BANK,docs=DOCS):
    manifest=json.loads((bank/'manifest.json').read_text())
    pairs=sorted((r['id'],r['sha256']) for group in manifest['categories'].values() for r in group)
    scene=docs/'autonomous-bank-rehearsal-timeline.json'
    return dict(bank_audio_set_sha256=hashlib.sha256(json.dumps(pairs,ensure_ascii=False).encode()).hexdigest(),
                scene_timeline_sha256=hashlib.sha256(scene.read_bytes()).hexdigest() if scene.exists() else None)


def build():
    manifest=json.loads((BANK/'manifest.json').read_text())
    qc={r['id']:r for r in json.loads((DOCS/'autonomous-production-qc-v1.json').read_text())['records']}
    groups={}
    for r in [r for group in manifest['categories'].values() for r in group]:
        path=BANK/r['file']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=r['sha256']:raise ValueError('Changed audio')
        row=groups.setdefault(r['sha256'],dict(id=r['id'],ids=[],sha256=r['sha256'],text=r['text'],category=r['category'],
            duration=r['duration'],audio='../../../'+path.relative_to(ROOT).as_posix(),issues=qc[r['id']]['issues'],
            accepted=r.get('auditory_verified') is True,listened=r.get('auditory_verified') is True))
        row['ids'].append(r['id'])
    data=list(groups.values())
    page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Винки · рабочий пилот RU</title>
<style>body{margin:0;background:#121826;color:#edf0fa;font:17px system-ui}main{max-width:1000px;margin:auto;padding:24px}video,audio,textarea{width:100%}video{max-height:640px;background:#0d1420}section{background:#202a3e;border:1px solid #54627f;padding:18px;border-radius:14px;margin:16px 0}section.flag{border-color:#ddae62}p{line-height:1.5}button,select,textarea{font:inherit;color:inherit;background:#303e59;border:1px solid #71819f;border-radius:7px;padding:9px}textarea{box-sizing:border-box;margin-top:12px}label{display:block;margin:12px 0}.note{color:#bbc6da;font-size:14px}.toolbar{position:sticky;top:0;background:#121826;padding:12px 0;z-index:2;display:flex;gap:10px;flex-wrap:wrap}[hidden]{display:none!important}</style>
<main><h1>Рабочий пилот Винки · RU</h1><p>76 слотов, 68 разных текстов. Одинаковые копии направления сгруппированы. Слова уже приняты; здесь оценивается озвучка и работа в сцене. В эфир банк не включён.</p>
<video controls preload="none" src="../../../artifacts/winky-autonomous/bank-v1/winky-bank-highlights.mp4"></video><p class="note">Постановочная репетиция с настоящими MP3 и прежними движениями. Тестовые сообщения и результаты; живой генерации ответов и торговли нет. Разметка акцентов подготовлена для оценки.</p>
<label><input id="scene" type="checkbox"> Речь, движения и переходы в репетиции подходят.</label><label><input id="sampled" type="checkbox"> Принимаю подачу банка по выборочной проверке. Непрослушанные файлы не отмечаются прослушанными; технически спорные записи требуют отдельного решения.</label>
<div class="toolbar"><button id="export">Скачать оценки пилота</button><select id="filter"><option value="all">Все записи</option><option value="flag">Только спорные по проверке</option><option value="unrated">Без личной оценки</option></select></div><div id="rows"></div></main>
<script>const rows=DATA,key='winky-production-voice-v1';let state={marks:{}};try{state=JSON.parse(localStorage.getItem(key)||'{"marks":{}}')}catch(e){}state.marks??={};const save=()=>localStorage.setItem(key,JSON.stringify(state));for(const name of ['scene','sampled']){const box=document.getElementById(name);box.checked=state[name]===true;box.onchange=()=>{state[name]=box.checked;save()}}
for(const r of rows){if(!state.marks[r.sha256]&&r.accepted)state.marks[r.sha256]={accepted:true,listened:true,note:''};const card=document.createElement('section');card.dataset.sha=r.sha256;card.classList.toggle('flag',r.issues.length>0);const h=document.createElement('h2'),t=document.createElement('p'),a=document.createElement('audio'),heard=document.createElement('input'),label=document.createElement('label'),choice=document.createElement('select'),note=document.createElement('textarea');h.textContent=r.text;t.className='note';t.textContent=r.category+' · '+r.duration.toFixed(2)+' сек'+(r.ids.length>1?' · '+r.ids.length+' одинаковых слота':'')+(r.issues.length?' · Требуется проверка на слух: '+r.issues.join(', '):'');a.controls=true;a.preload='none';a.src=r.audio;heard.type='checkbox';heard.checked=state.marks[r.sha256]?.listened===true;label.append(heard,' Прослушал этот файл');heard.onchange=()=>{state.marks[r.sha256]??={};state.marks[r.sha256].listened=heard.checked;save()};for(const [value,text] of [['','Без личной оценки'],['yes','Подходит'],['no','Переделать']]){const o=document.createElement('option');o.value=value;o.textContent=text;choice.append(o)}choice.value=state.marks[r.sha256]?.accepted===true?'yes':state.marks[r.sha256]?.accepted===false?'no':'';choice.onchange=()=>{state.marks[r.sha256]??={};state.marks[r.sha256].accepted=choice.value==='yes'?true:choice.value==='no'?false:null;save()};note.rows=2;note.placeholder='Замечание к звуку или подаче';note.value=state.marks[r.sha256]?.note||'';note.oninput=()=>{state.marks[r.sha256]??={};state.marks[r.sha256].note=note.value;save()};card.append(h,t,a,label,choice,note);document.getElementById('rows').append(card)}
document.getElementById('filter').onchange=e=>{for(const c of document.querySelectorAll('section')){const r=rows.find(r=>r.sha256===c.dataset.sha);c.hidden=e.target.value==='flag'?!r.issues.length:e.target.value==='unrated'?typeof state.marks[r.sha256]?.accepted==='boolean':false}};document.addEventListener('play',e=>{for(const media of document.querySelectorAll('audio,video'))if(media!==e.target)media.pause()},true);
document.getElementById('export').onclick=()=>{const records=rows.filter(r=>typeof state.marks[r.sha256]?.accepted==='boolean').flatMap(r=>r.ids.map(id=>({id,sha256:r.sha256,accepted:state.marks[r.sha256].accepted,listened:state.marks[r.sha256].listened===true,note:state.marks[r.sha256].note||'',offset_sec:null})));const blob=new Blob([JSON.stringify({version:1,kind:'autonomous_production_voice_review_v1',created_at:new Date().toISOString(),scene_accepted:state.scene===true,sampled_bank_accepted:state.sampled===true,records},null,2)],{type:'application/json'}),link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='winky-autonomous-production-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};</script></html>'''
    bound=binding()
    page=page.replace("key='winky-production-voice-v1'",'key='+json.dumps('winky-production-voice-v1-'+bound['bank_audio_set_sha256']+'-'+str(bound['scene_timeline_sha256'])))
    page=page.replace("kind:'autonomous_production_voice_review_v1',", "kind:'autonomous_production_voice_review_v1',"+','.join(k+':'+json.dumps(v) for k,v in bound.items())+',')
    (DOCS/'autonomous-production-review.html').write_text(page.replace('DATA',json.dumps(data,ensure_ascii=False).replace('</','<\\/')))
    print(json.dumps(dict(recording_slots=76,distinct_audio=len(data),flagged=sum(bool(r['issues']) for r in data))))


if __name__=='__main__':build()
