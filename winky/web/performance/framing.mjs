// Fixed close portrait. Reserve the full motion envelope before any gesture starts.
// Measured from all visible arms/head skin over 15 motions (including transitions
// and both victory hops), then padded. Separate volumes avoid combining the
// forward face-hand poses with the widest, shallower overhead arm transitions.
const MOTION_VOLUMES=[
  {min:[-43,65,-17],max:[42,162,48]},
  {min:[-61,67,-13],max:[61,177,20]},
];
export function installFraming(controller,camera=window.camera){
  const T=window.THREE,model=controller.fbx;
  const anchor=114,target=new T.Vector3(0,anchor,0),direction=camera.position.clone().sub(target).normalize();
  const orientation=camera.quaternion.clone().invert(),referenceDistance=camera.position.distanceTo(target);
  const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const reserve=MOTION_VOLUMES.flatMap(({min,max})=>[min[0],max[0]].flatMap(x=>[min[1],max[1]].flatMap(y=>[min[2],max[2]].map(z=>new T.Vector3(x,y,z)))));
  let requestedScale=model.scale.x,offsetY=model.position.y,state={},configuration='';
  function update(){
    if(!(camera.aspect>0)||!Number.isFinite(camera.aspect))return state;
    const scale=model.scale.x;
    model.position.y=offsetY+anchor*(1-scale);
    const key=[scale,offsetY,camera.aspect,camera.fov].join(':');
    // Bone poses, speech, idle and result callbacks never alter the camera.
    if(key===configuration)return state;
    configuration=key;model.updateMatrixWorld(true);
    const coordinates=reserve.map(p=>model.localToWorld(p.clone()).sub(target).applyQuaternion(orientation));
    const vtan=Math.tan(T.MathUtils.degToRad(camera.fov/2))*.955,htan=vtan*camera.aspect;
    const compositionY=6*scale;
    const limits=d=>{
      let left=-8*scale,right=8*scale,bottom=compositionY-3*scale,top=compositionY+5*scale;
      for(const p of coordinates){
        const depth=d-p.z;if(depth<=camera.near+1)return null;
        left=Math.max(left,p.x-depth*htan);right=Math.min(right,p.x+depth*htan);
        bottom=Math.max(bottom,p.y-depth*vtan);top=Math.min(top,p.y+depth*vtan);
      }
      return left<=right&&bottom<=top?{left,right,bottom,top}:null;
    };
    let distance=referenceDistance;
    if(!limits(distance)){
      let lo=distance,hi=distance;
      for(const p of coordinates)hi=Math.max(hi,p.z+Math.abs(p.x)/htan+2,p.z+(Math.abs(p.y)+Math.abs(compositionY))/vtan+2);
      for(let n=0;n<22;n++){const middle=(lo+hi)/2;if(limits(middle))hi=middle;else lo=middle;}
      distance=hi+.1;
    }
    const safe=limits(distance),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const panX=clamp(0,safe.left,safe.right),panY=clamp(compositionY,safe.bottom,safe.top);
    const aim=target.clone().addScaledVector(right,panX).addScaledVector(up,panY);
    camera.far=Math.max(1000,distance+200*scale);
    camera.position.copy(aim).addScaledVector(direction,distance);camera.lookAt(aim);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    state={requestedScale,effectiveScale:requestedScale*referenceDistance/distance,limited:distance>referenceDistance+.5,
      distance,panX,panY,samples:reserve.length,mode:'fixed-motion-envelope'};return state;
  }
  const originalScale=window.winkySetScale,originalOffset=window.winkySetOffsetY;
  window.winkySetScale=value=>{originalScale(value);requestedScale=model.scale.x;configuration='';return update();};
  window.winkySetOffsetY=value=>{originalOffset(value);offsetY=model.position.y;configuration='';return update();};
  window.addEventListener('resize',()=>{configuration='';update();});
  window.winkyFraming={update,get state(){return state;}};
  update();return window.winkyFraming;
}
