const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('./trading_core.js');
test('closed candle timestamps, OHLC precision, no partial candle lookahead', () => {
  const bars = core.candles([{ts:0,price:0.0000121},{ts:5000,price:0.0000123},{ts:10000,price:0.0000122},{ts:16000,price:9}],15,20000);
  assert.equal(bars.length,1); assert.equal(bars[0].high,0.0000123); assert.equal(bars[0].close,0.0000122);
});
test('strategy rejects absent, stale, foreign-symbol and incomplete history', () => {
  const now=1700000000000;
  for(const ticks of [[],[{asset:'EURUSD_otc',ts:now-5000,price:1}],[{asset:'GBPUSD_otc',ts:now,price:1}],[{asset:'EURUSD_otc',ts:now,price:1}]]) {
    assert.equal(core.analyze(ticks,'EUR/USD OTC',now).shouldTrade,false);
  }
});
test('flat data never forces an entry; complete multi-timeframe history is evaluated', () => {
  const now=1700000040000, ticks=[];
  for(let ts=now-30*60000;ts<=now;ts+=1000)ticks.push({asset:'EURUSD_otc',ts,price:1});
  const result=core.analyze(ticks,'EUR/USD OTC',now);
  assert.equal(result.shouldTrade,false); assert.match(result.vetoReason,/тренд/);
});
test('EMA/ATR preserve bullish and bearish direction at tiny price scales', () => {
  const bars=Array.from({length:30},(_,i)=>({open:1+i*.01,close:1.005+i*.01,high:1.01+i*.01,low:.99+i*.01}));
  assert.equal(core.metrics(bars).direction,'BUY');
  const tiny=bars.map(c=>Object.fromEntries(Object.entries(c).map(([k,v])=>[k,v*1e-6])));
  assert.equal(core.metrics(tiny).direction,'BUY');
  const down=bars.map(c=>({open:3-c.open,close:3-c.close,high:3-c.low,low:3-c.high}));
  assert.equal(core.metrics(down).direction,'SELL');
});
test('strict broker settlements: unknown is never LOSS, refund distinct, exact cents', () => {
  assert.equal(core.settlement({id:'a'}),null);
  assert.equal(core.settlement({id:'a',profit:'46'}),null);
  assert.equal(core.settlement({id:'a',profit:45.75}).outcome,'WIN');
  assert.equal(core.settlement({id:'a',profit:-50}).outcome,'LOSS');
  assert.equal(core.settlement({id:'a',profit:0}).outcome,'REFUND');
});
test('confirmed setups select different expirations; direction and scale are stable', () => {
  const now=1700000042000;
  for (const [period, amplitude, phase, expiry] of [[45,.1,.4,'2m'],[60,.1,.6,'1m']]) {
    const ticks=[];
    for(let ts=now-30*60000;ts<=now;ts+=1000) {
      const t=(ts-now)/1000;
      ticks.push({ts,asset:'EURUSD_otc',price:100+t*.001+amplitude*Math.sin(t*2*Math.PI/period+phase)});
    }
    const signal=core.analyze(ticks,'EUR/USD OTC',now);
    assert.equal(signal.shouldTrade,true); assert.equal(signal.direction,'BUY');
    assert.equal(signal.recommendedExpiry,expiry);
    const scaled=core.analyze(ticks.map(t=>({...t,price:t.price*1e-7})),'EUR/USD OTC',now);
    assert.equal(scaled.direction,signal.direction); assert.equal(scaled.recommendedExpiry,expiry);
    const inverse=core.analyze(ticks.map(t=>({...t,price:200-t.price})),'EUR/USD OTC',now);
    assert.equal(inverse.shouldTrade,true); assert.equal(inverse.direction,'SELL');
    assert.equal(core.analyze(ticks,'EUR/USD OTC',now+10000).shouldTrade,false);
  }
});
test('socket hook preserves native order, matches identity and handles binary close packet', () => {
  const messages=[],now=Date.now();
  class Socket { constructor(){this.handlers={};} addEventListener(k,fn){this.handlers[k]=fn;} send(data){this.sent=data;} receive(data){this.handlers.message({data});} }
  class Canvas {} Canvas.prototype.getContext=()=>null;
  class Context {} Context.prototype.fillText=()=>{}; Context.prototype.fillRect=()=>{}; Context.prototype.strokeRect=()=>{}; Context.prototype.clearRect=()=>{};
  const window={ WebSocket:Socket, postMessage:m=>messages.push(m), addEventListener:()=>{} };
  const sandbox={window,WinkyTradingCore:core,HTMLCanvasElement:Canvas,CanvasRenderingContext2D:Context,console,Date,TextDecoder,TextEncoder,ArrayBuffer,Uint8Array,Blob,setInterval:()=>{},setTimeout:()=>{},document:{querySelectorAll:()=>[],querySelector:()=>null},MutationObserver:class{observe(){}}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/page_hook.js','utf8'),sandbox);
  const socket=new window.WebSocket('wss://example.test');
  window.__winkyArmedOrder={at:now};
  const packet='42'+JSON.stringify(['openOrder',{asset:'EURUSD_otc',amount:50,time:60,action:'call',optionType:100}]);
  socket.send(packet); assert.equal(socket.sent,packet);
  const o={id:'correct',asset:'EURUSD_otc',amount:50,action:'call',open_time:now/1000,close_time:(now+60000)/1000};
  socket.receive('42'+JSON.stringify(['successopenOrder',{...o,asset:'GBPUSD_otc'}]));
  assert.equal(messages.filter(m=>m.type==='ORDER_OPENED').length,0);
  socket.receive('42'+JSON.stringify(['successopenOrder',o]));
  assert.equal(messages.find(m=>m.type==='ORDER_OPENED').orderId,'correct');
  socket.receive('451-["successcloseOrder",{"_placeholder":true,"num":0}]');
  socket.receive(new TextEncoder().encode(JSON.stringify({deals:[{...o,profit:45.75}]})).buffer);
  assert.equal(messages.find(m=>m.type==='ORDER_SETTLED').result.profit,45.75);
});
