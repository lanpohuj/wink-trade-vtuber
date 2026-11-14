// Laboratory-only poses calibrated on the frozen FBX; no live application imports.
const rightArm=['RightShoulder','RightArm','RightForeArm','RightHand'];
const leftArm=['LeftShoulder','LeftArm','LeftForeArm','LeftHand'];
const torso=['Head','Neck','Spine','Spine1','Spine2'];
export const EXTRA_REST={LeftArm:[0,0,.04],LeftForeArm:[0,-.16,0],LeftHand:[0,0,0]};
const fingers=[];
for(const side of ['Right','Left'])for(const finger of ['Index','Middle','Ring','Pinky','Thumb'])for(let n=1;n<=3;n++){
  const name=`${side}Hand${finger}${n}`;
  fingers.push(name);EXTRA_REST[name]=finger==='Thumb'?[0,-.08,0]:[0,0,-.16];
}
const rightFingers=fingers.filter(n=>n.startsWith('Right'));
const faceHand=[...rightArm,...torso,'LeftShoulder',...rightFingers];
export const EXTRA_JOINTS={
  shy:faceHand,quiet_laugh:faceHand,ponder:faceHand,
  playful_doubt:[...torso,'RightShoulder','LeftShoulder'],
  hand_heart:[...rightArm,...leftArm,...torso,...fingers],
};
export const FACE_MOODS={shy:'blush',quiet_laugh:'happy',ponder:'thinking',playful_doubt:'wink',hand_heart:'happy'};
const relaxed={};
for(const name of rightFingers)relaxed[name]=name.includes('Thumb')?[0,-.08,0]:[0,0,-.02];
const cover={
  RightShoulder:[0,0,.025],RightArm:[-.86,-.81,.36],RightForeArm:[-.29,-2.11,0],
  RightHand:[-1.09042,.37925,-.31974],forearmTwist:-.55,
  Head:[.075,.035,-.07],Neck:[.035,.018,-.035],
  Spine:[.012,0,0],Spine1:[.018,0,0],Spine2:[.02,0,0],LeftShoulder:[0,0,.025],
  ...relaxed,
};
const thinking={
  RightShoulder:[0,0,.02],RightArm:[-.26,-.55,.40],RightForeArm:[-.14,-2.45,0],
  RightHand:[-.53029,-.27548,-.30918],forearmTwist:-.55,
  Head:[.025,.16,.075],Neck:[.015,.08,.04],
  Spine:[0,0,0],Spine1:[.012,.01,0],Spine2:[.015,.015,0],LeftShoulder:[0,0,.015],
};
for(const name of rightFingers){
  const joint=Number(name.at(-1));
  thinking[name]=name.includes('Index')?[0,0,.08]
    :name.includes('Thumb')?[.1,-.12,-.12]:[0,0,joint===1?-.45:-.8];
}
const calibratedHeart={
  RightArm:[-0.31,-0.6,0.05],
  RightForeArm:[1.33,0.04,1.83],
  RightHand:[-0.13248,-0.15339,0.68358],
  LeftArm:[-0.42,-0.25,0.0],
  LeftForeArm:[1.75,-0.15,1.84],
  LeftHand:[0.00467,-0.13449,0.76698],
  RightHandIndex1:[-0.35,0.31,0.13],
  RightHandIndex2:[-0.12,-0.12,0.275],
  RightHandIndex3:[-0.1,-0.12,-1],
  RightHandThumb1:[-0.35,0.955,-0.35],
  RightHandThumb2:[-0.3,-0.535,-0.62],
  RightHandThumb3:[-0.12,-0.11,-1.14],
  RightHandMiddle1:[0,0,-0.5],
  RightHandMiddle2:[0,0,-0.9],
  RightHandMiddle3:[0,0,-0.9],
  RightHandRing1:[0,0,-0.5],
  RightHandRing2:[0,0,-0.9],
  RightHandRing3:[0,0,-0.9],
  RightHandPinky1:[0,0,-0.5],
  RightHandPinky2:[0,0,-0.9],
  RightHandPinky3:[0,0,-0.9],
  LeftHandIndex1:[-0.35,0.285,-0.02],
  LeftHandIndex2:[-0.12,-0.085,-0.31],
  LeftHandIndex3:[-0.1,-0.12,-1],
  LeftHandThumb1:[-0.32,0.565,-0.35],
  LeftHandThumb2:[-0.22,-0.65,-0.41],
  LeftHandThumb3:[-0.03,-0.7,-1.2],
  LeftHandMiddle1:[0,0,-0.5],
  LeftHandMiddle2:[0,0,-0.9],
  LeftHandMiddle3:[0,0,-0.9],
  LeftHandRing1:[0,0,-0.5],
  LeftHandRing2:[0,0,-0.9],
  LeftHandRing3:[0,0,-0.9],
  LeftHandPinky1:[0,0,-0.5],
  LeftHandPinky2:[0,0,-0.9],
  LeftHandPinky3:[0,0,-0.9],
};
const heart={...calibratedHeart,RightShoulder:[0,0,0],LeftShoulder:[0,0,0],
  Head:[-.015,0,.045],Neck:[0,0,.025],Spine:[0,0,0],Spine1:[.01,0,0],Spine2:[.01,0,0]};
export function makeExtraTracks(rest){
  const laugh={...cover,Head:[.005,0,.025],Neck:[.005,0,.015]};
  const laughBeat={...laugh,RightShoulder:[0,0,.09],LeftShoulder:[0,0,.075],
    Head:[.045,0,.025],Neck:[.022,0,.015],Spine:[.02,0,0],Spine1:[.045,0,0],Spine2:[.055,0,0]};
  const doubtful={Head:[.015,.03,.10],Neck:[.008,.015,.055],
    Spine:[-.008,0,0],Spine1:[-.015,0,0],Spine2:[-.02,0,0],RightShoulder:[0,0,.045],LeftShoulder:[0,0,.012]};
  const doubtLeft={...doubtful,Head:[.015,.12,.10],Neck:[.008,.06,.055]};
  const doubtRight={...doubtful,Head:[.015,-.12,.10],Neck:[.008,-.06,.055]};
  return {
    shy:[[0,rest],[.7,cover],[1.15,cover],[2.5,cover],[3.2,rest]],
    quiet_laugh:[[0,rest],[.65,laugh],[.92,laugh],[1.10,laughBeat],[1.3,laugh],
      [1.48,laughBeat],[1.68,laugh],[1.86,laughBeat],[2.08,laugh],[2.5,laugh],[3.2,rest]],
    ponder:[[0,rest],[.8,thinking],[1.3,thinking],[2.5,thinking],[3.2,rest]],
    playful_doubt:[[0,rest],[.55,doubtful],[.9,doubtLeft],[1.25,doubtRight],[1.6,doubtLeft],
      [1.95,doubtRight],[2.35,doubtful],[2.55,doubtful],[3.2,rest]],
    hand_heart:[[0,rest],[1.0,heart],[1.5,heart],[2.5,heart],[3.2,rest]],
  };
}
