import test from 'node:test';
import assert from 'node:assert/strict';
import {Director, profileFor, envelope, PROFILES} from './policy.mjs';

test('semantics override broad excited emotion, likes do not cheer', () => {
  assert.equal(profileFor({category:'NARRATE_PAIR',emotion:'excited'}),'focus');
  for(const kind of ['like','gift','follow']) assert.equal(profileFor({conditions:{chat_kind:kind},emotion:'excited'}),'thanks');
  assert.ok(!PROFILES.thanks.includes('cheer'));
  assert.equal(profileFor({category:'TRADE_LOSS',emotion:'excited'}),'reassure');
  assert.equal(profileFor({category:'CHAT_REPLY',emotion:'thinking'}),'curious');
  assert.equal(profileFor({category:'CHAT_REPLY',intent:'skeptic',emotion:'wink'}),'reassure');
  assert.equal(profileFor({category:'NARRATE_PAIR',emotion:'blush'}),'focus');
  assert.equal(profileFor({category:'CHAT_REPLY',emotion:'blush'}),'embarrassed');
});
test('one performance for duplicate callbacks, stale end cannot kill next phrase', () => {
  const d=new Director();d.end(undefined);d.clock(undefined,1);assert.equal(d.active,null);d.begin({id:'a',duration:8});
  d.clock('a',1);assert.equal(d.begin({id:'a'}),null);assert.equal(d.active.time,1);
  d.begin({id:'b'});d.clock('a',8);d.end('a');assert.equal(d.active.id,'b');assert.equal(d.active.ended,false);
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
