// Real-rig rehearsal with existing recordings. No bot, broker, LLM or TTS requests.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {spawn,execFileSync}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.WINKY_REHEARSAL_OUT||path.join(root,'artifacts/winky-autonomous');
const timeline=JSON.parse(fs.readFileSync(process.env.WINKY_REHEARSAL_TIMELINE||path.join(root,'docs/voice-audit/conversation-v1/autonomous-rehearsal-timeline.json')));
const exporting=process.argv.includes('--export');
fs.mkdirSync(out,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.WINKY_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const report={staged:true,live:false,checks:[],errors:[],video_exported:false};
 try{
  const page=await browser.newPage({viewport:{width:1000,height:920}});
  page.on('pageerror',e=>report.errors.push(e.message));
  const load=async()=>{
   await page.goto('http://127.0.0.1:8794/frame.html?candidate=1');await page.waitForFunction(()=>window.labReady);
   await page.evaluate(()=>{
    avatarLabReceive({type:'cancel'});avatarLabReceive({type:'idle-enabled',enabled:false});
    window.step=vtuber.update.bind(vtuber);vtuber.update=()=>{};
    window.advance=(seconds,clock=false)=>{for(let t=0;t<seconds;t+=1/60){
     if(clock&&avatarLabDirector.active)avatarLabReceive({type:'clock',id:avatarLabDirector.active.id,time:avatarLabDirector.active.time+1/60,rms:.5});
     step(1/60,t);
    }};
   });
  };
  await load();
  const checks=await page.evaluate(()=>{
   const rows=[],check=(name,condition)=>{if(!condition)throw Error(name);rows.push(name);};
   const send=avatarLabReceive;
   send({type:'begin',event:{id:'serious',category:'CHAT_REPLY',intent:'bot',duration:18,max_duration_sec:25}});
   send({type:'clock',id:'serious',time:1,rms:.5});
   send({type:'context',context:{connected:true,phase:'RESULT',result:'WIN',result_age_sec:0,result_key:'check:1:result'}});
   advance(.2,true);
   check('serious answer owns the body while the win waits',!avatarLabCelebrations.active&&!!avatarLabCelebrations.pending&&avatarLabDirector.active.profile==='explain');
   advance(6,true);check('old large win expires instead of interrupting explanation',!avatarLabCelebrations.pending&&!avatarLabCelebrations.active);
   send({type:'end',id:'serious'});advance(.2);
   check('ending the explanation cannot revive the expired dance',!avatarLabCelebrations.active);
   send({type:'begin',event:{id:'short',category:'CHAT_REPLY',intent:'bot',duration:5}});
   send({type:'clock',id:'short',time:1,rms:.4});
   send({type:'context',context:{connected:true,phase:'RESULT',result:'WIN',result_age_sec:0,result_key:'check:2:result'}});
   advance(.2,true);send({type:'end',id:'short'});advance(.2);
   check('a short natural boundary releases the fresh win',!!avatarLabCelebrations.active);
   const serial=avatarLabCelebrations.serial;
   send({type:'begin',event:{id:'result-voice',category:'TRADE_WIN',session_id:'check',trade_seq:2,created_at:Date.now(),duration:3}});
   send({type:'context',context:{connected:true,phase:'RESULT',result:'WIN',result_age_sec:0,result_key:'check:2:result'}});
   check('heartbeat and delayed voice share one visual result',avatarLabCelebrations.serial===serial);
   send({type:'cancel'});
   send({type:'begin',event:{id:'beats',category:'CHAT_REPLY',duration:7,performance:{beats:[
    {start:.2,duration:2,gesture:'hand_heart'},{start:4,duration:2,gesture:'peek_closer'}]}}});
   send({type:'clock',id:'beats',time:1,rms:.6});advance(.1);
   check('authored first beat reaches the actual hand-heart action',vtuber.actionMode==='hand_heart');
   send({type:'clock',id:'beats',time:5,rms:.6});advance(.1);
   check('second authored beat follows the same audio clock',vtuber.actionMode==='peek_closer');
   send({type:'end',id:'stale'});send({type:'cancel',id:'stale'});
   check('stale callbacks leave the current performance intact',avatarLabDirector.active.id==='beats'&&!avatarLabDirector.active.ended);
   advance(11);check('missing clock and end release orphaned articulation',!avatarLabDirector.active&&vtuber.speechHoldTimer===0);
   send({type:'cancel'});check('manual stop clears pending visual reactions',!avatarLabCelebrations.pending&&!avatarLabCelebrations.active);
   return rows;
  });
  report.checks.push(...checks);
  await page.screenshot({path:path.join(out,'stage-verification.png')});
  assert.equal(report.errors.length,0);
  if(exporting){
   await load();
   await page.evaluate(timeline=>{
    window.review=timeline;window.previousClip=null;window.previousContext=-1;
    window.stageSamples=[];window.lastStageSignature='';
    avatarLabReceive({type:'idle-enabled',enabled:true});avatarLabCelebrations.random=()=>.999;
    window.exportCanvas=document.createElement('canvas');exportCanvas.width=1300;exportCanvas.height=920;
    window.renderReviewFrame=n=>{
     const t=n/review.fps;
     const ctxEvent=[...review.context_events].reverse().find(e=>e.at<=t)||review.context_events[0];
     const clip=review.clips.find(c=>t>=c.at&&t<c.at+c.duration);
     const upcoming=review.clips.find(c=>c.at>t&&c.at-t<2&&c.event.comment);
     avatarLabReceive({type:'context',context:{...ctxEvent,connected:true,movement_mode:'vivid',
      remaining_sec:Math.max(0,(ctxEvent.remaining_sec||0)-(t-ctxEvent.at)),
      preparing:upcoming?1:0,ready:0,result_age_sec:ctxEvent.result?t-ctxEvent.at:Infinity,
      result_key:ctxEvent.result?`rehearsal:${ctxEvent.seq}:result`:''}});
     if(previousClip&&previousClip!==clip)avatarLabReceive({type:'end',id:previousClip.event.id});
     if(clip&&previousClip!==clip)avatarLabReceive({type:'begin',event:{...clip.event,created_at:Date.now()}});
     if(clip)avatarLabReceive({type:'clock',id:clip.event.id,time:t-clip.at,rms:clip.rms[Math.floor((t-clip.at)/.05)]||0});
     previousClip=clip||null;
     step(1/review.fps,t);window.winkyScreenshot();
     const state=window.avatarLabState,signature=[state.id,state.gesture,state.phase,state.celebration,state.pendingCelebration].join(':');
     if(signature!==lastStageSignature){stageSamples.push({at:t,id:state.id,gesture:state.gesture,phase:state.phase,
      celebration:state.celebration,pending:state.pendingCelebration});lastStageSignature=signature;}
     const c=exportCanvas.getContext('2d');c.fillStyle='#20283a';c.fillRect(0,0,1300,920);c.drawImage(window.canvas,0,0,1000,920);
     c.fillStyle='#111a2c';c.fillRect(1000,0,300,920);
     const text=(s,x,y,max=270,size=18,color='#e9edff')=>{
      c.fillStyle=color;c.font=`${size}px system-ui`;c.textBaseline='top';let line='',lineY=y;
      for(const word of s.split(' ')){if(c.measureText(line+word).width>max&&line){c.fillText(line,x,lineY);lineY+=size*1.45;line='';}line+=word+' ';}
      if(line)c.fillText(line,x,lineY);return lineY+size*1.45;
     };
     text('ВИНКИ · РЕПЕТИЦИЯ',1020,26,260,19,'#bdb5ff');
     text(review.caption||'Тестовые сообщения и сделки. Существующие MP3. Без живой генерации.',1020,65,260,13,'#b5bfd7');
     const scene=[...review.scenes].reverse().find(s=>s.at<=t);
     text(scene.title,1020,155,260,22);text(scene.description,1020,220,260,16,'#c1c9df');
     const phase={ANALYZING:'Поиск',IN_TRADE:'Наблюдение',RESULT:'Результат',IDLE:'Свободная пауза'}[ctxEvent.phase];
     text(phase+(ctxEvent.result?' · тестовый '+ctxEvent.result:''),1020,350,260,16,'#a1e9cd');
     const latest=review.clips.filter(c=>c.event.comment&&c.at-2<=t&&t<c.at+c.duration+8).at(-1);
     if(latest){text('Зритель '+latest.event.viewer_key.toUpperCase(),1020,430,260,14,'#bdb5ff');text(latest.event.comment,1020,465,260,18);}
     if(clip){
      c.fillStyle='rgba(11,17,31,.9)';c.fillRect(25,775,945,112);
      text(clip.event.text,45,792,905,21);
      text(clip.owner_listened?'Принятый голосовой дубль':review.caption?'Новая запись · оценка в сцене':'Историческая запись · проверка в сцене',1020,660,260,13,'#b5bfd7');
     }
     text('Без фоновой музыки. Оценка режиссуры, переходов и движений.',1020,760,260,13,'#94a3c5');
     text(`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')} / ${Math.floor(review.duration_sec/60)}:${String(review.duration_sec%60).padStart(2,'0')}`,1020,855,260,17);
     c.fillStyle='#a996ff';c.fillRect(0,916,1300*t/review.duration_sec,4);
     return exportCanvas.toDataURL('image/jpeg',.88).split(',')[1];
    };
   },timeline);
   const silent=path.join(out,'rehearsal-silent.mp4');
   const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(timeline.fps),'-i','-',
    '-an','-c:v','libx264','-preset','veryfast','-crf','21','-threads','2','-pix_fmt','yuv420p',silent],{stdio:['pipe','ignore','pipe']});
   let ffError='';ff.stderr.on('data',d=>ffError+=d);ff.stdin.on('error',()=>{});
   const exit=once(ff,'close');
   const frames=timeline.duration_sec*timeline.fps;
   const snapshots=new Set((timeline.snapshot_seconds||[6,64,74,93,116,154,159,185,221,292]).map(s=>s*timeline.fps));
   for(let n=0;n<frames;n++){
    const encoded=await page.evaluate(n=>renderReviewFrame(n),n),data=Buffer.from(encoded,'base64');
    if(snapshots.has(n))fs.writeFileSync(path.join(out,`scene-${n/timeline.fps}.jpg`),data);
    if(!ff.stdin.write(data))await once(ff.stdin,'drain');
    if(n%(timeline.fps*30)===0)console.log(`Rendered ${n/timeline.fps}/${timeline.duration_sec}s`);
   }
   ff.stdin.end();const [code]=await exit;if(code!==0)throw Error(ffError);
   execFileSync('ffmpeg',['-y','-v','error','-i',silent,'-i',path.join(out,'rehearsal-audio.wav'),
    '-c:v','copy','-c:a','aac','-b:a','128k','-t',String(timeline.duration_sec),'-movflags','+faststart',path.join(out,'winky-autonomous-rehearsal.mp4')]);
   report.frames=frames;report.duration_sec=timeline.duration_sec;report.video_exported=true;
   report.stage_samples=await page.evaluate(()=>stageSamples);
   if(timeline.assert_deferred_win!==false){
    assert.ok(report.stage_samples.some(s=>s.pending==='rehearsal:2:result'));
    assert.ok(!report.stage_samples.some(s=>s.celebration==='rehearsal:2:result'),'long explanation must outlast and cancel deferred dance');
   }
   assert.equal(report.errors.length,0);
  }
  console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,video:report.video_exported}));
 }finally{
  fs.writeFileSync(path.join(out,'stage-verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
