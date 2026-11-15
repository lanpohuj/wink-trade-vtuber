// Whole-chain regression, including the rejected c6e7003 poses, not wrist positions alone.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const old=execFileSync('git',['show','c6e7003:experiments/winky_avatar/victory-poses.mjs'],{encoding:'utf8'});const key='export const VICTORY_POSES=';const baseline=JSON.parse(old.slice(old.indexOf(key)+key.length).trim().replace(/;$/,''));
(async()=>{const b=await chromium.launch();const out=path.join(__dirname,'.runtime/arm-rotation');fs.mkdirSync(out,{recursive:true});const report={checks:[],errors:[]};
try{const p=await b.newPage({viewport:{width:1000,height:920}});p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:8794/frame.html?candidate=1');await p.waitForFunction(()=>window.labReady);await p.addStyleTag({content:'html,body{background:#20283a!important}'});
 const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
 const metrics=await p.evaluate(async baseline=>{
  const{ARM_JOINTS,VICTORY_POSES}=await import('/victory-poses.mjs');const c=vtuber,T=THREE;
  const measure=poses=>Object.entries(poses).map(([mode,rows])=>{
   const maxima={step:0,offHinge:0,forearmTwist:0,elbowFlex:0,upperStep:0,upperTwist:0},minima={elbowFlex:Infinity};let previous={},previousUpper={};const samples=[];
   for(const[t,values]of rows)for(const side of ['Right','Left']){
    const name=side+'ForeArm',k=ARM_JOINTS.indexOf(name)*3,base=c.baseRotations['Shibahu_'+name],v=values.slice(k,k+3);
    const upperName=side+'Arm',uk=ARM_JOINTS.indexOf(upperName)*3,ub=c.baseRotations['Shibahu_'+upperName],uv=values.slice(uk,uk+3),uq=new T.Quaternion().setFromEuler(new T.Euler(ub.x+uv[0],ub.y+uv[1],ub.z+uv[2])),ud=new T.Quaternion().setFromEuler(new T.Euler(ub.x,ub.y,ub.z)).invert().multiply(uq.clone());
    const ut=new T.Quaternion(ud.x,0,0,ud.w).normalize();maxima.upperTwist=Math.max(maxima.upperTwist,2*Math.acos(Math.min(1,Math.abs(ut.w)))*180/Math.PI);if(previousUpper[side])maxima.upperStep=Math.max(maxima.upperStep,previousUpper[side].angleTo(uq)*180/Math.PI);previousUpper[side]=uq;

    const rest=new T.Quaternion().setFromEuler(new T.Euler(base.x,base.y,base.z)),q=new T.Quaternion().setFromEuler(new T.Euler(base.x+v[0],base.y+v[1],base.z+v[2])),delta=rest.invert().multiply(q.clone());if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
    const hinge=new T.Quaternion(0,delta.y,0,delta.w).normalize(),offHinge=2*Math.acos(Math.min(1,Math.abs(delta.clone().multiply(hinge.clone().invert()).w)))*180/Math.PI;
    const axial=new T.Quaternion(delta.x,0,0,delta.w).normalize(),twist=2*Math.acos(Math.min(1,Math.abs(axial.w)))*180/Math.PI;
    const flex=-2*Math.atan2(hinge.y,hinge.w)*180/Math.PI,step=previous[side]?previous[side].angleTo(q)*180/Math.PI:0;previous[side]=q;
    maxima.step=Math.max(maxima.step,step);maxima.offHinge=Math.max(maxima.offHinge,offHinge);maxima.forearmTwist=Math.max(maxima.forearmTwist,twist);maxima.elbowFlex=Math.max(maxima.elbowFlex,flex);minima.elbowFlex=Math.min(minima.elbowFlex,flex);
    samples.push({t,side,flex,offHinge,twist,step});
   }return{mode,maxima,minima,samples};
  });return{baseline:measure(baseline),current:measure(VICTORY_POSES)};
 },baseline);report.targets=metrics;
 check('regression reproduces the rejected forearm inversion',metrics.baseline.some(m=>m.maxima.offHinge>90&&m.maxima.step>45));
 for(const m of metrics.current){
  check(m.mode+' elbow remains in its anatomical hinge plane',m.maxima.offHinge<4);
  check(m.mode+' no forced longitudinal forearm spin',m.maxima.forearmTwist<4);
  check(m.mode+' no backward elbow or full lock',m.minima.elbowFlex>4&&m.maxima.elbowFlex<145);
  check(m.mode+' no abrupt target rotation',m.maxima.step<15);
  check(m.mode+' upper arm has no half-turn spin',m.maxima.upperTwist<120&&m.maxima.upperStep<20);
 }
 const runtime=await p.evaluate(()=>{
  const c=vtuber,T=THREE;avatarLabReceive({type:'idle-enabled',enabled:false});window.rotationStep=c.update.bind(c);c.update=()=>{};winkySetScale(1.5);
  const reset=()=>{avatarLabReceive({type:'cancel'});for(const[n,r]of Object.entries(c.baseRotations))c.bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,v]of Object.entries(c.basePositions))c.bones[n]?.position.set(v.x,v.y,v.z);c.fbx.rotation.y=0;};
  const results=[];
  for(const mode of ['victory_jump','victory_wave']){
   reset();for(let n=0;n<30;n++)rotationStep(1/120,0);c.triggerAction(mode,3.8);let previous={},peakForearmSpeed=0,peakOffHinge=0;const frames=[];
   for(let n=0;n<480;n++){
    rotationStep(1/120,n/120);
    for(const side of ['Right','Left']){
     const name='Shibahu_'+side+'ForeArm',q=c.bones[name].quaternion.clone(),base=c.baseRotations[name],rest=new T.Quaternion().setFromEuler(new T.Euler(base.x,base.y,base.z)),d=rest.invert().multiply(q.clone());
     if(previous[side])peakForearmSpeed=Math.max(peakForearmSpeed,previous[side].angleTo(q)*180/Math.PI*120);previous[side]=q;
     const hinge=new T.Quaternion(0,d.y,0,d.w).normalize();peakOffHinge=Math.max(peakOffHinge,2*Math.acos(Math.min(1,Math.abs(d.multiply(hinge.invert()).w)))*180/Math.PI);
    }
    if(n%12===0)frames.push({time:n/120,mode:c.actionMode,framing:winkyFraming.state});
   }results.push({mode,peakForearmSpeed,peakOffHinge,frames});
  }return results;
 });report.runtime=runtime;
 for(const r of runtime){check(r.mode+' displayed forearm motion stays bounded',r.peakForearmSpeed<350);check(r.mode+' displayed elbow stays in plane',r.peakOffHinge<4);}
 for(const mode of ['victory_jump','victory_wave'])for(const [angle,label]of [[0,'front'],[Math.PI/2,'side'],[Math.PI,'back']])for(const[t,phase]of [[.48,'raise'],[1.20,'high'],[3.35,'lower']]){
  await p.evaluate(({mode,angle,t})=>{const c=vtuber;avatarLabReceive({type:'cancel'});for(const[n,r]of Object.entries(c.baseRotations))c.bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,v]of Object.entries(c.basePositions))c.bones[n]?.position.set(v.x,v.y,v.z);c.fbx.rotation.y=angle;c.triggerAction(mode,3.8);for(let n=0;n<Math.round(t*120);n++)rotationStep(1/120,n/120);winkyScreenshot();},{mode,angle,t});
  await p.screenshot({path:path.join(out,`${mode}-${label}-${phase}.png`)});
 }
 check('no JavaScript errors',!report.errors.length);
 console.log(JSON.stringify({checks:report.checks.length,baseline:metrics.baseline.map(({mode,maxima})=>({mode,maxima})),current:metrics.current.map(({mode,maxima,minima})=>({mode,maxima,minima})),runtime:runtime.map(({frames,...r})=>r),errors:report.errors}));
}finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
