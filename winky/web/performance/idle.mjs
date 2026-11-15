// Silent stage behavior. Speech owns the body as soon as a real recording starts.
const POOLS={
  playful:['hip_groove','shy','neko_paws','peek_closer','tilt','joy','flirt_kiss'],
  attentive:['ponder','peek_closer','tilt','nod'],
  watching:['peek_closer','hip_groove','neko_paws','ponder','tilt'],
  waiting:['ponder','peek_closer','tilt'],
  supportive:['tilt','nod','ponder','peek_closer'],
};
const DURATION={hip_groove:5.6,shy:3.4,neko_paws:3.6,flirt_kiss:3.2,peek_closer:3.4,
  ponder:3.4,tilt:2.8,nod:2.6,joy:2.8,quiet_laugh:3.2,hand_heart:3.2};
const COOLDOWN={hip_groove:24,shy:22,neko_paws:23,flirt_kiss:48,peek_closer:16,
  ponder:17,tilt:7,nod:10,joy:18,quiet_laugh:30,hand_heart:35};
export class IdleDirector{
  constructor(random=Math.random){
    this.random=random;this.time=0;this.enabled=true;this.active=null;this.serial=0;
    this.nextAt=2.8+random()*1.2;this.previous='';this.last={};this.context={};
    this.contextAt=-Infinity;this.negativeUntil=0;this.recentProfile='';this.recentAt=-Infinity;
  }
  setContext(context={}){
    this.context={...context};this.contextAt=this.time;
    if(context.result==='LOSS'&&Number(context.result_age_sec)<45)
      this.negativeUntil=Math.max(this.negativeUntil,this.time+45-Math.max(0,Number(context.result_age_sec)));
    if(context.result==='WIN'&&Number(context.result_age_sec)<45)this.negativeUntil=this.time;
  }
  mood(){
    if(this.time<this.negativeUntil)return 'supportive';
    if(this.time-this.contextAt<7){
      if(this.context.preparing>0||this.context.ready>0)return 'waiting';
      if(this.context.connected&&this.context.phase==='IN_TRADE'&&Number(this.context.remaining_sec)-(this.time-this.contextAt)>12&&!this.context.high_volatility)return 'watching';
      if(this.context.connected&&['ANALYZING','IN_TRADE','RESULT'].includes(this.context.phase))return 'attentive';
    }
    return 'playful';
  }
  speech(profile,gesture=''){this.recentProfile=profile;this.recentAt=this.time;if(gesture){this.previous=gesture;this.last[gesture]=this.time;}if(profile==='reassure')this.negativeUntil=Math.max(this.negativeUntil,this.time+25);this.interrupt(1.5);}
  interrupt(delay=2){this.active=null;this.nextAt=Math.max(this.nextAt,this.time+delay);}
  enable(value){this.enabled=!!value;this.interrupt(2.5);}
  tick(dt,{speech=false,manual=false}={}){
    this.time+=Math.max(0,Math.min(.5,dt));
    if(!this.enabled||speech||manual){this.interrupt(1.5);return null;}
    const mood=this.mood();
    if(this.active&&this.active.mood!==mood){this.interrupt(.8);return null;}
    if(this.active&&this.time-this.active.started>=this.active.duration){
      this.active=null;this.nextAt=this.time+1.7+this.random()*1.6;
    }
    if(!this.active&&this.time>=this.nextAt){
      let pool=POOLS[mood];
      if(mood==='playful'&&this.time-this.recentAt<35){
        if(this.recentProfile==='amused')pool=[...pool,'quiet_laugh'];
        if(['thanks','gift_thanks'].includes(this.recentProfile))pool=[...pool,'hand_heart'];
      }
      const eligible=pool.filter(g=>g!==this.previous&&this.time-(this.last[g]??-Infinity)>=COOLDOWN[g]);
      if(!eligible.length){this.nextAt=this.time+1;return null;}
      // Favor movements that have not appeared recently, with shuffled ties.
      const order=eligible.map(g=>({g,score:(this.last[g]??-10000)+this.random()*6})).sort((a,b)=>a.score-b.score);
      const gesture=order[0].g;this.last[gesture]=this.time;this.previous=gesture;
      this.active={id:++this.serial,gesture,duration:DURATION[gesture],started:this.time,mood};
    }
    if(!this.active)return null;
    return {...this.active,time:this.time-this.active.started};
  }
}
