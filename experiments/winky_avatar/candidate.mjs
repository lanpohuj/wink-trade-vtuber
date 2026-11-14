import {Director} from './policy.mjs';
const director = new Director();
const controller = window.vtuber;
const originalUpdate = controller.update.bind(controller);
const originalBone = controller.lerpBoneOffset.bind(controller);
let frame = {gesture: 'listen', weight: 0, speaking: false};
let audioRms = 0, hasSession = false;
const ease = x => {x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Calibrated on the frozen FBX: each thumb has its own rest frame. Approximate
// terminal thumb points now reach the outside of the index knuckle (.10/.22 cm).
const pawThumbs = {
  Right: [[.69,-.14,.37],[.26,.14,.02],[.01,-.18,-.07]],
  Left: [[.77,-.28,.56],[.01,.08,.01],[-.01,-.35,-.06]],
};
const kissTouch = {RightShoulder:[0,0,.08],RightArm:[-.90,-.75,-.45],RightForeArm:[-.45,-2.12,0],RightHand:[-.40,.25,-.20]};
const kissSend = {RightShoulder:[0,0,.08],RightArm:[-.75,-.45,-.30],RightForeArm:[-.35,-1.65,0],RightHand:[-.40,.20,-.25]};
const kissRest = {RightShoulder:[0,0,0],RightArm:[0,0,.04],RightForeArm:[0,-.16,0],RightHand:[0,0,0]};
let kissWasActive=false, heartsSent=false;
const style=document.createElement('style');
style.textContent='@keyframes winkyLabHeart{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}18%{opacity:.9}100%{opacity:0;transform:translate(calc(-50% + var(--drift)), -85px) scale(1.1)}}.winky-lab-heart{position:fixed;pointer-events:none;color:#fa83ae;font:20px system-ui;animation:winkyLabHeart 1.4s ease-out forwards;z-index:10}';
document.head.append(style);
function sendHearts(){
  const point=controller.fbx.localToWorld(new window.THREE.Vector3(0,137.7,10)).project(window.camera);
  for(let i=0;i<3;i++){
    const heart=document.createElement('span');heart.className='winky-lab-heart';heart.textContent='♥';
    heart.style.left=`${(point.x+1)*innerWidth/2+(i-1)*12}px`;heart.style.top=`${(1-point.y)*innerHeight/2}px`;
    heart.style.setProperty('--drift',`${(i-1)*24}px`);heart.style.animationDelay=`${i*.12}s`;
    heart.addEventListener('animationend',()=>heart.remove(),{once:true});document.body.append(heart);
  }
}
// Preserve the authored idle movement and old actions. Disable automatic large idle
// actions in this candidate so they cannot collide with a queued speech performance.
controller.idleFlirtTimer = Infinity;
controller.lerpBoneOffset = function(bone, tx, ty, tz, dt, speed = 8, maybeSpeed = 8) {
  // Normalize both legacy call signatures before mixing: one target per write.
  const named = typeof tx === 'string';
  const name = named ? tx : typeof bone === 'string' ? bone : bone?.name;
  const target = named ? [ty, tz, dt] : [tx, ty, tz];
  const delta = named ? speed : dt, rate = named ? maybeSpeed : speed;
  if(this.actionMode==='neko_paws'){
    const match=/^Shibahu_(Right|Left)HandThumb([123])$/.exec(name);
    if(match)return originalBone(name,...pawThumbs[match[1]][Number(match[2])-1],delta,9);
  }
  if(this.actionMode==='flirt_kiss' && name?.startsWith('Shibahu_')){
    const alias=name.slice(8),touch=kissTouch[alias];
    if(touch){
      const time=Math.max(0,this.actionDuration-this.actionTimer);
      const reach=ease(time/.9),release=ease((time-1.25)/1.05),lower=ease((time-2.55)/.65);
      const pose=touch.map((v,i)=>{
        const sending=v+(kissSend[alias][i]-v)*release;
        const fromRest=kissRest[alias][i]+(sending-kissRest[alias][i])*reach;
        return fromRest+(kissRest[alias][i]-fromRest)*lower;
      });
      return originalBone(name,...pose,delta,9);
    }
  }
  if (!this.actionMode && this.waveTimer <= 0) {
    const side = name?.includes('Right') ? 'Right' : 'Left';
    const arm = /^Shibahu_(Right|Left)(Arm|ForeArm|Hand)$/.test(name);
    const w = frame.weight, sign = side === 'Right' ? 1 : -1;
    if (arm) {
      // A speaking flag never lifts either arm. Gestures have a separate envelope.
      let pose = name.endsWith('ForeArm') ? [0, -.16, 0] : name.endsWith('Arm') ? [0, 0, .04] : [0, 0, 0];
      const explaining = frame.gesture === `explain_${side.toLowerCase()}`;
      if (explaining) {
        // Deliberately small prototype: use the existing rig's safe low-arm range.
        const goal = name.endsWith('ForeArm') ? [0, -.70, 0] : name.endsWith('Arm') ? [-.12, .06 * sign, .09] : [0, .12 * sign, -.04];
        pose = pose.map((v, i) => v + (goal[i] - v) * w);
      }
      return originalBone(name, ...pose, delta, rate);
    }
    if (name === 'Shibahu_Head' || name === 'Shibahu_Neck') {
      const share = name.endsWith('Head') ? .6 : .4;
      if (frame.gesture === 'nod') target[0] += Math.sin((director.active?.time || 0) * 5) * .10 * w * share;
      if (frame.gesture === 'tilt') { target[2] += .14 * w * share; target[1] += .06 * w * share; }
      if (frame.gesture === 'bow') target[0] += .16 * w * share;
      if (frame.gesture === 'joy') target[2] += Math.sin((director.active?.time || 0) * 4) * .08 * w * share;
    }
    if (/^Shibahu_Spine[12]?$/.test(name) && frame.gesture === 'bow') target[0] += .035 * w;
  }
  return originalBone(name, ...target, delta, rate);
};
const originalMorph=controller.smoothSetMorph.bind(controller);
controller.smoothSetMorph=function(name,target,dt,speed=20){
  if(this.actionMode==='flirt_kiss' && !frame.speaking && this.smoothedRms<=.03){
    const elapsed=Math.max(0,this.actionDuration-this.actionTimer);
    const puckered=.88*(1-ease((elapsed-2.65)/.5));
    if(['face_mesh1','face_mesh3','face_mesh6','face_mesh4_2'].includes(name))target=0;
    if(name==='face_mesh9')target=puckered;
  }
  return originalMorph(name,target,dt,speed);
};
controller.update = function(dt, elapsed) {
  dt = Math.max(0, Math.min(.5, dt));
  frame = director.frame(dt);
  if (hasSession && !frame.speaking) this.speechHoldTimer = 0;
  // Preserve elapsed time at low frame rates. Small integration steps prevent
  // pose jumps without making a three-second action take ten seconds on screen.
  const steps=Math.max(1,Math.ceil(dt/.05)),step=dt/steps;
  for(let i=0;i<steps;i++){
    this.idleFlirtTimer=Infinity;
    originalUpdate(step,elapsed-dt+(i+1)*step,frame.speaking,frame.speaking?audioRms:0);
  }
  const kissing=this.actionMode==='flirt_kiss';
  if(kissing&&!kissWasActive)heartsSent=false;
  if(kissing&&!heartsSent && this.actionDuration-this.actionTimer>=1.4){sendHearts();heartsSent=true;}
  kissWasActive=kissing;
  window.avatarLabState = { ...frame, id: director.active?.id || null, time: director.active?.time || 0, rms: audioRms };
};
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== parent || e.data?.scope !== 'winky-avatar-lab') return;
  const m = e.data;
  if (m.type === 'begin') {
    const a = director.begin(m.event);
    if (!a) return;
    hasSession = true;
    controller.actionMode = null; controller.actionTimer = 0; controller.waveTimer = 0;
    // Expressions don't invoke body actions in the candidate.
    controller.currentEmotion = ['idle','happy','neutral','thinking','excited','blush','wink','surprised'].includes(m.event.emotion) ? m.event.emotion : 'happy';
    controller.emotionResetTimer = 4;
    if (a.gesture === 'wave') controller.waveTimer = Math.min(2.5, a.duration);
  } else if (m.type === 'clock' && director.active?.id === m.id) {
    director.clock(m.id, m.time); audioRms = Math.max(0, Math.min(1, Number(m.rms) || 0));
  } else if (m.type === 'end' && director.active?.id === m.id) {
    director.end(m.id); audioRms = 0; controller.waveTimer = 0;
    controller.currentEmotion = 'idle'; controller.emotionResetTimer = 0;
  } else if (m.type === 'legacy') {
    director.end(director.active?.id); audioRms = 0;
    controller.actionMode=null;controller.actionTimer=0;controller.waveTimer=0;
    kissWasActive=false;heartsSent=false;
    if (m.action === 'wave') controller.wave();
    else controller.triggerAction(m.action, 3.2);
  } else if (m.type === 'cancel') {
    director.end(director.active?.id);audioRms=0;controller.speechHoldTimer=0;
    controller.actionMode=null;controller.actionTimer=0;controller.waveTimer=0;
    controller.currentEmotion='idle';controller.emotionResetTimer=0;
    document.querySelectorAll('.winky-lab-heart').forEach(h=>h.remove());
  }
});
window.avatarLabDirector = director;
