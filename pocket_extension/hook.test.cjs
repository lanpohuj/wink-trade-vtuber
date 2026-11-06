const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadHook() {
  let now=1700000000000;
  const messages=[];
  class Socket { constructor(){this.handlers={};} addEventListener(event,fn){this.handlers[event]=fn;} send(data){this.sent=data;} receive(data){this.handlers.message({data});} }
  class Canvas {} Canvas.prototype.getContext=()=>null;
  class Context {} Context.prototype.fillText=()=>{};Context.prototype.fillRect=()=>{};
  const window={WebSocket:Socket,postMessage:m=>messages.push(m),addEventListener(){}};
  const document={querySelectorAll:()=>[],querySelector:()=>null,dispatchEvent(){}};
  const sandbox={window,document,HTMLCanvasElement:Canvas,CanvasRenderingContext2D:Context,
    console:{log(){},warn(){},error(){}},TextDecoder,TextEncoder,ArrayBuffer,Uint8Array,Blob,
    Date:class extends Date{static now(){return now;}},setInterval(){},clearInterval(){},
    setTimeout:(fn,ms=0)=>{queueMicrotask(()=>{now+=ms;fn();});},
    MouseEvent:class{constructor(type){this.type=type;}},KeyboardEvent:class{},
    HTMLInputElement:class{},performance:{now:()=>now}};
  Object.defineProperty(sandbox.HTMLInputElement.prototype,'value',{set(value){this._value=value;},get(){return this._value;}});
  let source=fs.readFileSync(__dirname+'/page_hook.js','utf8');
  const at=source.lastIndexOf('})();');
  source=source.slice(0,at)+`globalThis.testing={handleMainWorldSetExpiry,handleMainWorldClickTrade,getActualChartTimeframeBadge,handleMainWorldEnsureChartTimeframe};`+source.slice(at);
  vm.runInNewContext(source,sandbox);
  return {...sandbox.testing,window,document,messages,Socket:window.WebSocket,now:()=>now};
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
  socket.receive('451-["successcloseOrder",{"_placeholder":true,"num":0}]');
  socket.receive(new TextEncoder().encode(JSON.stringify({deals:[{...opened,net_profit:46}]})).buffer);
  assert.equal(h.messages.find(m=>m.type==='BROKER_DEAL_RESULT').net,46);
});
test('fractional timestamps and canvas preservation remain supported',()=>{
  const h=loadHook(),socket=new h.Socket('wss://test');
  socket.receive('42["updateStream",[["EURUSD_otc",1700000000.382,1.052345]]]');
  assert.equal(h.messages.find(m=>m.type==='TICK').price,1.052345);
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
  const item={textContent:'S15',offsetParent:{},children:[],getAttribute:()=>null,getBoundingClientRect:()=>({left:100,top:100,width:30,height:25}),dispatchEvent(){},closest(){return this;},click(){itemClicks++;toolbar.textContent='S15';}};
  h.document.querySelectorAll=selector=>selector.startsWith('[data-period=')?[item]:[toolbar];
  await h.handleMainWorldEnsureChartTimeframe('S15');
  assert.equal(menuClicks,1);assert.equal(itemClicks,1);
  assert.equal(h.messages.find(m=>m.type==='WINKY_RESP_CHART_TIMEFRAME').ok,true);
});
