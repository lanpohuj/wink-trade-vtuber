// The arm paths are retargeted offline with elbow IK and forearm pronation.
import {ARM_JOINTS,VICTORY_POSES} from './victory-poses.mjs';
const body=['Hips','Head','Neck','Spine','Spine1','Spine2'];
const fingers=[];
for(const side of ['Right','Left'])for(const finger of ['Index','Middle','Ring','Pinky','Thumb'])for(let n=1;n<=3;n++)fingers.push(`${side}Hand${finger}${n}`);
export const VICTORY_JOINTS=Object.fromEntries(['victory_jump','victory_wave'].map(n=>[n,[...ARM_JOINTS,...body,...fingers]]));
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function makeVictoryTracks(rest){
 return Object.fromEntries(Object.entries(VICTORY_POSES).map(([mode,rows])=>[mode,rows.map(([t,values],i)=>{
  if(i===0||i===rows.length-1)return[t,rest];
  const w=smooth(t/.35)*smooth((3.2-t)/.55),phase=t*3.8/3.2,jump=mode==='victory_jump'?jumpBody(phase):{crouch:0,flightHeight:0};
  const lean=Math.sin((t-.3)*2.1)*.035*w,pose={};
  ARM_JOINTS.forEach((n,k)=>pose[n]=values.slice(k*3,k*3+3));
  Object.assign(pose,{Hips:[.012*jump.crouch,0,-lean*.3],Spine:[.018*jump.crouch,0,lean*.2],
   Spine1:[.025*jump.crouch,0,lean*.35],Spine2:[.025*jump.crouch,0,lean*.25],Head:[-.018*w,0,-lean*.5],Neck:[0,0,-lean*.15]});
  for(const n of fingers){const joint=Number(n.at(-1)),right=n.startsWith('Right'),extra=.025*Math.sin(t*2.7+(right?0:.8));
   pose[n]=n.includes('Thumb')?[.025*w,(right?.07:-.07)*w,0]:[0,0,-(.09+(joint===2?.05:0)+extra)*w-.16*(1-w)];
  }
  return[t,pose];
 })]));
}
export function jumpBody(time,duration=3.8){
 // Model units are centimetres. Airtime follows a 6-7 cm hop, rather than the
 // old four-centimetre rise suspended for almost a second.
 const t=time*3.8/duration;let flightHeight=0,crouch=0;
 for(const [takeoff,height]of [[.88,7.2],[1.56,5.7]]){
  const flight=2*Math.sqrt(2*height/981),landing=takeoff+flight;
  if(t>=takeoff&&t<=landing){const u=(t-takeoff)/flight;flightHeight=Math.max(flightHeight,4*height*u*(1-u));}
  if(t>=takeoff-.29&&t<takeoff){
   const u=(t-(takeoff-.29))/.29;crouch=Math.max(crouch,u<.62?smooth(u/.62):1-smooth((u-.62)/.38));
  }
  if(t>=landing&&t<landing+.30){const u=(t-landing)/.30;crouch=Math.max(crouch,.84*(u<.28?smooth(u/.28):1-smooth((u-.28)/.72)));}
 }
 const envelope=smooth(t/.35)*smooth((3.8-t)/.65);
 return {height:flightHeight-2.2*crouch,flightHeight,crouch,shiftX:.55*Math.sin((t-.25)*2.8)*envelope};
}
export function createJumpLegs(controller,T){
 const c=controller,saved=[];
 for(const name of ['Hips',...['Right','Left'].flatMap(s=>['UpLeg','Leg','Foot'].map(n=>s+n))]){
  const bone=c.bones['Shibahu_'+name],r=c.baseRotations['Shibahu_'+name],p=c.basePositions['Shibahu_'+name];if(!bone)continue;
  saved.push({bone,quaternion:bone.quaternion.clone(),position:bone.position.clone()});bone.rotation.set(r.x,r.y,r.z);bone.position.set(p.x,p.y,p.z);
 }
 c.fbx.updateMatrixWorld(true);
 const modelQ=c.fbx.getWorldQuaternion(new T.Quaternion()),inverse=c.fbx.matrixWorld.clone().invert(),refs={};
 for(const side of ['Right','Left']){
  const foot=c.bones[`Shibahu_${side}Foot`];if(!foot)continue;
  refs[side]={position:foot.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),
   rotation:modelQ.clone().invert().multiply(foot.getWorldQuaternion(new T.Quaternion()))};
 }
 for(const s of saved){s.bone.quaternion.copy(s.quaternion);s.bone.position.copy(s.position);}c.fbx.updateMatrixWorld(true);
 const worldSet=(bone,q)=>{bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true);};
 return body=>{
  c.fbx.updateMatrixWorld(true);
  for(const side of Object.keys(refs)){
   const upper=c.bones[`Shibahu_${side}UpLeg`],lower=c.bones[`Shibahu_${side}Leg`],foot=c.bones[`Shibahu_${side}Foot`];if(!upper||!lower)continue;
   const hip=upper.getWorldPosition(new T.Vector3()),knee=lower.getWorldPosition(new T.Vector3()),ankle=foot.getWorldPosition(new T.Vector3());
   const goal=refs[side].position.clone();goal.y+=body.flightHeight;goal.x+=body.flightHeight>0?body.shiftX:0;c.fbx.localToWorld(goal);
   const l1=hip.distanceTo(knee),l2=knee.distanceTo(ankle),dir=goal.clone().sub(hip),distance=Math.min(l1+l2-.0001,Math.max(Math.abs(l1-l2)+.0001,dir.length()));dir.normalize();
   const bend=new T.Vector3(0,0,1).applyQuaternion(c.fbx.getWorldQuaternion(new T.Quaternion()));bend.addScaledVector(dir,-bend.dot(dir)).normalize();
   const a=(l1*l1-l2*l2+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,l1*l1-a*a)),kneeGoal=hip.clone().addScaledVector(dir,a).addScaledVector(bend,h);
   const align=(bone,end,to)=>{const origin=bone.getWorldPosition(new T.Vector3()),from=end.getWorldPosition(new T.Vector3()).sub(origin).normalize(),direction=to.clone().sub(origin).normalize();worldSet(bone,new T.Quaternion().setFromUnitVectors(from,direction).multiply(bone.getWorldQuaternion(new T.Quaternion())));};
   align(upper,lower,kneeGoal);align(lower,foot,goal);
   const q=c.fbx.getWorldQuaternion(new T.Quaternion()).multiply(refs[side].rotation);
   if(body.flightHeight>0)q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.045));worldSet(foot,q);
  }
 };
}
