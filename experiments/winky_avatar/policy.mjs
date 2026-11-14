// Experimental only. No imports from, or callbacks into, the running application.
import {normalizeEvent,canonicalAction} from './sync-event.mjs';
export const PROFILES = {
  conversation: ['listen', 'nod', 'explain_right', 'listen', 'tilt'],
  explain: ['explain_right', 'nod', 'explain_left', 'ponder', 'listen'],
  focus: ['listen', 'tilt', 'nod', 'listen'],
  analysis: ['ponder','peek_closer','listen','nod'],
  engage: ['tilt','quiet_laugh','listen','neko_paws','nod'],
  greeting: ['wave', 'nod'],
  thanks: ['bow', 'joy', 'hand_heart', 'nod'],
  celebrate: ['joy', 'hip_groove', 'nod', 'explain_right'],
  reassure: ['nod', 'listen', 'tilt'],
  curious: ['peek_closer', 'tilt', 'listen', 'ponder'],
  playful: ['tilt', 'joy', 'listen'],
  embarrassed: ['shy', 'flirt_kiss', 'neko_paws', 'tilt', 'listen'],
  flirt: ['flirt_kiss','shy','neko_paws','tilt','listen'],
  amused: ['quiet_laugh', 'tilt', 'listen'],
  thoughtful: ['ponder', 'listen', 'tilt'],
  skeptical: ['playful_doubt', 'listen', 'nod'],
  gift_thanks: ['hand_heart', 'hip_groove', 'bow', 'joy'],
};
export const LABELS = {
  listen: 'Спокойная речь', nod: 'Мягкий кивок', tilt: 'Любопытный наклон',
  explain_right: 'Объяснение правой рукой', explain_left: 'Объяснение левой рукой',
  bow: 'Благодарный поклон', joy: 'Сдержанная радость', wave: 'Живое приветствие',
  shy: 'Смущение · прикрывает рот',
  quiet_laugh:'Тихий смех',ponder:'Задумчивость',playful_doubt:'Игривое недоверие',hand_heart:'Сердечко руками',
  flirt_kiss:'Воздушный поцелуй после фразы',neko_paws:'Кулачки у лица',hip_groove:'Качание бёдрами',peek_closer:'Любопытное приближение',
};
export function profileFor(input = {}) {
  const event=normalizeEvent(input);
  const c = String(event.category || '').toUpperCase();
  if (c === 'TRADE_WIN') return 'celebrate';
  if(c==='NARRATE_RESULT' && /^WIN/.test(String(event.result_kind||event.conditions.result_kind||'')))return 'celebrate';
  if (['TRADE_LOSS', 'TRADE_REFUND', 'NARRATE_RESULT'].includes(c)) return 'reassure';
  if(['ANALYZING_CHART','NARRATE_SCAN'].includes(c))return 'analysis';
  if (['NARRATE_PAIR', 'PAIR_SWITCHED_NEW_SCAN', 'ANALYZING_CHART', 'NARRATE_SCAN',
    'NARRATE_TRADE', 'NARRATE_EXPIRY', 'IN_TRADE_WAITING', 'PREPARE_ENTRY',
    'OPEN_TRADE_CALL', 'OPEN_TRADE_PUT', 'SIGNAL_ANNOUNCEMENT', 'NARRATE_VOLATILITY', 'WEAK_SIGNAL_SWITCH_PAIR'].includes(c)) return 'focus';
  if (['NARRATE_LESSON', 'STREAM_INSIGHT', 'NARRATE_CTA'].includes(c)) return 'explain';
  if(c==='NARRATE_ENGAGE')return 'engage';
  if (c === 'START_STREAM_READY') return 'greeting';
  const kind = event.chat_kind || event.conditions?.chat_kind;
  if (kind === 'join') return 'greeting';
  if (kind === 'gift') return 'gift_thanks';
  if (['like', 'follow'].includes(kind)) return 'thanks';
  if(event.intent==='greeting')return 'greeting';
  if(event.intent==='compliment')return 'embarrassed';
  if(['strategy','bot'].includes(event.intent))return 'explain';
  if(['skeptic','gambler'].includes(event.intent))return 'reassure';
  if(event.intent==='pair_request')return 'focus';
  if(event.intent==='engage')return 'engage';
  // Explicit semantics precede emotion. An excited explanation is still an explanation.
  if (['quiet_laugh','laugh'].includes(event.emotion) || event.intent==='joke') return 'amused';
  if (event.emotion==='ponder' || event.emotion==='thinking') return 'thoughtful';
  if (event.emotion==='playful_doubt' || event.intent==='playful_doubt') return 'skeptical';
  if (event.emotion==='hand_heart' || event.intent==='thanks') return 'gift_thanks';
  if (['blush','shy'].includes(event.emotion)) return 'embarrassed';
  if(['flirt_kiss','neko_paws'].includes(event.emotion)||event.action==='flirt_kiss')return 'flirt';
  if(['win','cheer','dance','hip_groove','groove'].includes(event.emotion))return 'celebrate';
  if(event.intent==='question')return 'curious';
  if (['surprised', 'peek_closer'].includes(event.emotion)) return 'curious';
  if (event.emotion==='wink' && event.intent!=='general') return 'playful';
  if (['wave', 'greeting'].includes(event.emotion)) return 'greeting';
  return 'conversation';
}
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export function envelope(t, duration) {
  if (t < 0 || t >= duration) return 0;
  return smooth(t / .45) * smooth((duration - t) / .65);
}
export class Director {
  constructor() { this.seen = new Set(); this.indices = {}; this.previous = ''; this.active = null;this.lastLarge=-Infinity; }
  begin(input,now=performance.now()/1000) {
    const event=normalizeEvent(input);
    if (!event.id || this.seen.has(event.id)) return null;
    this.seen.add(event.id);
    if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value);
    const profile = profileFor(event), pool = PROFILES[profile];
    let index = this.indices[profile] || 0, gesture = pool[index++ % pool.length];
    if (gesture === this.previous && pool.length > 1) gesture = pool[index++ % pool.length];
    this.indices[profile] = index;
    const serious=['focus','analysis','reassure','explain'].includes(profile);
    const hint=canonicalAction(event.promised_action||event.action);
    if(hint&&Object.hasOwn(LABELS,hint)&&(!serious||['nod','listen','ponder','peek_closer','explain_left','explain_right'].includes(hint)))gesture=hint;
    if (event.gesture && Object.hasOwn(LABELS, event.gesture)) gesture = event.gesture;
    // A short acknowledgment should not compress a full arm gesture into a jerk.
    if(!event.gesture && Number(event.duration)>0 && Number(event.duration)<1.8
      && ['wave','shy','quiet_laugh','ponder','hand_heart','neko_paws','hip_groove'].includes(gesture))gesture='nod';
    const large=['wave','shy','quiet_laugh','ponder','hand_heart','neko_paws','hip_groove','flirt_kiss'].includes(gesture);
    if(large&&!event.gesture&&!event.promised_action&&now-this.lastLarge<8)gesture='nod';
    if(large&&gesture!=='nod')this.lastLarge=now;
    this.previous = gesture;
    this.active = { id: event.id, profile, gesture, time: 0, duration: Math.min(3.2, Math.max(.8, Number(event.duration) || 3)),
      start:.12,deferred:gesture==='flirt_kiss',ended:false,playing:true,tailTime:0,source:event.source||'',text:event.text };
    return this.active;
  }
  clock(id, time, playing=true) { if (this.active && this.active.id === id && Number.isFinite(time)) {this.active.time = Math.max(0, time);this.active.playing=playing;} }
  end(id) { if (this.active && this.active.id === id && !this.active.ended) { this.active.ended = true; this.active.release = 1; } }
  cancel(){this.active=null;}
  frame(dt) {
    const a = this.active;
    if (!a) return { gesture: 'listen', weight: 0, speaking: false };
    if (a.ended) {
      if(a.deferred && a.tailTime<3.6){a.tailTime+=Math.max(0,Math.min(.5,dt));return {gesture:'flirt_kiss',weight:envelope(a.tailTime,3.2),speaking:false,profile:a.profile,phase:'tail',poseTime:Math.min(3.2,a.tailTime),poseDuration:3.2};}
      a.release *= Math.exp(-Math.max(0, Math.min(.5, dt)) * 10);
      if (a.release < .001) { this.active = null; return { gesture: 'listen', weight: 0, speaking: false }; }
    }
    const time=Math.max(0,a.time-a.start),gesture=a.deferred?'tilt':a.gesture;
    return { gesture,plannedGesture:a.gesture, weight:a.ended&&a.deferred?0:envelope(time,a.duration)*(a.ended?a.release:1),
      speaking:!a.ended&&a.playing,profile:a.profile,phase:a.ended?'release':a.time<a.start?'before':time<a.duration?'during':'after',poseTime:Math.min(a.duration,time),poseDuration:a.duration };
  }
}
export function performancePlan(input){
  const event=normalizeEvent(input),profile=profileFor(event);
  return {profile,variants:PROFILES[profile],hint:event.promised_action||event.action||'',emotion:event.emotion,
    intent:event.intent,category:event.category,chat_kind:event.chat_kind,afterSpeech:PROFILES[profile].includes('flirt_kiss')};
}
