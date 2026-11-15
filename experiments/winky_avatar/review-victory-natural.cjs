// Inspect actual rig motion, wrist angles, ground contact and asymmetry.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch();const out=path.join(__dirname,'.runtime/victory-natural');fs.mkdirSync(out,{recursive:true});const report={checks:[],motions:[],errors:[]};
try{const p=await b.newPage({viewport:{width:1000,height:920}});p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:8794/frame.html?candidate=1');await p.waitForFunction(()=>window.labReady);
 await p.addStyleTag({content:'html,body{background:#20283a!important}'});
 const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
 for(const action of ['victory_jump','victory_wave']){
  const result=await p.evaluate(async action=>{
   const{jumpBody}=await import('/victory-motions.mjs'),c=vtuber,T=THREE;avatarLabReceive({type:'cancel'});avatarLabReceive({type:'idle-enabled',enabled:false});winkySetScale(1.5);
   window.step=c.update.bind(c);if(window.frozenStep)window.step=window.frozenStep;else window.frozenStep=window.step;c.update=()=>{};
   const reset=()=>{for(const[n,r]of Object.entries(c.baseRotations))c.bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,v]of Object.entries(c.basePositions))c.bones[n]?.position.set(v.x,v.y,v.z);c.fbx.updateMatrixWorld(true);};reset();
   const pos=n=>c.fbx.worldToLocal(c.bones['Shibahu_'+n].getWorldPosition(new T.Vector3()));
   const feet=Object.fromEntries(['Right','Left'].map(s=>[s,pos(s+'Foot')]));const restHands={};for(const side of ['Right','Left']){const r=c.baseRotations['Shibahu_'+side+'Hand'];restHands[side]=new T.Quaternion().setFromEuler(new T.Euler(r.x,r.y,r.z));}
   for(let n=0;n<30;n++)step(1/120,0);c.triggerAction(action,3.8);
   let maxWristAngle=0,maxHandSpeed=0,maxAsymmetry=0,maxGroundError=0,maxOutward=0;const samples=[],previous={};
   for(let n=0;n<480;n++){
    step(1/120,n/120);c.fbx.updateMatrixWorld(true);const t=3.8-c.actionTimer,body=jumpBody(t,3.8),hands={};
    for(const side of ['Right','Left']){
     const hand=pos(side+'Hand');hands[side]=hand.toArray();maxWristAngle=Math.max(maxWristAngle,restHands[side].angleTo(c.bones['Shibahu_'+side+'Hand'].quaternion));
     if(previous[side])maxHandSpeed=Math.max(maxHandSpeed,hand.distanceTo(previous[side])*120);previous[side]=hand.clone();maxOutward=Math.max(maxOutward,Math.abs(hand.x));
     if(action==='victory_jump'&&c.actionMode==='victory_jump'&&body.flightHeight===0){const foot=pos(side+'Foot');maxGroundError=Math.max(maxGroundError,foot.distanceTo(feet[side]));}
    }
    if(n<108)maxAsymmetry=Math.max(maxAsymmetry,Math.abs(hands.Right[1]-hands.Left[1]));
    if(n%12===0)samples.push({time:n/120,hands,rootHeight:c.bones.Shibahu_Hips.position.y-c.basePositions.Shibahu_Hips.y});
   }
   return{action,maxWristAngle,maxHandSpeed,maxAsymmetry,maxGroundError,maxOutward,samples};
  },action);report.motions.push(result);
  check(action+' keeps wrist bend below 13 degrees',result.maxWristAngle<13*Math.PI/180);
  check(action+' uses different timing in the two arms',result.maxAsymmetry>2);
  check(action+' moves along a compact frontal path instead of a wide doll-like T pose',result.maxOutward<43);
  check(action+' has bounded hand velocity without pose snaps',result.maxHandSpeed<240);
  if(action==='victory_jump')check('grounded feet stay planted through anticipation and landing',result.maxGroundError<.15);
  for(const[time,label]of [[.30,'prepare'],[.86,'raise'],[1.01,'air'],[1.20,'land'],[2.75,'lower']]){
   await p.evaluate(({action,time})=>{avatarLabReceive({type:'cancel'});for(const[n,r]of Object.entries(vtuber.baseRotations))vtuber.bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,v]of Object.entries(vtuber.basePositions))vtuber.bones[n]?.position.set(v.x,v.y,v.z);vtuber.triggerAction(action,3.8);for(let n=0;n<Math.round(time*120);n++)step(1/120,n/120);winkyScreenshot();},{action,time});
   await p.screenshot({path:path.join(out,action+'-'+label+'.png')});
  }
 }
 check('no browser errors',!report.errors.length);console.log(JSON.stringify({checks:report.checks.length,motions:report.motions.map(({samples,...r})=>r),errors:report.errors}));
}finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
