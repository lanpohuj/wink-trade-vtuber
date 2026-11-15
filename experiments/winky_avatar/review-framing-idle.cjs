// Independent full skin-vertex checks, not the reduced hull used by the camera.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.join(__dirname,'.runtime/framing-idle');fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch();const report={checks:[],errors:[],framing:[],idle:[]};
 try{
 const page=await browser.newPage({viewport:{width:600,height:720}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:8794/frame.html?candidate=1');await page.waitForFunction(()=>window.labReady);
 await page.evaluate(()=>{
  avatarLabReceive({type:'idle-enabled',enabled:false});const c=vtuber;
  window.savedUpdate=c.update.bind(c);c.update=()=>{};window.skinRows=[];
  c.fbx.traverse(m=>{if(!m.isSkinnedMesh||!m.visible)return;const g=m.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;if(!si)return;
   const visible=new Set();for(const group of g.groups.length?g.groups:[{start:0,count:g.index?.count||p.count,materialIndex:0}]){
    const mat=Array.isArray(m.material)?m.material[group.materialIndex]:m.material;if(mat?.visible===false)continue;
    for(let k=group.start;k<group.start+group.count;k++)visible.add(g.index?g.index.getX(k):k);
   }
   const ids=[];for(const i of visible){let weight=0;for(let k=0;k<4;k++)if(/Arm|Hand|Shoulder/.test(m.skeleton.bones[si.getComponent(i,k)]?.name))weight+=sw.getComponent(i,k);if(weight>.35||p.getY(i)>=130)ids.push(i);}
   if(ids.length)skinRows.push({m,ids});
  });
  window.probeSkin=()=>{let depthMin=Infinity,depthMax=-Infinity;const min=[Infinity,Infinity],max=[-Infinity,-Infinity];c.fbx.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   for(const{m,ids}of skinRows)for(const i of ids){const p=m.getVertexPosition(i,new THREE.Vector3());m.localToWorld(p);p.project(camera);depthMin=Math.min(depthMin,p.z);depthMax=Math.max(depthMax,p.z);min[0]=Math.min(min[0],p.x);min[1]=Math.min(min[1],p.y);max[0]=Math.max(max[0],p.x);max[1]=Math.max(max[1],p.y);}
   return{min,max,depthMin,depthMax,peak:Math.max(...max,-min[0],-min[1])};};
  window.resetPose=()=>{avatarLabReceive({type:'cancel'});for(const[n,r]of Object.entries(c.baseRotations))c.bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,p]of Object.entries(c.basePositions))c.bones[n]?.position.set(p.x,p.y,p.z);c.actionMode=null;c.actionTimer=0;c.waveTimer=0;c.currentEmotion='idle';c.emotionResetTimer=0;c.speechHoldTimer=0;c.smoothedRms=0;};
 });
 const check=(name,result)=>{assert.ok(result,name);report.checks.push(name);};
 for(const [width,height]of [[600,720],[420,720],[900,720],[200,720]]){
  await page.setViewportSize({width,height});await page.waitForFunction(aspect=>Math.abs(camera.aspect-aspect)<.001,width/height);
  for(const scale of [.5,1,1.5])for(const action of ['idle','wave','hip_groove','dance','cheer','neko_paws','flirt_kiss','shy','ponder','hand_heart','quiet_laugh','playful_doubt','peek_closer']){
   const result=await page.evaluate(({scale,action})=>{
    resetPose();winkySetScale(scale);for(let n=0;n<45;n++)savedUpdate(1/30,0);
    if(action==='wave')vtuber.wave();else if(action!=='idle')vtuber.triggerAction(action,3.2);
    let worst={peak:0},badDepth=false;for(let n=0;n<108;n++){savedUpdate(1/30,n/30);if(n%12===0){const probe=probeSkin();badDepth ||= probe.depthMax>=1||probe.depthMin<=-1;if(probe.peak>worst.peak)worst={...probe,time:n/30};}}
    return{scale,action,...worst,badDepth,frame:winkyFraming.state};
   },{scale,action});report.framing.push({width,height,...result});
   if(result.peak>1||result.badDepth)throw Error('Clipped full skin: '+JSON.stringify(report.framing.at(-1)));
  }
 }
 check('all 13 motions keep the actual arms and head skin inside four viewport shapes at 50/100/150%',report.framing.every(r=>r.peak<=1&&!r.badDepth));
 await page.setViewportSize({width:600,height:720});
 for(const scale of [.5,1.5])for(const offset of [-.5,.5]){
  const r=await page.evaluate(({scale,offset})=>{resetPose();winkySetScale(scale);winkySetOffsetY(offset);savedUpdate(1/30,0);return probeSkin();},{scale,offset});
  check(`vertical adjustment stays safe at scale ${scale} and Y ${offset}`,r.peak<=1);
 }
 await page.evaluate(()=>{resetPose();winkySetScale(1);winkySetOffsetY(0);avatarLabIdle.random=(()=>{let n=12345;return()=>((n=(1664525*n+1013904223)>>>0)/4294967296);})();avatarLabReceive({type:'idle-enabled',enabled:true});});
 for(const [name,context]of [['free',{}],['analysis',{phase:'ANALYZING',connected:true}],['fish',{preparing:2}],['loss',{result:'LOSS',result_age_sec:0}]]){
  const result=await page.evaluate(({name,context})=>{
   avatarLabReceive({type:'cancel'});avatarLabIdle.interrupt(0);const starts=[],gestures=new Set();let activeFrames=0,last=0;
   for(let n=0;n<1800;n++){
    if(n%60===0)avatarLabReceive({type:'context',context});savedUpdate(1/30,n/30);
    const s=avatarLabState;if(s.idle){activeFrames++;gestures.add(s.idle);if(last!==s.activityId){last=s.activityId;starts.push({time:n/30,gesture:s.idle});}}
   }
   return{name,starts,gestures:[...gestures],active_fraction:activeFrames/1800};
  },{name,context});report.idle.push(result);
  check(name+' has visible, contextual autonomous movement',result.starts.length>=7);
  if(name!=='free')check(name+' excludes playful dances and kisses',result.gestures.every(g=>['tilt','nod','ponder','peek_closer'].includes(g)));
 }
 const transition=await page.evaluate(()=>{
  avatarLabReceive({type:'context',context:{}});avatarLabReceive({type:'begin',event:{id:'speech-priority',category:'NARRATE_LESSON',duration:8}});
  avatarLabReceive({type:'clock',id:'speech-priority',time:5,rms:.4});savedUpdate(1/30,5);
  return{...avatarLabState,action:vtuber.actionMode};
 });check('real speech replaces idle immediately and uses its second phrase gesture',transition.speaking&&transition.id==='speech-priority'&&!transition.idle&&transition.beat===1);
 check('no browser JavaScript errors',report.errors.length===0);
 console.log(JSON.stringify({checks:report.checks.length,cases:report.framing.length,max_skin_ndc:Math.max(...report.framing.map(r=>r.peak)),idle:report.idle.map(({name,active_fraction,gestures})=>({name,active_fraction,gestures})),errors:report.errors}));
 }finally{fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
