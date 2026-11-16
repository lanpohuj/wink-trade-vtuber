import test from 'node:test';
import assert from 'node:assert/strict';
import {Director, profileFor, envelope, PROFILES, recordingBeats} from './policy.mjs';

test('semantics override broad excited emotion, likes do not cheer', () => {
  assert.equal(profileFor({category:'NARRATE_PAIR',emotion:'excited'}),'focus');
  for(const kind of ['like','follow']) assert.equal(profileFor({conditions:{chat_kind:kind},emotion:'excited'}),'thanks');
  assert.equal(profileFor({conditions:{chat_kind:'gift'},emotion:'excited'}),'gift_thanks');
  assert.ok(!PROFILES.thanks.includes('cheer'));
  assert.equal(profileFor({category:'TRADE_LOSS',emotion:'excited'}),'reassure');
  assert.equal(profileFor({category:'CHAT_REPLY',emotion:'thinking'}),'thoughtful');
  assert.equal(profileFor({category:'CHAT_REPLY',intent:'skeptic',emotion:'wink'}),'reassure');
  assert.equal(profileFor({category:'NARRATE_PAIR',emotion:'blush'}),'focus');
  assert.equal(profileFor({category:'CHAT_REPLY',emotion:'blush'}),'embarrassed');
});
test('new reactions follow explicit intent and never replace serious results',()=>{
  for(const [emotion,profile,gesture]of [
    ['quiet_laugh','amused','quiet_laugh'],['ponder','thoughtful','ponder'],
    ['playful_doubt','skeptical','playful_doubt'],['hand_heart','gift_thanks','hand_heart'],
  ]){
    const d=new Director(),event={id:emotion,category:'CHAT_REPLY',emotion};
    assert.equal(d.begin(event).gesture,gesture);assert.equal(profileFor(event),profile);
    assert.equal(profileFor({...event,category:'TRADE_LOSS'}),'reassure');
    assert.equal(profileFor({...event,category:'NARRATE_PAIR'}),'focus');
    assert.equal(profileFor({...event,category:'TRADE_LOSS',conditions:{chat_kind:'gift'}}),'reassure');
    assert.equal(profileFor({...event,category:'NARRATE_PAIR',conditions:{chat_kind:'gift'}}),'focus');
    assert.equal(profileFor({...event,intent:'gambler'}),'reassure');
  }
});
test('one performance for duplicate callbacks, stale end cannot kill next phrase', () => {
  const d=new Director();d.end(undefined);d.clock(undefined,1);assert.equal(d.active,null);d.begin({id:'a',duration:8});
  d.clock('a',1);assert.equal(d.begin({id:'a'}),null);assert.equal(d.active.time,1);
  d.begin({id:'b'});d.clock('a',8);d.end('a');assert.equal(d.active.id,'b');assert.equal(d.active.ended,false);
});
test('short replies use a nod instead of an accelerated large gesture',()=>{
  const d=new Director();
  assert.equal(d.begin({id:'short',conditions:{chat_kind:'gift'},duration:1}).gesture,'nod');
  assert.equal(d.begin({id:'preview',conditions:{chat_kind:'gift'},duration:1,gesture:'hand_heart'}).gesture,'hand_heart');
});
test('short audio and silence never hold a gesture indefinitely', () => {
  const d=new Director();d.begin({id:'a',duration:1,gesture:'nod'});d.clock('a',.6);
  assert.ok(d.frame(.016).weight>0);d.end('a');
  for(let i=0;i<150;i++)d.frame(1/60);
  assert.equal(d.active,null);assert.equal(d.frame(0).speaking,false);
  assert.equal(envelope(-1,3),0);assert.equal(envelope(3,3),0);
});
test('audio clock, not number of RMS callbacks, controls the performance', () => {
  const d=new Director();d.begin({id:'a',gesture:'bow'});d.clock('a',.8);
  const a=d.frame(.016);
  for(let i=0;i<60;i++) d.frame(.016);
  assert.equal(d.active.time,.8);assert.equal(d.frame(.016).weight,a.weight);
});
test('regular speech includes calm hands and rotates across phrase starts', () => {
  const d=new Director(), gestures=[];
  for(let n=0;n<20;n++){gestures.push(d.begin({id:String(n),category:'CHAT_REPLY'}).gesture);d.end(String(n));}
  assert.ok(gestures.includes('listen'));assert.ok(new Set(gestures).size>=4);
  assert.ok(gestures.every(g=>!['cheer','dance','wave'].includes(g)));
  for(let i=1;i<gestures.length;i++)assert.notEqual(gestures[i],gestures[i-1]);
});

test('long phrases have a second contextual gesture on the same media clock',()=>{
 const d=new Director();d.begin({id:'long',category:'NARRATE_LESSON',duration:8},20);
 d.clock('long',1);assert.equal(d.frame(.02).beat,0);
 d.clock('long',5);const f=d.frame(.02);assert.equal(f.beat,1);assert.ok(f.weight>0);assert.ok(['explain_left','nod'].includes(f.gesture));
 d.clock('long',5,false);for(let n=0;n<60;n++)d.frame(.02);assert.equal(d.frame(.02).poseTime,f.poseTime);
 assert.equal(d.frame(.02).speaking,false);
 d.end('long');for(let n=0;n<180;n++)d.frame(1/60);assert.equal(d.active,null);
});
test('authored recording beats follow actual audio time, with silence between gestures',()=>{
 const d=new Director();d.begin({id:'beats',duration:8,performance:{beats:[
  {start:.3,duration:2,gesture:'joy'}, {start:4,duration:2,gesture:'hand_heart'}]}});
 d.clock('beats',1);assert.equal(d.frame(.01).gesture,'joy');
 d.clock('beats',3);assert.equal(d.frame(.01).gesture,'listen');assert.equal(d.frame(.01).weight,0);
 d.clock('beats',5);assert.equal(d.frame(.01).gesture,'hand_heart');
 const invalid=[{start:0,duration:2,gesture:'hip_groove'}];
 assert.deepEqual(recordingBeats({performance:{beats:invalid}},'reassure',8),[]);
 assert.deepEqual(recordingBeats({performance:{beats:[{start:7,duration:2,gesture:'joy'}]}},'conversation',8),[]);
});
test('lost audio clock stops articulation and eventually releases an orphaned speech session',()=>{
 const d=new Director();d.begin({id:'lost',duration:4});d.clock('lost',.2);
 for(let i=0;i<110;i++)d.frame(1/60);assert.equal(d.frame(.01).speaking,false);
 for(let i=0;i<420;i++)d.frame(1/60);assert.equal(d.active,null);
});
