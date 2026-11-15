import test from 'node:test';import assert from 'node:assert/strict';
import{IdleDirector}from'./idle.mjs';
const random=()=>{let n=123456;return()=>((n=(1664525*n+1013904223)>>>0)/4294967296);};
function run(d,seconds,context){const starts=[],frames=[];let id=0;for(let n=0;n<seconds*30;n++){if(context&&n%60===0)d.setContext(context);const f=d.tick(1/30);frames.push(f);if(f&&f.id!==id){id=f.id;starts.push({...f});}}return{starts,frames};}
test('waiting stage is varied and visibly active without a fixed dance loop',()=>{
 const d=new IdleDirector(random()),r=run(d,180),gestures=r.starts.map(s=>s.gesture);
 assert.ok(new Set(gestures).size>=6);for(let i=1;i<gestures.length;i++)assert.notEqual(gestures[i],gestures[i-1]);
 assert.ok(r.frames.filter(Boolean).length/r.frames.length>.48);
 assert.ok(r.frames.filter(Boolean).length/r.frames.length<.8);
 for(const g of ['hip_groove','shy','neko_paws','flirt_kiss'])assert.ok(gestures.includes(g),g);
 for(let i=0;i<r.starts.length;i++)if(r.starts[i].gesture==='flirt_kiss')for(let j=i+1;j<r.starts.length;j++)if(r.starts[j].gesture==='flirt_kiss')assert.ok(r.starts[j].started-r.starts[i].started>=48);
});
test('trading attention and pending synthesis never start a flirty dance',()=>{
 for(const context of [{phase:'IN_TRADE',connected:true},{phase:'ANALYZING',connected:true},{preparing:2}]){
  const r=run(new IdleDirector(random()),100,context);
  assert.ok(r.starts.length>=10);assert.ok(r.starts.every(s=>['ponder','peek_closer','tilt','nod'].includes(s.gesture)));
 }
});
test('a recent loss remains supportive even if the context heartbeat disappears',()=>{
 const d=new IdleDirector(random());d.setContext({result:'LOSS',result_age_sec:0});
 const r=run(d,40);assert.ok(r.starts.length>5);assert.ok(r.starts.every(s=>s.mood==='supportive'));
});
test('speech immediately preempts idle and a manual preview has exclusive ownership',()=>{
 const d=new IdleDirector(random());run(d,5);d.speech('embarrassed');
 for(let n=0;n<300;n++)assert.equal(d.tick(1/30,{speech:true}),null);
 for(let n=0;n<60;n++)assert.equal(d.tick(1/30,{manual:true}),null);
 d.enable(false);for(let n=0;n<300;n++)assert.equal(d.tick(1/30),null);
});
test('a change to a serious scene interrupts a current playful pose',()=>{
 const d=new IdleDirector(random());let f;for(let n=0;n<150&&!f;n++)f=d.tick(1/30);
 assert.ok(f);d.setContext({phase:'IN_TRADE',connected:true});assert.equal(d.tick(.1),null);
 assert.ok(run(d,20,{phase:'IN_TRADE',connected:true}).starts.every(s=>s.mood==='attentive'));
});
test('idle does not immediately repeat a kiss just used by speech',()=>{
 const d=new IdleDirector(random());d.speech('flirt','flirt_kiss');
 const r=run(d,40);assert.ok(r.starts.length>4);assert.ok(r.starts.every(s=>s.gesture!=='flirt_kiss'));
});
test('pausing the voice queue does not freeze a silent avatar',()=>{
 const d=new IdleDirector(random());const r=run(d,30,{paused:true});assert.ok(r.starts.length>=4);
});
test('settled trade waiting stays lively but the expiry boundary restores attention',()=>{
 const d=new IdleDirector(random());const r=run(d,60,{phase:'IN_TRADE',connected:true,remaining_sec:40});
 assert.ok(r.starts.some(s=>s.gesture==='hip_groove'));assert.ok(r.starts.some(s=>s.gesture==='neko_paws'));
 assert.ok(r.starts.every(s=>!['joy','flirt_kiss','hand_heart'].includes(s.gesture)));
 const end=run(d,20,{phase:'IN_TRADE',connected:true,remaining_sec:8});
 assert.ok(end.starts.every(s=>s.mood==='attentive'));
});
test('a fresh recovery result replaces the previous subdued mood',()=>{
 const d=new IdleDirector(random());d.setContext({result:'LOSS',result_age_sec:0});run(d,5);assert.equal(d.mood(),'supportive');
 d.setContext({result:'WIN',result_age_sec:0});assert.equal(d.mood(),'playful');
});
