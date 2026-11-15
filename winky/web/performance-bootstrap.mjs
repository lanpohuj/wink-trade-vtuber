// Keep the original avatar.js intact. Only the speech performance adapter is added.
import {installPerformance} from './performance/controller.mjs';
let runtime=null,pending=[];
const receive=message=>{
  if(runtime)runtime.receive(message);
  else {pending.push(message);if(pending.length>256)pending.shift();}
};
window.winkyPerformance={receive,ready:false};
await import('/avatar.js?v=20261028_visual_v1');
while(!window.vtuber)await new Promise(resolve=>setTimeout(resolve,25));
runtime=installPerformance(window.vtuber);
window.winkyPerformance={receive,ready:true,get state(){return runtime.state;}};
// Loading a model can outlast a short phrase. Never replay an ended phrase or
// release its kiss after it has already disappeared from the actual audio queue.
let start=null,clock=null;const options=new Map();
for(const message of pending){
  if(['context','idle-enabled'].includes(message.type))options.set(message.type,message);
  if(message.type==='begin'){start=message;clock=null;}
  if(message.type==='clock'&&start?.event.id===message.id)clock=message;
  if(message.type==='cancel'&&(!message.id||message.id===start?.event.id)){start=null;clock=null;}
  if(message.type==='end'&&message.id===start?.event.id){start=null;clock=null;}
}
pending=[];
for(const message of options.values())runtime.receive(message);
if(start){runtime.receive(start);if(clock)runtime.receive(clock);}
const report=()=>window.pywebview?.api?.report_performance_ready?.({release:'speech-sync-v1'});
window.addEventListener('pywebviewready',report,{once:true});report();
