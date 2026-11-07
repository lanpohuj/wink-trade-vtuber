/**
 * Winky AI — Page Context Hook (po.financial)
 * Intercepts live WebSocket ticks and Chart Canvas text renders directly in the main page world.
 * Executes pair switching and expiration synchronization with full Main World permissions.
 */
(function () {
  "use strict";

  // Prevent double injection
  if (window.__WINKY_PAGE_HOOK_LOADED__) return;
  window.__WINKY_PAGE_HOOK_LOADED__ = true;
  const HOOK_VERSION="2.3.2";
  let lastHistoryTransport=null;
  const historyReplayAt=new Map();
  const historyWindows=new Map(),historyRecoveries=new Map();
  let extensionHistorySend=false,marketSocket=null,historyRequestIndex=Math.floor(Date.now()/10);

  console.log("[WinkyHook] Инжектирован в контекст страницы po.financial");

  // 0. Hook HTMLCanvasElement.prototype.getContext to force preserveDrawingBuffer for WebGL
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
      attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
    }
    return origGetContext.call(this, type, attrs);
  };

  // 1. Hook WebSocket traffic for real ticks and deal synchronization
  const OriginalWebSocket = window.WebSocket;
  let pendingTradeCommand = null;
  let lastSentTrade = null;
  const normalizeAsset = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const toMilliseconds = value => Number(value) < 1e11 ? Number(value) * 1000 : Number(value);
  let marketContext = { asset: null, generation: 0, periodSec: null, changedAt: 0 };
  const pairVisitedAt = new Map();
  function selectPairCandidate(candidates, excludedPairs=[]) {
    const excluded=new Set(excludedPairs.map(normalizeAsset));
    return Array.from(new Map(candidates.map(c=>[c.normName,c])).values()).filter(c=>!excluded.has(c.normName))
      .sort((a,b)=>b.payout-a.payout || (pairVisitedAt.get(a.normName)||0)-(pairVisitedAt.get(b.normName)||0) || a.normName.localeCompare(b.normName))[0] || null;
  }
  function normalizeChartTf(value) {
    const text = String(value || '').trim().toUpperCase().replace(/\s/g, '');
    const reversed = text.match(/^(\d+)(S|M|H)$/);
    if(reversed) return reversed[2]+reversed[1];
    const localized=text.match(/^(\d+)(С|СЕК\.?|SEC\.?|SECONDS?|МИН\.?|MIN\.?|MINUTES?)$/);
    if(localized) return (/МИН|MIN/.test(localized[2])?'M':'S')+localized[1];
    return text;
  }
  const tfSeconds = value => { const m=normalizeChartTf(value).match(/^(S|M|H)(\d+)$/); return m ? Number(m[2])*({S:1,M:60,H:3600}[m[1]]) : null; };
  const marketTrace=[];
  function traceHistory(kind,name,payload) {
    const raw=Array.isArray(payload)?payload:payload?.data || payload?.history || payload?.candles || payload?.ticks;
    const safeItem=item=>Array.isArray(item)?item.filter(v=>typeof v==='number' || (typeof v==='string' && /^[A-Z0-9_]{3,30}$/i.test(v))).slice(0,7):
      item && typeof item==='object'?Object.fromEntries(['asset','symbol','time','timestamp','ts','price','open','high','low','close'].filter(k=>
        ['asset','symbol'].includes(k)?typeof item[k]==='string' && /^[A-Z0-9_]{3,30}$/i.test(item[k]):Number.isFinite(Number(item[k])) && item[k]!==null).map(k=>[k,item[k]])):null;
    const record={kind,name,at:Date.now(),keys:payload && typeof payload==='object'?Object.keys(payload).slice(0,15):[],
      asset:payload?.asset || payload?.symbol || null,period:payload?.period ?? payload?.timeframe ?? null,
      fields:Object.fromEntries(['time','index','offset','count','limit'].filter(k=>Number.isFinite(payload?.[k])).map(k=>[k,payload[k]])),
      collections:Object.fromEntries(['history','candles','data','ticks'].filter(k=>Array.isArray(payload?.[k])).map(k=>[k,{count:payload[k].length,samples:[...payload[k].slice(0,2),...(payload[k].length>2?[payload[k].at(-1)]:[])].map(safeItem)}])),
      count:Array.isArray(raw)?raw.length:null,samples:Array.isArray(raw)?[...raw.slice(0,2),...(raw.length>2?[raw.at(-1)]:[])].map(safeItem):[]};
    marketTrace.push(record);if(marketTrace.length>60)marketTrace.shift();
    publishHookDiagnostics();
  }
  function publishHookDiagnostics() {
    if(!document.documentElement || !document.createElement || !document.getElementById)return;
    let el=document.getElementById('winky-hook-diagnostics');
    if(!el) {el=document.createElement('script');el.id='winky-hook-diagnostics';el.type='application/json';document.documentElement.appendChild(el);}
    el.textContent=JSON.stringify({version:HOOK_VERSION,context:marketContext,chartTf:window.__winkyActualChartTf || null,trace:marketTrace});
  }
  function rememberHistoryWindow(group,periodSec) {
    if(![15,30,60,120].includes(periodSec))return;
    const key=normalizeAsset(group.asset)+'|'+periodSec;
    const w=historyWindows.get(key) || {times:new Set(),oldest:Infinity,lastResponseAt:0};
    const times=group.candles.map(c=>c.time).concat(group.ticks.map(t=>t.ts));
    for(const c of group.candles)w.times.add(c.time);
    if(times.length)w.oldest=times.reduce((oldest,time)=>Math.min(oldest,time),w.oldest);
    w.lastResponseAt=Date.now();historyWindows.set(key,w);
    if(w.times.size>200)w.times=new Set(Array.from(w.times).sort((a,b)=>a-b).slice(-200));
    if(historyWindows.size>100)historyWindows.delete(historyWindows.keys().next().value);
    const recovery=historyRecoveries.get(key);
    if(recovery && recovery.waiting) {
      recovery.waiting=false;
      if(w.times.size<200 && recovery.pages<3 && w.oldest<recovery.lastOldest) {
        recovery.lastOldest=w.oldest;setTimeout(()=>sendHistoryPage(key),300);
      } else historyRecoveries.delete(key);
    }
  }
  function sendHistoryPage(key) {
    const r=historyRecoveries.get(key),t=lastHistoryTransport,w=historyWindows.get(key);
    if(!r || !t || r.pages>=3 || normalizeAsset(marketContext.asset)!==normalizeAsset(r.pair)) {historyRecoveries.delete(key);return false;}
    const body={...t.payload,asset:marketContext.asset,period:r.period};
    if(Number.isFinite(body.index))body.index=++historyRequestIndex;
    if(Number.isFinite(body.offset) && body.offset>0)body.offset=Math.min(body.offset,200*r.period);
    // time/offset are the fields observed in Pocket's native loadHistoryPeriod.
    // Keep its opaque index and window size; only move the end bound backwards.
    if(!Number.isFinite(body.time)) {historyRecoveries.delete(key);return false;}
    if(Number.isFinite(w?.oldest))body.time=Math.floor(w.oldest/1000)-r.period;
    for(const field of ['count','limit'])if(Number.isFinite(body[field]))body[field]=200;
    if(r.cursors.has(body.time)) {historyRecoveries.delete(key);return false;}
    r.cursors.add(body.time);r.pages++;r.waiting=true;
    try {extensionHistorySend=true;t.socket.send('42'+JSON.stringify([t.event,body]));return true;}
    catch(_) {historyRecoveries.delete(key);return false;}
    finally {extensionHistorySend=false;}
  }
  function publishMarketData(packet, context, pending=[]) {
    const receivedAt = Date.now();
    const history = /^(updateHistoryNewFast|updateHistoryNew|history|candles|load_history|loadHistoryPeriod|loadHistoryPeriodFast|successLoadHistoryPeriod)$/i.test(packet.name);
    if (history) {
      traceHistory('response',packet.name,packet.payload);
      const payload = packet.payload;
      const raw = Array.isArray(payload) ? payload : ['data','history','candles','ticks'].flatMap(k=>Array.isArray(payload?.[k])?payload[k]:[]);
      if (!Array.isArray(raw)) return;
      const groups = new Map();
      const nativePeriod=payload?.period ?? payload?.timeframe;
      let periodSec = Number(nativePeriod) || tfSeconds(nativePeriod) || null;
      const explicitAsset=payload?.asset || payload?.symbol;
      const identityCandidates=pending.filter(r=>(!explicitAsset || normalizeAsset(r.asset)===normalizeAsset(explicitAsset)) &&
        (!nativePeriod || r.periodSec===periodSec));
      if(identityCandidates.length>1 && raw.some(item=>!(Array.isArray(item) && typeof item[0]==='string') && !(item?.asset || item?.symbol))) return; // Anonymous history must not cross generations.
      const bound=identityCandidates.length===1 ? identityCandidates[0] : null;
      if(!nativePeriod && bound) periodSec=bound.periodSec;
      const anonymousAsset=!explicitAsset && bound && bound.generation===context.generation ? bound.asset : null;
      const groupFor = asset => {
        if (!asset) return null; // Never label an anonymous delayed history with the current pair.
        const key=normalizeAsset(asset);
        if (!groups.has(key)) groups.set(key,{asset,ticks:[],candles:[]});
        return groups.get(key);
      };
      for (const item of raw) {
        let asset=explicitAsset || anonymousAsset, timestamp, price;
        if (Array.isArray(item)) {
          if (item.length===3 && typeof item[0]==='string') [asset,timestamp,price]=item;
          else if(item.length>=5 && Number.isFinite(periodSec) && periodSec>0 && item.slice(0,5).every(v=>Number.isFinite(Number(v)))) {
            // Captured updateHistoryNewFast candle tuple: time, open, close, high, low, volume.
            const [time,open,close,high,low]=item.map(Number),group=groupFor(asset);
            if(group && open>0 && close>0 && high>=Math.max(open,close) && low<=Math.min(open,close))
              group.candles.push({time:toMilliseconds(time),open,close,high,low});
            continue;
          } else if (item.length===2) [timestamp,price]=item;
        } else if (item && typeof item==='object') {
          asset=item.asset || item.symbol || asset;
          timestamp=item.time ?? item.timestamp ?? item.ts;
          price=item.price;
          if (['open','high','low','close'].every(k=>Number.isFinite(Number(item[k])) && Number(item[k])>0) && Number.isFinite(periodSec) && periodSec>0) {
            const group=groupFor(asset), time=toMilliseconds(timestamp);
            if(group && Number.isFinite(time)) group.candles.push({open:Number(item.open),high:Number(item.high),low:Number(item.low),close:Number(item.close),time});
            continue;
          }
        }
        const group=groupFor(asset), ts=toMilliseconds(timestamp);
        if(group && Number.isFinite(ts) && Number.isFinite(Number(price)) && Number(price)>0) group.ticks.push({price:Number(price),ts});
      }
      for(const group of groups.values()) {
        const matching=identityCandidates.filter(r=>normalizeAsset(r.asset)===normalizeAsset(group.asset));
        if(matching.length>1) continue;
        const matched=matching[0] || bound;
        const generation=matched && normalizeAsset(matched.asset)===normalizeAsset(group.asset) ? matched.generation :
          (normalizeAsset(group.asset)===normalizeAsset(context.asset) ? context.generation : null);
        if(matched) {const index=pending.indexOf(matched);if(index>=0)pending.splice(index,1);}
        rememberHistoryWindow(group,periodSec);
        if(group.ticks.length) window.postMessage({source:'WINKY_PAGE_HOOK',type:'WS_HISTORY_TICKS',asset:group.asset,ticks:group.ticks.slice(-5000),generation,receivedAt},'*');
        if(group.candles.length) window.postMessage({source:'WINKY_PAGE_HOOK',type:'WS_CANDLES_HISTORY',asset:group.asset,candles:group.candles,periodSec,generation,receivedAt},'*');
      }
      return;
    }
    if(!/^(updateStream|stream|ticks|quote|quotes)$/i.test(packet.name)) return;
    const visit = value => {
      if(!Array.isArray(value)) { if(value && typeof value==='object') Object.values(value).forEach(visit); return; }
      if(value.length===3 && typeof value[0]==='string' && Number.isFinite(Number(value[1])) && Number.isFinite(Number(value[2]))) {
        const [rawSymbol,ts,p]=value, price=Number(p), timestamp=toMilliseconds(ts);
        if(price>0) window.postMessage({source:'WINKY_HOOK',type:'TICK',price,rawSymbol,source_type:'ws',timestamp,receivedAt,
          generation:normalizeAsset(rawSymbol)===normalizeAsset(context.asset)?context.generation:null},'*');
      } else value.forEach(visit);
    };
    visit(packet.payload);
  }
  function readSocketPacket(text) {
    try {
      const body = JSON.parse(text.slice(text.indexOf('[')));
      return Array.isArray(body) && typeof body[0] === 'string' ? { name: body[0], payload: body[1] } : null;
    } catch (_) { return null; }
  }
  function socketDealObjects(value, depth = 0, opening = false) {
    if (!value || typeof value !== 'object' || depth > 5) return [];
    const own = value.id != null || value.order_id != null || value.deal_id != null ||
      (opening && (value.asset || value.symbol) && (value.amount != null || value.bet != null)) ? [value] : [];
    return own.concat(Object.values(value).flatMap(v => socketDealObjects(v, depth + 1, opening)));
  }
  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);
    let attachmentName = null;
    let attachmentContext = null;
    let attachmentRequests = null;
    ws.__winkyHistoryRequests=[];

    const handleMessage = (data) => {
      try {
        if (data instanceof ArrayBuffer) {
          try {
            data = new TextDecoder("utf-8").decode(data);
          } catch (_) {}
        } else if (typeof Blob !== "undefined" && data instanceof Blob) {
          data.arrayBuffer().then((buf) => {
            try {
              handleMessage(new TextDecoder("utf-8").decode(buf));
            } catch (_) {}
          });
          return;
        }

        if (typeof data === "string") {
          if (/^45\d*-/.test(data)) { attachmentName = readSocketPacket(data)?.name || null; attachmentContext={...marketContext}; attachmentRequests=ws.__winkyHistoryRequests.slice(); return; }
          let packetContext={...marketContext};
          let packetRequests=ws.__winkyHistoryRequests;
          if (attachmentName) {
            const name = attachmentName;
            packetContext=attachmentContext || packetContext;
            packetRequests=attachmentRequests || packetRequests;
            attachmentName = null; attachmentContext=null; attachmentRequests=null;
            try { data = '42' + JSON.stringify([name, JSON.parse(data)]); } catch (_) { return; }
          }
          const packet = readSocketPacket(data);
          if (packet && /^(successopenOrder|openOrder)$/i.test(packet.name) && lastSentTrade && Date.now() - lastSentTrade.sentAt < 12000) {
            for (const obj of socketDealObjects(packet.payload, 0, true)) {
              const asset = obj.asset || obj.symbol;
              const amount = Number(obj.amount ?? obj.bet);
              const openedAt = toMilliseconds(obj.open_time ?? obj.openTime);
              const closesAt = toMilliseconds(obj.close_time ?? obj.closeTime ?? obj.expired);
              if (normalizeAsset(asset) !== normalizeAsset(lastSentTrade.pair) || Math.abs(amount - lastSentTrade.stake) > 0.01 || !Number.isFinite(amount) || (Number.isFinite(openedAt) && Math.abs(openedAt - lastSentTrade.sentAt) > 12000)) continue;
              const evidence = { requestId: lastSentTrade.requestId, pair: asset, stake: amount, orderId: obj.id ?? obj.order_id ?? obj.deal_id };
              window.postMessage({ source: 'WINKY_HOOK', type: 'BROKER_DEAL_OPEN', ...evidence, closesAt }, '*');
              // Restore the working openOrder -> DEAL_BADGE_TIMER bridge for
              // parsed Socket.IO packets too, including ACKs without an ID.
              const realSec = Number.isFinite(closesAt) ? Math.ceil((closesAt - Date.now()) / 1000) : Number(obj.time);
              if (realSec >= 0 && realSec <= 300) window.postMessage({ source: 'WINKY_HOOK', type: 'DEAL_BADGE_TIMER', ...evidence, remainingSec: realSec, badgeText: `WS ${realSec}s` }, '*');
            }
          }
          if (packet && /^(successcloseOrder|closeOrder|closedOrder|updateClosedDeals)$/i.test(packet.name)) {
            for (const obj of socketDealObjects(packet.payload)) {
              // Unlabelled profit may mean gross payout, not net P/L. Zero
              // alone cannot distinguish a refund from a lost stake.
              let net = typeof obj.net_profit === 'number' ? obj.net_profit : null;
              if (net === null && typeof obj.profit === 'number' && obj.profit < 0) net = obj.profit;
              if (net === null && typeof obj.payout === 'number' && typeof obj.amount === 'number') net = obj.payout - obj.amount;
              if (!Number.isFinite(net)) continue;
              window.postMessage({ source: 'WINKY_HOOK', type: 'BROKER_DEAL_RESULT', orderId: obj.id ?? obj.order_id ?? obj.deal_id, net }, '*');
            }
          }
          // Check for openOrder / deal creation response from server
          if (!packet && (data.includes("openOrder") || data.includes("successopenOrder"))) {
            try {
              const jsonMatch = data.match(/(\{[\s\S]*\})/);
              if (jsonMatch) {
                const obj = JSON.parse(jsonMatch[1]);
                let realSec = null;
                if (typeof obj.expired === "number" && typeof obj.open_time === "number" && obj.expired > obj.open_time) {
                  realSec = Math.round(obj.expired - obj.open_time);
                } else if (typeof obj.close_time === "number" && typeof obj.open_time === "number" && obj.close_time > obj.open_time) {
                  realSec = Math.round(obj.close_time - obj.open_time);
                } else if (typeof obj.time === "number" && obj.time >= 5 && obj.time <= 300) {
                  realSec = Math.round(obj.time);
                }
                if (realSec && realSec >= 5 && realSec <= 300) {
                  console.log("[WinkyHook] 🎯 Detected open deal from WS response:", { realSec, obj });
                  window.postMessage(
                    {
                      source: "WINKY_HOOK",
                      type: "DEAL_BADGE_TIMER",
                      remainingSec: realSec,
                      badgeText: `WS ${realSec}s`,
                      pair: obj.asset,
                      stake: obj.amount,
                      orderId: obj.id,
                    },
                    "*"
                  );
                }
              }
            } catch (_) {}
          }

          if(packet) {
            const before=packetRequests.slice();
            publishMarketData(packet,packetContext,packetRequests);
            if(packetRequests!==ws.__winkyHistoryRequests) {
              const consumed=new Set(before.filter(r=>!packetRequests.includes(r)));
              ws.__winkyHistoryRequests=ws.__winkyHistoryRequests.filter(r=>!consumed.has(r));
            }
          }
          else {
            // Some feeds send the tuple array directly, without a Socket.IO
            // event envelope. Keep the legacy real-tick fallback for it.
            try {const tuples=JSON.parse(data);if(Array.isArray(tuples))publishMarketData({name:'updateStream',payload:tuples},packetContext);} catch(_) {}
          }
        }
      } catch (_) {}
    };

    ws.addEventListener("message", (event) => {
      handleMessage(event.data);
    });

    // Also wrap onmessage property setter
    let userHandler = null;
    Object.defineProperty(ws, "onmessage", {
      get() {
        return userHandler;
      },
      set(fn) {
        userHandler = fn;
        this.addEventListener("message", (e) => {
          if (typeof userHandler === "function") {
            try {
              userHandler.call(this, e);
            } catch (_) {}
          }
        });
      },
      configurable: true,
    });

    return ws;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  // Intercept WebSocket.prototype.send for openOrder and changeSymbol packets
  const origWsSend = OriginalWebSocket.prototype.send;
  OriginalWebSocket.prototype.send = function (data) {
    try {
      const targetSec = window.__winkyTargetExpirySec || 30;
      if(typeof data==='string') {
        const packet=readSocketPacket(data), body=packet?.payload;
        if(packet && /^(loadHistoryPeriod|load_history|loadHistory|history)$/i.test(packet.name) && body && !Array.isArray(body) && (body.asset || body.symbol)) {
          const asset=body.asset || body.symbol, periodSec=Number(body.period)||tfSeconds(body.period ?? body.timeframe);
          if([15,30,60,120].includes(periodSec)) {
            traceHistory(extensionHistorySend?'request_extension':'request',packet.name,body);
            if(!extensionHistorySend)lastHistoryTransport={socket:this,event:packet.name,payload:{...body},asset,periodSec,observedAt:Date.now()};
            const pending=this.__winkyHistoryRequests || (this.__winkyHistoryRequests=[]);
            if(!pending.some(r=>r.asset===asset && r.periodSec===periodSec && r.generation===marketContext.generation))pending.push({...marketContext,asset,periodSec});
          }
        }
      }
      if (typeof data === "string") {
        if (data.includes("changeSymbol")) {
          const matchSym = data.match(/42\[\s*"changeSymbol"\s*,\s*(\{[\s\S]*\})\s*\]/);
          if (matchSym) {
            try {
              const symObj = JSON.parse(matchSym[1]);
              if (symObj && symObj.asset) {
                traceHistory('request','changeSymbol',symObj);
                marketSocket=this;
                window.__winkyCurrentAsset = symObj.asset;
                marketContext={asset:symObj.asset,generation:marketContext.generation+(normalizeAsset(symObj.asset)!==normalizeAsset(marketContext.asset)?1:0),periodSec:Number(symObj.period)||tfSeconds(symObj.period ?? symObj.timeframe)||null,changedAt:Date.now()};
                this.__winkyHistoryRequests=this.__winkyHistoryRequests || [];
                this.__winkyHistoryRequests=this.__winkyHistoryRequests.filter(r=>!(r.generation===marketContext.generation && normalizeAsset(r.asset)===normalizeAsset(marketContext.asset) && r.periodSec===marketContext.periodSec));
                this.__winkyHistoryRequests.push({...marketContext});
                if(this.__winkyHistoryRequests.length>20) this.__winkyHistoryRequests.shift();
                canvasCandleBars=[];
                window.postMessage({source:'WINKY_HOOK',type:'MARKET_CONTEXT',...marketContext},'*');
                console.log("[WinkyHook] 🔀 Intercepted changeSymbol asset:", symObj.asset);
              }
            } catch (_) {}
          }
        }
        if (data.includes("openOrder")) {
          const match = data.match(/^(\d+\[\s*"openOrder"\s*,\s*)(\{[\s\S]*\})(\s*\])$/);
          if (match) {
            const orderObj = JSON.parse(match[2]);
            if (pendingTradeCommand && Date.now() - pendingTradeCommand.sentAt < 3000) {
              lastSentTrade = { ...pendingTradeCommand, pair: orderObj.asset, stake: Number(orderObj.amount ?? orderObj.bet), sentAt: Date.now() };
              pendingTradeCommand = null;
            }
            // Если выбран OTC актив или секундный таймер 15s/30s/1m/2m, принудительно выставляем точное время в секундах и тип опциона 100:
            if (targetSec <= 120) {
              orderObj.time = targetSec;
              if (String(orderObj.asset || "").toLowerCase().includes("otc") || orderObj.optionType === 100) {
                orderObj.optionType = 100;
              }
            }
            data = match[1] + JSON.stringify(orderObj) + match[3];
            console.log("[WinkyHook] 🚀 Rewrote openOrder WS packet to time=" + targetSec + "s:", data);
          }
        }
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("openOrder") && text.includes('"time"')) {
          const updatedText = text
            .replace(/"time"\s*:\s*\d+/g, `"time":${targetSec}`)
            .replace(/"optionType"\s*:\s*\d+/g, `"optionType":100`);
          if (updatedText !== text) {
            data = new TextEncoder().encode(updatedText).buffer;
            console.log("[WinkyHook] 🚀 Rewrote binary openOrder WS packet to time=" + targetSec + "s");
          }
        }
      }
    } catch (e) {
      // Отправляем оригинальный пакет без сбоев
    }
    return origWsSend.call(this, data);
  };
  window.WebSocket.prototype.send = OriginalWebSocket.prototype.send;

  // Poll DOM Deals List in right panel for real active deal timer e.g. 00:29, 00:14, 00:51
  setInterval(() => {
    try {
      const dealItems = document.querySelectorAll(
        ".deals-list .item, .deals-list__item, .open-deals .item, [class*='deal-item'], [class*='deals-list'] [class*='item']"
      );
      for (const item of dealItems) {
        if (!item || item.offsetParent === null) continue;
        if (item.closest('.closed-deals, [data-test="closed-deals"], .trading-history, [data-status="closed"]')) continue;
        const text = (item.textContent || "").trim();
        const m = text.match(/\b0([0-4]):([0-5]\d)\b/);
        if (m) {
          const mSec = parseInt(m[1], 10);
          const sSec = parseInt(m[2], 10);
          const totalSec = mSec * 60 + sSec;
          if (totalSec >= 0 && totalSec <= 300) {
            window.postMessage(
              {
                source: "WINKY_HOOK",
                type: "DEAL_BADGE_TIMER",
                remainingSec: totalSec,
                badgeText: m[0],
                pair: text.match(/[A-Z]{3}\s*\/\s*[A-Z]{3}(?:\s+OTC)?/i)?.[0],
                stake: text.match(/\$\s*(\d+(?:[.,]\d+)?)/)?.[1]?.replace(',', '.'),
              },
              "*"
            );
            break;
          }
        }
      }
    } catch (_) {}
  }, 400);

  // 2. Hook Canvas 2D fillText for active quote label, open deal timer, and closing time on chart canvas
  const origFillText = CanvasRenderingContext2D.prototype.fillText;
  let lastCanvasPrice = 0;
  let lastCanvasTime = 0;
  let lastPriceY = null;
  let lastDealTimerSec = null;
  let lastDealTimerTs = 0;
  let lastClosingNoticeTs = 0;
  let lastServerClockSec = null;
  let lastServerClockTs = 0;
  let lastCloseLabelPos = null;
  let lastChartExpSyncTs = 0;
  let lastDealBadge = null;

  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    try {
      if (typeof text === "string" || typeof text === "number") {
        const str = String(text).trim();
        const width = this.canvas ? this.canvas.width : 0;
        const height = this.canvas ? this.canvas.height : 0;

        // 1. Server Clock Time (top left of chart, e.g. "21:40:07 UTC+7", "21:40:07 UTC")
        const serverClockMatch = str.match(/(\d{1,2}):(\d{2}):(\d{2})\s*UTC/i);
        if (serverClockMatch) {
          const sh = parseInt(serverClockMatch[1], 10);
          const sm = parseInt(serverClockMatch[2], 10);
          const ss = parseInt(serverClockMatch[3], 10);
          lastServerClockSec = sh * 3600 + sm * 60 + ss;
          lastServerClockTs = Date.now();
        }

        // 2. Close Time Label ("Время закрытия", "Expiration time", "Close time")
        const lowerStr = str.toLowerCase();
        if (lowerStr.includes("время закрытия") || lowerStr.includes("expiration time") || lowerStr.includes("close time")) {
          lastCloseLabelPos = { x: x, y: y, ts: Date.now() };
        }

        // 3. Close Time of Chart (e.g. "21:41:07")
        const closingTimeMatch = str.match(/^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
        if (closingTimeMatch) {
          const ch = parseInt(closingTimeMatch[1], 10);
          const cm = parseInt(closingTimeMatch[2], 10);
          const cs = parseInt(closingTimeMatch[3], 10);
          const closeSec = ch * 3600 + cm * 60 + cs;

          let chartExpSec = null;
          if (lastServerClockSec !== null && (Date.now() - lastServerClockTs < 3500)) {
            const elapsed = Math.round((Date.now() - lastServerClockTs) / 1000);
            const curSec = (lastServerClockSec + elapsed) % 86400;
            let diff = closeSec - curSec;
            if (diff < 0) diff += 86400;
            chartExpSec = diff;
          } else {
            const now = new Date();
            const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            let diff = closeSec - curSec;
            if (diff < -43200) diff += 86400;
            chartExpSec = diff;
          }

          if (chartExpSec !== null && chartExpSec >= 10 && chartExpSec <= 300) {
            const nowTs = Date.now();
            if (nowTs - lastChartExpSyncTs > 900) {
              lastChartExpSyncTs = nowTs;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "CHART_EXPIRATION_SYNC",
                  chartExpSec: chartExpSec,
                  closeStr: str,
                  timestamp: nowTs,
                },
                "*"
              );
            }
          }
        }

        // 4. Real Deal Badge Stake on chart canvas (e.g. "▲ $110", "▼ $50", "$110")
        if (/^[▲▼⬆⬇]?\s*\$\d+/.test(str)) {
          lastDealBadge = { text: str, x: x, y: y, ts: Date.now() };
        }

        // 5. Real Deal Badge Timer MM:SS drawn inside that exact deal badge (00:00 to 05:59)
        const badgeTimerMatch = str.match(/^0([0-5]):([0-5]\d)$/);
        if (badgeTimerMatch && lastDealBadge) {
          const dt = Date.now() - lastDealBadge.ts;
          const dx = Math.abs(x - lastDealBadge.x);
          const dy = y - lastDealBadge.y;
          if (dt < 80 && dx < 65 && dy >= 4 && dy <= 38) {
            const remSec = parseInt(badgeTimerMatch[1], 10) * 60 + parseInt(badgeTimerMatch[2], 10);
            const nowTs = Date.now();
            if (remSec !== lastDealTimerSec || nowTs - lastDealTimerTs > 150) {
              lastDealTimerSec = remSec;
              lastDealTimerTs = nowTs;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "DEAL_BADGE_TIMER",
                  remainingSec: remSec,
                  badgeText: lastDealBadge.text,
                  timestamp: nowTs,
                },
                "*"
              );
            }
          }
        }

        // C. Active Quote Label on Right Axis (e.g. 1.88610, 0.13412, 0.068200)
        if (/^\d{1,6}\.\d{2,6}$/.test(str)) {
          if (x > width * 0.65) {
            const num = parseFloat(str);
            const now = performance.now();
            const yRatio = height > 0 ? y / height : 0.5;
            if (
              num > 0 &&
              isFinite(num) &&
              (num !== lastCanvasPrice || Math.abs(y - (lastPriceY || 0)) > 2 || now - lastCanvasTime > 120)
            ) {
              lastCanvasPrice = num;
              lastPriceY = y;
              lastCanvasTime = now;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "TICK",
                  price: num,
                  y: y,
                  yRatio: yRatio,
                  source_type: "canvas",
                  rawSymbol: window.__winkyCurrentAsset,
                  generation: marketContext.generation,
                  receivedAt: Date.now(),
                  timestamp: Date.now(),
                },
                "*"
              );
            }
          }
        }
      }
    } catch (_) {}

    return origFillText.apply(this, arguments);
  };

  // 2b. Hook Canvas 2D fillRect for real-time 40-60 candle geometry snapshot
  const origFillRect = CanvasRenderingContext2D.prototype.fillRect;
  let canvasCandleBars = [];
  let lastCandlesSnapshotTs = 0;

  function isGreenCandleStyle(style) {
    if (!style) return false;
    const s = String(style).toLowerCase();
    return s.includes("#00") || s.includes("#2e") || s.includes("#26") || s.includes("#10") ||
           s.includes("rgb(0,") || s.includes("rgb(38,") || s.includes("rgb(46,") || s.includes("rgb(0 ");
  }

  function isRedCandleStyle(style) {
    if (!style) return false;
    const s = String(style).toLowerCase();
    return s.includes("#ff") || s.includes("#e7") || s.includes("#ef") || s.includes("#f4") || s.includes("#d3") ||
           s.includes("rgb(255,") || s.includes("rgb(239,") || s.includes("rgb(231,") || s.includes("rgb(244,");
  }

  function flushCanvasCandlesIfReady(now) {
    if (now - lastCandlesSnapshotTs < 350) return;
    if (canvasCandleBars.length < 12) return;

    lastCandlesSnapshotTs = now;
    const raw = canvasCandleBars;
    canvasCandleBars = [];

    // Sort by x ascending (left to right)
    raw.sort((a, b) => a.x - b.x);

    // Group adjacent parts belonging to the same candle column
    const grouped = [];
    for (const item of raw) {
      const last = grouped[grouped.length - 1];
      if (last && Math.abs(last.x - item.x) <= 3) {
        const topY = Math.min(last.y, item.y);
        const botY = Math.max(last.y + last.h, item.y + item.h);
        last.y = topY;
        last.h = botY - topY;
        last.isGreen = last.isGreen || item.isGreen;
      } else {
        grouped.push({ ...item });
      }
    }

    if (grouped.length < 8) return;

    // Convert coordinates to normalized OHLC candles:
    // Screen coords: lower y is higher on chart (higher price).
    // Inverted normalized price = 1000 - y.
    const canvasCandles = grouped.slice(-60).map((bar, idx) => {
      const isGreen = bar.isGreen;
      const topPrice = 1000 - bar.y;
      const botPrice = 1000 - (bar.y + bar.h);
      const open = isGreen ? botPrice : topPrice;
      const close = isGreen ? topPrice : botPrice;
      const bodySize = Math.max(0.001, bar.h);
      const wickExtra = bodySize * 0.25;
      const high = topPrice + wickExtra;
      const low = botPrice - wickExtra;
      return {
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        isGreen: isGreen,
        isRed: !isGreen,
        bodySize: parseFloat(bodySize.toFixed(2)),
        totalRange: parseFloat((high - low).toFixed(2)),
        x: bar.x,
        time: Date.now() - (grouped.length - idx) * 5000,
      };
    });

    window.postMessage(
      {
        source: "WINKY_HOOK",
        type: "CANVAS_CANDLES_SNAPSHOT",
        pair: window.__winkyCurrentAsset || null,
        generation: marketContext.generation,
        periodSec: tfSeconds(window.__winkyActualChartTf),
        receivedAt: Date.now(),
        candles: canvasCandles,
        timestamp: now,
      },
      "*"
    );
  }

  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    try {
      const width = this.canvas ? this.canvas.width : 0;
      const height = this.canvas ? this.canvas.height : 0;

      // Candle body dimensions: width 3..38px, height >= 1px, in main chart area
      if (w >= 3 && w <= 38 && h >= 1 && y > 35 && y < height - 40 && width >= 250) {
        const style = this.fillStyle;
        const green = isGreenCandleStyle(style);
        const red = !green && isRedCandleStyle(style);

        if (green || red) {
          canvasCandleBars.push({
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            h: Math.round(h),
            isGreen: green,
          });

          flushCanvasCandlesIfReady(Date.now());
        }
      }
    } catch (_) {}

    return origFillRect.apply(this, arguments);
  };

  // 3. Message Listener for commands from content.js (Main World execution)
  window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data || event.data.source !== "WINKY_CONTENT") return;
    const data = event.data;
    if(data.type==='WINKY_CMD_GET_MARKET_STATUS') {
      const observed=getActualChartTimeframeBadge();
      publishHookDiagnostics();
      window.postMessage({source:'WINKY_HOOK',type:'WINKY_RESP_MARKET_STATUS',requestId:data.requestId,version:HOOK_VERSION,
        asset:marketContext.asset,generation:marketContext.generation,periodSec:marketContext.periodSec,chartTf:observed.badge,assetMenuOpen:Boolean(visibleAssetMenu())},'*');
    } else if(data.type==='WINKY_CMD_REQUEST_HISTORY') {
      let requested=false,error='native_history_request_not_observed';
      const key=normalizeAsset(data.pair)+'|'+data.periodSec,w=historyWindows.get(key);
      // Bootstrap from the native schema captured in fixtures/pocket-native-history.json.
      // A server-native history bound is mandatory; never substitute local wall time.
      if(!lastHistoryTransport && marketSocket && Number.isFinite(w?.oldest) && normalizeAsset(marketContext.asset)===normalizeAsset(data.pair)) {
        lastHistoryTransport={socket:marketSocket,event:'loadHistoryPeriod',asset:marketContext.asset,periodSec:data.periodSec,
          payload:{asset:marketContext.asset,index:++historyRequestIndex,time:Math.floor(w.oldest/1000)-data.periodSec,offset:200*data.periodSec,period:data.periodSec},observedAt:Date.now()};
      }
      const t=lastHistoryTransport;
      if(historyRecoveries.has(key) && Date.now()-historyRecoveries.get(key).startedAt>10000)historyRecoveries.delete(key);
      if((w?.times.size || 0)>=200)error=null;
      else if(historyRecoveries.has(key))error='history_response_pending';
      else if(t && [15,30,60,120].includes(data.periodSec) && normalizeAsset(marketContext.asset)===normalizeAsset(data.pair) &&
        Date.now()-(historyReplayAt.get(key) || 0)>3000) {
        historyReplayAt.set(key,Date.now());
        if(historyReplayAt.size>20)historyReplayAt.delete(historyReplayAt.keys().next().value);
        // Templates with an explicit count are also retained for older Pocket clients.
        if(!Number.isFinite(t.payload.time) && ['count','limit'].some(k=>Number.isFinite(t.payload[k]))) {
          const body={...t.payload,asset:marketContext.asset,period:data.periodSec};
          for(const f of ['count','limit'])if(Number.isFinite(body[f]))body[f]=200;
          try {extensionHistorySend=true;t.socket.send('42'+JSON.stringify([t.event,body]));requested=true;error=null;}
          catch(_) {error='history_transport_unavailable';}finally {extensionHistorySend=false;}
        } else {
          historyRecoveries.set(key,{pair:data.pair,period:data.periodSec,pages:0,cursors:new Set(),lastOldest:Infinity,waiting:false,startedAt:Date.now()});
          requested=sendHistoryPage(key);error=requested?null:'history_transport_unavailable';
        }
      }
      window.postMessage({source:'WINKY_HOOK',type:'WINKY_RESP_REQUEST_HISTORY',requestId:data.requestId,requested,
        satisfied:(w?.times.size || 0)>=200,available:w?.times.size || 0,error},'*');
    } else if (data.type === "WINKY_CMD_SWITCH_PAIR") {
      await handleMainWorldSwitchPair(data);
    } else if (data.type === "WINKY_CMD_SET_EXPIRY") {
      await handleMainWorldSetExpiry(data);
    } else if (data.type === "WINKY_CMD_CLICK_TRADE") {
      await handleMainWorldClickTrade(data);
    } else if (data.type === "WINKY_CMD_SET_CHART_TIMEFRAME") {
      await handleMainWorldEnsureChartTimeframe(data.targetTf || "S15", data);
    }
  });

  async function handleMainWorldSwitchPair(cmd) {
    const { targetPair, currentPair, recentPairs = [], minPayout = 88 } = cmd;
    console.log("[WinkyHook] 🔀 WINKY_CMD_SWITCH_PAIR in MAIN World:", { targetPair, currentPair, minPayout });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const findPairBtn = () => {
      const selectors = [
        ".current-symbol",
        ".pair-number-wrap",
        ".currencies-block__in",
        ".top-left-block__block1 a",
        "[data-test='asset-select']",
        ".alist-trigger",
        ".alist__head",
        ".symbols-head",
        ".btn-select-pair",
        ".assets-block__active",
        ".current-asset",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      }
      return document.querySelector("h1, .symbol, .pair");
    };

    const isPopupOpen = () => Boolean(visibleAssetMenu());
    const forceClosePopup = () => closeAssetMenu(findPairBtn());

    // Extract actual currently open pair from PO page
    let actualCurrentPair = "";
    const activeSelectors = [
      ".current-symbol",
      ".pair-number-wrap",
      ".currencies-block__in",
      "[data-test='current-asset']",
      "h1.pair-title",
      ".active-asset",
    ];
    for (const sel of activeSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const m = el.textContent.trim().match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
        if (m) {
          actualCurrentPair = m[0].trim();
          break;
        }
      }
    }
    if (!actualCurrentPair && document.title) {
      const m = document.title.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
      if (m) actualCurrentPair = m[1].trim();
    }
    const normActualCur = (actualCurrentPair || currentPair || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const pairBtn = findPairBtn();
    if (!pairBtn) {
      window.postMessage(
        { source: "WINKY_HOOK", type: "WINKY_RESP_SWITCH_PAIR", requestId: cmd.requestId, ok: false, error: "Pair button not found" },
        "*"
      );
      return;
    }

    // 1. Open popup if not open
    if (!isPopupOpen()) {
      pairBtn.click();
      await sleep(350);
    }

    // 2. Click Currencies tab ($ Валюты) or OTC filter if present
    const tabs = document.querySelectorAll(".assets-block__nav-item, .alist__tab, .tabs__item, .assets-nav a, [data-filter*='otc'], [class*='otc']");
    for (const tab of tabs) {
      const txt = (tab.textContent || "").toLowerCase();
      if ((txt.includes("валют") || txt.includes("currenc") || txt.includes("otc")) && !tab.classList.contains("active")) {
        try { tab.click(); await sleep(150); } catch (_) {}
        break;
      }
    }

    // 3. Scroll to top to see high-paying OTC pairs (92%)
    const scrollContainers = document.querySelectorAll(
      ".alist__list, .assets-block__alist, .alist, .ps, ul.alist__list, .scrollbar-container"
    );
    for (const sc of scrollContainers) {
      try {
        sc.scrollTop = 0;
      } catch (_) {}
    }
    await sleep(250);

    // 4. Collect candidate rows (СТРОГО ТОЛЬКО OTC ПАРЫ!)
    const rows = document.querySelectorAll("a.alist__link, li.alist__item, .alist__item, .assets-block__item");
    let candidates = [];

    for (const row of rows) {
      if (!row || row.offsetParent === null) continue;
      const text = row.textContent || "";

      // Step 3: STRICTLY require OTC in row text! Non-OTC pairs have NO 15s/30s seconds expiry!
      if (!text.toUpperCase().includes("OTC")) continue;

      // Extract payout e.g. "+92%", "92%", "89%"
      const pMatch = text.match(/(\d{2})%/);
      const payout = pMatch ? parseInt(pMatch[1], 10) : 0;
      if (payout < minPayout) continue;

      // Extract pair name e.g. "EUR/USD OTC" or "ZAR/USD OTC"
      const labelEl = row.querySelector(".alist__label, .asset-name, .symbol-name");
      const rawName = labelEl ? labelEl.textContent.trim() : "";
      const nameMatch = (rawName || text).match(/([A-Z]{3}\s*[\/\s]\s*[A-Z]{3}(\s*OTC)?|[A-Za-z0-9]+\s+OTC)/i);
      let pairName = nameMatch ? nameMatch[0].trim().toUpperCase() : text.split("\n")[0].trim();
      if (!pairName.includes("/") && pairName.length >= 6 && !pairName.includes(" ")) {
        pairName = pairName.slice(0, 3) + "/" + pairName.slice(3);
      }
      if (!pairName.toUpperCase().includes("OTC")) {
        pairName += " OTC";
      }
      const normName = pairName.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (!pairName || normName === normActualCur || normName === "na") continue;

      const clickable = row.tagName.toLowerCase() === "a" ? row : row.querySelector("a") || row;
      candidates.push({ name: pairName, normName, payout, element: clickable, rawRow: row });
    }

    console.log(`[WinkyHook] Найдено OTC-кандидатов для смены: ${candidates.length}`);

    let chosen = null;
    if (targetPair) {
      const normTarget = targetPair.toLowerCase().replace(/[^a-z0-9]/g, "");
      chosen = candidates.find((c) => c.normName.includes(normTarget));
    }

    if (!targetPair && !chosen && candidates.length > 0) {
      chosen=selectPairCandidate(candidates,cmd.excludePairs || []);
    }

    if (chosen && chosen.element) {
      console.log(`[WinkyHook] 🎯 Кликаем по новой паре: ${chosen.name} (+${chosen.payout}%)`);

      // Save to visited pairs memory
      window.__winkyVisitedPairs = window.__winkyVisitedPairs || [];
      window.__winkyVisitedPairs.push(chosen.name);
      if (window.__winkyVisitedPairs.length > 12) window.__winkyVisitedPairs.shift();

      pairVisitedAt.set(chosen.normName,Date.now());
      const el = chosen.element;
      realClick(el);

      await sleep(180);
      const menuClosed=await forceClosePopup();
      let pairObserved=false;
      for(let i=0;i<8;i++) {
        if(normalizeAsset(findPairBtn()?.textContent).includes(chosen.normName)) {pairObserved=true;break;}
        await sleep(80);
      }

      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SWITCH_PAIR",
          ok: pairObserved && menuClosed,
          error:!pairObserved?'pair_not_observed':!menuClosed?'asset_menu_not_closed':null,
          newPair: chosen.name,
          payout: chosen.payout,
          requestId: cmd.requestId,
          generation: marketContext.generation,
        },
        "*"
      );
    } else {
      await forceClosePopup();
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SWITCH_PAIR",
          ok: false,
          error: "No matching pair found",
        },
        "*"
      );
    }
  }

  function realClick(el) {
    if (!el) return;
    ["pointerdown", "mousedown", "mouseup"].forEach((evtName) => {
      try {
        el.dispatchEvent(new MouseEvent(evtName, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
      } catch (_) {}
    });
    if (typeof el.click === "function") {
      try { el.click(); } catch (_) {}
    }
  }

  function visibleAssetMenu() {
    return Array.from(document.querySelectorAll('.drop-down-modal-wrap, .alist, .assets-block, .symbols-modal, .modal-window--assets'))
      .find(el=>el.offsetParent!==null && el.getBoundingClientRect().width>40 && el.getBoundingClientRect().height>40 && el.querySelector('.alist__link, .alist__item, .assets-block__item')) || null;
  }

  async function closeAssetMenu(button=null) {
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    if(!visibleAssetMenu()) return true;
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));await sleep(60);
    if(visibleAssetMenu()) {const header=button || document.querySelector('.currencies-block__in, .current-symbol');if(header)realClick(header);await sleep(60);}
    if(visibleAssetMenu()) {
      const canvas=document.querySelector('.chart-container canvas, #chart-canvas, canvas');
      if(canvas)realClick(canvas);await sleep(60);
    }
    return !visibleAssetMenu();
  }

  function getActualChartTimeframeBadge() {
    const selectors='.current-timeframe, .chart-timeframe, .chart-panel__button--timeframe, [data-test*="timeframe"], .block--chart-type, .chart-type-block, .items-link--chart-type, .items__link--chart-type';
    const semantic=Array.from(document.querySelectorAll(selectors));
    const canvas=document.querySelector('.chart-container canvas, #chart-canvas, canvas');
    const chart=canvas?.getBoundingClientRect();
    const candidates=semantic.concat(Array.from(document.querySelectorAll('.top-left-block a, .top-left-block button, .chart-panel button, .chart-panel a, span')));
    for(const element of candidates) {
      if(!element || element.offsetParent===null || element.closest?.('#winky-sniper-root, #winky-orb-counter, .winky-widget, .alist, .assets-block, .deals-list, .block--expiration-inputs')) continue;
      const children=Array.from(element.querySelectorAll?.('span, [data-period], [data-timeframe]') || []);
      for(const label of [element,...children]) {
        const badge=normalizeChartTf(label.textContent);
        if(!/^(S5|S10|S15|S30|M1|M2|M3|M5|M10|M15|M30|H1|H4|D1)$/.test(badge))continue;
        const rect=label.getBoundingClientRect();
        const known=semantic.includes(element);
        if(!known && (!chart || rect.top<chart.top-70 || rect.top>chart.top+90 || rect.left<chart.left || rect.left>chart.right))continue;
        const btn=label.closest?.('button,a,[role="button"]') || element.closest?.('button,a,[role="button"]') ||
          (semantic.includes(element)?(element.querySelector?.('button,a,[role="button"]') || element):null);
        if(!btn || btn.closest?.('.currencies-block, .alist, .assets-block'))continue;
        window.__winkyActualChartTf=badge;
        window.postMessage({source:'WINKY_HOOK',type:'CHART_TF_STATUS',tf:badge,generation:marketContext.generation},'*');
        return {badge,btn};
      }
    }
    return {badge:null,btn:null};
  }

  function visibleChartMenu() {
    return Array.from(document.querySelectorAll('.drop-down-modal--chart-type')).find(el=>el.offsetParent!==null && el.getBoundingClientRect().width>40) || null;
  }
  async function closeChartMenu(button) {
    if(!visibleChartMenu())return true;
    if(button)realClick(button);
    // Pocket removes its modal after the exit transition. Do not report a
    // failure at 100 ms or click again while the first close is still running.
    for(let i=0;i<8 && visibleChartMenu();i++)await new Promise(resolve=>setTimeout(resolve,60));
    return !visibleChartMenu();
  }

  async function handleMainWorldEnsureChartTimeframe(targetTf = 'S15', command = {}) {
    const target=normalizeChartTf(targetTf),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const reply=(ok,error=null)=>{
      const observed=getActualChartTimeframeBadge().badge;
      publishHookDiagnostics();
      window.postMessage({source:'WINKY_HOOK',type:'WINKY_RESP_CHART_TIMEFRAME',ok:ok && observed===target,
        activeTf:observed,requestedTf:target,requestId:command.requestId,generation:marketContext.generation,pair:marketContext.asset,error},'*');
      return ok && observed===target;
    };
    if(!['M1','S15'].includes(target))return reply(false,'unsupported_timeframe');
    await closeAssetMenu();
    const current=getActualChartTimeframeBadge(),button=current.btn;
    if(current.badge===target) {const closed=await closeChartMenu(button);return reply(closed,closed?null:'chart_menu_not_closed');}
    if(window.__winkyTfSwitchBusy)return reply(false,'timeframe_busy');
    const attempts=window.__winkyTfAttempts || (window.__winkyTfAttempts={});
    if(Date.now()-(attempts[target] || 0)<250)return reply(false,'timeframe_cooldown');
    attempts[target]=Date.now();
    if(!button)return reply(false,'timeframe_button_missing');
    window.__winkyTfSwitchBusy=true;
    let selected=null,confirmed=false,error=null,closed=false;
    try {
      if(!visibleChartMenu()) {realClick(button);await sleep(180);}
      const popup=visibleChartMenu();
      const items=popup?popup.querySelectorAll('.time-frames-block li a'):
        document.querySelectorAll(`[data-period='${tfSeconds(target)}'], .timeframe-item, .timeframe-list button, .timeframe-list a, [data-timeframe], [data-period], [data-tf], .drop-down-modal__item, span`);
      for(const item of items) {
        if(item.offsetParent===null || item.children.length>2)continue;
        if(!popup) {
          const r=item.getBoundingClientRect(),anchor=button.getBoundingClientRect();
          if(item.closest?.('#winky-bot-root, #winky-orb-counter, .alist, .assets-block, .block--expiration-inputs'))continue;
          if(r.left<anchor.left-100 || r.left>anchor.left+700 || r.top<=anchor.top || r.top>anchor.top+500)continue;
        }
        const attr=item.getAttribute('data-period') || item.getAttribute('data-tf') || item.getAttribute('data-timeframe');
        if(Number(attr)===tfSeconds(target) || normalizeChartTf(item.textContent)===target) {selected=item;break;}
      }
      if(selected)realClick(selected.closest('a,li,button,[role="button"]') || selected);
      for(let i=0;i<8;i++) {if(getActualChartTimeframeBadge().badge===target) {confirmed=true;break;}await sleep(80);}
      if(!selected)error='timeframe_item_missing';else if(!confirmed)error='timeframe_not_observed';
    } catch(_) {error='timeframe_switch_failed';}
    finally {
      closed=await closeChartMenu(button);
      await closeAssetMenu();window.__winkyTfSwitchBusy=false;
    }
    return reply(confirmed && closed,error || (!closed?'chart_menu_not_closed':null));
  }

  function closePocketCalculatorIfOpen() {
    try {
      const calc = document.querySelector(".calculator, .popover-calculator, .modal-calculator");
      if (calc && calc.offsetParent !== null) {
        const closeBtn = calc.querySelector(".close, .btn-close, .calculator__close, .icon-close");
        if (closeBtn) {
          closeBtn.click();
        } else {
          document.body.click();
        }
      }
    } catch (_) {}
  }

  function findPocketTradeButton(direction) {
    const isBuy = String(direction).toUpperCase() === "BUY" || String(direction).toUpperCase() === "CALL";
    const exactSelectors = isBuy
      ? [
          "a.btn-call", ".btn-call", ".switch-state-block__item--up a", ".switch-state-block__item--up",
          ".action-high-low .btn-call", "[data-qa='btn-call']", ".call-btn", ".btn-up"
        ]
      : [
          "a.btn-put", ".btn-put", ".switch-state-block__item--down a", ".switch-state-block__item--down",
          ".action-high-low .btn-put", "[data-qa='btn-put']", ".put-btn", ".btn-down"
        ];

    for (const sel of exactSelectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Поиск по ВСЕМ кликабельным элементам (a, button, div, span) по тексту КУПИТЬ / ПРОДАТЬ
    const candidates = document.querySelectorAll("a, button, .btn, [role='button'], .switch-state-block__item");
    for (const el of candidates) {
      if (el.closest("#winky-sniper-root, #winky-orb-counter, .winky-widget")) continue;
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
      if (txt.length > 25) continue;
      if (isBuy && (txt === "КУПИТЬ" || txt.includes("КУПИТЬ") || txt === "BUY" || txt === "HIGHER")) {
        return el.closest("a, button, .btn, .switch-state-block__item") || el;
      }
      if (!isBuy && (txt === "ПРОДАТЬ" || txt.includes("ПРОДАТЬ") || txt === "SELL" || txt === "LOWER")) {
        return el.closest("a, button, .btn, .switch-state-block__item") || el;
      }
    }
    return null;
  }

  async function handleMainWorldSetExpiry(cmd) {
    const { targetDurationStr } = cmd;
    console.log("[WinkyHook] ⏱️ WINKY_CMD_SET_EXPIRY in MAIN World:", targetDurationStr);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      closePocketCalculatorIfOpen();

      // 1. Парсинг целевого времени в секундах (15s, 30s, 1m или 2m!)
      let targetSec = 30;
      if (targetDurationStr === "15s" || targetDurationStr === "00:00:15") targetSec = 15;
      else if (targetDurationStr === "30s" || targetDurationStr === "00:00:30") targetSec = 30;
      else if (targetDurationStr === "1m" || targetDurationStr === "60s" || targetDurationStr === "00:01:00" || targetDurationStr === "1 min") targetSec = 60;
      else if (targetDurationStr === "2m" || targetDurationStr === "120s" || targetDurationStr === "00:02:00" || targetDurationStr === "2 min") targetSec = 120;
      else targetSec = 30;

      window.__winkyTargetExpirySec = targetSec; // 15, 30, 60 или 120

      // 2. Ищем инпут времени ТОЛЬКО внутри блока экспирации
      const allInputs = Array.from(document.querySelectorAll(".block--expiration-inputs input, .right-block input, .trading-panel input"));
      const timeInp = allInputs.find((inp) => (inp.value || "").includes(":"));

      const isTimerMode = (val) => {
        const s = String(val || "").trim();
        if (/^00:0[0-5]:[0-5]\d$/.test(s)) return true;
        if (/^0[0-5]:[0-5]\d$/.test(s)) return true;
        return false;
      };

      // 3. Автоматическое переключение из Режима Флажка (21:41:00) в Режим Таймера (00:00:30)
      if (timeInp && !isTimerMode(timeInp.value)) {
        console.log(`[WinkyHook] ⚠️ Поле времени в Режиме Флажка (${timeInp.value}). Переключаем в Режим Таймера...`);
        const beforeVal = timeInp.value;
        const switchTargets = Array.from(document.querySelectorAll(
          ".block--expiration-inputs .switch-state-block__item:not(.active), " +
          ".block--expiration-inputs .switch-state-block a, " +
          ".block--expiration-inputs .switch-state-block, " +
          ".expiration-switch, " +
          ".expiration-block [class*='switch-state']"
        ));
        for (const el of switchTargets) {
          if (el === timeInp || el.closest(".btn-plus") || el.closest(".btn-minus")) continue;
          try { if (typeof el.click === "function") el.click(); } catch (_) {}
          await sleep(180);
          if (timeInp.value !== beforeVal || isTimerMode(timeInp.value)) break;
          el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          await sleep(180);
          if (timeInp.value !== beforeVal || isTimerMode(timeInp.value)) break;
        }
        console.log(`[WinkyHook] ⏱️ Переключен режим времени, теперь: ${timeInp.value} (isTimer=${isTimerMode(timeInp.value)})`);
      }

      // Функция чтения текущих секунд из инпута
      const readCurrentExpirySec = () => {
        if (!timeInp || !timeInp.value) return null;
        const val = timeInp.value.trim();
        const mTime = val.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
        if (!mTime) return null;
        const h = mTime[1] ? parseInt(mTime[1], 10) : 0;
        const m = parseInt(mTime[2], 10);
        const s = parseInt(mTime[3], 10);

        if (isTimerMode(val)) {
          return m * 60 + s;
        }

        // Если пара осталась в Режиме Флажка (HH:MM:SS), возвращаем targetSec (15 или 30)
        return null;
      };

      // 4. Проверяем видимые быстрые пилюли времени (S15, S30, M1, M2)
      const pills = document.querySelectorAll(".pills__item, .time-pill, .expiration-list button, .pills button");
      for (const p of pills) {
        if (!p || p.offsetParent === null) continue;
        const pTxt = (p.textContent || "").trim();
        if (
          (targetSec === 15 && (pTxt === "S15" || pTxt === "00:15")) ||
          (targetSec === 30 && (pTxt === "S30" || pTxt === "00:30")) ||
          (targetSec === 60 && (pTxt === "M1" || pTxt === "01:00" || pTxt === "1m" || pTxt === "1M")) ||
          (targetSec === 120 && (pTxt === "M2" || pTxt === "02:00" || pTxt === "2m" || pTxt === "2M"))
        ) {
          p.click();
          console.log(`[WinkyHook] ✅ Кликнута видимая пилюля времени Покета: ${pTxt}`);
          await sleep(90);
          break;
        }
      }

      // 5. Пошаговая настройка кнопками + и -
      const btnMinus = document.querySelector(".block--expiration-inputs .btn-minus, .block--expiration-inputs .value__val-start, .block--expiration-inputs button:first-child, .btn-minus");
      const btnPlus = document.querySelector(".block--expiration-inputs .btn-plus, .block--expiration-inputs .value__val-end, .block--expiration-inputs button:last-child, .btn-plus");

      let curSec = readCurrentExpirySec();
      let prevSec = null;
      let stagnationCount = 0;

      for (let step = 0; step < 12; step++) {
        curSec = readCurrentExpirySec();
        if (Math.abs(curSec - targetSec) <= 4) break;

        if (prevSec !== null && prevSec === curSec) {
          stagnationCount++;
          if (stagnationCount >= 2) break; // Достигнут лимит брокера
        } else {
          stagnationCount = 0;
        }
        prevSec = curSec;

        if (curSec > targetSec && btnMinus) {
          btnMinus.click();
          await sleep(90);
        } else if (curSec < targetSec && btnPlus) {
          btnPlus.click();
          await sleep(90);
        } else {
          break;
        }
      }

      closePocketCalculatorIfOpen();

      // 6. Честное считывание реального времени (15s, 30s, 1m или 2m)
      let actualSec = readCurrentExpirySec();
      const confirmedSec = actualSec;
      let label = "30s";
      if (actualSec <= 20 || targetSec === 15) { actualSec = 15; label = "15s"; }
      else if (actualSec >= 90 || targetSec === 120) { actualSec = 120; label = "2m"; }
      else if (actualSec >= 45 || targetSec === 60) { actualSec = 60; label = "1m"; }
      else { actualSec = 30; label = "30s"; }

      console.log(`[WinkyHook] ⏱️ Реальное установленное время экспирации в Покете: ${actualSec}с (${label})`);

      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SET_EXPIRY",
          requestId: cmd.requestId,
          ok: true,
          actualSec: actualSec,
          requestedSec: targetSec,
          observedSec: confirmedSec,
          confirmed: Number.isFinite(confirmedSec) && Math.abs(confirmedSec - targetSec) <= 4,
          label: label,
        },
        "*"
      );
    } catch (e) {
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SET_EXPIRY",
          requestId: cmd.requestId,
          ok: false,
          error: String(e),
          actualSec: 60,
          label: "1m",
        },
        "*"
      );
    }
  }

  let lastHookTradeClickTime = 0;

  async function handleMainWorldClickTrade(cmd) {
    const { direction, stake = 50 } = cmd;
    console.log("[WinkyHook] ⚡ WINKY_CMD_CLICK_TRADE in MAIN World:", { direction, stake });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const now = Date.now();
    if (now - lastHookTradeClickTime < 3000) {
      console.warn(`[WinkyHook] 🛑 Блокировка повторного клика! (${now - lastHookTradeClickTime}ms < 3000ms)`);
      window.postMessage(
        { source: "WINKY_HOOK", type: "WINKY_RESP_CLICK_TRADE", requestId: cmd.requestId, ok: false, clicked: false, error: "debounce_blocked" },
        "*"
      );
      return;
    }
    lastHookTradeClickTime = now;

    try {
      closePocketCalculatorIfOpen();

      // 1. Устанавливаем сумму ставки БЕЗ клика и БЕЗ фокуса (чтобы не открывался калькулятор!)
      if (stake) {
        const stakeInps = document.querySelectorAll(
          ".block--amount-inputs input, .amount-block input, .block--bet-amount input, input[name='amount']"
        );
        for (const inp of stakeInps) {
          if (inp && inp.offsetParent !== null) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
              nativeSetter.call(inp, String(stake));
            } else {
              inp.value = String(stake);
            }
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            inp.dispatchEvent(new Event("change", { bubbles: true }));
            inp.dispatchEvent(new Event("blur", { bubbles: true }));
            break;
          }
        }
        closePocketCalculatorIfOpen();
      }

      await sleep(100);

      // 2. Ищем кнопку сделки через универсальный безотказный поиск
      const btn = findPocketTradeButton(direction);
      if (!btn) {
        console.error(`[WinkyHook] ❌ Кнопка ${direction} не найдена в DOM!`);
        window.postMessage(
          { source: "WINKY_HOOK", type: "WINKY_RESP_CLICK_TRADE", requestId: cmd.requestId, ok: false, clicked: false, error: "button_not_found" },
          "*"
        );
        return;
      }

      // 3. Вызываем одиночный строгий клик по кнопке сделки
      pendingTradeCommand = { requestId: cmd.requestId, sentAt: Date.now() };
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      btn.click();

      console.log(`[WinkyHook] 🎯 Клик ${direction} ($${stake}) успешно исполнен в MAIN World!`);
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_CLICK_TRADE",
          requestId: cmd.requestId,
          ok: true,
          clicked: true,
          direction: direction,
          stake: stake,
        },
        "*"
      );
    } catch (e) {
      console.error("[WinkyHook] ⚠️ Ошибка при клике сделки:", e);
      window.postMessage(
        { source: "WINKY_HOOK", type: "WINKY_RESP_CLICK_TRADE", ok: false, error: String(e) },
        "*"
      );
    }
  }
})();
