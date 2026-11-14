import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Director,PROFILES,LABELS,profileFor,performancePlan} from './policy.mjs';
import {normalizeEvent,canonicalAction,inferIntent,LEGACY_ACTIONS} from './sync-event.mjs';
import {TRACKS} from './motion-tracks.mjs';

test('legacy commands preserve safe movements and trading directions stay metadata',()=>{
  for(const [from,to]of [['dance','hip_groove'],['cheer','joy'],['kiss','flirt_kiss'],['blush','shy'],['paws','neko_paws'],['peek','peek_closer']])assert.equal(canonicalAction(from),to);
  for(const value of ['BUY','SELL','CALL','PUT'])assert.equal(canonicalAction(value),'');
  for(const name of Object.values(PROFILES).flat())assert.ok(LABELS[name]);
  for(const name of [...Object.keys(TRACKS),...LEGACY_ACTIONS])assert.ok(Object.values(PROFILES).flat().includes(name),name+' is reachable automatically');
  assert.ok(!Object.values(PROFILES).flat().some(g=>['dance','cheer'].includes(g)));
});
test('Russian and English comments and explicit meanings route before mood',()=>{
  for(const [comment,intent,profile]of [
    ['Привет Винки!','greeting','greeting'],['You are so cute','compliment','embarrassed'],
    ['What is the strategy?','strategy','explain'],['Это скам?','skeptic','reassure'],
    ['Давай ва-банк!','gambler','reassure'],['Ты опять хитришь?','playful_doubt','skeptical'],
    ['lol, haha!','joke','amused'],['Где ссылка?','bot','explain'],
  ]){assert.equal(inferIntent(comment),intent);assert.equal(profileFor({comment,text:'[wink] Ответ'}),profile);}
  assert.equal(profileFor({text:'[wink] Обычный ответ без специального повода'}),'conversation');
  assert.equal(profileFor({category:'TRADE_WIN_RECOVERY'}),'celebrate');
  assert.equal(profileFor({category:'SNIPER_WAIT'}),'focus');
  assert.equal(profileFor({category:'NARRATE_RESULT',conditions:{result_kind:'WIN_50'}}),'celebrate');
  assert.equal(profileFor({source:'signal_announcement',emotion:'excited',action:'cheer'}),'focus');
  assert.equal(profileFor({source:'trade_event',event:'loss_step1',emotion:'wink'}),'reassure');
  assert.equal(profileFor({quick_id:'how_to_use',emotion:'excited'}),'explain');
  assert.equal(profileFor({keyword_id:'kw_hello',emotion:'happy'}),'greeting');
});
test('social events override generic tags but literal promised movements are respected',()=>{
  for(const [text,gesture,kind]of [['Танцую для тебя!','hip_groove','follow'],['Enjoy my dance!','hip_groove','follow'],['Лови сердечко!','hand_heart','like'],['Sending you a kiss','flirt_kiss','gift'],['Лови лапки','neko_paws','gift']]){
    const d=new Director();assert.equal(d.begin({id:text,chat_kind:kind,text,duration:7},10).gesture,gesture);
  }
  assert.equal(normalizeEvent({text:'Не буду танцевать'}).promised_action,'');
  assert.equal(normalizeEvent({text:"Don't dance for me",comment:'танцуй'}).promised_action,'');
  assert.equal(normalizeEvent({text:'Спасибо!',comment:'поцелуй'}).promised_action,'');
  assert.equal(new Director().begin({id:'loss',category:'TRADE_LOSS',emotion:'excited',action:'dance',text:'Танцую!'}).gesture,'nod');
});
test('large gestures have a cooldown and no repeat storm on every phrase',()=>{
  const d=new Director();
  assert.equal(d.begin({id:'1',emotion:'ponder',duration:6},10).gesture,'ponder');
  assert.equal(d.begin({id:'2',emotion:'hand_heart',duration:6},12).gesture,'nod');
  assert.equal(d.begin({id:'3',emotion:'quiet_laugh',duration:6},20).gesture,'quiet_laugh');
  assert.equal(d.begin({id:'4',chat_kind:'follow',text:'Танцую для тебя!',duration:6},21).gesture,'hip_groove');
});
test('kiss waits for actual audio end, completes without voice, Stop cancels it',()=>{
  const d=new Director();d.begin({id:'kiss',gesture:'flirt_kiss',duration:9});
  d.clock('kiss',1);let f=d.frame(.016);assert.equal(f.gesture,'tilt');assert.equal(f.speaking,true);
  for(let i=0;i<90;i++)f=d.frame(1/30);assert.notEqual(f.phase,'tail');
  d.end('kiss');f=d.frame(1/30);assert.equal(f.phase,'tail');assert.equal(f.gesture,'flirt_kiss');assert.equal(f.speaking,false);
  for(let i=0;i<150;i++)d.frame(1/30);assert.equal(d.active,null);
  d.begin({id:'kiss2',gesture:'flirt_kiss'});d.end('kiss2');d.frame(.1);d.cancel();assert.equal(d.frame(.1).gesture,'listen');
});
test('a new voice preempts only the old post-speech tail and stale ends are harmless',()=>{
  const d=new Director();d.begin({id:'a',gesture:'flirt_kiss'});d.end('a');d.frame(.4);
  d.begin({id:'b',category:'NARRATE_PAIR'});d.end('a');d.clock('b',.6);
  const f=d.frame(.1);assert.equal(d.active.id,'b');assert.equal(f.speaking,true);assert.notEqual(f.gesture,'flirt_kiss');
});
test('all finite source rows have a valid, playable animation plan',async()=>{
  const c=await(await fetch('http://127.0.0.1:8794/sync-catalog.json')).json();
  assert.ok(c.rows.length>2100);assert.equal(c.routes.length,12);
  const ids=new Set(),sources={},plans=[];
  for(const r of c.rows){
    assert.ok(!ids.has(r.id));ids.add(r.id);const plan=performancePlan(r);assert.ok(plan.variants.length);
    for(const g of plan.variants)assert.ok(LABELS[g],r.id+':'+g);
    const d=new Director(),a=d.begin({...r,id:r.id},10);assert.ok(LABELS[a.gesture]);d.clock(r.id,1);assert.ok(Number.isFinite(d.frame(.02).weight));
    sources[r.source]=(sources[r.source]||0)+1;plans.push({id:r.id,text:r.text,route:r.route,...plan});
    if(r.playback==='visual_only_no_synthesis')assert.equal(r.audio,null);
  }
  for(const route of c.routes){const plan=performancePlan({...route,comment:'Привет',text:'[happy] Ответ'});assert.ok(PROFILES[plan.profile]);}
  fs.mkdirSync(new URL('./.runtime/revision-4/',import.meta.url),{recursive:true});
  fs.writeFileSync(new URL('./.runtime/revision-4/sync-map.json',import.meta.url),JSON.stringify({sources,routes:c.routes,source_sha256:c.source_sha256,plans},null,2));
  console.log(JSON.stringify({sources,rows:plans.length,routes:c.routes.length}));
});
