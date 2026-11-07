const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadHook() {
  let now=1700000000000;
  const messages=[],intervals=[],commands=[];
  class Socket { constructor(){this.handlers={};} addEventListener(event,fn){this.handlers[event]=fn;} send(data){this.sent=data;(this.sentMessages || (this.sentMessages=[])).push(data);} receive(data){this.handlers.message({data});} }
  class Canvas {} Canvas.prototype.getContext=()=>null;
  class Context {} Context.prototype.fillText=()=>{};Context.prototype.fillRect=()=>{};
  const window={WebSocket:Socket,postMessage:m=>messages.push(m),addEventListener(event,fn){if(event==='message')commands.push(fn);}};
  const document={querySelectorAll:()=>[],querySelector:()=>null,dispatchEvent(){}};
  const sandbox={window,document,HTMLCanvasElement:Canvas,CanvasRenderingContext2D:Context,
    console:{log(){},warn(){},error(){}},TextDecoder,TextEncoder,ArrayBuffer,Uint8Array,Blob,
    Date:class extends Date{static now(){return now;}},setInterval(fn,ms){intervals.push({fn,ms});},clearInterval(){},
    setTimeout:(fn,ms=0)=>{queueMicrotask(()=>{now+=ms;fn();});},
    MouseEvent:class{constructor(type){this.type=type;}},KeyboardEvent:class{},
    HTMLInputElement:class{},performance:{now:()=>now}};
  Object.defineProperty(sandbox.HTMLInputElement.prototype,'value',{set(value){this._value=value;},get(){return this._value;}});
  let source=fs.readFileSync(__dirname+'/page_hook.js','utf8');
  const at=source.lastIndexOf('})();');
  source=source.slice(0,at)+`globalThis.testing={marketTrace,handleMainWorldSwitchPair,closeAssetMenu,handleMainWorldSetExpiry,handleMainWorldClickTrade,getActualChartTimeframeBadge,handleMainWorldEnsureChartTimeframe,selectPairCandidate,pairVisitedAt};`+source.slice(at);
  vm.runInNewContext(source,sandbox);
  return {...sandbox.testing,window,document,messages,Socket:window.WebSocket,now:()=>now,
    async command(data){for(const fn of commands)await fn({source:window,data:{source:'WINKY_CONTENT',...data}});},
    runIntervals(ms){for(const interval of intervals)if(interval.ms===ms)interval.fn();}};
}

test('four expiry modes retain native outgoing time rewrite and optionType 100',async()=>{
  for(const [label,seconds] of [['15s',15],['30s',30],['1m',60],['2m',120]]) {
    const h=loadHook();
    const value=`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    h.document.querySelectorAll=()=>[{value}];
    await h.handleMainWorldSetExpiry({targetDurationStr:label});
    const response=h.messages.find(m=>m.type==='WINKY_RESP_SET_EXPIRY');
    assert.equal(response.requestedSec,seconds);assert.equal(response.observedSec,seconds);assert.equal(response.confirmed,true);
    const socket=new h.Socket('wss://test');
    socket.send('42'+JSON.stringify(['openOrder',{asset:'EURUSD_otc',time:60,optionType:1,amount:50}]));
    const order=JSON.parse(socket.sent.slice(2))[1];assert.equal(order.time,seconds);assert.equal(order.optionType,100);
  }
});
test('missing expiry field is unconfirmed, not observed as requested seconds',async()=>{
  const h=loadHook();await h.handleMainWorldSetExpiry({targetDurationStr:'30s'});
  const response=h.messages.find(m=>m.type==='WINKY_RESP_SET_EXPIRY');
  assert.equal(response.confirmed,false);assert.equal(response.observedSec,null);
});
test('one trade command clicks once; debounce does not create a second order',async()=>{
  const h=loadHook();let clicks=0;
  const button={dispatchEvent(){},click(){clicks++;}};
  h.document.querySelector=selector=>selector.includes('btn-call')?button:null;
  await h.handleMainWorldClickTrade({direction:'BUY',stake:50,requestId:7});
  await h.handleMainWorldClickTrade({direction:'BUY',stake:50,requestId:7});
  assert.equal(clicks,1);assert.equal(h.messages.filter(m=>m.type==='WINKY_RESP_CLICK_TRADE' && m.clicked).length,1);
});
test('optional open confirmation and binary close result preserve trade ID',async()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  h.document.querySelector=selector=>selector.includes('btn-call')?{
    dispatchEvent(){},click(){socket.send('42'+JSON.stringify(['openOrder',{asset:'EURUSD_otc',amount:50,time:30,action:'call'}]));}
  }:null;
  await h.handleMainWorldClickTrade({direction:'BUY',stake:50,requestId:3});
  const opened={id:'deal-3',asset:'EURUSD_otc',amount:50,open_time:h.now()/1000,close_time:h.now()/1000+30};
  socket.receive('42'+JSON.stringify(['successopenOrder',opened]));
  assert.equal(h.messages.find(m=>m.type==='BROKER_DEAL_OPEN').orderId,'deal-3');
  assert.equal(h.messages.find(m=>m.type==='DEAL_BADGE_TIMER').remainingSec,30);
  socket.receive('451-["successcloseOrder",{"_placeholder":true,"num":0}]');
  socket.receive(new TextEncoder().encode(JSON.stringify({deals:[{...opened,net_profit:46}]})).buffer);
  assert.equal(h.messages.find(m=>m.type==='BROKER_DEAL_RESULT').net,46);
});
test('legacy parsed opening ACK without ID/time metadata still synchronizes the trade timer',async()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  h.document.querySelector=selector=>selector.includes('btn-call')?{
    dispatchEvent(){},click(){socket.send('42'+JSON.stringify(['openOrder',{asset:'EURUSD_otc',amount:50,time:30}]));}
  }:null;
  await h.handleMainWorldClickTrade({direction:'BUY',stake:50,requestId:9});
  socket.receive('42'+JSON.stringify(['successopenOrder',{asset:'GBPUSD_otc',amount:50,time:30}]));
  assert.equal(h.messages.some(m=>m.type==='BROKER_DEAL_OPEN'),false);
  socket.receive('42'+JSON.stringify(['successopenOrder',{asset:'EURUSD_otc',amount:50,time:30}]));
  const timer=h.messages.find(m=>m.type==='DEAL_BADGE_TIMER');
  assert.equal(timer.remainingSec,30);assert.equal(timer.requestId,9);assert.equal(timer.stake,50);
  assert.equal(h.messages.find(m=>m.type==='BROKER_DEAL_OPEN').orderId,undefined);
});
test('DOM history duration is not published as a live deal countdown',()=>{
  const h=loadHook();
  const closed={offsetParent:{},textContent:'EUR/USD OTC $50 00:30',closest:()=>({})};
  const open={offsetParent:{},textContent:'EUR/USD OTC $50 00:08',closest:()=>null};
  h.document.querySelectorAll=()=>[closed,open];h.runIntervals(400);
  const timers=h.messages.filter(m=>m.type==='DEAL_BADGE_TIMER');
  assert.equal(timers.length,1);assert.equal(timers[0].remainingSec,8);
});
test('fractional timestamps and canvas preservation remain supported',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.receive('42["updateStream",[["EURUSD_otc",1700000000.382,1.052345]]]');
  assert.equal(h.messages.find(m=>m.type==='TICK').price,1.052345);
});
test('every tick in a multi-asset packet preserves fractional broker time',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.receive('42["updateStream",[["GBPUSD_otc",1700000000.125,1.2],["EURUSD_otc",1700000000.382,1.1]]]');
  const ticks=h.messages.filter(m=>m.type==='TICK');assert.equal(ticks.length,2);assert.equal(ticks[1].timestamp,1700000000382);assert.equal(ticks[1].receivedAt,h.now());
});
test('raw tuple feeds retain the legacy live price path without inventing history identity',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.receive('[["EURUSD_otc",1700000000.25,1.051],["GBPUSD_otc",1700000000.5,1.251]]');
  const ticks=h.messages.filter(m=>m.type==='TICK');assert.equal(ticks.length,2);assert.equal(ticks[0].timestamp,1700000000250);
});
test('pair selection is deterministic, ranks payout before age and excludes this round',()=>{
  const h=loadHook(),a={normName:'eurusdotc',payout:92},b={normName:'gbpusdotc',payout:92},d={normName:'audusdotc',payout:90};
  h.pairVisitedAt.set(a.normName,100);h.pairVisitedAt.set(b.normName,20);
  assert.equal(h.selectPairCandidate([a,b,d]),b);
  assert.equal(h.selectPairCandidate([a,b,d],['GBP/USD OTC']),a);
  assert.equal(h.selectPairCandidate([a,b,d],['GBP/USD OTC','EUR/USD OTC']),d);
  assert.equal(h.selectPairCandidate([a,a],[a.normName]),null);
});
test('binary history retains its original context across a later symbol request',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.receive('451-["history",{"_placeholder":true,"num":0}]');
  socket.send('42["changeSymbol",{"asset":"GBPUSD_otc","period":15}]');
  socket.receive(new TextEncoder().encode(JSON.stringify({asset:'EURUSD_otc',data:[[1700000000,1.1]]})).buffer);
  const history=h.messages.find(m=>m.type==='WS_HISTORY_TICKS');assert.equal(history.asset,'EURUSD_otc');assert.equal(history.generation,1);
});
test('timeframe failure responds with the request ID rather than forcing a timeout',async()=>{
  const h=loadHook();await h.handleMainWorldEnsureChartTimeframe('M1',{requestId:99});
  const response=h.messages.find(m=>m.type==='WINKY_RESP_CHART_TIMEFRAME');assert.equal(response.requestId,99);assert.equal(response.ok,false);assert.equal(response.error,'timeframe_button_missing');
});
test('M1 candle badge is read independently from a bottom H2 history control',()=>{
  const h=loadHook();const make=(text,top)=>({textContent:text,offsetParent:{},getBoundingClientRect:()=>({left:100,top,width:30,height:25}),classList:{contains:()=>false}});
  const m1=make('M1',60),h2=make('H2',700);
  h.document.querySelectorAll=selector=>selector.includes('.chart-type-block')?[m1]:[h2];
  assert.equal(h.getActualChartTimeframeBadge().badge,'M1');
});
test('timeframe menu receives one opening click and S15 must be observed',async()=>{
  const h=loadHook();let menuClicks=0,itemClicks=0;
  const toolbar={textContent:'M1',offsetParent:{},classList:{contains:()=>false},getBoundingClientRect:()=>({left:100,top:60,width:30,height:25}),dispatchEvent(){},click(){menuClicks++;}};
  const item={textContent:'S15',offsetParent:{},children:[],getAttribute:()=>null,getBoundingClientRect:()=>({left:100,top:100,width:30,height:25}),dispatchEvent(){},closest(selector){return selector==='a,li,button,[role="button"]'?this:null;},click(){itemClicks++;toolbar.textContent='S15';}};
  h.document.querySelectorAll=selector=>selector.startsWith('[data-period=')?[item]:[toolbar];
  await h.handleMainWorldEnsureChartTimeframe('S15');
  assert.equal(menuClicks,1);assert.equal(itemClicks,1);
  assert.equal(h.messages.find(m=>m.type==='WINKY_RESP_CHART_TIMEFRAME').ok,true);
});
test('M1 target is selected and verified instead of always selecting S15',async()=>{
  const h=loadHook();const toolbar={textContent:'S15',offsetParent:{},children:[],classList:{contains:()=>false},getBoundingClientRect:()=>({left:100,top:60,width:30,height:25}),dispatchEvent(){},click(){}};
  const item={textContent:'M1',offsetParent:{},children:[],getAttribute:()=>null,getBoundingClientRect:()=>({left:100,top:100,width:30,height:25}),dispatchEvent(){},closest(selector){return selector==='a,li,button,[role="button"]'?this:null;},click(){toolbar.textContent='M1';}};
  h.document.querySelectorAll=selector=>selector.startsWith('[data-period=')?[item]:[toolbar];
  await h.handleMainWorldEnsureChartTimeframe('M1',{requestId:10});
  const response=h.messages.find(m=>m.type==='WINKY_RESP_CHART_TIMEFRAME');assert.equal(response.ok,true);assert.equal(response.activeTf,'M1');assert.equal(response.requestId,10);
});

test('anonymous history is accepted only for one pending native request',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.receive('42'+JSON.stringify(['history',{data:[{time:1700000000,open:1,high:1.2,low:.9,close:1.1}]}]));
  const history=h.messages.find(m=>m.type==='WS_CANDLES_HISTORY');
  assert.equal(history.asset,'EURUSD_otc');assert.equal(history.periodSec,60);
  const other=loadHook(),ambiguous=new other.Socket('wss://test');
  ambiguous.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  ambiguous.send('42["changeSymbol",{"asset":"GBPUSD_otc","period":15}]');
  ambiguous.receive('42["history",{"data":[[1700000000,1.1]]}]');
  assert.equal(other.messages.some(m=>m.type==='WS_HISTORY_TICKS'),false);
});
test('binary attachment consumption preserves a newer pending request',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.receive('451-["history",{"_placeholder":true,"num":0}]');
  socket.send('42["changeSymbol",{"asset":"GBPUSD_otc","period":15}]');
  socket.receive(new TextEncoder().encode(JSON.stringify({asset:'EURUSD_otc',period:60,data:[[1700000000,1.1]]})).buffer);
  assert.equal(socket.__winkyHistoryRequests.length,1);assert.equal(socket.__winkyHistoryRequests[0].asset,'GBPUSD_otc');
  socket.receive('42["history",{"data":[[1700000001,1.2]]}]');
  assert.equal(h.messages.filter(m=>m.type==='WS_HISTORY_TICKS').at(-1).asset,'GBPUSD_otc');
});
test('a visible nested M1 label in a chart toolbar is detected with the asset menu open',()=>{
  const h=loadHook();
  const rect={left:300,top:90,right:330,width:30,height:30};
  const button={offsetParent:{},textContent:'candlesM1',closest:()=>null,querySelectorAll:()=>[label]};
  const label={offsetParent:{},textContent:'M1',getBoundingClientRect:()=>rect,closest:()=>button};
  h.document.querySelector=()=>({getBoundingClientRect:()=>({left:60,right:1400,top:65})});
  h.document.querySelectorAll=selector=>selector.includes('.current-timeframe')?[]:selector.includes('.top-left-block')?[button,label]:[];
  // No semantic class is required, but the label must belong to a toolbar control above the chart.
  button.closest=selector=>selector==='button,a,[role="button"]'?button:null;
  assert.equal(h.getActualChartTimeframeBadge().badge,'M1');
});

test('history recovery reuses only an observed native request, caps at 200 and rate-limits replay',async()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',requestId:1,pair:'EUR/USD OTC',periodSec:60});
  assert.equal(h.messages.at(-1).requested,false);
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.send('42["loadHistoryPeriod",{"asset":"EURUSD_otc","period":60,"time":1700000000,"offset":0,"count":50}]');
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',requestId:2,pair:'EUR/USD OTC',periodSec:60});
  assert.equal(h.messages.at(-1).requested,true);
  const replay=JSON.parse(socket.sent.slice(2));assert.equal(replay[0],'loadHistoryPeriod');assert.equal(replay[1].count,200);assert.equal(replay[1].time,1700000000);
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',requestId:3,pair:'EUR/USD OTC',periodSec:60});assert.equal(h.messages.at(-1).requested,false);
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',requestId:4,pair:'GBP/USD OTC',periodSec:60});assert.equal(h.messages.at(-1).requested,false);
  await h.command({type:'WINKY_CMD_GET_MARKET_STATUS',requestId:5});
  assert.equal(h.messages.at(-1).version,'2.3.2');assert.equal(h.messages.at(-1).requestId,5);
});
test('timeframe changes within a pair preserve history identity; returning from another pair creates a new generation',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":15}]');
  let contexts=h.messages.filter(m=>m.type==='MARKET_CONTEXT');assert.equal(contexts[0].generation,contexts[1].generation);
  socket.send('42["changeSymbol",{"asset":"GBPUSD_otc","period":15}]');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  contexts=h.messages.filter(m=>m.type==='MARKET_CONTEXT');assert.ok(contexts.at(-1).generation>contexts[0].generation);
});
test('asset menu closure finds a visible menu even if the first modal is hidden',async()=>{
  const h=loadHook();let opened=true,clicks=0;
  const hidden={offsetParent:null};
  const menu={get offsetParent(){return opened?{}:null;},getBoundingClientRect:()=>({width:600,height:500}),querySelector:()=>({})};
  const header={dispatchEvent(){},click(){clicks++;opened=false;}};
  h.document.querySelectorAll=selector=>selector.includes('.symbols-modal')?[hidden,menu]:[];
  h.document.querySelector=()=>header;
  assert.equal(await h.closeAssetMenu(),true);assert.equal(clicks,1);
});
test('timeframe menu selection follows the toolbar at wide and zoomed positions',async()=>{
  const h=loadHook();const toolbar={textContent:'M1',offsetParent:{},getBoundingClientRect:()=>({left:750,top:100,width:30,height:25}),dispatchEvent(){},click(){}};
  const item={textContent:'S15',offsetParent:{},children:[],getAttribute:()=>null,getBoundingClientRect:()=>({left:760,top:150,width:30,height:25}),dispatchEvent(){},closest:()=>null,click(){toolbar.textContent='S15';}};
  h.document.querySelectorAll=selector=>selector.startsWith('[data-period=')?[item]:selector.includes('.current-timeframe')?[toolbar]:[];
  await h.handleMainWorldEnsureChartTimeframe('S15');assert.equal(h.messages.find(m=>m.type==='WINKY_RESP_CHART_TIMEFRAME').ok,true);
});

test('self-identified history ticks from multiple assets are not treated as ambiguous anonymous data',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.send('42["changeSymbol",{"asset":"GBPUSD_otc","period":15}]');
  socket.receive('42["history",[["EURUSD_otc",1700000000.1,1.1],["GBPUSD_otc",1700000000.2,1.2]]]');
  const histories=h.messages.filter(m=>m.type==='WS_HISTORY_TICKS');assert.equal(histories.length,2);
  assert.equal(histories[0].generation,1);assert.equal(histories[1].generation,2);
});

test('captured Pocket menu is scoped correctly and closes by its header, not Escape',async()=>{
  const fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/pocket-chart-controls.json','utf8'));
  assert.match(fixture.toolbar,/items__link--chart-type/);assert.match(fixture.menu,/time-frames-block/);
  const h=loadHook();let opened=false,badge='M1',headerClicks=0,itemClicks=0;
  const rect=()=>({left:245,top:82,width:40,height:35});
  const toolbar={offsetParent:{},children:[],get textContent(){return badge;},getBoundingClientRect:rect,dispatchEvent(){},
    closest:()=>null,querySelectorAll:()=>[],click(){opened=!opened;headerClicks++;}};
  const labels=Array.from(fixture.menu.matchAll(/<span>([^<]+)<\/span>/g),m=>m[1]);
  const items=labels.map(label=>({offsetParent:{},children:[],textContent:label,getAttribute:()=>null,dispatchEvent(){},
    closest(){return this;},click(){badge=label;itemClicks++;}}));
  const menu={offsetParent:{},getBoundingClientRect:()=>({width:400,height:380}),querySelectorAll(selector){
    assert.equal(selector,'.time-frames-block li a');return items;}};
  h.document.querySelectorAll=selector=>selector==='.drop-down-modal--chart-type'?(opened?[menu]:[]):
    selector.includes('.items__link--chart-type')?[toolbar]:[];
  await h.handleMainWorldEnsureChartTimeframe('S15',{requestId:232});
  assert.equal(itemClicks,1);assert.equal(headerClicks,2);assert.equal(opened,false);
  const reply=h.messages.find(m=>m.type==='WINKY_RESP_CHART_TIMEFRAME');assert.equal(reply.ok,true);assert.equal(reply.activeTf,'S15');
  opened=true;await h.handleMainWorldEnsureChartTimeframe('S15',{requestId:233});
  assert.equal(opened,false);assert.equal(itemClicks,1);
});

test('a combined native response forwards tick history and named OHLC independently',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');socket.send('42["changeSymbol",{"asset":"EURUSD_otc","period":60}]');
  socket.receive('42'+JSON.stringify(['updateHistoryNewFast',{asset:'EURUSD_otc',period:60,
    history:[[1700000000.25,1.2]],candles:[{time:1699999920,open:1.1,close:1.2,high:1.25,low:1.05}]}]));
  assert.equal(h.messages.find(m=>m.type==='WS_HISTORY_TICKS').ticks.length,1);
  assert.equal(h.messages.find(m=>m.type==='WS_CANDLES_HISTORY').candles.length,1);
});

test('captured native history window moves backwards and stops after 200 unique candles',async()=>{
  const native=JSON.parse(fs.readFileSync(__dirname+'/fixtures/pocket-native-history.json','utf8'));
  const h=loadHook(),socket=new h.Socket('wss://test'),asset=native.request.asset,period=native.request.period;
  socket.send('42'+JSON.stringify(['changeSymbol',{asset,period}]));
  socket.send('42'+JSON.stringify([native.requestEvent,native.request]));
  const bars=(start,count)=>Array.from({length:count},(_,i)=>({time:start+i*period,open:1,high:1.2,low:.9,close:1.1}));
  const initial=bars(1699993980,100);
  socket.receive('42'+JSON.stringify(['loadHistoryPeriodFast',{asset,period,data:initial}]));
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',pair:asset,periodSec:period,requestId:1});
  const older=JSON.parse(socket.sent.slice(2));assert.equal(older[0],native.requestEvent);
  assert.equal(older[1].time,initial[0].time-period);assert.equal(older[1].offset,9000);
  const sentBefore=socket.sentMessages.length;
  socket.receive('42'+JSON.stringify(['loadHistoryPeriodFast',{asset,period,data:bars(initial[0].time-100*period,100)}]));
  await new Promise(resolve=>queueMicrotask(resolve));
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',pair:asset,periodSec:period,requestId:2});
  assert.equal(h.messages.at(-1).satisfied,true);assert.equal(socket.sentMessages.length,sentBefore);
  assert.equal(h.messages.filter(m=>m.type==='WS_CANDLES_HISTORY').length,2);
});
test('market diagnostics never retain auth packets or arbitrary nested values',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42["auth",{"session":"DO_NOT_STORE_SECRET","uid":123}]');
  socket.receive('42["auth",{"session":"DO_NOT_STORE_SECRET"}]');
  socket.receive('42["history",{"asset":"EURUSD_otc","period":60,"data":[{"time":1700000000,"price":{"token":"DO_NOT_STORE_SECRET"}}]}]');
  assert.equal(JSON.stringify(h.marketTrace).includes('DO_NOT_STORE_SECRET'),false);
});

test('captured fast-history tuples preserve open/close/high/low and native broker time',()=>{
  const fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/pocket-fast-history.json','utf8'));
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42'+JSON.stringify(['changeSymbol',{asset:fixture.payload.asset,period:60}]));
  socket.receive('42'+JSON.stringify([fixture.event,fixture.payload]));
  const history=h.messages.find(m=>m.type==='WS_CANDLES_HISTORY');assert.equal(history.candles.length,3);
  assert.deepEqual({...history.candles[0]},{time:1794045420000,open:1.30883,close:1.30954,high:1.30995,low:1.30874});
  assert.equal(h.messages.find(m=>m.type==='WS_HISTORY_TICKS').ticks.length,3);
});
test('captured history schema can request older bars without a manual chart pan',async()=>{
  const fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/pocket-fast-history.json','utf8'));
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.send('42'+JSON.stringify(['changeSymbol',{asset:fixture.payload.asset,period:60}]));
  socket.receive('42'+JSON.stringify([fixture.event,fixture.payload]));
  await h.command({type:'WINKY_CMD_REQUEST_HISTORY',pair:fixture.payload.asset,periodSec:60,requestId:232});
  const sent=JSON.parse(socket.sent.slice(2));assert.equal(sent[0],'loadHistoryPeriod');
  assert.equal(sent[1].time,1794039540-60);assert.equal(sent[1].offset,200*60);assert.equal(sent[1].period,60);
  assert.ok(Number.isFinite(sent[1].index));assert.equal(h.messages.at(-1).requested,true);
});
