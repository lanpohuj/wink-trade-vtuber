// Real skinned-mesh checks and optional offline export; no live app connection.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=path.join(__dirname,'.runtime/revision-3'),exporting=process.argv.includes('--export');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:760,height:900}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto('http://127.0.0.1:8794');await page.waitForFunction(()=>!document.getElementById('play').disabled);
  const candidate=page.frames().find(f=>f.url().endsWith('candidate=1'));
  const report={checks:[],errors,motions:{},ui:{}};
  const check=(name,value)=>{
   if(!value)fs.writeFileSync(path.join(output,'expression-verification.json'),JSON.stringify(report,null,2)+'\n');
   assert.ok(value,name);report.checks.push(name);
  };
  for(const [action,label]of [['quiet_laugh','Тихий смех'],['ponder','Задумчивость'],['playful_doubt','Игривое недоверие'],['hand_heart','Сердечко руками']]){
   await page.getByRole('button',{name:label,exact:true}).click();
   await candidate.waitForFunction(action=>vtuber.actionMode===action,action);
   await page.click('#stop');await candidate.waitForFunction(()=>vtuber.actionMode===null);
   check(action+' preview and Stop work through the UI',true);report.ui[action]='passed';
  }
  await page.evaluate(()=>{
   document.getElementById('baseline').closest('section').remove();
   for(const el of document.querySelector('main').children)if(!el.classList.contains('views'))el.style.display='none';
   const views=document.querySelector('.views');views.style.display='block';
   const view=document.querySelector('.view');view.style.width='600px';view.style.margin='auto';
   document.querySelector('.view iframe').style.height='720px';
   document.querySelector('.view h2').textContent='Отдельный стенд · новые движения';
   const title=document.createElement('h1');title.id='expressionTitle';title.style.cssText='font-size:22px;line-height:1.25;height:56px;margin:0 0 6px';document.querySelector('main').prepend(title);
  });
  await candidate.evaluate(()=>{
   window.expressionUpdate=vtuber.update.bind(vtuber);vtuber.update=()=>{};
   const c=vtuber,V=n=>c.bones['Shibahu_'+n].getWorldPosition(new THREE.Vector3());
   window.resetExpression=action=>{
    for(const[n,r]of Object.entries(c.baseRotations))c.bones[n]?.rotation.set(r.x,r.y,r.z);
    for(const[n,p]of Object.entries(c.basePositions))c.bones[n]?.position.set(p.x,p.y,p.z);
    c.actionMode=null;c.actionTimer=0;c.waveTimer=0;c.speechHoldTimer=0;c.talkBodyWeight=0;c.smoothedRms=0;
    c.currentEmotion='idle';c.emotionResetTimer=0;c.tailPhase=0;c.faceMesh.morphTargetInfluences.fill(0);
    for(let n=0;n<120;n++)expressionUpdate(1/60,0);
    c.blinkTimer=0;c.isBlinking=false;c.nextBlinkInterval=3.5;c.triggerAction(action,3.2);
   };
   const tip=(side,type)=>c.bones[`Shibahu_${side}Hand${type}3`].localToWorld(new THREE.Vector3(side==='Right'?-1.4:1.4,0,0));
   window.expressionMetrics=()=>{
    c.fbx.updateMatrixWorld(true);
    const ri=tip('Right','Index'),li=tip('Left','Index'),rt=tip('Right','Thumb'),lt=tip('Left','Thumb');
    const h=c.bones.Shibahu_Head,s=c.bones.Shibahu_RightShoulder;
    return {wrist:V('RightHand').toArray(),indexTip:ri.toArray(),thumbTip:rt.toArray(),leftIndexTip:li.toArray(),leftThumbTip:lt.toArray(),
     indexGap:ri.distanceTo(li),thumbGap:rt.distanceTo(lt),heartHeight:(ri.y+li.y-rt.y-lt.y)/2,
     upperArch:(V('RightHandIndex3').y+V('LeftHandIndex3').y-ri.y-li.y)/2,
     headYaw:h.rotation.y-c.baseRotations[h.name].y,shoulderZ:s.rotation.z-c.baseRotations[s.name].z,
     active:c.actionMode};
   };
   const mesh=c.faceMesh,g=mesh.geometry,base=g.attributes.position,dict=mesh.morphTargetDictionary;
   const landmark=(name,side)=>{
    const morph=g.morphAttributes.position[dict[name]??dict['blendShape1.'+name]],rows=[];
    for(let i=0;i<base.count;i++){
     if(name==='face_mesh9'&&base.getY(i)>=138.3)continue;
     if(side && (base.getY(i)<138.3 || (side<0?base.getX(i)>=0:base.getX(i)<=0)))continue;
     const delta=new THREE.Vector3().fromBufferAttribute(morph,i);if(!g.morphTargetsRelative)delta.sub(new THREE.Vector3().fromBufferAttribute(base,i));
     const weight=delta.length();if(weight>.07)rows.push([i,weight]);
    }
    return rows;
   };
   const landmarks={mouth:landmark('face_mesh9'),leftEye:landmark('face_mesh8',-1),rightEye:landmark('face_mesh8',1)};
   const point=rows=>{const sum=new THREE.Vector3();let weight=0;for(const[i,w]of rows){const p=mesh.getVertexPosition(i,new THREE.Vector3());mesh.localToWorld(p);sum.addScaledVector(p,w);weight+=w;}return sum.divideScalar(weight);};
   window.occlusionProbe=()=>{
    c.fbx.updateMatrixWorld(true);const meshes=[];
    c.fbx.traverse(m=>{if(m.isMesh&&m.visible){if(m.isSkinnedMesh)m.computeBoundingSphere();meshes.push(m);}});
    const firstHit=target=>{
     const ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());
     const hit=ray.intersectObjects(meshes,false).find(h=>{const mat=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return mat?.visible!==false;});
     if(!hit)return {handWeight:0,mesh:null};
     const geo=hit.object.geometry,indices=geo.attributes.skinIndex,weights=geo.attributes.skinWeight;let handWeight=0;
     if(indices)for(const v of [hit.face.a,hit.face.b,hit.face.c])for(let k=0;k<4;k++)if(hit.object.skeleton.bones[indices.getComponent(v,k)]?.name.includes('Hand'))handWeight+=weights.getComponent(v,k)/3;
     return {mesh:hit.object.name,handWeight,point:hit.point.toArray()};
    };
    const mouth=point(landmarks.mouth);mouth.y+=.4;
    const mouthHits=[[-.65,0],[0,0],[.65,0],[0,.45],[0,-.35]].map(([x,y])=>firstHit(mouth.clone().add(new THREE.Vector3(x,y,0))));
    const metrics=expressionMetrics(),index=new THREE.Vector3(...metrics.indexTip),chin=mouth.clone();chin.y-=2;
    const gap=new THREE.Vector3(...metrics.indexTip).lerp(new THREE.Vector3(...metrics.leftIndexTip),.5)
      .lerp(new THREE.Vector3(...metrics.thumbTip).lerp(new THREE.Vector3(...metrics.leftThumbTip),.5),.55);
    return {mouth:mouth.toArray(),mouthHits,eyes:[firstHit(point(landmarks.leftEye)),firstHit(point(landmarks.rightEye))],
     chinDistance:index.distanceTo(chin),heartOpening:firstHit(gap)};
   };
  });
  let imageIndex=0;const framesDir=path.join(output,'frames');if(exporting)fs.mkdirSync(framesDir,{recursive:true});
  for(const [action,title]of [
   ['shy','Смущение · ладонь прикрывает рот'],['quiet_laugh','Тихий смех · лёгкие движения плеч и головы'],
   ['ponder','Задумчивость · палец у подбородка'],['playful_doubt','Игривое недоверие · мягкое покачивание головой'],['hand_heart','Сердечко руками · благодарность за поддержку'],
  ]){
   await page.evaluate(text=>document.getElementById('expressionTitle').textContent=text,title);
   await candidate.evaluate(action=>resetExpression(action),action);
   const samples=[],probes=[];
   for(let n=1;n<=108;n++){
    const time=n/30,sample=await candidate.evaluate(time=>{expressionUpdate(1/30,time);return expressionMetrics();},time);samples.push({time,...sample});
    if(n===42||n===66)probes.push({time,...await candidate.evaluate(()=>occlusionProbe())});
    if(exporting)await page.screenshot({path:path.join(framesDir,String(imageIndex++).padStart(4,'0')+'.jpg'),type:'jpeg',quality:86});
    if(n===48)await page.screenshot({path:path.join(output,action+'-review.png')});
   }
   report.motions[action]={samples,probes};
   check(action+' has finite positions and returns to idle',samples.every(s=>[...s.wrist,...s.indexTip].every(Number.isFinite))&&samples.at(-1).active===null);
   check(action+' leaves both eyes uncovered by hands',probes.every(p=>p.eyes.every(h=>h.handWeight<.1)));
   if(action==='shy')check('shy palm physically covers the mouth',probes.every(p=>p.mouthHits.every(h=>h.handWeight>.8)));
   if(action==='ponder')check('ponder finger reaches the chin',probes.every(p=>p.chinDistance<4));
   if(action==='quiet_laugh'){
    const held=samples.filter(s=>s.time>=.9&&s.time<=2.3).map(s=>s.shoulderZ);
    check('laugh shoulders have a separate rhythmic movement',Math.max(...held)-Math.min(...held)>.025);
   }
   if(action==='playful_doubt'){
    const held=samples.filter(s=>s.time>=.8&&s.time<=2.3).map(s=>s.headYaw);
    check('playful doubt turns the head in both directions',Math.min(...held)<-.06&&Math.max(...held)>.06);
   }
   if(action==='hand_heart'){
    const held=samples.filter(s=>s.time>=1.3&&s.time<=2.4);
    check('heart index fingertips meet',held.every(s=>s.indexGap<.8));
    check('heart thumb tips meet',held.every(s=>s.thumbGap<.8));
    check('heart has an upper cleft and lower point',held.every(s=>s.upperArch>.5&&s.heartHeight>5));
    check('heart opening is not filled by a hand mesh',probes.every(p=>p.heartOpening.handWeight<.1));
   }
   report.motions[action]={samples,probes};
  }
  check('no browser errors',errors.length===0);check('browser requests stay on the laboratory port',requests.every(r=>r.startsWith('http://127.0.0.1:8794/')));
  fs.writeFileSync(path.join(output,'expression-verification.json'),JSON.stringify(report,null,2)+'\n');
  if(exporting)execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',path.join(framesDir,'%04d.jpg'),'-frames:v',String(imageIndex),'-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,'new-expressions.mp4')]);
  console.log(JSON.stringify({checks:report.checks.length,errors,exported_frames:imageIndex,
   mouth_coverage_min:Math.min(...report.motions.shy.probes.flatMap(p=>p.mouthHits.map(h=>h.handWeight))),
   heart_index_gap_max:Math.max(...report.motions.hand_heart.samples.filter(s=>s.time>=1.3&&s.time<=2.4).map(s=>s.indexGap))}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
