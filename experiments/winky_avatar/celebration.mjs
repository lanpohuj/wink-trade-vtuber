// Visual reactions only: consume received facts; never control trades or audio.
export const WIN_GESTURES=['victory_jump','victory_wave','neko_paws','hip_groove','hand_heart'];
export function tradeKey(session,seq){
  return session&&seq!==undefined&&seq!==null&&String(seq)!==''?`${session}:${seq}:result`:'';
}
export class CelebrationDirector {
  constructor(random=Math.random){this.random=random;this.bag=[];this.previous='';this.seen=new Set();this.latest=new Map();this.active=null;this.serial=0;
    this.time=0;this.pending=null;this.speechProfile='';this.speechPlaying=false;this.smallUntil=0;}
  blocked(){return this.speechPlaying&&['reassure','explain','focus','analysis','thoughtful'].includes(this.speechProfile);}
  setSpeech(profile='',playing=false){
    this.speechProfile=profile;this.speechPlaying=playing;
    if(this.blocked()&&this.active){
      // Do not restart a partly seen dance after the answer.
      this.pending=this.active.time<.1?{reaction:this.active,until:this.time+5}:null;
      this.active=null;this.smallUntil=this.time+.8;
    }
    if(!this.blocked()&&this.pending){
      if(this.time<=this.pending.until)this.active=this.pending.reaction;
      this.pending=null;
    }
  }
  next(){
    if(!this.bag.length){
      this.bag=[...WIN_GESTURES];
      for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
      if(this.bag[0]===this.previous)[this.bag[0],this.bag[1]]=[this.bag[1],this.bag[0]];
    }
    return this.previous=this.bag.shift();
  }
  result({key,outcome,age,connected=true}){
    if(!connected||!key||!Number.isFinite(age)||age<-.5||age>10)return false;
    if(!['WIN','LOSS','REFUND','UNKNOWN'].includes(outcome))return false;
    const sequence=/^(.*):(\d+):result$/.exec(key);
    if(sequence){
      const seq=Number(sequence[2]);if(seq<(this.latest.get(sequence[1])??-1))return false;
      this.latest.set(sequence[1],seq);if(this.latest.size>128)this.latest.delete(this.latest.keys().next().value);
    }
    // Remember all outcomes so a repeated heartbeat cannot revive an old win.
    if(this.seen.has(key))return false;
    this.seen.add(key);if(this.seen.size>4096)this.seen.delete(this.seen.values().next().value);
    if(outcome!=='WIN'){if(['LOSS','REFUND','UNKNOWN'].includes(outcome))this.cancel();return false;}
    this.pending=null;
    this.active={id:++this.serial,key,gesture:this.next(),time:0,duration:3.8};
    if(this.blocked())this.setSpeech(this.speechProfile,true);
    return true;
  }
  context(c={}){return this.result({key:c.result_key,outcome:c.result,age:Number(c.result_age_sec),connected:c.connected===true});}
  speech(event,now=Date.now()/1000){
    const key=tradeKey(event.session_id,event.trade_seq);
    if(!key)return false;
    const created=Number(event.created_at),stamp=created>1e11?created/1000:created;
    // The spoken result can arrive before its heartbeat; both share one key.
    return this.result({key,outcome:event.category==='TRADE_WIN'?'WIN':event.category==='TRADE_LOSS'?'LOSS':'REFUND',
      age:Number.isFinite(stamp)&&stamp>0?now-stamp:Infinity});
  }
  tick(dt){
    this.time+=Math.max(0,Math.min(.5,dt));
    if(this.pending&&this.time>this.pending.until)this.pending=null;
    const a=this.active;if(!a)return null;
    a.time+=Math.max(0,Math.min(.5,dt));if(a.time>=a.duration){this.active=null;return null;}
    return a;
  }
  cancel(){this.active=null;this.pending=null;this.smallUntil=0;}
}
