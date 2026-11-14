import {LABELS, profileFor,performancePlan} from './policy.mjs';
const $ = id => document.getElementById(id), audio = $('audio');
const library = await (await fetch('/library.json')).json();
const catalog=await(await fetch('/sync-catalog.json')).json();
let context, analyser, samples, event, ready = new Set(), serial = 0, selected, sessionStarted = false, lastTemplate;
let visualStart=0,visualDuration=0,tailShown=false;
const post = m => ['baseline', 'candidate'].forEach(id => $(id).contentWindow.postMessage({scope:'winky-avatar-lab', ...m}, location.origin));
const option = (value, text) => {const o = document.createElement('option'); o.value=value;o.textContent=text;return o;};
for(const [id,label] of Object.entries(LABELS)) $('gesture').append(option(id,label));
for(const name of ['wave','dance','cheer','shy','flirt_kiss','neko_paws','hip_groove','peek_closer']) {
  const labels={wave:'Приветствие',dance:'Танец с руками · разбор',cheer:'Руки вверх · разбор',shy:'Смущение',flirt_kiss:'Воздушный поцелуй',neko_paws:'Кулачки у лица',hip_groove:'Качание бёдрами',peek_closer:'Любопытство'};
  const b=document.createElement('button');b.textContent=labels[name];b.onclick=()=>{stop();post({type:'legacy',action:name});};$('legacy').append(b);
}
for(const name of ['shy','quiet_laugh','ponder','playful_doubt','hand_heart']){
  const button=document.createElement('button');button.textContent=LABELS[name];
  button.onclick=()=>{
    stop();
    $('baseline').contentWindow.postMessage({scope:'winky-avatar-lab',type:'park'},location.origin);
    $('candidate').contentWindow.postMessage({scope:'winky-avatar-lab',type:'preview',action:name},location.origin);
    $('status').textContent='Просмотр: '+LABELS[name];
  };
  $('newMotions').append(button);
}
function categories(){const old=$('category').value;$('category').replaceChildren(...[...new Set(library.filter(r=>r.lang===$('lang').value).map(r=>r.category))].sort().map(c=>option(c,c)));if([...$('category').options].some(o=>o.value===old))$('category').value=old;records();}
function records(){const rows=library.filter(r=>r.lang===$('lang').value&&r.category===$('category').value);$('record').replaceChildren(...rows.map(r=>option(r.id,r.text)));select();}
function select(){stop();lastTemplate=null;audio.removeAttribute('src');audio.load();selected=library.find(r=>r.id===$('record').value);$('phrase').textContent=selected?.text||'';}
$('lang').onchange=categories;$('category').onchange=records;$('record').onchange=select;
function stop(){audio.pause();post({type:'cancel'});event=null;sessionStarted=false;visualStart=0;tailShown=false;}
function finish(){if(event)post({type:'end',id:event.id});event=null;sessionStarted=false;visualStart=0;}
async function play(chat=false){
  stop();if(!selected||ready.size<2)return;
  if(!context){context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=512;samples=new Float32Array(analyser.fftSize);context.createMediaElementSource(audio).connect(analyser);const gain=context.createGain();analyser.connect(gain);gain.connect(context.destination);window.labGain=gain;}
  await context.resume();window.labGain.gain.value=$('mute').checked?0:1;
  audio.src=selected.audio;
  event={...selected,id:`lab-${++serial}`,emotion:chat?$('chatEmotion').value:'happy',gesture:$('gesture').value};
  if(chat){event.category='CHAT_REPLY';event.conditions={};event.intent=$('chatIntent').value;}
  lastTemplate={...event};
  // Speech identity starts only when media actually plays, never when queued.
  try{await audio.play();}catch(error){stop();$('status').textContent='Ошибка воспроизведения: '+error.message;}
}
audio.addEventListener('playing',()=>{
  if(!event&&lastTemplate)event={...lastTemplate,id:`lab-${++serial}`};
  if(!event)return;
  if(!sessionStarted){event.duration=Number.isFinite(audio.duration)?audio.duration:event.duration;post({type:'begin',event});sessionStarted=true;}
});
audio.addEventListener('ended',()=>{finish();$('status').textContent='Фраза закончилась · завершение жеста и возврат в покой.';});
audio.addEventListener('error',()=>{if(event){stop();$('status').textContent='Запись недоступна';}});
$('play').onclick=()=>play();$('chat').onclick=()=>play(true);$('stop').onclick=stop;
$('mute').onchange=()=>{if(window.labGain)window.labGain.gain.value=$('mute').checked?0:1;};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.scope!=='winky-avatar-lab'||e.data.type!=='ready')return;const id=e.data.candidate?'candidate':'baseline';if(e.source!==$(id).contentWindow)return;ready.add(id);if(ready.size===2){$('play').disabled=false;$('play').textContent='Сравнить на этой фразе';$('status').textContent=`Готово · ${library.length} записей для просмотра · приложение изолировано`;}});
function tick(){
  if(event&&sessionStarted){let rms=0;if(!audio.paused){analyser.getFloatTimeDomainData(samples);rms=Math.min(1,Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length)*4);}
    const time=visualStart?(performance.now()-visualStart)/1000:audio.currentTime;
    post({type:'clock',id:event.id,time,rms:visualStart?0:rms,playing:!visualStart&&!audio.paused});
    const state=$('candidate').contentWindow.avatarLabState;
    $('status').textContent=`${visualStart?'Без озвучки · условная шкала времени':audio.paused?'Пауза':'Речь'} · ${profileFor(event)} · ${LABELS[state?.gesture]||'…'} · ${time.toFixed(2)} с`;
    if(visualStart&&time>=visualDuration)finish();
  }else{
    const state=$('candidate').contentWindow.avatarLabState;
    if(state?.phase==='tail'){tailShown=true;$('status').textContent='После речи · воздушный поцелуй';}
    else if(tailShown&&!state?.id){tailShown=false;$('status').textContent='Фраза и жест завершены · покой';}
  }
  requestAnimationFrame(tick);
}
categories();tick();
// A late frame load cannot lose its ready event while the catalog is loading.
for (const id of ['baseline','candidate']) if($(id).contentWindow.labReady)ready.add(id);
if(ready.size===2){$('play').disabled=false;$('play').textContent='Сравнить на этой фразе';}

// Text templates are shown separately: an absent approved recording never
// silently becomes synthetic speech or an unrelated MP3.
const templates=catalog.rows.filter(r=>r.source!=='recording');
$('source').replaceChildren(...[...new Set(templates.map(r=>r.source))].map(s=>option(s,s)));
function templateOptions(){
  $('template').replaceChildren(...templates.filter(r=>r.source===$('source').value&&r.lang===$('templateLang').value)
    .map(r=>option(r.id,`${r.route} · ${r.text}`)));
  templateInfo();
}
function templateInfo(){
  const r=templates.find(r=>r.id===$('template').value);if(!r)return;
  $('templateText').textContent=r.text;
  const p=performancePlan(r);
  $('plan').textContent=`${p.profile} · ${p.variants.map(v=>LABELS[v]).join(' / ')}${p.hint?' · по тексту: '+LABELS[p.hint]:''}`;
  $('templatePlay').textContent=r.audio?'Проверить с существующей записью':'Посмотреть без озвучки · 5 секунд';
}
$('source').onchange=templateOptions;$('templateLang').onchange=templateOptions;$('template').onchange=templateInfo;
function visualPlay(row){
  stop();if(ready.size<2)return;
  event={...row,id:`lab-text-${++serial}`,duration:5};lastTemplate=null;
  visualStart=performance.now();visualDuration=5;sessionStarted=true;
  post({type:'begin',event});
}
$('templatePlay').onclick=async()=>{
  const row=templates.find(r=>r.id===$('template').value);if(!row)return;
  if(row.audio){selected=row;await play();}else visualPlay(row);
};
for(const route of catalog.routes)$('route').append(option(route.id,route.id));
$('dynamicPlay').onclick=()=>{
  const route=catalog.routes.find(r=>r.id===$('route').value);
  visualPlay({...route,source:'dynamic_contract',route:route.id,text:$('replyText').value,comment:$('commentText').value});
};
$('coverage').textContent=`${library.length} готовых записей + ${templates.length} текстовых вариантов · ${catalog.routes.length} маршрутов событий`;
templateOptions();
