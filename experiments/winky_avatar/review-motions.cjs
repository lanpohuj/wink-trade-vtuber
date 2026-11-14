// Compare against the previous accepted laboratory, never against the live app.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),output=path.join(__dirname,'.runtime/revision-2');
const exporting=process.argv.includes('--export');
fs.mkdirSync(output,{recursive:true});
const previous=execFileSync('git',['show','ffbc79c:experiments/winky_avatar/candidate.mjs'],{cwd:root,encoding:'utf8'});
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:870}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/candidate.mjs',route=>route.request().frame().url().includes('previous=1')
      ?route.fulfill({body:previous,contentType:'text/javascript'}):route.continue());
    await page.goto('http://127.0.0.1:8794');
    await page.waitForFunction(()=>!document.getElementById('play').disabled);
    const navigation=page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('previous=1')});
    await page.evaluate(()=>{
      document.getElementById('baseline').src='/frame.html?candidate=1&previous=1';
      for(const el of document.querySelector('main').children)if(!el.classList.contains('views'))el.style.display='none';
      document.querySelectorAll('.view iframe').forEach(el=>el.style.height='720px');
      document.querySelectorAll('.view h2')[0].textContent='Предыдущий стенд';
      document.querySelectorAll('.view h2')[1].textContent='Доработанный вариант';
      const title=document.createElement('h1');title.id='motionTitle';document.querySelector('main').prepend(title);
    });
    await navigation;
    const frames=[page.frames().find(f=>f.url().includes('previous=1')),page.frames().find(f=>f.url().endsWith('candidate=1'))];
    for(const frame of frames){
      await frame.waitForFunction(()=>window.labReady);
      await frame.evaluate(()=>{
        window.frozenUpdate=vtuber.update.bind(vtuber);vtuber.update=()=>{};
        window.resetMotion=action=>{
          const c=vtuber;
          for(const [n,r]of Object.entries(c.baseRotations))c.bones[n]?.rotation.set(r.x,r.y,r.z);
          for(const [n,p]of Object.entries(c.basePositions))c.bones[n]?.position.set(p.x,p.y,p.z);
          c.actionMode=null;c.actionTimer=0;c.waveTimer=0;c.speechHoldTimer=0;c.talkBodyWeight=0;
          c.smoothedRms=0;c.currentEmotion='idle';c.emotionResetTimer=0;c.blinkTimer=0;c.isBlinking=false;c.tailPhase=0;
          document.querySelectorAll('.winky-lab-heart').forEach(h=>h.remove());
          c.faceMesh.morphTargetInfluences.fill(0);
          for(let i=0;i<120;i++)frozenUpdate(1/60,0);
          action==='wave'?c.wave():c.triggerAction(action,3.2);
        };
        window.motionMetrics=()=>{
          const c=vtuber;c.fbx.updateMatrixWorld(true);
          const v=n=>c.bones['Shibahu_'+n].getWorldPosition(new THREE.Vector3());
          const wrist=v('RightHand'),middle=v('RightHandMiddle1'),normal=v('RightHandIndex1').sub(v('RightHandPinky1')).cross(middle.clone().sub(wrist)).normalize();
          const tip=c.bones.Shibahu_RightHandIndex3.localToWorld(new THREE.Vector3(-1.4,0,0));
          const head=v('Head');
          const projected=tip.clone().project(camera);
          return {wrist:wrist.toArray(),elbow:v('RightForeArm').toArray(),palmFacing:normal.dot(camera.position.clone().sub(wrist).normalize()),
            fingertip:tip.toArray(),projected:projected.toArray(),fingerHeadHeight:Math.abs(middle.y-head.y),
            hand:c.bones.Shibahu_RightHand.quaternion.toArray(),head:c.bones.Shibahu_Head.quaternion.toArray()};
        };
      });
    }
    const report={previous_commit:'ffbc79c',checks:[],motions:{},errors};
    const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
    let imageIndex=0;
    const framesDir=path.join(output,'frames');if(exporting)fs.mkdirSync(framesDir,{recursive:true});
    for(const [action,title]of [['wave','Приветствие · подъём, живые взмахи, опускание'],['shy','Смущение · рука к щеке и мягкий наклон головы'],['flirt_kiss','Поцелуй · быстрее к губам, кисть развёрнута к зрителю']]){
      await page.evaluate(text=>document.getElementById('motionTitle').textContent=text,title);
      for(const frame of frames)await frame.evaluate(action=>resetMotion(action),action);
      const samples=[];
      for(let n=1;n<=108;n++){
        const time=n/30,metrics=[];
        for(let i=0;i<frames.length;i++)metrics.push(await frames[i].evaluate(({time,heartsAt})=>{
          frozenUpdate(1/30,time);
          // Offline export uses the same simulated clock for CSS particles.
          for(const animation of document.getAnimations()){
            animation.pause();animation.currentTime=Math.max(0,(time-heartsAt)*1000);
          }
          return motionMetrics();
        },{time,heartsAt:i===0?1.4:1.12}));
        samples.push({time,previous:metrics[0],candidate:metrics[1]});
        if(exporting)await page.screenshot({path:path.join(framesDir,String(imageIndex++).padStart(4,'0')+'.jpg'),type:'jpeg',quality:86});
        if([18,36,60].includes(n))await page.screenshot({path:path.join(output,`${action}-${n}.png`)});
      }
      const held=samples.filter(s=>s.time>=.8&&s.time<=2.4),current=samples.map(s=>s.candidate);
      check(action+' finite rig positions',current.every(m=>[...m.wrist,...m.elbow,...m.hand].every(Number.isFinite)));
      if(action==='wave'){
        check('wave palm faces the viewer during sweeps',held.every(s=>s.candidate.palmFacing>.8));
        check('wave fingertips stay inside the image while raising and lowering',samples.filter(s=>s.time>=.15&&s.time<=3.2).every(s=>Math.abs(s.candidate.projected[0])<1));
        const span=key=>Math.max(...held.map(s=>s.candidate[key][0]))-Math.min(...held.map(s=>s.candidate[key][0]));
        check('wave elbow is steadier than the hand',span('elbow')<span('wrist')*.65);
      }
      if(action==='shy')check('shy hand reaches the face height',held.every(s=>s.candidate.fingerHeadHeight<7));
      if(action==='flirt_kiss'){
        check('kiss back of hand faces the viewer',samples.filter(s=>s.time>=.6&&s.time<=2.4).every(s=>s.candidate.palmFacing<-.9));
        const quick=samples.find(s=>s.time>=.6);
        check('kiss hand reaches lip height earlier',Math.abs(quick.candidate.fingertip[1]-134)<Math.abs(quick.previous.fingertip[1]-134));
      }
      report.motions[action]=samples;
    }
    check('no browser errors',errors.length===0);
    fs.writeFileSync(path.join(output,'motion-verification.json'),JSON.stringify(report,null,2)+'\n');
    if(exporting)execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',path.join(framesDir,'%04d.jpg'),'-frames:v',String(imageIndex),'-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,'refined-motions.mp4')]);
    console.log(JSON.stringify({checks:report.checks.length,errors,exported_frames:imageIndex}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
