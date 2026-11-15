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
 // Cubic Hermite with timed tangents: C1 velocity at path knots, no stop at each pose.
 const curve=(keys,t)=>{
  if(t<=keys[0][0])return keys[0][1];if(t>=keys.at(-1)[0])return keys.at(-1)[1];
  let i=0;while(keys[i+1][0]<t)i++;const a=keys[i],b=keys[i+1],prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)],d=b[0]-a[0],u=(t-a[0])/d;
  return a[1].map((v,k)=>{const m0=i===0?0:.65*(b[1][k]-prev[1][k])/(b[0]-prev[0]),m1=i+1===keys.length-1?0:.65*(next[1][k]-a[1][k])/(next[0]-a[0]);return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*d*m0+(-2*u**3+3*u*u)*b[1][k]+(u**3-u*u)*d*m1;});
 };
 reset();const neutral={};for(const side of ['Right','Left']){
  const hand=bones['Shibahu_'+side+'Hand'],inv=wq(side+'Hand').invert(),index=wp(side+'HandIndex1').sub(wp(side+'Hand')).applyQuaternion(inv),pinky=wp(side+'HandPinky1').sub(wp(side+'Hand')).applyQuaternion(inv);
  let normal=index.clone().cross(pinky).normalize();if(normal.clone().applyQuaternion(wq(side+'Hand')).z<0)normal.negate();
  neutral[side]={wrist:wp(side+'Hand').toArray(),normal:normal.toArray()};
 }
 const output={};
 for(const mode of ['victory_jump','victory_wave']){
  const rows=[];
  for(let n=0;n<=80;n++){
   const time=n*.04;reset();const pose={};
   for(const side of ['Right','Left']){
    const right=side==='Right',s=right?-1:1,delay=right?0:.085,t=time-delay,rest=neutral[side].wrist;
    const highY=right?157:155.6;
    const keys=[[0,rest],[.18,[s*27,96,13]],[.36,[s*25,126,24]],[.57,[s*24.5,147,20]],[.76,[s*24,highY,10]],
     [1.02,[s*(right?26:24),highY+.5,12]],[1.29,[s*(right?22.5:26),highY-1,10]],
     [1.59,[s*(right?25:23.5),highY+.2,11]],[1.90,[s*(right?23:25),highY-1.2,10]],
     [2.16,[s*24,highY-1,12]],[2.43,[s*25,145,21]],[2.70,[s*26,123,22]],[2.92,[s*27,94,12]],[3.115,rest]];
    if(mode==='victory_jump'){
      // Hands settle and give softly on each landing rather than repeating a wave.
      for(const key of keys)if(key[0]>1&&key[0]<2.2){key[1][0]=s*(right?24:25);key[1][1]=highY-(key[0]===1.29?2.5:0);}
    }
    const raised=smooth(t/.65)*smooth((3.115-t)/.7);
    set(side+'Shoulder',[.008*raised,0,(right?.045:.055)*raised]);c.fbx.updateMatrixWorld(true);
    const goal=new T.Vector3(...curve(keys,t)),shoulder=wp(side+'Arm'),elbow=wp(side+'ForeArm'),wrist=wp(side+'Hand');
    const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),dir=goal.clone().sub(shoulder),d=Math.min(l1+l2-.08,Math.max(Math.abs(l1-l2)+.08,dir.length()));dir.normalize();goal.copy(shoulder).addScaledVector(dir,d);
    const highPole=smooth((goal.y-120)/28);const bend=new T.Vector3(s*(.18+.82*highPole),-.9*(1-highPole),1-.75*highPole);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
    const elbowGoal=shoulder.clone().addScaledVector(dir,a).addScaledVector(bend,h);
    const align=(bone,end,target)=>{const from=wp(end).sub(wp(bone)).normalize(),to=target.clone().sub(wp(bone)).normalize();worldSet(bone,new T.Quaternion().setFromUnitVectors(from,to).multiply(wq(bone)));};
    align(side+'Arm',side+'ForeArm',elbowGoal);align(side+'ForeArm',side+'Hand',goal);
    // Pronation belongs to the forearm, with a nearly neutral wrist throughout.
    const axis=wp(side+'Hand').sub(wp(side+'ForeArm')).normalize(),normal=new T.Vector3(...neutral[side].normal).applyQuaternion(wq(side+'Hand'));
    const current=normal.clone().addScaledVector(axis,-normal.dot(axis)).normalize(),desired=new T.Vector3(0,0,1);desired.addScaledVector(axis,-desired.dot(axis)).normalize();
    const angle=Math.max(-1.45,Math.min(1.45,Math.atan2(axis.dot(current.clone().cross(desired)),current.dot(desired))))*raised;
    worldSet(side+'ForeArm',new T.Quaternion().setFromAxisAngle(axis,angle).multiply(wq(side+'ForeArm')));
    const wave=mode==='victory_wave'?curve([[0,[0]],[.7,[0]],[.98,[.13]],[1.25,[-.12]],[1.55,[.10]],[1.89,[-.075]],[2.18,[.035]],[2.55,[0]],[3.2,[0]]],t-.045)[0]*(right?1:.6):.025*raised;
    const hand=bones['Shibahu_'+side+'Hand'];hand.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...neutral[side].normal),wave));
    // Tiny flexion follows wrist travel, instead of a rigid fixed world palm.
    hand.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.045*raised));
    for(const part of ['Shoulder','Arm','ForeArm','Hand']){const name=side+part,r=c.baseRotations['Shibahu_'+name];const restQ=new T.Quaternion().setFromEuler(new T.Euler(r.x,r.y,r.z+(part==='Arm'?.04:0)));if(part==='ForeArm')restQ.setFromEuler(new T.Euler(r.x,r.y-.16,r.z));bones['Shibahu_'+name].quaternion.copy(restQ.slerp(bones['Shibahu_'+name].quaternion.clone(),smooth(time/.2)*smooth((3.2-time)/.22)));const e=bones['Shibahu_'+name].rotation;pose[name]=[e.x-r.x,e.y-r.y,e.z-r.z].map(v=>+v.toFixed(6));}
   }
   rows.push([+time.toFixed(2),names.flatMap(n=>pose[n])]);
  }
  output[mode]=rows;
 }
 return {names,poses:output};
});
const text='// Generated by generate-victory-poses.cjs on the frozen FBX. Offsets from rest.\nexport const ARM_JOINTS='+JSON.stringify(data.names)+';\nexport const VICTORY_POSES='+'{\n'+Object.entries(data.poses).map(([name,rows])=>JSON.stringify(name)+': [\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n]').join(',\n')+'\n};\n';fs.writeFileSync(path.join(__dirname,'victory-poses.mjs'),text);console.log('Generated two continuous, asymmetric arm paths; 81 samples each.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
