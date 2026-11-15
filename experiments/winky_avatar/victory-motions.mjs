// Calibrated on the frozen FBX with two-bone reach targets above the ears.
const high={"RightShoulder":[0,0,0],"RightArm":[-0.032624,-0.121743,2.076332],"RightForeArm":[0.060152,-0.142529,0.796333],"RightHand":[-1.244698,0.13629,-0.157033],"LeftShoulder":[0,0,0],"LeftArm":[-0.051985,-0.191277,2.071532],"LeftForeArm":[0.081177,-0.168486,0.792454],"LeftHand":[-1.259282,0.069879,-0.208959]};
const outside={"RightShoulder":[0,0,0],"RightArm":[-0.03194,-0.093053,1.938493],"RightForeArm":[0.062208,-0.138529,0.841809],"RightHand":[-1.259636,0.041127,-0.146758],"LeftShoulder":[0,0,0],"LeftArm":[-0.055708,-0.157935,1.934103],"LeftForeArm":[0.084393,-0.165682,0.83821],"LeftHand":[-1.27208,-0.02494,-0.195343]};
const inside={"RightShoulder":[0,0,0],"RightArm":[-0.033195,-0.139353,2.132392],"RightForeArm":[0.087382,-0.171752,0.938373],"RightHand":[-1.229777,0.336474,-0.162131],"LeftShoulder":[0,0,0],"LeftArm":[-0.050388,-0.210642,2.127379],"LeftForeArm":[0.114687,-0.199818,0.934655],"LeftHand":[-1.246394,0.269876,-0.221834]};
const prepare={"RightShoulder":[0,0,0],"RightArm":[-0.028917,-0.046232,1.481508],"RightForeArm":[0.363096,-0.295674,1.776804],"RightHand":[-1.164055,0.504742,0.003627],"LeftShoulder":[0,0,0],"LeftArm":[-0.060593,-0.093113,1.47846],"LeftForeArm":[0.431335,-0.31391,1.778444],"LeftHand":[-1.166822,0.447772,-0.06687]};
const body=['Hips','Head','Neck','Spine','Spine1','Spine2'];
const hands=[];const fingers={};
for(const side of ['Right','Left'])for(const finger of ['Index','Middle','Ring','Pinky','Thumb'])for(let n=1;n<=3;n++){
 const name=`${side}Hand${finger}${n}`;hands.push(name);
 fingers[name]=finger==='Thumb'?[0,side==='Right'?.08:-.08,0]:[0,0,.025];
}
const pose=(arms,lean=0)=>({...arms,...fingers,Hips:[0,0,-lean*.4],Spine:[0,0,lean*.2],Spine1:[0,0,lean*.3],Spine2:[0,0,lean*.3],Head:[-.02,0,lean*.4],Neck:[0,0,lean*.2]});
export const VICTORY_JOINTS=Object.fromEntries(['victory_jump','victory_wave'].map(n=>[n,[...Object.keys(high),...body,...hands]]));
export function makeVictoryTracks(rest){
 const up=pose(high),out=pose(outside,.055),back=pose(inside,-.045),prep=pose(prepare);
 return {
  victory_jump:[[0,rest],[.25,prep],[.52,up],[.84,out],[1.08,back],[1.38,out],[1.62,back],[1.96,up],[2.35,prep],[3.2,rest]],
  victory_wave:[[0,rest],[.4,prep],[.7,up],[.94,out],[1.22,back],[1.5,out],[1.82,back],[2.12,out],[2.42,up],[2.72,prep],[3.2,rest]],
 };
}
// Two distinct hops, each with preparation, flight and a soft landing.
export function jumpBody(time,duration=3.8){
 const t=time*3.2/duration;let height=0,crouch=0;
 for(const [start,end]of [[.46,1.12],[1.35,2.05]]){
  if(t>=start&&t<=end)height=Math.max(height,4.3*Math.sin(Math.PI*(t-start)/(end-start)));
  for(const center of [start-.10,end+.08])crouch=Math.max(crouch,Math.max(0,1-Math.abs(t-center)/.15));
 }
 return {height:height-1.1*crouch,crouch};
}
