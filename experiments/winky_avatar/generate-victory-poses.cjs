// Retarget continuous wrist paths to the frozen rig. No running app or broker access.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:1000,height:920}});await p.goto('http://127.0.0.1:8794/frame.html?candidate=1');await p.waitForFunction(()=>window.labReady);
const data=await p.evaluate(()=>{
 const c=vtuber,T=THREE;c.update=()=>{};avatarLabReceive({type:'idle-enabled',enabled:false});winkySetScale(1);winkySetOffsetY(0);
 const names=['RightShoulder','RightArm','RightForeArm','RightHand','LeftShoulder','LeftArm','LeftForeArm','LeftHand'];
 const bones=c.bones,wp=n=>bones['Shibahu_'+n].getWorldPosition(new T.Vector3()),wq=n=>bones['Shibahu_'+n].getWorldQuaternion(new T.Quaternion());
 const set=(n,v)=>{const r=c.baseRotations['Shibahu_'+n];bones['Shibahu_'+n].rotation.set(r.x+v[0],r.y+v[1],r.z+v[2]);};
 const reset=()=>{for(const[n,r]of Object.entries(c.baseRotations))bones[n]?.rotation.set(r.x,r.y,r.z);for(const[n,v]of Object.entries(c.basePositions))bones[n]?.position.set(v.x,v.y,v.z);for(const side of ['Right','Left']){set(side+'Arm',[0,0,.04]);set(side+'ForeArm',[0,-.16,0]);}c.fbx.updateMatrixWorld(true);};
 const worldSet=(n,q)=>{const bone=bones['Shibahu_'+n];bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true);};
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 // Preserve the celebration/hop clock, but shorten only the arm transitions.
 const retime=t=>t<=.96?t*.75:t<=1.85?.72+(t-.96)*1.28/.89:2+(t-1.85)*1.02/1.35;
 const timed=keys=>keys.map(([t,v])=>[retime(t),v]);
 // Cubic Hermite with timed tangents: C1 velocity at path knots, no stop at each pose.
 const curve=(keys,t)=>{
  for(let k=1;k<keys.length;k++)if(!(keys[k][0]>keys[k-1][0]))throw Error('Unordered motion keys');
  if(t<=keys[0][0])return keys[0][1];if(t>=keys.at(-1)[0])return keys.at(-1)[1];
  let i=0;while(keys[i+1][0]<t)i++;const a=keys[i],b=keys[i+1],prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)],d=b[0]-a[0],u=(t-a[0])/d;
  return a[1].map((v,k)=>{const m0=i===0?0:.65*(b[1][k]-prev[1][k])/(b[0]-prev[0]),m1=i+1===keys.length-1?0:.65*(next[1][k]-a[1][k])/(next[0]-a[0]);return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*d*m0+(-2*u**3+3*u*u)*b[1][k]+(u**3-u*u)*d*m1;});
 };
 reset();const neutral={};for(const side of ['Right','Left']){
  const hand=bones['Shibahu_'+side+'Hand'],inv=wq(side+'Hand').invert(),index=wp(side+'HandIndex1').sub(wp(side+'Hand')).applyQuaternion(inv),pinky=wp(side+'HandPinky1').sub(wp(side+'Hand')).applyQuaternion(inv);
  let normal=index.clone().cross(pinky).normalize();if(normal.clone().applyQuaternion(wq(side+'Hand')).z<0)normal.negate();
  neutral[side]={wrist:wp(side+'Hand').toArray(),normal:normal.toArray()};
 }
 const frames={};
 const frame=(direction,normal)=>{const x=direction.clone().normalize(),z=normal.clone().addScaledVector(x,-normal.dot(x)).normalize(),y=z.clone().cross(x).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));};
 for(const side of ['Right','Left']){
  reset();const upper=wp(side+'ForeArm').sub(wp(side+'Arm')).normalize(),lower=wp(side+'Hand').sub(wp(side+'ForeArm')).normalize(),normal=upper.clone().cross(lower).normalize();
  frames[side]={upper,lower,normal,upperFrame:frame(upper,normal),lowerFrame:frame(lower,normal),upperQ:wq(side+'Arm'),lowerQ:wq(side+'ForeArm'),restAngle:upper.angleTo(lower)};
 }
 const output={};
 for(const mode of ['victory_jump','victory_wave']){
  const rows=[];
  for(let n=0;n<=80;n++){
   const time=n*.04;reset();const pose={};
   for(const side of ['Right','Left']){
    const right=side==='Right',s=right?-1:1,delay=right?0:.085*smooth(time/.3)*smooth((3.2-time)/.4),t=time-delay,rest=neutral[side].wrist;
    const highY=right?157:155.6;
    const keys=[[0,rest],[.22,[s*27,rest[1]+8,rest[2]+9]],[.46,[s*25.5,118,23]],[.70,[s*24.5,149,18]],[.90,[s*24,highY,10]],
     [1.02,[s*(right?28:22),highY+.5,12]],[1.29,[s*(right?20:28),highY-1,10]],
     [1.59,[s*(right?28:21),highY+.2,11]],[1.75,[s*(right?21:27),highY-1.2,10]],
     [1.85,[s*24,highY-1,12]],[2.08,[s*25,149,18]],[2.43,[s*26,123,23]],[2.76,[s*27,94,14]],[3.02,[s*27,rest[1]+5,rest[2]+5]],[3.2,rest]];
    if(mode==='victory_jump'){
      // Smaller celebratory sways, with a soft give on landing.
      for(const key of keys)if(key[0]>1&&key[0]<1.8){key[1][0]=s*(24+(Math.abs(key[1][0])-24)*.55);key[1][1]=highY-(key[0]===1.29?2.5:0);}
    }
    const raised=smooth(t/.49)*smooth((3.02-t)/.53);
    set(side+'Shoulder',[.008*raised,0,(right?.10:.12)*raised]);c.fbx.updateMatrixWorld(true);
    const goal=new T.Vector3(...curve(timed(keys),t)),shoulder=wp(side+'Arm'),elbow=wp(side+'ForeArm'),wrist=wp(side+'Hand');
    const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),dir=goal.clone().sub(shoulder).normalize();
    // Drive extension by a smooth elbow angle, not by a hard reach clamp.
    // Near full reach, tiny wrist translations otherwise snap the elbow straight.
    const restFlex=frames[side].restAngle*180/Math.PI;
    const flex=curve(timed([[0,[restFlex]],[.22,[35]],[.50,[95]],[.72,[75]],[.96,[45]],[1.3,[48]],[1.7,[46]],[1.85,[48]],[2.10,[70]],[2.44,[98]],[2.84,[50]],[3.2,[restFlex]]]),t)[0]*Math.PI/180;
    const d=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(flex));goal.copy(shoulder).addScaledVector(dir,d);
    const highPole=smooth((goal.y-120)/28);const bend=new T.Vector3(s*(.25+.75*highPole),-.9+.7*highPole,-1+.75*highPole);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
    const elbowGoal=shoulder.clone().addScaledVector(dir,a).addScaledVector(bend,h);
    // Map full bind frames, not just their long axes. Both segments share one
    // anatomical hinge plane, so solving a hand point cannot invert the elbow.
    const upper=elbowGoal.clone().sub(shoulder).normalize(),lower=goal.clone().sub(elbowGoal).normalize(),normal=upper.clone().cross(lower).normalize(),bind=frames[side];
    const upperQ=frame(upper,normal).multiply(bind.upperFrame.clone().invert()).multiply(bind.upperQ);
    const lowerQ=frame(lower,normal).multiply(bind.lowerFrame.clone().invert()).multiply(bind.lowerQ);
    worldSet(side+'Arm',upperQ);worldSet(side+'ForeArm',lowerQ);
    // Palm orientation follows the anatomical hinge frame. Never add a
    // camera-facing roll at the elbow; it twisted the sleeve and crossed branches.
    const wave=curve([[0,[0]],[.53,[0]],[.83,[.24]],[1.14,[-.23]],[1.48,[.22]],[1.83,[-.21]],[2.13,[.18]],[2.38,[-.12]],[2.6,[0]],[3.2,[0]]],t-.045)[0]*(right?1:.8)*(mode==='victory_jump'?.55:1);
    const hand=bones['Shibahu_'+side+'Hand'];hand.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...neutral[side].normal),wave));
    // Tiny flexion follows wrist travel, instead of a rigid fixed world palm.
    hand.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.045*raised));
    for(const part of ['Shoulder','Arm','ForeArm','Hand']){const name=side+part,r=c.baseRotations['Shibahu_'+name];const restQ=new T.Quaternion().setFromEuler(new T.Euler(r.x,r.y,r.z+(part==='Arm'?.04:0)));if(part==='ForeArm')restQ.setFromEuler(new T.Euler(r.x,r.y-.16,r.z));bones['Shibahu_'+name].quaternion.copy(restQ.slerp(bones['Shibahu_'+name].quaternion.clone(),smooth(time/.15)*smooth((3.11-time)/.17)));const e=bones['Shibahu_'+name].rotation;pose[name]=[e.x-r.x,e.y-r.y,e.z-r.z].map(v=>+v.toFixed(6));}
   }
   rows.push([+time.toFixed(2),names.flatMap(n=>pose[n])]);
  }
  output[mode]=rows;
 }
 return {names,poses:output};
});
const text='// Generated by generate-victory-poses.cjs on the frozen FBX. Offsets from rest.\nexport const ARM_JOINTS='+JSON.stringify(data.names)+';\nexport const VICTORY_POSES='+'{\n'+Object.entries(data.poses).map(([name,rows])=>JSON.stringify(name)+': [\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n]').join(',\n')+'\n};\n';fs.writeFileSync(path.join(__dirname,'victory-poses.mjs'),text);console.log('Generated two continuous, asymmetric arm paths; 81 samples each.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
