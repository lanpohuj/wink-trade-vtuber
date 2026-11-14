const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8794');await page.waitForFunction(()=>!document.getElementById('play').disabled);
  await page.selectOption('#category','NARRATE_ENGAGE');
  for(const action of ['quiet_laugh','ponder','playful_doubt','hand_heart']){
   // Each first reaction is a fresh session; cooldown behavior is tested separately.
   await page.reload();await page.waitForFunction(()=>!document.getElementById('play').disabled);
   await page.selectOption('#category','NARRATE_ENGAGE');
   await page.selectOption('#gesture','');await page.selectOption('#chatEmotion',action);
   await page.click('#chat');
   await page.waitForFunction(action=>{
    const w=document.getElementById('candidate').contentWindow;
    return w.vtuber.actionMode===action&&w.avatarLabState?.speaking&&w.avatarLabState.rms>.02;
   },action);
   const started=await page.evaluate(()=>{
    const w=document.getElementById('candidate').contentWindow,state={...w.avatarLabState};
    document.getElementById('audio').pause();return {...state,action:w.vtuber.actionMode};
   });
   assert.equal(started.gesture,action);assert.equal(started.action,action);assert.ok(started.id&&started.rms>.02);
   await page.click('#stop');await page.waitForFunction(()=>document.getElementById('candidate').contentWindow.vtuber.actionMode===null);
   results.push({action,id:started.id,rms:started.rms,profile:started.profile,stopped:true});
  }
  assert.deepEqual(errors,[]);
  const output=path.join(__dirname,'.runtime/revision-4/speech-verification.json');
  fs.writeFileSync(output,JSON.stringify({scope:'simulated_chat_emotion_on_existing_muted_recording',results,errors},null,2)+'\n');
  console.log(JSON.stringify({speech_scenarios:results.length,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
