// Compare the accepted hinge repair with the requested faster, stronger gestures.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const old=execFileSync('git',['show','e89cf20:experiments/winky_avatar/victory-poses.mjs'],{encoding:'utf8'});
const key='export const VICTORY_POSES=',baseline=JSON.parse(old.slice(old.indexOf(key)+key.length).trim().replace(/;$/,''));
(async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:1000,height:920}});
  await page.goto('http://127.0.0.1:8794/frame.html?candidate=1');await page.waitForFunction(()=>window.labReady);
  const report=await page.evaluate(async baseline=>{
   const {ARM_JOINTS,VICTORY_POSES}=await import('/victory-poses.mjs'),c=vtuber,T=THREE;
   c.update=()=>{};avatarLabReceive({type:'idle-enabled',enabled:false});
   const measure=poses=>Object.entries(poses).flatMap(([mode,rows])=>{
    const traces={Right:[],Left:[]};
    for(let n=0;n<=384;n++){
     const time=n/120;let i=0;while(i<rows.length-2&&rows[i+1][0]<time)i++;
     const [ta,a]=rows[i],[tb,b]=rows[i+1],u=Math.max(0,Math.min(1,(time-ta)/(tb-ta)));
     for(const [name,r]of Object.entries(c.baseRotations))c.bones[name]?.rotation.set(r.x,r.y,r.z);
     for(const [k,name]of ARM_JOINTS.entries()){
      const r=c.baseRotations['Shibahu_'+name],q=v=>new T.Quaternion().setFromEuler(new T.Euler(r.x+v[k*3],r.y+v[k*3+1],r.z+v[k*3+2]));
      c.bones['Shibahu_'+name].quaternion.copy(q(a).slerp(q(b),u));
     }
     c.fbx.updateMatrixWorld(true);
     for(const side of ['Right','Left']){
      const name='Shibahu_'+side+'Hand',r=c.baseRotations[name],hand=c.bones[name];
      const y=c.fbx.worldToLocal(hand.getWorldPosition(new T.Vector3())).y;
      const wrist=new T.Quaternion().setFromEuler(new T.Euler(r.x,r.y,r.z)).angleTo(hand.quaternion)*180/Math.PI;
      traces[side].push({time,y,wrist});
     }
    }
    return Object.entries(traces).map(([side,trace])=>{
     const low=trace[0].y,high=Math.max(...trace.map(s=>s.y)),ten=low+(high-low)*.1,ninety=low+(high-low)*.9;
     const above10=trace.filter(s=>s.y>ten),above90=trace.filter(s=>s.y>ninety);
     return {mode,side,raise:above90[0].time-above10[0].time,lower:above10.at(-1).time-above90.at(-1).time,
      wrist:Math.max(...trace.map(s=>s.wrist))};
    });
   });
   return {baseline:measure(baseline),current:measure(VICTORY_POSES)};
  },baseline);
  report.checks=[];
  for(const [i,now]of report.current.entries()){
   const before=report.baseline[i];
   now.raiseRatio=now.raise/before.raise;now.lowerRatio=now.lower/before.lower;now.waveRatio=now.wrist/before.wrist;
   for(const [label,ok]of [['raise is faster',now.raiseRatio<.85],['lower is faster',now.lowerRatio<.85],['wave is stronger',now.waveRatio>1.6]]){
    assert.ok(ok,`${now.mode} ${now.side} ${label}`);report.checks.push(`${now.mode} ${now.side} ${label}`);
   }
  }
  const out=path.join(__dirname,'.runtime/arm-tempo');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
