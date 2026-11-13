const fs=require('node:fs');
const vm=require('node:vm');

function loadHook() {
  let now=1700000000000;
  const messages=[],intervals=[],commands=[];
  const storageMock = new Map();
  const defaultSessionStorage = {
    getItem: k => (storageMock.has(k) ? storageMock.get(k) : null),
    setItem: (k, v) => storageMock.set(k, String(v)),
    removeItem: k => storageMock.delete(k),
    clear: () => storageMock.clear(),
    _storage: storageMock
  };
  class Socket { constructor(){this.handlers={};} addEventListener(event,fn){this.handlers[event]=fn;} send(data){this.sent=data;(this.sentMessages || (this.sentMessages=[])).push(data);} receive(data){this.handlers.message({data});} }
  class Canvas {} Canvas.prototype.getContext=()=>null;
  class Context {} Context.prototype.fillText=()=>{};Context.prototype.fillRect=()=>{};
  const window={WebSocket:Socket,sessionStorage:defaultSessionStorage,postMessage:m=>messages.push(m),addEventListener(event,fn){if(event==='message')commands.push(fn);}};
  const document={querySelectorAll:()=>[],querySelector:()=>null,dispatchEvent(){}};
  const sandbox={window,document,sessionStorage:defaultSessionStorage,HTMLCanvasElement:Canvas,CanvasRenderingContext2D:Context,
    console:{log(){},warn(){},error(){}},TextDecoder,TextEncoder,ArrayBuffer,Uint8Array,Blob,
    Date:class extends Date{static now(){return now;}},setInterval(fn,ms){intervals.push({fn,ms});},clearInterval(){},
    setTimeout:(fn,ms=0)=>{queueMicrotask(()=>{now+=ms;fn();});},
    MouseEvent:class{constructor(type){this.type=type;}},KeyboardEvent:class{},
    HTMLInputElement:class{},performance:{now:()=>now}};
  Object.defineProperty(sandbox.HTMLInputElement.prototype,'value',{set(value){this._value=value;},get(){return this._value;}});
  let source=fs.readFileSync(__dirname+'/page_hook.js','utf8');
  const at=source.lastIndexOf('})();');
  source=source.slice(0,at)+`globalThis.testing={marketTrace,handleMainWorldSwitchPair,closeAssetMenu,handleMainWorldSetExpiry,handleMainWorldClickTrade,getActualChartTimeframeBadge,handleMainWorldEnsureChartTimeframe,selectPairCandidate,pairVisitedAt,sandboxStreamNormalizer,shouldAlignSession,registerNormalizerWindow,transformIncomingMessageEvent,getAssetMicroStep,syncHeaderAccountLabel};`+source.slice(at);
  vm.runInNewContext(source,sandbox);
  return {...sandbox.testing,window,document,messages,Socket:window.WebSocket,now:()=>now,
    async command(data){for(const fn of commands)await fn({source:window,data:{source:'WINKY_CONTENT',...data}});},
    runIntervals(ms){for(const interval of intervals)if(interval.ms===ms)interval.fn();}};
}

module.exports={loadHook};
