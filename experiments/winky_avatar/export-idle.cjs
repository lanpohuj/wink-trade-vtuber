// Deterministic silent review of autonomous idle; no voice synthesis or live input.
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
(async()=>{const browser=await chromium.launch();const dir=path.join(__dirname,'.runtime/framing-idle/idle-frames');fs.mkdirSync(dir,{recursive:true});
 try{const p=await browser.newPage({viewport:{width:600,height:720}});await p.goto('http://127.0.0.1:8794/frame.html?candidate=1');await p.waitForFunction(()=>window.labReady);
 await p.addStyleTag({content:'html,body{background:#20283a!important}#caption{position:fixed;top:12px;left:12px;color:#e9edff;font:14px system-ui;line-height:1.4;z-index:20}'});
 await p.evaluate(()=>{
  avatarLabReceive({type:'cancel'});winkySetScale(1);
  let seed=8;avatarLabIdle.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  Object.assign(avatarLabIdle,{time:0,nextAt:2.8+avatarLabIdle.random()*1.2,last:{},previous:'',active:null,negativeUntil:0,context:{},contextAt:0});
  avatarLabIdle.enable(true);avatarLabIdle.nextAt=3.2;
  const update=vtuber.update.bind(vtuber);vtuber.update=()=>{};window.exportUpdate=update;
  window.exportCanvas=document.createElement('canvas');exportCanvas.width=600;exportCanvas.height=720;
 });
 for(let n=0;n<930;n++){
  const data=await p.evaluate(n=>{
    const time=n/30;exportUpdate(1/30,time);
    for(const animation of document.getAnimations()){
      const el=animation.effect?.target;if(!el)continue;
      if(!el.dataset.born)el.dataset.born=String(time);
      animation.pause();animation.currentTime=(time-Number(el.dataset.born))*1000;
      if(time-Number(el.dataset.born)>1.7)el.remove();
    }
    window.winkyScreenshot();
    const ctx=exportCanvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
    ctx.fillStyle='#20283a';ctx.fillRect(0,0,600,720);ctx.drawImage(window.canvas,0,0,600,720);
    for(const el of document.querySelectorAll('.winky-lab-heart')){
      const css=getComputedStyle(el),matrix=new DOMMatrix(css.transform),origin=css.transformOrigin.split(' ').map(parseFloat);
      ctx.save();ctx.globalAlpha=Number(css.opacity);ctx.translate(el.offsetLeft+origin[0],el.offsetTop+origin[1]);
      ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f);ctx.translate(-origin[0],-origin[1]);
      ctx.fillStyle=css.color;ctx.font=css.font||'20px system-ui';ctx.textBaseline='top';ctx.fillText('♥',0,0);ctx.restore();
    }
    ctx.fillStyle='#e9edff';ctx.font='14px system-ui';ctx.textBaseline='top';ctx.fillText('Живое ожидание · без звука',12,12);
    return exportCanvas.toDataURL('image/jpeg',.9).split(',')[1];
  },n);
  fs.writeFileSync(path.join(dir,String(n).padStart(4,'0')+'.jpg'),Buffer.from(data,'base64'));
  if(n%300===0)console.log('frames '+n+'/930');
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',path.join(dir,'%04d.jpg'),'-frames:v','930','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(dir,'../idle-review.mp4')]);
 console.log('Exported 31 seconds at 30 FPS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
