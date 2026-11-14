// Authored only for the frozen Shibahu FBX. Angles are offsets from its rest pose.
// The adapter interpolates orientations as quaternions, including forearm roll.
import {EXTRA_REST,EXTRA_JOINTS,makeExtraTracks} from './extra-motions.mjs';
export {FACE_MOODS} from './extra-motions.mjs';
export const REST = {
  RightShoulder:[0,0,0], RightArm:[0,0,.04], RightForeArm:[0,-.16,0], RightHand:[0,0,0],
  Head:[0,0,0], Neck:[0,0,0], Spine:[0,0,0], Spine1:[0,0,0], Spine2:[0,0,0],
  LeftShoulder:[0,0,0],
  ...EXTRA_REST,
};
export const JOINTS={
  wave:['RightShoulder','RightArm','RightForeArm','RightHand'],
  flirt_kiss:['RightShoulder','RightArm','RightForeArm','RightHand'],
  ...EXTRA_JOINTS,
};
const center = {
  RightShoulder:[0,0,.06], RightArm:[-.88,.23,.31], RightForeArm:[1.72,-.38,2.27],
  RightHand:[-.07227,.17222,-.18224], forearmTwist:0,
};
const lift1={RightShoulder:[0,0,.02],RightArm:[0,-.20,.41],RightForeArm:[.78,-1.11,.36],RightHand:[0,0,0],forearmTwist:0};
const lift2={RightShoulder:[0,0,.04],RightArm:[.02,-.14,.39],RightForeArm:[1.20,.16,2.05],RightHand:[-.42,.13,.40],forearmTwist:0};
const outside = {
  RightShoulder:[0,0,.07], RightArm:[-1.01,.52,.36], RightForeArm:[1.75,-.21,2.15],
  RightHand:[-.33965,.23249,-.13089], forearmTwist:-.22,
};
const inside = {
  RightShoulder:[0,0,.05], RightArm:[-.77,-.09,.34], RightForeArm:[1.86,-.63,2.47],
  RightHand:[.31135,.13314,-.26744], forearmTwist:.22,
};
const kissTouch = {
  RightShoulder:[0,0,.08], RightArm:[-.84,-1.21,-.29], RightForeArm:[-.44,-2.27,0],
  RightHand:[-.26322,-.67079,-.29677], forearmTwist:-.55,
};
const kissSend = {
  RightShoulder:[0,0,.08], RightArm:[-.75,-.45,-.30], RightForeArm:[-.35,-1.65,0],
  RightHand:[-.73985,-.31649,-1.25317], forearmTwist:-.65,
};
function softPose(a,b,weight){
  const out={};
  for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
    if(key==='forearmTwist'){out[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*weight;continue;}
    const from=a[key]||REST[key],to=b[key]||REST[key];
    out[key]=from.map((v,i)=>v+(to[i]-v)*weight);
  }
  return out;
}
// Uneven sweeps soften over time. The elbow moves much less than the hand.
export const TRACKS = {
  wave:[
    [0,REST],[.18,lift1],[.35,lift2],[.57,center],[.78,outside],[1.06,inside],
    [1.25,softPose(center,outside,.88)],[1.56,softPose(center,inside,.84)],
    [1.86,softPose(center,outside,.68)],[2.16,softPose(center,inside,.58)],
    [2.42,center],[2.58,center],[2.82,lift2],[3.02,lift1],[3.2,REST],
  ],
  flirt_kiss:[[0,REST],[.5,kissTouch],[1.0,kissTouch],[1.95,kissSend],[2.5,kissSend],[3.2,REST]],
  ...makeExtraTracks(REST),
};
export function sampleTrack(name,time){
  const track=TRACKS[name];
  if(!track)return null;
  const t=Math.max(0,Math.min(3.2,time));
  for(let i=1;i<track.length;i++)if(t<=track[i][0]){
    const [start,a]=track[i-1],[end,b]=track[i];
    const f=(t-start)/(end-start),weight=f*f*(3-2*f);
    return {a,b,weight,time:t};
  }
  return {a:REST,b:REST,weight:0,time:t};
}
export function actionWeight(time){
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  return ease(time/.48)*(1-ease((time-2.58)/.62));
}
