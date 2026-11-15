// Real-rig visual and integration checks. Results are simulated; no broker, chat or TTS calls.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'.runtime/win-reactions');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch();const report={checks:[],errors:[],cases:[],rounds:[]};
 try{
 const p=await browser.newPage({viewport:{width:600,height:720}});p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto('http://127.0.0.1:8794/frame.html?candidate=1');await p.waitForFunction(()=>window.labReady);
 await p.addStyleTag({content:'html,body{background:#20283a!important}'});
 await p.evaluate(()=>{
  avatarLabReceive({type:'idle-enabled',enabled:false});window.step=vtuber.update.bind(vtuber);vtuber.update=()=>{};
  window.rows=[];
  vtuber.fbx.traverse(m=>{if(!m.isSkinnedMesh||!m.visible)return;const g=m.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;if(!si)return;
   const visible=new Set();for(const group of g.groups.length?g.groups:[{start:0,count:g.index?.count||p.count,materialIndex:0}]){
    const mat=Array.isArray(m.material)?m.material[group.materialIndex]:m.material;if(mat?.visible===false)continue;
    for(let k=group.start;k<group.start+group.count;k++)visible.add(g.index?g.index.getX(k):k);
   }
   const ids=[];for(const i of visible){let w=0;for(let k=0;k<4;k++)if(/Arm|Hand|Shoulder/.test(m.skeleton.bones[si.getComponent(i,k)]?.name))w+=sw.getComponent(i,k);if(w>.35||p.getY(i)>=130)ids.push(i);}
   if(ids.length)rows.push({m,ids});
  });
  window.skin=()=>{let peak=0,zmin=Infinity,zmax=-Infinity;vtuber.fbx.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   for(const{m,ids}of rows)for(const i of ids){const v=m.getVertexPosition(i,new THREE.Vector3());m.localToWorld(v);v.project(camera);peak=Math.max(peak,Math.abs(v.x),Math.abs(v.y));zmin=Math.min(zmin,v.z);zmax=Math.max(zmax,v.z);}
   return{peak,zmin,zmax};};
  window.reset=()=>{avatarLabReceive({type:'cancel'});for(const[n,r]of Object.entries(vtuber.baseRotations))vtuber.bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,v]of Object.entries(vtuber.basePositions))vtuber.bones[n]?.position.set(v.x,v.y,v.z);vtuber.smoothedRms=0;};
 });
 const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);};
 for(const[width,height]of [[600,720],[420,720],[900,720],[200,720]]){
  await p.setViewportSize({width,height});await p.waitForFunction(a=>Math.abs(camera.aspect-a)<.001,width/height);
  for(const scale of [.5,1,1.5])for(const action of ['victory_jump','victory_wave','neko_paws','hip_groove','hand_heart']){
   const r=await p.evaluate(({scale,action})=>{
    reset();winkySetScale(scale);for(let n=0;n<30;n++)step(1/30,0);vtuber.triggerAction(action,3.8);
    let peak=0,zmin=Infinity,zmax=-Infinity,maxY=-Infinity,minY=Infinity;const hands=[];
    for(let n=0;n<120;n++){step(1/30,n/30);if(n%6===0){const s=skin();peak=Math.max(peak,s.peak);zmin=Math.min(zmin,s.zmin);zmax=Math.max(zmax,s.zmax);}
     const y=vtuber.bones.Shibahu_Hips.position.y-vtuber.basePositions.Shibahu_Hips.y;maxY=Math.max(maxY,y);minY=Math.min(minY,y);
     if(n===36)for(const side of ['Right','Left'])hands.push(vtuber.bones['Shibahu_'+side+'Hand'].getWorldPosition(new THREE.Vector3()).y-vtuber.bones.Shibahu_Head.getWorldPosition(new THREE.Vector3()).y);
    }
    return{scale,action,peak,zmin,zmax,maxY,minY,hands};
   },{scale,action});report.cases.push({width,height,...r});
   check(`full arms/head in frame: ${width}x${height} ${scale} ${action}`,r.peak<1&&r.zmin>-1&&r.zmax<1);
   if(action==='victory_jump'){check('jump includes lift and compression '+width+' '+scale,r.maxY>4&&r.minY<-.5);}
   if(action.startsWith('victory_'))check('both hands reach above the head '+width+' '+scale,r.hands.every(v=>v>12*scale));
  }
 }
 await p.setViewportSize({width:600,height:720});
 for(const action of ['victory_jump','victory_wave']){
  await p.evaluate(action=>{reset();winkySetScale(1);vtuber.triggerAction(action,3.8);for(let n=0;n<40;n++)step(1/30,n/30);winkyScreenshot();},action);
  await p.screenshot({path:path.join(out,action+'.png')});
 }
 const integration=await p.evaluate(()=>{
  reset();const send=avatarLabReceive;send({type:'begin',event:{id:'chat-playing',category:'CHAT_REPLY',duration:20}});send({type:'clock',id:'chat-playing',time:1,rms:.4});
  const results=[];
  for(let seq=1;seq<=15;seq++){
   const context={connected:true,result:'WIN',result_key:`browser:${seq}:result`,result_age_sec:0};send({type:'context',context});step(1/30,seq);
   const first={...avatarLabState};send({type:'context',context});step(1/30,seq);const repeated={...avatarLabState};
   send({type:'begin',event:{id:'result-voice-'+seq,category:'TRADE_WIN',session_id:'browser',trade_seq:seq,created_at:Date.now(),duration:8}});
   send({type:'clock',id:'result-voice-'+seq,time:1,rms:.4});step(1/30,seq);
   const announced={...avatarLabState};for(let n=0;n<130;n++)step(1/30,n/30);
   results.push({first,repeated,announced,after:{...avatarLabState}});
  }
  return results;
 });report.rounds=integration;
 for(let n=0;n<15;n++){
  const r=integration[n];check('result reacts without interrupting speech '+n,r.first.phase==='celebration'&&r.first.speaking);
  check('heartbeat and voiced result keep the same reaction '+n,r.first.celebrationId===r.repeated.celebrationId&&r.first.celebrationId===r.announced.celebrationId);
  check('celebration ends while speech remains at its frozen clock '+n,!r.after.celebration&&r.after.id==='result-voice-'+(n+1)&&r.after.speaking&&r.after.gesture==='listen');
  if(n)check('no consecutive repetition '+n,r.first.gesture!==integration[n-1].first.gesture);
 }
 for(let n=0;n<15;n+=5)check('complete five-motion round '+n,new Set(integration.slice(n,n+5).map(r=>r.first.gesture)).size===5);
 const stop=await p.evaluate(()=>{
  avatarLabReceive({type:'context',context:{connected:true,result:'WIN',result_key:'browser:16:result',result_age_sec:0}});step(1/30,0);
  avatarLabReceive({type:'cancel',id:'stale'});step(1/30,0);const stale=!!avatarLabState.celebration;
  avatarLabReceive({type:'cancel'});step(1/30,0);return{stale,stopped:!avatarLabState.celebration};
 });check('stale Stop ignored; actual Stop cancels the visual result',stop.stale&&stop.stopped);
 check('no browser errors',!report.errors.length);
 console.log(JSON.stringify({checks:report.checks.length,cases:report.cases.length,max_skin_ndc:Math.max(...report.cases.map(r=>r.peak)),rounds:integration.map(r=>r.first.gesture),errors:report.errors}));
 }finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
