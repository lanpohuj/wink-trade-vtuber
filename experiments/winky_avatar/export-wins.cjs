// Silent full-round preview of received result events. No live trades or voice generation.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
(async()=>{const b=await chromium.launch();const out=path.join(__dirname,'.runtime/win-reactions'),dir=path.join(out,'frames');fs.mkdirSync(dir,{recursive:true});
 try{const p=await b.newPage({viewport:{width:600,height:720}});await p.goto('http://127.0.0.1:8794/frame.html?candidate=1');await p.waitForFunction(()=>window.labReady);
 await p.evaluate(()=>{avatarLabReceive({type:'cancel'});avatarLabReceive({type:'idle-enabled',enabled:false});avatarLabCelebrations.random=()=>.999;
  window.step=vtuber.update.bind(vtuber);vtuber.update=()=>{};winkySetScale(1);for(let i=0;i<30;i++)step(1/30,0);
  window.exportCanvas=document.createElement('canvas');exportCanvas.width=600;exportCanvas.height=720;});
 const labels=['Радостные прыжки','Взмахи над головой','Кулачки у лица','Качание бёдрами','Сердечко руками'];
 for(let n=0;n<690;n++){
  const data=await p.evaluate(({n,label})=>{
   const clip=Math.floor(n/138),local=n%138;
   if(local===6)avatarLabReceive({type:'context',context:{connected:true,phase:'RESULT',result:'WIN',result_age_sec:0,result_key:`preview:${clip+1}:result`}});
   step(1/30,n/30);window.winkyScreenshot();const ctx=exportCanvas.getContext('2d');ctx.fillStyle='#20283a';ctx.fillRect(0,0,600,720);ctx.drawImage(window.canvas,0,0,600,720);
   ctx.fillStyle='#e9edff';ctx.font='16px system-ui';ctx.textBaseline='top';ctx.fillText(`${clip+1}/5 · ${label}`,14,14);
   ctx.font='12px system-ui';ctx.fillText('Симуляция подтверждённого плюса · без звука',14,39);
   return exportCanvas.toDataURL('image/jpeg',.9).split(',')[1];
  },{n,label:labels[Math.floor(n/138)]});fs.writeFileSync(path.join(dir,String(n).padStart(4,'0')+'.jpg'),Buffer.from(data,'base64'));
  if(n%230===0)console.log('frames '+n+'/690');
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',path.join(dir,'%04d.jpg'),'-frames:v','690','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'win-round.mp4')]);console.log('Exported 23-second five-motion round');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
