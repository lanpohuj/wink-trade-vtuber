// Optional browser acceptance: PLAYWRIGHT_MODULE=/path/to/playwright node verify.cjs
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, '.runtime');
fs.mkdirSync(output, {recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  try {
    const page=await browser.newPage({viewport:{width:1340,height:1120}});
    const errors=[], network=[];
    page.on('pageerror',e=>{errors.push(e.message);console.error('Browser:',e.stack);});
    page.on('request',r=>network.push(r.url()));
    await page.goto('http://127.0.0.1:8794');
    await page.waitForFunction(()=>!document.getElementById('play').disabled,{timeout:60000});
    const candidate=page.frames().find(f=>f.url().endsWith('candidate=1'));
    const baseline=page.frames().find(f=>f.url().endsWith('/frame.html'));
    const report={checks:[],playback:[],poses:{},requests:0};
    const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);};
    report.coverage=await page.evaluate(async()=>{
      const {profileFor}=await import('/policy.mjs'),rows=await(await fetch('/library.json')).json(),profiles={},categories={};
      for(const r of rows){const p=profileFor(r);profiles[p]=(profiles[p]||0)+1;categories[r.category]=(categories[r.category]||0)+1;}
      return {recordings:rows.length,profiles,categories};
    });
    check('every library recording has a performance profile',Object.values(report.coverage.profiles).reduce((n,x)=>n+x,0)===report.coverage.recordings);
    for(const lang of ['ru','en']){
      await page.selectOption('#lang',lang);
      await page.selectOption('#category','NARRATE_PAIR');
      await page.click('#play');
      await page.waitForFunction(()=>document.getElementById('audio').currentTime>.3&&document.getElementById('candidate').contentWindow.avatarLabState.rms>.02);
      const state=await page.evaluate(()=>{
        const snapshot={...document.getElementById('candidate').contentWindow.avatarLabState};
        document.getElementById('audio').pause();
        return snapshot;
      });
      check(lang+' real audio starts one identified session',state.speaking&&state.id&&state.profile==='focus');
      // Observe RMS over several actual audio frames, not a synthetic forced value.
      const rms=state.rms;
      check(lang+' waveform drives articulation',rms>.02);
      const t=await candidate.evaluate(()=>avatarLabDirector.active.time);
      await candidate.evaluate(()=>new Promise(resolve=>setTimeout(resolve,200)));
      const paused=await candidate.evaluate(()=>avatarLabDirector.active.time);
      check(lang+' pause keeps the same audio clock',Math.abs(t-paused)<.09);
      await page.screenshot({path:path.join(output,`speech-${lang}.png`),fullPage:true});
      await page.evaluate(()=>document.getElementById('audio').play());
      await page.waitForFunction(()=>!document.getElementById('candidate').contentWindow.avatarLabDirector.active,{timeout:20000});
      report.playback.push({lang,id:state.id,max_rms:rms});
    }
    await page.click('#stop');
    async function pose(frame,action,seconds=1.8){
      return frame.evaluate(({action,seconds})=>{
        const c=vtuber;
        if(!window.labSavedUpdate){window.labSavedUpdate=c.update.bind(c);c.update=()=>{};}
        c.actionMode=null;c.actionTimer=0;c.waveTimer=0;c.speechHoldTimer=0;c.talkBodyWeight=0;
        c.smoothedRms=0;c.currentEmotion='idle';c.emotionResetTimer=0;c.idleFlirtTimer=Infinity;
        c.triggerAction(action,3.2);
        for(let n=0;n<Math.round(seconds*60);n++)labSavedUpdate(1/60,n/60,false,0);
        c.fbx.updateMatrixWorld(true);
        const thumbs={};
        for(const side of ['Right','Left']){
          const hand=c.bones[`Shibahu_${side}Hand`];
          const thumb=c.bones[`Shibahu_${side}HandThumb3`].localToWorld(new THREE.Vector3(side==='Right'?-1.4:1.4,0,0));
          const target=c.bones[`Shibahu_${side}HandIndex1`].getWorldPosition(new THREE.Vector3()).lerp(c.bones[`Shibahu_${side}HandIndex2`].getWorldPosition(new THREE.Vector3()),.45);
          thumbs[side]=thumb.distanceTo(target);
        }
        const dict=c.faceMesh.morphTargetDictionary,inf=c.faceMesh.morphTargetInfluences;
        const weight=n=>inf[dict[n]??dict['blendShape1.'+n]];
        const bones={};for(const n of ['Shibahu_Hips','Shibahu_RightHand','Shibahu_LeftHand'])bones[n]=c.bones[n].quaternion.toArray();
        return {thumbs,mouthA:weight('face_mesh1'),mouthO:weight('face_mesh9'),hearts:document.querySelectorAll('.winky-lab-heart').length,bones};
      },{action,seconds});
    }
    const oldPaws=await pose(baseline,'neko_paws'),newPaws=await pose(candidate,'neko_paws');
    for(const side of ['Right','Left']) check(side+' thumb folds toward index knuckle',newPaws.thumbs[side]<oldPaws.thumbs[side]*.2);
    report.poses.paws={baseline:oldPaws,candidate:newPaws};
    await page.screenshot({path:path.join(output,'paws-comparison.png'),fullPage:true});
    const oldKiss=await pose(baseline,'flirt_kiss'),newKiss=await pose(candidate,'flirt_kiss');
    check('kiss release retains puckered lips',newKiss.mouthO>.8&&newKiss.mouthA<.01);
    check('kiss sends three small hearts',newKiss.hearts===3);
    report.poses.kiss={baseline:oldKiss,candidate:newKiss};
    await page.screenshot({path:path.join(output,'kiss-comparison.png'),fullPage:true});
    const oldHip=await pose(baseline,'hip_groove',2.8),newHip=await pose(candidate,'hip_groove',2.8);
    for(const name of Object.keys(oldHip.bones)) check('preserved hip groove '+name,oldHip.bones[name].every((v,i)=>Math.abs(v-newHip.bones[name][i])<.0001));
    report.poses.hip_groove={baseline:oldHip,candidate:newHip};
    const lowFps=await candidate.evaluate(()=>{vtuber.triggerAction('hip_groove',3.2);labSavedUpdate(.4,10);return vtuber.actionTimer;});
    check('low frame rate preserves action duration',Math.abs(lowFps-2.8)<.001);
    check('no browser JavaScript errors',errors.length===0);
    check('all browser requests stay on isolated laboratory port',network.every(url=>url.startsWith('http://127.0.0.1:8794/')));
    report.requests=network.length;report.errors=errors;
    fs.writeFileSync(path.join(output,'browser-verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({checks:report.checks.length,errors,playback:report.playback,thumbs:newPaws.thumbs,kiss:newKiss.mouthO}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
