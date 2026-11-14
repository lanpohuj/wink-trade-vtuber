// Integration against the real frozen rig and existing audio; no native app API.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const report={checks:[],errors:[],states:[]},output=path.join(__dirname,'.runtime/revision-4');
 const check=(label,result)=>{assert.ok(result,label);report.checks.push(label);};
 try{
  const page=await browser.newPage({viewport:{width:1350,height:1080}});
  const requests=[];page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto('http://127.0.0.1:8794');await page.waitForFunction(()=>!document.getElementById('play').disabled);
  const c=page.frames().find(f=>f.url().endsWith('candidate=1'));
  await page.selectOption('#category','NARRATE_ENGAGE');await page.selectOption('#gesture','ponder');await page.click('#play');
  await page.waitForFunction(()=>{const w=document.getElementById('candidate').contentWindow;return w.avatarLabState?.time>1.2&&w.avatarLabState.rms>.02&&w.vtuber.actionMode==='ponder';});
  await page.evaluate(()=>document.getElementById('audio').pause());
  await c.waitForFunction(()=>avatarLabState.speaking===false);
  await page.waitForTimeout(350);
  const snap=()=>c.evaluate(()=>{
   const f=vtuber.faceMesh,d=f.morphTargetDictionary;
   return {time:avatarLabState.time,poseTime:avatarLabState.poseTime,timer:vtuber.actionTimer,speaking:avatarLabState.speaking,
    jaw:f.morphTargetInfluences[d.face_mesh1??d['blendShape1.face_mesh1']],squint:f.morphTargetInfluences[d.face_mesh7??d['blendShape1.face_mesh7']],
    hand:vtuber.bones.Shibahu_RightHand.quaternion.toArray(),id:avatarLabState.id};
  });
  const paused=await snap();await page.waitForTimeout(350);const held=await snap();report.states.push({paused,held});
  check('audio pause holds the authored media time and action timer',Math.abs(paused.time-held.time)<.001&&Math.abs(paused.timer-held.timer)<.001);
  check('paused speech closes the jaw and keeps the gentle thinking squint',held.jaw<.04&&held.squint>.17&&held.squint<.23&&!held.speaking);
  check('a paused hand settles on the same target instead of completing the gesture',paused.hand.every((v,i)=>Math.abs(v-held.hand[i])<.02));
  await page.evaluate(()=>document.getElementById('audio').play());await c.waitForFunction(()=>avatarLabState.speaking);
  check('resume keeps the same speech identity',await c.evaluate(id=>avatarLabState.id===id,paused.id));
  await page.click('#stop');await c.waitForFunction(()=>!avatarLabDirector.active&&vtuber.actionMode===null);

  for(const action of ['hip_groove','neko_paws','peek_closer']){
   await page.selectOption('#gesture',action);await page.click('#play');
   await c.waitForFunction(action=>avatarLabState?.time>.5&&vtuber.actionMode===action,action);
   check(action+' is synchronized through the same playback scheduler',true);await page.click('#stop');
  }
  await page.selectOption('#gesture','flirt_kiss');await page.click('#play');
  await c.waitForFunction(()=>avatarLabState?.time>.6&&avatarLabState.speaking);
  check('a spoken kiss keeps lip articulation and waits until audio ends',await c.evaluate(()=>vtuber.actionMode!=='flirt_kiss'&&avatarLabState.plannedGesture==='flirt_kiss'));
  await page.evaluate(()=>{document.getElementById('audio').playbackRate=8;});
  await c.waitForFunction(()=>avatarLabState?.phase==='tail'&&vtuber.actionMode==='flirt_kiss',{timeout:20000});
  check('natural media end starts the silent kiss tail',await c.evaluate(()=>!avatarLabState.speaking));
  await c.waitForFunction(()=>document.querySelectorAll('.winky-lab-heart').length===3);
  check('the post-speech kiss releases three hearts',true);
  await page.selectOption('#gesture','listen');await page.click('#play');await c.waitForFunction(()=>avatarLabState?.speaking);
  check('a new voice cancels the old kiss and its hearts immediately',await c.evaluate(()=>vtuber.actionMode!=='flirt_kiss'&&document.querySelectorAll('.winky-lab-heart').length===0));
  await page.click('#stop');

  await page.selectOption('#source','local_reply');await page.selectOption('#templateLang','ru');
  await page.click('#templatePlay');await c.waitForFunction(()=>avatarLabState?.id?.startsWith('lab-text-'));
  check('unrecorded source text has a labeled silent visual preview',await page.evaluate(()=>document.getElementById('status').textContent.includes('Без озвучки')&&document.getElementById('audio').paused));
  await page.click('#stop');
  await page.selectOption('#route','llm_reply');await page.fill('#commentText','Ты такая милая!');await page.fill('#replyText','[blush] Спасибо, ты меня смущаешь.');await page.click('#dynamicPlay');
  await c.waitForFunction(()=>avatarLabState?.profile==='embarrassed');check('dynamic comment and reply are normalized through the visible UI',true);
  await page.screenshot({path:path.join(output,'sync-stand.png'),fullPage:true});await page.click('#stop');
  check('no browser errors',report.errors.length===0);check('no requests leave the isolated lab',requests.every(r=>r.startsWith('http://127.0.0.1:8794/')));
  console.log(JSON.stringify({checks:report.checks.length,errors:report.errors}));
 }finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'sync-verification.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
