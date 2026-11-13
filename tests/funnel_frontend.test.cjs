'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const source=fs.readFileSync('webapp/app.js','utf8');
function harness(status=200, body={}) {
 const nodes={},intervals=[],requests=[];
 const get=id=>nodes[id]??=({textContent:'',innerHTML:'',style:{},className:'',disabled:false,hidden:true,href:'#',classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={URLSearchParams,window:{location:{search:'?tg_id=123456789&lang=ru'},Telegram:{WebApp:{initData:'signed-test-data',initDataUnsafe:{user:{id:123456789}}}}},localStorage:{getItem(){return null}},document:{getElementById:get,addEventListener(){}},performance:{now(){return 1000}},setTimeout(fn){fn();return 1},setInterval(fn){intervals.push(fn);return 1},clearInterval(){},Math,console,fetch:async(url,options)=>{
  requests.push({url,options});if(status==='network')throw new Error('offline');
  return {ok:status===200,status,json:async()=>({pair:'EUR/USD OTC',duration:'30s',direction:'BUY',accuracy:92,rationale_ru:['safe'],...body})};
 }};
 vm.createContext(context);vm.runInContext(source,context);vm.runInContext('dispatchLumeanVoice=async()=>{}',context);
 return {context,nodes,get,intervals,requests};
}
for (const status of [401,500,'network']) test(`API failure ${status} never fabricates a signal or a win`,async()=>{
 const h=harness(status);await vm.runInContext('startSignalAnalysis()',h.context);
 assert.equal(h.get('directionBlock').className,'winky-direction-block idle');
 assert.equal(h.get('metricAccuracy').textContent,'—');
 assert.equal(h.intervals.length,0);
 assert.equal(vm.runInContext('state.liveWins',h.context),0);
 assert.equal(h.get('btnGetSignal').disabled,false);
 assert.equal(vm.runInContext('state.lastSignal',h.context),null);
});
test('403 opens deposit sheet and does not start expiry',async()=>{
 const h=harness(403);await vm.runInContext('startSignalAnalysis()',h.context);
 assert.equal(h.get('depositSheetBackdrop').hidden,false);assert.equal(h.intervals.length,0);
});
test('successful server signal ends neutrally without changing statistics',async()=>{
 const h=harness();await vm.runInContext('startSignalAnalysis()',h.context);
 assert.match(h.get('directionBlock').className,/active buy/);
 assert.equal(h.get('metricAccuracy').textContent,'92%');
 for(let i=0;i<30;i++)h.intervals[0]();
 assert.equal(h.get('directionBlock').className,'winky-direction-block idle');
 assert.match(h.get('directionBlock').textContent,/не подтверждён/);
 assert.equal(vm.runInContext('state.liveWins',h.context),0);
 assert.equal(h.get('btnGetSignal').disabled,false);
 assert.equal(h.requests[0].options.headers['X-Telegram-Init-Data'],'signed-test-data');
});
test('HTML in server rationale is escaped at the rendering boundary',async()=>{
 const h=harness(200,{rationale_ru:['<img src=x onerror=alert(1)>']});
 await vm.runInContext('startSignalAnalysis()',h.context);
 assert.ok(!h.get('directionBlock').innerHTML.includes('<img'));
 assert.match(h.get('directionBlock').innerHTML,/&lt;img/);
});
test('profile populates the real attributed registration and deposit links',async()=>{
 const registration='https://broker.test/register?sub_id1=123456789';
 const deposit='https://broker.test/deposit?sub_id1=123456789';
 const h=harness(200,{register_url:registration,deposit_url:deposit});
 await vm.runInContext('loadProfile()',h.context);
 assert.equal(h.get('btnRegisterLink').href,registration);
 assert.equal(h.get('btnDepositLink').href,deposit);
 assert.equal(h.requests[0].options.headers['X-Telegram-Init-Data'],'signed-test-data');
});
