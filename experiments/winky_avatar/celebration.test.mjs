import test from 'node:test';
import assert from 'node:assert/strict';
import {CelebrationDirector,WIN_GESTURES,tradeKey} from './celebration.mjs';
import {jumpBody} from './victory-motions.mjs';
const context=(seq,extra={})=>({connected:true,result:'WIN',result_key:`session:${seq}:result`,result_age_sec:0,...extra});
test('every complete round uses all five celebrations once; no repeat at a round boundary',()=>{
 for(const random of [()=>0,()=>.999,Math.random]){
  const c=new CelebrationDirector(random),gestures=[];
  for(let i=1;i<=100;i++){assert.ok(c.context(context(i)));gestures.push(c.active.gesture);}
  for(let n=0;n<100;n+=5)assert.deepEqual(new Set(gestures.slice(n,n+5)),new Set(WIN_GESTURES));
  for(let n=1;n<100;n++)assert.notEqual(gestures[n],gestures[n-1]);
 }
});
test('heartbeat, recovery announcement and voice reuse one result without advancing the round',()=>{
 const c=new CelebrationDirector();assert.ok(c.context(context(1)));c.tick(1/30);const first={...c.active};
 for(let n=0;n<20;n++)assert.equal(c.context(context(1)),false);
 assert.equal(c.speech({category:'TRADE_WIN',session_id:'session',trade_seq:1,created_at:Date.now()}),false);
 assert.deepEqual(c.active,first);assert.equal(c.bag.length,4);
});
test('spoken official result can arrive first; delayed older result cannot replace a newer one',()=>{
 const c=new CelebrationDirector();assert.ok(c.speech({category:'TRADE_WIN',session_id:'session',trade_seq:2,created_at:Date.now()}));
 assert.equal(c.context(context(2)),false);const a=c.active;
 assert.equal(c.context(context(1,{result:'LOSS'})),false);assert.equal(c.active,a);
 assert.equal(c.context(context(1)),false);assert.equal(c.active,a);
});
test('only fresh confirmed wins react; invalid, disconnected and future facts cannot consume a gesture',()=>{
 const c=new CelebrationDirector();
 for(const extra of [{result:'PENDING'},{result:'UNKNOWN'},{result:'REFUND'},{result:'LOSS'},{result_age_sec:11},{result_age_sec:-2},{result_age_sec:NaN},{connected:false},{result_key:''}])
  assert.equal(c.context(context(Math.random(),extra)),false);
 assert.equal(c.serial,0);assert.equal(c.bag.length,0);
});
test('new loss cancels a celebration and does not advance the celebration round',()=>{
 const c=new CelebrationDirector();c.context(context(1));assert.equal(c.context(context(2,{result:'LOSS'})),false);
 assert.equal(c.active,null);assert.equal(c.bag.length,4);c.context(context(3));assert.equal(c.serial,2);
});
test('reaction ends on elapsed visual time independently of a frozen speech clock; stop does not replay it',()=>{
 const c=new CelebrationDirector();c.context(context(1));for(let n=0;n<240;n++)c.tick(1/60);assert.equal(c.active,null);
 assert.equal(c.context(context(1)),false);c.context(context(2));c.cancel();assert.equal(c.context(context(2)),false);
 assert.equal(c.active,null);assert.equal(tradeKey('x',0),'x:0:result');assert.equal(tradeKey('',1),'');
});
test('jump has preparation, two flights and landing, with no sustained floating',()=>{
 const heights=Array.from({length:321},(_,i)=>jumpBody(i/100,3.2).height);let flights=0;
 heights.forEach((v,i)=>{if(v>0&&!(heights[i-1]>0))flights++;assert.ok(Number.isFinite(v)&&v<=7.21&&v>=-2.21);});
 assert.equal(flights,2);assert.equal(heights[0],0);assert.equal(heights.at(-1),0);assert.ok(heights.some(v=>v<-1.8));
 const inAir=Array.from({length:761},(_,i)=>jumpBody(i/200,3.8).flightHeight>0);
 const spans=[];let start=-1;inAir.forEach((yes,i)=>{if(yes&&start<0)start=i;if(!yes&&start>=0){spans.push((i-start)/200);start=-1;}});
 assert.equal(spans.length,2);assert.ok(spans.every(t=>t>.19&&t<.27),'short small hops, without slow floating');
});
