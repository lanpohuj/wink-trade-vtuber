// Close portrait, with actual skinned arms/head protected from viewport cropping.
export function installFraming(controller,camera=window.camera){
  const T=window.THREE,model=controller.fbx;
  const anchor=114,target=new T.Vector3(0,anchor,0),direction=camera.position.clone().sub(target).normalize();
  const orientation=camera.quaternion.clone().invert(),referenceDistance=camera.position.distanceTo(target);
  const reserve=[[-33,76,12],[33,76,12],[-26,66,8],[26,66,8],[0,162,8]];
  const directions=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)directions.push(new T.Vector3(x,y,z));
  const samples=[];
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||!mesh.visible)return;
    const g=mesh.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
    if(!si)return;
    const visible=new Set();
    for(const group of g.groups.length?g.groups:[{start:0,count:g.index?.count||p.count,materialIndex:0}]){
      const material=Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material;
      if(material?.visible===false)continue;
      for(let k=group.start;k<group.start+group.count;k++)visible.add(g.index?g.index.getX(k):k);
    }
    const groups=new Map();
    for(const i of visible){
      let arm=0,bone=-1,weight=-1;
      for(let k=0;k<4;k++){
        const n=si.getComponent(i,k),w=sw.getComponent(i,k),name=mesh.skeleton.bones[n]?.name||'';
        if(/Arm|Hand|Shoulder/.test(name))arm+=w;
        if(w>weight){weight=w;bone=n;}
      }
      if(arm<.35&&p.getY(i)<130)continue;
      let rows=groups.get(bone);if(!rows){rows=directions.map(()=>({i:-1,score:-Infinity}));groups.set(bone,rows);}
      const v=new T.Vector3().fromBufferAttribute(p,i);
      directions.forEach((d,k)=>{const score=v.dot(d);if(score>rows[k].score)rows[k]={i,score};});
    }
    const ids=[...new Set([...groups.values()].flatMap(rows=>rows.map(r=>r.i)).filter(i=>i>=0))];
    if(ids.length)samples.push({mesh,ids});
  });
  let requestedScale=model.scale.x,offsetY=model.position.y,distance=referenceDistance,hold=0;
  const point=new T.Vector3(),world=new T.Vector3(),coordinates=[];
  const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  let panX=0,panY=0,state={};
  function update(dt=0){
    if(!(camera.aspect>0)||!Number.isFinite(camera.aspect))return state;
    const scale=model.scale.x;
    model.position.y=offsetY+anchor*(1-scale);
    model.updateMatrixWorld(true);coordinates.length=0;
    const vtan=Math.tan(T.MathUtils.degToRad(camera.fov/2))*.955,htan=vtan*camera.aspect;
    const record=position=>{point.copy(position).sub(target).applyQuaternion(orientation);coordinates.push(point.x,point.y,point.z);};
    for(const r of reserve){world.set(...r);model.localToWorld(world);record(world);}
    for(const {mesh,ids}of samples)for(const i of ids){mesh.getVertexPosition(i,world);mesh.localToWorld(world);record(world);}
    // First use spare room on the opposite side of a leaning pose. Pulling the
    // camera away is only needed when the entire arm/head silhouette cannot fit.
    const limits=d=>{
      let left=-8*scale,right=8*scale,bottom=-3*scale,top=5*scale;
      for(let i=0;i<coordinates.length;i+=3){
        const depth=d-coordinates[i+2],x=coordinates[i],y=coordinates[i+1];
        if(depth<=camera.near+1)return null;
        left=Math.max(left,x-depth*htan);right=Math.min(right,x+depth*htan);
        bottom=Math.max(bottom,y-depth*vtan);top=Math.min(top,y+depth*vtan);
      }
      return left<=right&&bottom<=top?{left,right,bottom,top}:null;
    };
    let minimum=referenceDistance;
    if(!limits(minimum)){
      let lo=minimum,hi=minimum;
      for(let i=0;i<coordinates.length;i+=3)
        hi=Math.max(hi,coordinates[i+2]+Math.abs(coordinates[i])/htan+2,coordinates[i+2]+Math.abs(coordinates[i+1])/vtan+2);
      for(let n=0;n<18;n++){const middle=(lo+hi)/2;if(limits(middle))hi=middle;else lo=middle;}
      minimum=hi+.05;
    }
    if(minimum>distance){distance=minimum;hold=1.2;}
    else{hold=Math.max(0,hold-dt);if(!hold)distance=Math.max(minimum,distance+(minimum-distance)*(dt?1-Math.exp(-dt*1.4):1));}
    const safe=limits(distance),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    if(safe){
      const desiredX=clamp(0,safe.left,safe.right),desiredY=clamp(0,safe.bottom,safe.top),blend=dt?1-Math.exp(-dt*4):1;
      panX=clamp(panX+(desiredX-panX)*blend,safe.left,safe.right);
      panY=clamp(panY+(desiredY-panY)*blend,safe.bottom,safe.top);
    }
    const aim=target.clone().addScaledVector(right,panX).addScaledVector(up,panY);
    camera.far=Math.max(1000,distance+200*scale);
    camera.position.copy(aim).addScaledVector(direction,distance);camera.lookAt(aim);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    state={requestedScale,effectiveScale:requestedScale*referenceDistance/distance,limited:distance>referenceDistance+.5,
      distance,panX,panY,samples:coordinates.length/3};return state;
  }
  const originalScale=window.winkySetScale,originalOffset=window.winkySetOffsetY;
  window.winkySetScale=value=>{originalScale(value);requestedScale=model.scale.x;distance=referenceDistance;hold=0;return update();};
  window.winkySetOffsetY=value=>{originalOffset(value);offsetY=model.position.y;distance=referenceDistance;hold=0;return update();};
  window.addEventListener('resize',()=>{distance=referenceDistance;hold=0;update();});
  window.winkyFraming={update,get state(){return state;}};
  update();return window.winkyFraming;
}
