// Experimental only. No imports from, or callbacks into, the running application.
export const PROFILES = {
  conversation: ['listen', 'nod', 'explain_right', 'listen', 'tilt'],
  explain: ['explain_right', 'nod', 'explain_left', 'listen'],
  focus: ['listen', 'tilt', 'nod', 'listen'],
  greeting: ['wave', 'nod'],
  thanks: ['bow', 'joy', 'nod'],
  celebrate: ['joy', 'nod', 'explain_right'],
  reassure: ['nod', 'listen', 'tilt'],
  curious: ['tilt', 'listen', 'nod'],
  playful: ['tilt', 'joy', 'listen'],
  embarrassed: ['shy', 'tilt', 'listen'],
};
export const LABELS = {
  listen: 'Спокойная речь', nod: 'Мягкий кивок', tilt: 'Любопытный наклон',
  explain_right: 'Объяснение правой рукой', explain_left: 'Объяснение левой рукой',
  bow: 'Благодарный поклон', joy: 'Сдержанная радость', wave: 'Живое приветствие',
  shy: 'Смущение с рукой у лица',
};
export function profileFor(event = {}) {
  const kind = event.chat_kind || event.conditions?.chat_kind;
  if (kind === 'join') return 'greeting';
  if (['like', 'follow', 'gift'].includes(kind)) return 'thanks';
  if(event.intent==='greeting')return 'greeting';
  if(event.intent==='compliment')return ['blush','shy'].includes(event.emotion)?'embarrassed':'playful';
  if(['strategy','bot'].includes(event.intent))return 'explain';
  if(['skeptic','gambler'].includes(event.intent))return 'reassure';
  const c = String(event.category || '').toUpperCase();
  if (c === 'TRADE_WIN') return 'celebrate';
  if (['TRADE_LOSS', 'TRADE_REFUND', 'NARRATE_RESULT'].includes(c)) return 'reassure';
  if (['NARRATE_PAIR', 'PAIR_SWITCHED_NEW_SCAN', 'ANALYZING_CHART', 'NARRATE_SCAN',
    'NARRATE_TRADE', 'NARRATE_EXPIRY', 'IN_TRADE_WAITING', 'PREPARE_ENTRY',
    'OPEN_TRADE_CALL', 'OPEN_TRADE_PUT', 'NARRATE_VOLATILITY', 'WEAK_SIGNAL_SWITCH_PAIR'].includes(c)) return 'focus';
  if (['NARRATE_LESSON', 'STREAM_INSIGHT', 'NARRATE_CTA'].includes(c)) return 'explain';
  if (c === 'START_STREAM_READY') return 'greeting';
  // Explicit semantics precede emotion. An excited explanation is still an explanation.
  if (['blush','shy'].includes(event.emotion)) return 'embarrassed';
  if (['thinking', 'surprised', 'peek_closer'].includes(event.emotion)) return 'curious';
  if (['blush', 'shy', 'flirt_kiss', 'wink'].includes(event.emotion)) return 'playful';
  if (['wave', 'greeting'].includes(event.emotion)) return 'greeting';
  return 'conversation';
}
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export function envelope(t, duration) {
  if (t < 0 || t >= duration) return 0;
  return smooth(t / .45) * smooth((duration - t) / .65);
}
export class Director {
  constructor() { this.seen = new Set(); this.indices = {}; this.previous = ''; this.active = null; }
  begin(event) {
    if (!event.id || this.seen.has(event.id)) return null;
    this.seen.add(event.id);
    if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value);
    const profile = profileFor(event), pool = PROFILES[profile];
    let index = this.indices[profile] || 0, gesture = pool[index++ % pool.length];
    if (gesture === this.previous && pool.length > 1) gesture = pool[index++ % pool.length];
    this.indices[profile] = index;
    if (event.gesture && Object.hasOwn(LABELS, event.gesture)) gesture = event.gesture;
    this.previous = gesture;
    this.active = { id: event.id, profile, gesture, time: 0, duration: Math.min(3.1, Math.max(.8, Number(event.duration) || 3)), ended: false };
    return this.active;
  }
  clock(id, time) { if (this.active && this.active.id === id && Number.isFinite(time)) this.active.time = Math.max(0, time); }
  end(id) { if (this.active && this.active.id === id && !this.active.ended) { this.active.ended = true; this.active.release = 1; } }
  frame(dt) {
    const a = this.active;
    if (!a) return { gesture: 'listen', weight: 0, speaking: false };
    if (a.ended) {
      a.release *= Math.exp(-Math.max(0, Math.min(.5, dt)) * 10);
      if (a.release < .001) { this.active = null; return { gesture: 'listen', weight: 0, speaking: false }; }
    }
    return { gesture: a.gesture, weight: envelope(a.time, a.duration) * (a.ended ? a.release : 1), speaking: !a.ended, profile: a.profile };
  }
}
