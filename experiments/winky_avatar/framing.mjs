// Keep the former close portrait's pixel density. The application adds transparent
// canvas above and beside it; an off-axis frustum extends that same image area.
export function installFraming(controller,camera=window.camera){
  const T=window.THREE,model=controller.fbx;
  const anchor=114,target=new T.Vector3(0,anchor,0),direction=camera.position.clone().sub(target).normalize();
  const referenceDistance=camera.position.distanceTo(target),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const params=new URLSearchParams(location.search);
  const portraitWidth=Number(params.get('portrait_width'))||600,portraitHeight=Number(params.get('portrait_height'))||720;
  const left=200,top=params.has('surface_top')?Number(params.get('surface_top')):200,right=200,width=portraitWidth+left+right,height=portraitHeight+top;
  const surface={width,height,portraitWidth,portraitHeight,left,top,right,bottom:0};
  let requestedScale=model.scale.x,offsetY=model.position.y,configuration='',state={};
  function update(){
    const scale=model.scale.x;model.position.y=offsetY+anchor*(1-scale);
    const key=[scale,offsetY,innerWidth,innerHeight].join(':');if(key===configuration)return state;
    configuration=key;
    // This is the old normal idle portrait distance, not the full-motion fit
    // which made Winky small. It remains fixed throughout every gesture.
    const distance=Math.max(referenceDistance,209.54*scale),panY=-3*scale;
    const aim=target.clone().addScaledVector(up,panY);
    camera.position.copy(aim).addScaledVector(direction,distance);camera.lookAt(aim);
    camera.setViewOffset(portraitWidth,portraitHeight,-left,-top,innerWidth,innerHeight);
    camera.updateMatrixWorld(true);
    state={requestedScale,effectiveScale:requestedScale*referenceDistance/distance,limited:false,
      distance,panX:0,panY,surface,mode:'expanded-portrait-surface'};return state;
  }
  const originalScale=window.winkySetScale,originalOffset=window.winkySetOffsetY;
  window.winkySetScale=value=>{originalScale(value);requestedScale=model.scale.x;configuration='';return update();};
  window.winkySetOffsetY=value=>{originalOffset(value);offsetY=model.position.y;configuration='';return update();};
  window.addEventListener('resize',()=>{configuration='';update();});
  window.winkyFraming={update,get state(){return state;}};
  // The lab host expands its iframe. The real app creates this surface directly.
  if(parent!==window)parent.postMessage({scope:'winky-avatar-lab',type:'surface-size',surface},location.origin);
  update();return window.winkyFraming;
}
