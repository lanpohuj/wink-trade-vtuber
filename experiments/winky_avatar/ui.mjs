import {LABELS, profileFor} from './policy.mjs';
const $ = id => document.getElementById(id), audio = $('audio');
const library = await (await fetch('/library.json')).json();
let context, analyser, samples, event, ready = new Set(), serial = 0, selected, sessionStarted = false, lastTemplate;
const post = m => ['baseline', 'candidate'].forEach(id => $(id).contentWindow.postMessage({scope:'winky-avatar-lab', ...m}, location.origin));
const option = (value, text) => {const o = document.createElement('option'); o.value=value;o.textContent=text;return o;};
for(const [id,label] of Object.entries(LABELS)) $('gesture').append(option(id,label));
for(const name of ['wave','dance','cheer','shy','flirt_kiss','neko_paws','hip_groove','peek_closer']) {
  const labels={wave:'Приветствие',dance:'Танец с руками · разбор',cheer:'Руки вверх · разбор',shy:'Смущение',flirt_kiss:'Воздушный поцелуй',neko_paws:'Кулачки у лица',hip_groove:'Качание бёдрами',peek_closer:'Любопытство'};
  const b=document.createElement('button');b.textContent=labels[name];b.onclick=()=>{stop();post({type:'legacy',action:name});};$('legacy').append(b);
}
function categories(){const old=$('category').value;$('category').replaceChildren(...[...new Set(library.filter(r=>r.lang===$('lang').value).map(r=>r.category))].sort().map(c=>option(c,c)));if([...$('category').options].some(o=>o.value===old))$('category').value=old;records();}
function records(){const rows=library.filter(r=>r.lang===$('lang').value&&r.category===$('category').value);$('record').replaceChildren(...rows.map(r=>option(r.id,r.text)));select();}
function select(){stop();lastTemplate=null;audio.removeAttribute('src');audio.load();selected=library.find(r=>r.id===$('record').value);$('phrase').textContent=selected?.text||'';}
$('lang').onchange=categories;$('category').onchange=records;$('record').onchange=select;
function stop(){audio.pause();if(event)post({type:'end',id:event.id});post({type:'cancel'});event=null;sessionStarted=false;}
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
audio.addEventListener('ended',()=>{stop();$('status').textContent='Фраза закончилась. Кандидат плавно возвращается в покой.';});
audio.addEventListener('error',()=>{if(event){stop();$('status').textContent='Запись недоступна';}});
$('play').onclick=()=>play();$('chat').onclick=()=>play(true);$('stop').onclick=stop;
$('mute').onchange=()=>{if(window.labGain)window.labGain.gain.value=$('mute').checked?0:1;};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.scope!=='winky-avatar-lab'||e.data.type!=='ready')return;const id=e.data.candidate?'candidate':'baseline';if(e.source!==$(id).contentWindow)return;ready.add(id);if(ready.size===2){$('play').disabled=false;$('play').textContent='Сравнить на этой фразе';$('status').textContent=`Готово · ${library.length} записей для просмотра · приложение изолировано`;}});
function tick(){
  if(event&&sessionStarted){let rms=0;if(!audio.paused){analyser.getFloatTimeDomainData(samples);rms=Math.min(1,Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length)*4);}
    post({type:'clock',id:event.id,time:audio.currentTime,rms});
    const state=$('candidate').contentWindow.avatarLabState;
    $('status').textContent=`${audio.paused?'Пауза':'Речь'} · ${profileFor(event)} · ${LABELS[state?.gesture]||'…'} · ${audio.currentTime.toFixed(2)} с`;
  }
  requestAnimationFrame(tick);
}
categories();tick();
// A late frame load cannot lose its ready event while the catalog is loading.
for (const id of ['baseline','candidate']) if($(id).contentWindow.labReady)ready.add(id);
if(ready.size===2){$('play').disabled=false;$('play').textContent='Сравнить на этой фразе';}
