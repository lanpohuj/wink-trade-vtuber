/* Pure, deterministic analysis and broker packet helpers. No DOM or orders. */
(function (root) {
  'use strict';
  const symbol = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const epoch = value => Number(value) < 1e11 ? Number(value) * 1000 : Number(value);
  const ema = (values, n) => values.reduce((a, v) => a.concat(a.length ? a.at(-1) + 2 / (n + 1) * (v - a.at(-1)) : v), []);
  function candles(ticks, seconds, now) {
    const buckets = new Map();
    for (const t of [...ticks].sort((a, b) => a.ts - b.ts)) {
      const time = Math.floor(t.ts / (seconds * 1000)) * seconds * 1000;
      if (time + seconds * 1000 > now) continue; // closed bars only
      const c = buckets.get(time);
      if (c) { c.high = Math.max(c.high, t.price); c.low = Math.min(c.low, t.price); c.close = t.price; c.count++; }
      else buckets.set(time, { time, open: t.price, high: t.price, low: t.price, close: t.price, count: 1 });
    }
    return [...buckets.values()];
  }
  function metrics(bars) {
    const closes = bars.map(c => c.close), fast = ema(closes, 9), slow = ema(closes, 21);
    const atr = bars.slice(-14).reduce((s, c, i) => {
      const prev = bars[bars.length - Math.min(14, bars.length) + i - 1]?.close ?? c.open;
      return s + Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
    }, 0) / Math.min(14, bars.length);
    const f = fast.at(-1), s = slow.at(-1), slope = s - slow.at(-4);
    const direction = f > s && slope > atr * 0.08 ? 'BUY' : f < s && slope < -atr * 0.08 ? 'SELL' : null;
    const last = closes.slice(-12), travel = last.slice(1).reduce((a, v, i) => a + Math.abs(v - last[i]), 0);
    const efficiency = travel ? Math.abs(last.at(-1) - last[0]) / travel : 0;
    return { atr, fast: f, slow: s, direction, efficiency };
  }
  function analyze(ticks, pair, now = Date.now()) {
    const reject = reason => ({ shouldTrade: false, valid: false, direction: null, confidence: 0, qualityScore: 0,
      vetoReason: reason, line1: reason, line2: 'Ожидание подтверждённого сетапа', factors: [], atr: 0 });
    const clean = ticks.filter(t => t.asset && symbol(t.asset) === symbol(pair) && Number.isFinite(t.price) && t.price > 0 && Number.isFinite(t.ts) && t.ts <= now && t.ts >= now - 45 * 60000).sort((a, b) => a.ts - b.ts);
    if (!clean.length || now - clean.at(-1).ts > 3000) return reject('Нет свежих котировок выбранной пары');
    const frames = [15, 30, 60, 120].map(s => ({ seconds: s, bars: candles(clean, s, now) }));
    if (frames.some(f => f.bars.length < (f.seconds === 120 ? 12 : 24))) return reject('Прогрев: нужно 12 закрытых свечей M2 и 24 младших свечи');
    for (const f of frames) {
      const recent = f.bars.slice(f.seconds === 120 ? -12 : -24);
      if (now - recent.at(-1).time > f.seconds * 2000 || recent.some((c, i) => i && c.time - recent[i - 1].time !== f.seconds * 1000)) return reject('Разрыв истории котировок');
      f.m = metrics(f.bars);
    }
    const macro = frames[3].m.direction;
    if (!macro || frames[2].m.direction !== macro) return reject('M1 и M2 не подтверждают общий тренд');
    const sign = macro === 'BUY' ? 1 : -1;
    const candidates = [];
    for (const f of frames.slice(0, 3)) {
      const { atr, fast, direction, efficiency } = f.m;
      if (!(atr > 0) || direction !== macro || efficiency < 0.25) continue;
      const c = f.bars.at(-1), prev = f.bars.at(-2), body = Math.abs(c.close - c.open);
      const price = clean.at(-1).price;
      const nearMean = Math.abs(prev.close - fast) <= atr * 0.8;
      const pullback = (prev.close - prev.open) * sign < 0;
      const confirmation = (c.close - c.open) * sign > 0 && (c.close - prev.close) * sign > 0;
      const late = (price - c.close) * sign > atr * 0.25 || now - (c.time + f.seconds * 1000) > Math.min(5000, f.seconds * 250);
      const adverse = (price - c.close) * sign < -atr * 0.3;
      const wick = macro === 'BUY' ? c.high - c.close : c.close - c.low;
      const levels = f.bars.slice(-24, -2).flatMap(b => [b.high, b.low]);
      const obstacles = levels.map(p => (p - price) * sign).filter(d => d > 0);
      const room = obstacles.length ? Math.min(...obstacles) / atr : Infinity;
      const micro = clean.filter(t => t.ts >= now - 3000);
      if (!pullback || !nearMean || !confirmation || late || adverse || body < atr * 0.2 || body > atr * 1.1 || wick > body * 0.65 || room < 0.6 || micro.length < 3 || (micro.at(-1).price - micro[0].price) * sign <= 0) continue;
      const expiry = f.seconds * 2; // one complete continuation window, not an arbitrary clock value
      candidates.push({ seconds: f.seconds, expiry, atr, score: Math.min(5, 3.5 + efficiency + Math.min(room, 2) / 4), time: c.time });
    }
    candidates.sort((a, b) => b.score - a.score || a.seconds - b.seconds);
    if (!candidates.length) return reject('Нет отката с подтверждением, запасом до уровня и свежим импульсом');
    const best = candidates[0];
    return { valid: true, shouldTrade: true, direction: macro, confidence: 0, qualityScore: best.score,
      setup: 'MTF_TREND_PULLBACK', recommendedExpiry: best.expiry === 120 ? '2m' : best.expiry === 60 ? '1m' : '30s',
      entryTimeframe: `S${best.seconds}`, signalKey: `${symbol(pair)}:${best.seconds}:${best.time}:${macro}`,
      atr: best.atr, factors: ['M1/M2: ' + macro, 'Закрытый откат и свеча подтверждения', 'Фильтр уровня и свежих тиков'],
      line1: `Тренд M1/M2 ${macro}; подтверждённый откат на ${best.seconds}с.`,
      line2: `Экспирация ${best.expiry}с; оценка условий ${best.score.toFixed(1)}/5 (не вероятность выигрыша).` };
  }
  function packet(text) {
    if (typeof text !== 'string') return null;
    const start = text.indexOf('[');
    if (start < 0) return null;
    try { const p = JSON.parse(text.slice(start)); return typeof p[0] === 'string' ? { event: p[0], data: p[1] } : null; } catch (_) { return null; }
  }
  function objects(value, result = []) {
    if (!value || typeof value !== 'object') return result;
    if (!Array.isArray(value) && (value.id != null || value.order_id != null || value.deal_id != null)) result.push(value);
    for (const v of Object.values(value)) if (v && typeof v === 'object') objects(v, result);
    return result;
  }
  function order(value) {
    const id = value.id ?? value.order_id ?? value.deal_id;
    const openedAt = epoch(value.open_time ?? value.openTime);
    const closesAt = epoch(value.close_time ?? value.closeTime ?? value.expired);
    const amount = Number(value.amount ?? value.bet ?? value.sum);
    const direction = ['call', 'buy'].includes(String(value.action ?? value.direction).toLowerCase()) ? 'BUY' : ['put', 'sell'].includes(String(value.action ?? value.direction).toLowerCase()) ? 'SELL' : null;
    return { id: id == null ? null : String(id), asset: value.asset ?? value.symbol, amount, openedAt, closesAt, direction };
  }
  function settlement(value) {
    const o = order(value);
    // Pocket's profit is net P/L. Do not infer loss from deducted balance.
    const profit = typeof value.profit === 'number' ? value.profit : null;
    return o.id && profit !== null && Number.isFinite(profit) ? { ...o, profit, outcome: profit > 0 ? 'WIN' : profit < 0 ? 'LOSS' : 'REFUND' } : null;
  }
  const api = { symbol, epoch, candles, metrics, analyze, packet, objects, order, settlement };
  if (typeof module !== 'undefined') module.exports = api;
  root.WinkyTradingCore = api;
})(globalThis);
