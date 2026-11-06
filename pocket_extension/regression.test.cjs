const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadContent() {
  let now = 1700000000000, balance = 1000, rows = [];
  const listeners = [];
  const document = { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null };
  const window = { addEventListener: (event, fn) => { if (event === 'message') listeners.push(fn); }, postMessage() {}, removeEventListener() {} };
  const storage = new Map();
  const sandbox = {
    window, document, console: { log() {}, warn() {}, error() {} },
    localStorage: { getItem:k=>storage.get(k)||null, setItem:(k,v)=>storage.set(k,v) },
    Date: class extends Date { static now() { return now; } },
    setInterval: () => 1, clearInterval() {},
    setTimeout: (fn,ms=0) => { queueMicrotask(()=>{now+=ms;fn();}); return 1; }, clearTimeout() {},
  };
  let source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  source = source.replace('  // Ensure DOM ready', `
    globalThis.testing = { state, getExpectedStake, parsePocketMoney, evaluateTradeOutcome,
      readClosedDealsFirstRow, matchesTradeEvidence, onSignalTimerFinished, aggregateCandles, chartPeriodSeconds,
      LiveTickBuffer, ProTraderEngine, ChartAnalyzer, POAutomation, startSignalAnalysis,
      executeTradeWithSignal,
      updateScoreOnTradeClose,
      rankPairCandidate, bestPairCandidate, canEnterAnalysis,
      marketFrames, rememberMarketFrame, acceptMarketEvidence, evaluate5FactorConfluence, renderAnalysisStep, quoteIsFresh, readTradersSentiment,
      setBalanceReader(fn) { getPocketBalance = fn; },
      setRowsReader(fn) { pocketDealRows = fn; },
      setClickBridge(fn) { requestMainWorldClickTrade = fn; },
      setDirectClick(fn) { clickPocketTradeButton = fn; },
      setPhaseNotifier(fn) { notifyTradePhase = fn; },
      setSpeakingReader(fn) { checkWinkySpeaking = fn; },
      setVoicePlayer(fn) { VoiceManager.playCategory = fn; },
      setNextAnalysis(fn) { startSignalAnalysis = fn; },
      setFinalAnalysis(fn) { freshPairAnalysis = fn; },
      prepareExecution() {
        requestMainWorldSetExpiry = async () => ({ok:true,confirmed:true,observedSec:30});
        waitForOptimalMicroEntry = async () => ({ok:true});
      },
      setSearchDependencies(deps) {
        requestMainWorldEnsureChartTimeframe = async target => ({activeTf:target,ok:true});
        waitPocketPairReady = deps.ready || (async () => true);
        if (deps.sentiment) readTradersSentiment = deps.sentiment;
        if (deps.scan) scanCanvasStructure = deps.scan;
        if (deps.analyze) ChartAnalyzer.analyzeMarket = deps.analyze;
        if (deps.confluence) evaluate5FactorConfluence = deps.confluence;
        if (deps.switchPair) switchPocketPair = deps.switchPair;
        if (deps.execute) executeTradeWithSignal = deps.execute;
      }
    };
    VoiceManager.playCategory = async () => true;
    switchPocketPair = async () => true;
    setPocketStakeAmount = () => true;
    sendProxyMessage = async () => ({});
    // Ensure DOM ready`);
  vm.runInNewContext(source, sandbox);
  const api = sandbox.testing;
  api.setBalanceReader(() => balance);
  api.setRowsReader(() => rows);
  return { ...api, document, window, storage, setBalance:v=>balance=v, setRows:v=>rows=v,
    now:()=>now,
    tick:ms=>now+=ms, emit(data) { for(const fn of listeners) fn({source:window,data:{source:'WINKY_HOOK',...data}}); },
    trade() { const t = {seq:1,pair:'EUR/USD OTC',direction:'BUY',stake:50,startedAt:now-30000,balanceBefore:1000,historyBefore:new Set(),brokerId:'id-1',openConfirmed:true,resultApplied:false}; api.state.tradeContext=t; api.state.tradeEndTime=now-1; return t; } };
}

function row(text, fields = {}, id = null) {
  return { textContent:text, offsetParent:{}, getAttribute:name=>name==='data-id'?id:null,
    closest:()=>null, querySelector(selector) { for(const [name,value] of Object.entries(fields)) if(selector.includes(name))return {textContent:String(value)}; return null; } };
}

test('x2.2 stake schedule is unchanged', () => {
  const c=loadContent(); assert.deepEqual([0,1,2,3].map(c.getExpectedStake),[50,110,242,50]);
});
test('deducted balance stays PENDING until the settlement window completes', () => {
  const c=loadContent(); c.trade(); c.setBalance(950);
  assert.equal(c.evaluateTradeOutcome().outcome,'PENDING');
  c.tick(30000); assert.equal(c.evaluateTradeOutcome().outcome,'PENDING');
  assert.equal(c.state.recoveryStep,0);
});
test('legacy balance result does not require an optional broker acknowledgement', async () => {
  for (const [after,status,nextStake] of [[1046,'WIN',50],[950,'LOSS',110],[1000,'REFUND',50]]) {
    const c=loadContent(),t=c.trade(),phases=[],voices=[];
    t.brokerId=null;t.openConfirmed=false;t.debitObserved=true;
    c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setBalance(after);
    c.setPhaseNotifier(phase=>phases.push(phase));c.setVoicePlayer(async category=>voices.push(category));
    let next=0;c.state.autoStream=true;c.setNextAnalysis(()=>{next++;});
    const wins=c.state.scoreWins,losses=c.state.scoreLosses;
    await c.onSignalTimerFinished();await Promise.resolve();
    assert.equal(c.state.lastTradeOutcome,status);assert.equal(c.state.currentStake,nextStake);
    assert.equal(c.state.scoreWins,wins+(status==='WIN'?1:0));
    assert.equal(c.state.scoreLosses,losses+(status==='LOSS'?1:0));
    assert.deepEqual(phases,['RESULT','IDLE']);assert.equal(c.state.botState,'IDLE');assert.equal(c.state.tradeContext,null);assert.equal(next,1);
    if(status!=='REFUND')assert.ok(voices.includes(status==='WIN'?'trade_win':'trade_loss_step1'));
    await c.onSignalTimerFinished();assert.equal(phases.length,2);
  }
});
test('unavailable settlement evidence releases the cycle without fabricating a result', async () => {
  const c=loadContent(),t=c.trade(),phases=[];
  c.state.botState='IN_TRADE';c.state.activeSignal={direction:'SELL'};c.state.recoveryStep=1;c.state.currentStake=110;
  c.setBalance(null);c.setPhaseNotifier(phase=>phases.push(phase));
  const wins=c.state.scoreWins,losses=c.state.scoreLosses,profit=c.state.scoreProfit;
  await c.onSignalTimerFinished();
  assert.equal(t.resultApplied,true);assert.equal(c.state.lastTradeOutcome,'UNKNOWN');assert.equal(c.state.lastTrade.isWin,null);
  assert.equal(c.state.recoveryStep,1);assert.equal(c.state.currentStake,110);
  assert.equal(c.state.scoreWins,wins);assert.equal(c.state.scoreLosses,losses);assert.equal(c.state.scoreProfit,profit);
  assert.deepEqual(phases,['RESULT','IDLE']);assert.equal(c.state.botState,'IDLE');assert.equal(c.state.tradeContext,null);
});
test('unrelated balance movement and an unobserved opening do not become a loss or refund', async () => {
  for(const [after,observed] of [[940,true],[950,false],[1000,false]]) {
    const c=loadContent(),t=c.trade();t.openConfirmed=false;t.debitObserved=observed;
    c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setBalance(after);
    await c.onSignalTimerFinished();assert.equal(c.state.lastTradeOutcome,'UNKNOWN');assert.equal(c.state.recoveryStep,0);
  }
});
test('a still-open matching badge returns to the active 200ms countdown', async () => {
  const c=loadContent(),t=c.trade();c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setBalance(950);
  c.emit({type:'DEAL_BADGE_TIMER',remainingSec:5,badgeText:'▲ $50'});
  await c.onSignalTimerFinished();assert.equal(c.state.botState,'IN_TRADE');assert.equal(c.state.tradeContext,t);assert.equal(t.resultApplied,false);
  assert.ok(c.state.expiryInterval);assert.equal(c.state.recoveryStep,0);
});
test('a closed history row with a duration cannot keep the trade active',async()=>{
  const c=loadContent(),t=c.trade();c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};
  const history=row('EUR/USD OTC $50 00:30',{'.amount':'$50','.deal-timer':'00:30'});
  history.closest=selector=>selector.includes('.closed-deals')?{}:null;
  c.document.querySelectorAll=()=>[history];c.setBalance(1046);
  await c.onSignalTimerFinished();assert.equal(c.state.lastTradeOutcome,'WIN');assert.equal(c.state.botState,'IDLE');assert.equal(t.resultApplied,true);
});
test('Winky speech wait is bounded and the balance is refreshed after it', async () => {
  const c=loadContent(),t=c.trade();c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setBalance(1046);
  let checks=0;c.setSpeakingReader(async()=>{checks++;c.setBalance(1047);return {is_speaking:true};});
  await c.onSignalTimerFinished();assert.ok(checks>0 && checks<20);assert.equal(c.state.lastTradeOutcome,'WIN');assert.equal(c.state.lastTrade.reason,'credited_balance');
  assert.equal(c.state.scoreProfit,1467);assert.equal(c.state.botState,'IDLE');assert.equal(t.resultApplied,true);
});
test('a nonresponding Winky bridge does not block score or the next cycle', async () => {
  const c=loadContent(),t=c.trade();t.brokerResult={id:'id-1',net:46};
  c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setSpeakingReader(()=>new Promise(()=>{}));
  await c.onSignalTimerFinished();assert.equal(c.state.lastTradeOutcome,'WIN');assert.equal(c.state.botState,'IDLE');
});
test('money parser excludes percentages/timers and preserves decimal amounts', () => {
  const c=loadContent(); assert.equal(c.parsePocketMoney('+92%'),null); assert.equal(c.parsePocketMoney('00:00'),null);
  assert.equal(c.parsePocketMoney('$1,046.75'),1046.75); assert.equal(c.parsePocketMoney('46,75 $'),46.75);
});
test('history matches pair, stake and new rows, not old records', () => {
  const c=loadContent(),t=c.trade();
  const old=row('EUR/USD OTC $50 +$46',{'.amount':'$50','.profit':'$46'},'old'); t.historyBefore.add('old');
  c.setRows([old,row('GBP/USD OTC $50 +$46',{'.amount':'$50','.profit':'$46'}),row('EUR/USD OTC $110 +$101',{'.amount':'$110','.profit':'$101'})]);
  assert.equal(c.readClosedDealsFirstRow(),null);
  c.setRows([row('EUR/USD OTC $50 +92% 00:00',{'.amount':'$50'})]); assert.equal(c.readClosedDealsFirstRow(),null);
  c.setRows([row('EUR/USD OTC $50 $96',{'.amount':'$50','.payout':'$96'},'new')]); assert.equal(c.evaluateTradeOutcome().outcome,'WIN');
});
test('loss, refund and delayed win are distinct', () => {
  const c=loadContent(),t=c.trade();
  for(const [profit,status] of [[46,'WIN'],[-50,'LOSS'],[0,'REFUND']]) { t.brokerResult={id:'id-1',net:profit}; assert.equal(c.evaluateTradeOutcome().outcome,status); }
  t.brokerResult=null; c.setBalance(950); assert.equal(c.evaluateTradeOutcome().outcome,'PENDING');
  c.setBalance(1046); assert.equal(c.evaluateTradeOutcome().profitDelta,46);
});
test('another trade timer or result cannot change current trade', () => {
  const c=loadContent(),t=c.trade(); c.state.botState='IN_TRADE'; const end=c.state.tradeEndTime;
  c.emit({type:'DEAL_BADGE_TIMER',remainingSec:60,pair:'GBP/USD OTC',stake:50}); assert.equal(c.state.tradeEndTime,end);
  c.emit({type:'BROKER_DEAL_RESULT',orderId:'other',net:-50}); assert.equal(t.brokerResult,undefined);
  c.emit({type:'DEAL_BADGE_TIMER',remainingSec:20,badgeText:'▲ $50'}); assert.equal(t.remainingSec,20);
});
test('timeout never triggers a blind second click', async () => {
  const c=loadContent(); c.trade(); let clicks=0;
  c.setClickBridge(async()=>({ok:false,error:'timeout_2500ms'})); c.setDirectClick(()=>{clicks++;return true;});
  assert.equal(await c.POAutomation.clickTrade('BUY'),null); assert.equal(clicks,0);
});
test('LOSS → LOSS → WIN preserves 50 → 110 → 242 → 50 and applies once', async () => {
  const c=loadContent(), stakes=[c.getExpectedStake(0)];
  for(const [index,net] of [-50,-110,222.64].entries()) {
    const t=c.trade(); t.seq=index+1; t.stake=c.getExpectedStake(c.state.recoveryStep); t.brokerResult={id:'id-1',net};
    c.state.botState='IN_TRADE'; c.state.activeSignal={direction:'BUY'};
    await c.onSignalTimerFinished(); stakes.push(c.state.currentStake);
    const losses=c.state.scoreLosses; await c.onSignalTimerFinished(); assert.equal(c.state.scoreLosses,losses);
  }
  assert.deepEqual(stakes,[50,110,242,50]);
});
test('REFUND leaves recovery step and W/L untouched', async () => {
  const c=loadContent(),t=c.trade(); c.state.recoveryStep=1;c.state.currentStake=110;
  t.brokerResult={id:'id-1',net:0};c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};
  const wins=c.state.scoreWins,losses=c.state.scoreLosses;
  await c.onSignalTimerFinished(); assert.equal(c.state.recoveryStep,1);assert.equal(c.state.scoreWins,wins);assert.equal(c.state.scoreLosses,losses);
});

test('aggregation preserves tiny prices without pixel minima', () => {
  const c=loadContent();
  for(const scale of [0.000001,1,1000]) {
    const bars=[{open:scale,close:1.1*scale,high:1.2*scale,low:.9*scale},{open:1.1*scale,close:1.15*scale,high:1.3*scale,low:scale}].map(b=>({...b,source:'ticks',pair:'EUR/USD OTC',candlePeriodSec:15}));
    const out=c.aggregateCandles(bars,2)[0];
    assert.equal(out.open,bars[0].open);assert.equal(out.close,bars[1].close);assert.equal(out.high,bars[1].high);
    assert.equal(out.candlePeriodSec,30);assert.ok(out.body>0);assert.equal(out.isGreen,true);
  }
});
test('mixed-source or mixed-pair candles cannot be aggregated', () => {
  const c=loadContent();const a={open:1,close:2,high:3,low:1,source:'ticks',pair:'EUR/USD OTC',candlePeriodSec:15};
  assert.equal(c.aggregateCandles([a,{...a,source:'pixels'}],2).length,0);
  assert.equal(c.aggregateCandles([a,{...a,pair:'GBP/USD OTC'}],2).length,0);
});
test('tick buffer receives one WS sample, ignores foreign pair and synthetic polling', () => {
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'EURUSD_otc',price:1,timestamp:1700000000000});
  assert.equal(c.LiveTickBuffer.ticks.length,1);
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'GBPUSD_otc',price:2,timestamp:1700000000100});
  c.ChartAnalyzer.onNewPriceTick(1.2,1700000000200);
  assert.equal(c.LiveTickBuffer.ticks.length,1);
});
test('the first live tick preserves history already loaded for the current asset',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  c.emit({type:'WS_HISTORY_TICKS',asset:'EURUSD_otc',ticks:[{ts:c.now()-2000,price:1},{ts:c.now()-1000,price:1.1}]});
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'EURUSD_otc',timestamp:c.now(),price:1.2});
  assert.equal(c.LiveTickBuffer.ticks.length,3);assert.equal(c.LiveTickBuffer.pair,'EUR/USD OTC');
});
test('delayed generation and anonymous history cannot populate the current pair',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  c.emit({type:'MARKET_CONTEXT',asset:'EURUSD_otc',generation:2});
  const ticks=[{ts:c.now()-15000,price:1},{ts:c.now()-14000,price:1.1}];
  c.emit({type:'WS_HISTORY_TICKS',asset:'EURUSD_otc',generation:1,ticks});
  c.emit({type:'WS_HISTORY_TICKS',generation:2,ticks});
  assert.equal(c.LiveTickBuffer.ticks.length,0);
  c.emit({type:'WS_HISTORY_TICKS',asset:'EURUSD_otc',generation:2,ticks});assert.equal(c.LiveTickBuffer.ticks.length,2);
});
test('broker OHLC history keeps its actual period and unfinished status',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';const time=Math.floor(c.now()/60000)*60000;
  c.emit({type:'WS_CANDLES_HISTORY',asset:'EURUSD_otc',periodSec:60,candles:[{time,open:.00001,close:.000011,high:.000012,low:.000009}]});
  const bars=c.marketFrames()[60];assert.equal(bars.length,1);assert.equal(bars[0].complete,false);assert.equal(bars[0].candlePeriodSec,60);assert.equal(bars[0].source,'broker');
});
test('timestamped aggregation does not bridge gaps or arbitrary chunk boundaries',()=>{
  const c=loadContent(),base={open:1,close:1.1,high:1.2,low:.9,candlePeriodSec:15,source:'ticks',pair:'EUR/USD OTC',complete:true};
  assert.equal(c.aggregateCandles([{...base,time:15000},{...base,time:30000}],2).length,0);
  assert.equal(c.aggregateCandles([{...base,time:0},{...base,time:30000}],2).length,0);
  const bars=c.aggregateCandles([{...base,time:0},{...base,time:15000}],2);assert.equal(bars.length,1);assert.equal(bars[0].complete,true);
});
test('known M1 visual fallback is stored without pretending to supply S15', () => {
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const period=60000,end=Math.floor(c.now()/period)*period;
  const bars=Array.from({length:30},(_,i)=>({time:end-(29-i)*period,open:100+i,close:100.5+i,high:101+i,low:99+i}));
  c.state.actualChartTf='M1';c.ChartAnalyzer.analyzeMarket({visualCandles:bars});
  assert.equal(c.marketFrames()[60].length,30);assert.equal(c.marketFrames()[15].length,0);
  c.state.actualChartTf=null;c.state.marketFrames.clear();c.state.candles=[];
  assert.equal(c.ChartAnalyzer.analyzeMarket({visualCandles:bars}).shouldTrade,false);
  assert.equal(c.chartPeriodSeconds('M1'),60);assert.equal(c.chartPeriodSeconds('S15'),15);assert.equal(c.chartPeriodSeconds('15S'),15);
});
function searchFixture(readyPair=null, ranked=false) {
  const c=loadContent(),pairs=['EUR/USD OTC','GBP/USD OTC','AUD/USD OTC','USD/JPY OTC','EUR/JPY OTC'],executed=[],switches=[],samples=[];
  c.state.targetPair=pairs[0];
  const analysis=()=>{samples.push(c.state.targetPair);return {shouldTrade:ranked || c.state.targetPair===readyPair,direction:'BUY',confidence:90,
    setup:'TREND_PULLBACK_30S',recommendedExpiry:'30s',trendRegime:'STRONG_UPTREND',rsi:55,pctB:.6,sr:{distToRes:2,distToSup:1},line1:'Live setup'};};
  const score=()=>ranked?(c.state.targetPair===pairs[0]?3.9:3.6):4.5;
  c.setSearchDependencies({scan:()=>{c.state.lastRealQuote={price:1,timestamp:c.now(),receivedAt:c.now(),pair:c.state.targetPair};return {visualCandles:[]};},analyze:analysis,sentiment:()=>({observed:true}),
    confluence:()=>({score:score(),factors:Array.from({length:5},()=>({score:score()/5,detail:'factor',pass:true}))}),
    switchPair:async(target)=>{const next=target||pairs[(pairs.indexOf(c.state.targetPair)+1)%5];switches.push(next);c.state.targetPair=next;return true;},
    execute:async(a)=>{executed.push({pair:c.state.targetPair,direction:a.direction});c.state.tradeContext={test:true};c.state.botState='IN_TRADE';}});
  return {...c,pairs,executed,switches,samples};
}
test('a ready setup on first or second pair enters immediately',async()=>{
  for(const index of [0,1]) {
    const c=searchFixture(['EUR/USD OTC','GBP/USD OTC'][index]);
    await c.startSignalAnalysis();assert.equal(c.executed.length,1);assert.equal(c.state.pairCandidates.length,index+1);assert.equal(c.switches.length,index);
  }
});
test('after five pairs the best eligible setup is rechecked and entered without observation',async()=>{
  const c=searchFixture(null,true),started=c.now();await c.startSignalAnalysis();
  assert.equal(c.state.pairCandidates.length,5);assert.equal(new Set(c.state.searchSeen).size,5);
  assert.equal(c.executed.length,1);assert.equal(c.executed[0].pair,c.pairs[0]);assert.equal(c.switches.at(-1),c.pairs[0]);
  assert.ok(c.now()-started<15000);assert.ok(c.state.decisionJournal.some(e=>e.event==='entry_confirmed'));
});
test('all hard-vetoed candidates end the round without a forced entry',async()=>{
  const c=searchFixture();let calls=0;
  c.setSearchDependencies({analyze:()=>{calls++;return {shouldTrade:true,hardVeto:true,vetoReason:'HIGH_RISK_MARKET',direction:'BUY',confidence:95};}});
  await c.startSignalAnalysis();assert.equal(c.executed.length,0);assert.ok(calls<80);assert.equal(c.state.botState,'IDLE');
  assert.equal(c.state.searchRunning,false);assert.equal(c.state.pairCandidates.length,5);
});
test('failed loading is not counted as an analyzed pair',async()=>{
  const c=searchFixture(null,true);c.setSearchDependencies({ready:async()=>c.state.targetPair!==c.pairs[0]});
  await c.startSignalAnalysis();assert.ok(c.state.pairCandidates.every(p=>p.pair!==c.pairs[0]));
});
test('failed pair switch is not counted as a new chart',async()=>{
  const c=searchFixture();c.setSearchDependencies({switchPair:async()=>false});await c.startSignalAnalysis();
  assert.equal(c.state.pairCandidates.length,1);assert.equal(c.executed.length,0);
});
test('ranking excludes missing factors; ties use payout then freshness',()=>{
  const c=loadContent();const unknown={analysis:{},confluence:{factors:[{score:1}]},payout:99,observedAt:5};
  assert.equal(c.rankPairCandidate(unknown),0);
  const candidate=(payout,observedAt)=>({analysis:{trendRegime:'FLAT'},confluence:{factors:[{score:1}]},payout,observedAt});
  const a=candidate(90,10),b=candidate(92,1),d=candidate(92,20);
  assert.equal(c.bestPairCandidate([unknown,a,b,d]),d);
});
test('a signal lost on return moves to the next ranked candidate',async()=>{
  const c=searchFixture(null,true);const visits=new Map();
  c.setSearchDependencies({switchPair:async(target)=>{const next=target||c.pairs[(c.pairs.indexOf(c.state.targetPair)+1)%5];c.switches.push(next);c.state.targetPair=next;if(target)visits.set(target,true);return true;},
    analyze:()=>({shouldTrade:!(c.state.targetPair===c.pairs[0] && visits.has(c.pairs[0])),direction:'BUY',setup:'TREND_PULLBACK_30S',recommendedExpiry:'30s',trendRegime:'STRONG_UPTREND',rsi:55,pctB:.5,sr:{distToRes:2},confidence:90})});
  await c.startSignalAnalysis();assert.equal(c.executed.length,1);assert.notEqual(c.executed[0].pair,c.pairs[0]);
});
test('quote freshness and identity remain mandatory even for the best score',()=>{
  const c=loadContent(),a={shouldTrade:true,direction:'BUY'},f={score:5};
  assert.equal(c.canEnterAnalysis(a,f,3.5),false);
  c.state.lastRealQuote={pair:c.state.targetPair,receivedAt:c.now(),timestamp:c.now(),price:1};assert.equal(c.canEnterAnalysis(a,f),true);
  c.tick(3500);assert.equal(c.canEnterAnalysis(a,f),false);
  c.state.lastRealQuote.receivedAt=c.now();c.state.lastRealQuote.pair='other';assert.equal(c.canEnterAnalysis(a,f),false);
});
test('analysis remains limited to one calculation per 250ms across chart switches',async()=>{
  const c=searchFixture('EUR/USD OTC'),times=[];
  c.setSearchDependencies({analyze:()=>{times.push(c.now());return {shouldTrade:true,direction:'BUY',setup:'TREND_PULLBACK_30S',recommendedExpiry:'30s',trendRegime:'STRONG_UPTREND',rsi:55,pctB:.5,sr:{distToRes:2}};}});
  await c.startSignalAnalysis();assert.ok(times.length>=2);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=250);
});
test('switching off or cancelling a search generation prevents a delayed entry',async()=>{
  const c=searchFixture('EUR/USD OTC');
  c.setSearchDependencies({ready:async()=>{c.state.searchGeneration++;return true;}});
  await c.startSignalAnalysis();assert.equal(c.executed.length,0);assert.equal(c.state.searchRunning,false);
});
test('rendering live updates preserves the card node and does not inflate accuracy',()=>{
  const c=loadContent(),nodes=new Map(),segments=Array.from({length:4},()=>({className:''}));let mounts=0,transitions=0;
  const card={classList:{remove(){},add(){transitions++;}},offsetWidth:300};
  const block={className:'',set innerHTML(value){mounts++;nodes.set('[data-analysis-card]',card);},
    querySelector(selector){if(selector==='[data-analysis-card]')return nodes.get(selector)||null;if(!nodes.has(selector))nodes.set(selector,{textContent:'',className:''});return nodes.get(selector);},
    querySelectorAll(){return segments;}};
  const accuracy={textContent:'',title:''};c.document.getElementById=id=>id==='botDirectionBlock'?block:id==='metricAccuracyVal'?accuracy:null;
  for(let i=0;i<20;i++)c.renderAnalysisStep(0,4,'Тренд','Данные обновляются','2.5',false);
  assert.equal(mounts,1);assert.equal(transitions,1);assert.equal(accuracy.textContent,'50%');
  c.renderAnalysisStep(3,4,'Вход','Не подтверждено','2.5',false,'rejected');
  assert.equal(mounts,1);assert.equal(nodes.get('[data-analysis-card]'),card);assert.equal(transitions,2);assert.equal(accuracy.textContent,'50%');
  assert.equal(nodes.get('[data-analysis-status]').textContent,'Не подтверждено');
});
test('confirmed click failure creates no timer, result or recovery step',async()=>{
  const c=loadContent();c.prepareExecution();c.POAutomation.clickTrade=async()=>false;
  const wins=c.state.scoreWins,losses=c.state.scoreLosses;
  await c.executeTradeWithSignal({direction:'BUY',recommendedExpiry:'30s'},{score:4.5},{});
  assert.equal(c.state.tradeContext,null);assert.equal(c.state.botState,'IDLE');assert.equal(c.state.expiryInterval,null);
  assert.equal(c.state.scoreWins,wins);assert.equal(c.state.scoreLosses,losses);assert.equal(c.state.recoveryStep,0);
});
test('cancelling during the final asynchronous recheck prevents the click',async()=>{
  const c=loadContent();c.prepareExecution();c.state.targetPair='EUR/USD OTC';c.document.title='EUR/USD OTC';c.state.searchGeneration=1;c.state.searchRunning=true;
  let clicks=0;c.POAutomation.clickTrade=async()=>{clicks++;return true;};
  c.setFinalAnalysis(async()=>{c.state.searchGeneration++;return {analysis:{shouldTrade:true,direction:'BUY',recommendedExpiry:'30s'},confluence:{score:5},scan:{}};});
  await c.executeTradeWithSignal({direction:'BUY',recommendedExpiry:'30s',searchGeneration:1},{score:5},{});
  assert.equal(clicks,0);assert.equal(c.state.tradeContext,null);assert.equal(c.state.botState,'IDLE');
});
test('opening, broker countdown, final result and recovery run through existing cycle',async()=>{
  const c=loadContent();c.prepareExecution();c.state.targetPair='EUR/USD OTC';
  c.POAutomation.clickTrade=async()=>{c.emit({type:'BROKER_DEAL_OPEN',requestId:c.state.tradeContext.seq,pair:'EURUSD_otc',stake:50,orderId:'real-1',closesAt:1700000030000});return true;};
  await c.executeTradeWithSignal({direction:'SELL',recommendedExpiry:'30s'},{score:4.5},{});
  assert.equal(c.state.botState,'IN_TRADE');assert.equal(c.state.tradeEndTime,1700000030000);assert.equal(c.state.tradeContext.brokerId,'real-1');
  c.tick(30000);c.emit({type:'BROKER_DEAL_RESULT',orderId:'real-1',net:-50});
  await c.onSignalTimerFinished();assert.equal(c.state.recoveryStep,1);assert.equal(c.state.currentStake,110);assert.equal(c.state.botState,'IDLE');
});
function taggedBars(c,bars,period,source='ticks') {
  const end=Math.floor(c.now()/(period*1000))*period*1000;
  return bars.map((bar,i)=>({...bar,body:Math.abs(bar.close-bar.open),bodySize:Math.abs(bar.close-bar.open),totalRange:bar.high-bar.low,
    upperWick:bar.high-Math.max(bar.open,bar.close),lowerWick:Math.min(bar.open,bar.close)-bar.low,isGreen:bar.close>bar.open,isRed:bar.close<bar.open,
    time:end-(bars.length-1-i)*period*1000,source,pair:'EUR/USD OTC',candlePeriodSec:period,complete:i<bars.length-1,incomplete:false}));
}
function flatContext(c,period) {return taggedBars(c,Array.from({length:55},()=>({open:100,close:100,high:101,low:99})),period);}
test('existing scenario formulas produce BUY and SELL with consistent explanations',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';let seed=123;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const directions=new Set(),horizons=new Set();
  for(let trial=0;trial<400;trial++) {
    let price=100;const raw=[];
    for(let i=0;i<55;i++) {const open=price,close=open+(random()-.48)*1.6,wick=random()*.6;price=close;raw.push({open,close,high:Math.max(open,close)+wick,low:Math.min(open,close)-wick});}
    const bars=taggedBars(c,raw,15);const sign=bars.at(-1).isGreen?1:-1;
    c.LiveTickBuffer.getMicroMetrics=()=>({delta3s:.1*sign,delta5s:.1*sign,delta6s:.1*sign,delta15s:.1*sign,delta30s:.1*sign,posIn15sRange:.5});
    const result=c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close);
    if(result.shouldTrade){directions.add(result.direction);horizons.add(result.recommendedExpiry);assert.equal(result.direction==='BUY',bars.at(-1).isGreen);assert.match(result.line2,result.direction==='BUY'?/ВВЕРХ/:/ВНИЗ/);}
  }
  assert.equal(directions.size,2);assert.ok(horizons.size>=2);
});
test('the required higher timeframe participates in every expiry decision',()=>{
  for(const [expiry,entryPeriod,contextPeriod] of [['15s',15,60],['30s',15,60],['1m',30,60],['2m',60,120]]) {
    const c=loadContent();c.state.targetPair='EUR/USD OTC';const frames={15:flatContext(c,15),30:flatContext(c,30),60:flatContext(c,60),120:flatContext(c,120)};
    c.ProTraderEngine.analyzeFrame=(bars,price,scan,options)=>({shouldTrade:options.expiry===expiry,direction:'BUY',confidence:90,setup:'TEST',recommendedExpiry:expiry,
      rsi:55,pctB:.5,trendRegime:'STRONG_UPTREND',sr:{distToRes:2},explanationRu:'test'});
    let result=c.ProTraderEngine.analyze(frames[entryPeriod],100,{timeframes:frames});
    assert.equal(result.shouldTrade,true);assert.ok(result.timeframesUsed.includes(contextPeriod));
    const falling=Array.from({length:55},(_,i)=>({open:150-i,close:149.5-i,high:150.2-i,low:149.3-i}));
    frames[contextPeriod]=taggedBars(c,falling,contextPeriod);
    result=c.ProTraderEngine.analyze(frames[entryPeriod],100,{timeframes:frames});
    assert.equal(result.shouldTrade,false);assert.equal(result.hardVeto,true);
  }
});
test('missing frames disable their scenarios, not all other expiries',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';const frames={15:flatContext(c,15),60:flatContext(c,60)};
  const evaluated=[];c.ProTraderEngine.analyzeFrame=(bars,price,scan,options)=>{evaluated.push(options.expiry);return {shouldTrade:false,vetoReason:'LOW_CONFLUENCE_WAIT'};};
  c.ProTraderEngine.analyze(frames[15],100,{timeframes:frames});assert.deepEqual(evaluated,['15s']);
});
test('unclosed macro bars do not alter the confirmed context; EMA50 needs 50 bars',()=>{
  const c=loadContent(),bars=flatContext(c,60).slice(-30),first=c.ProTraderEngine.frameContext(bars);
  bars.at(-1).close=500;const second=c.ProTraderEngine.frameContext(bars);
  assert.equal(second.direction,first.direction);assert.equal(second.ema50Ready,false);
});
test('confluence is the sum of observed factors, with no invented sentiment or levels',()=>{
  const c=loadContent();const a={shouldTrade:true,direction:'BUY',confidence:97,trendRegime:'STRONG_UPTREND',setup:'TREND_PULLBACK_30S',rsi:55,pctB:.5,sr:{distToRes:.5}};
  const result=c.evaluate5FactorConfluence({},a,{observed:false});
  assert.equal(result.factors[2].score,.5);assert.equal(result.factors[4].score,0);
  assert.equal(result.score,result.factors.reduce((sum,f)=>sum+f.score,0));
  delete a.sr;assert.equal(c.evaluate5FactorConfluence({},a,{}).factors[2].score,0);
});
test('only a valid Pocket sentiment split counts as observed evidence',()=>{
  const c=loadContent();let up=60,down=40;
  c.document.querySelector=selector=>selector.includes('.sentiment-call')?{textContent:up+'%'}:selector.includes('.sentiment-put')?{textContent:down+'%'}:null;
  assert.equal(c.readTradersSentiment().observed,true);
  up=92;down=90;assert.equal(c.readTradersSentiment().observed,false);
});
test('indicator ratios retain scale on low-priced OTC instruments',()=>{
  const c=loadContent();const prices=Array.from({length:30},(_,i)=>100+Math.sin(i*.7)*2+i*.05);
  const normal=c.ProTraderEngine.computeBollinger(prices),small=c.ProTraderEngine.computeBollinger(prices.map(p=>p*1e-7));
  assert.equal(normal.pctB,small.pctB);
});
test('confirmed net profit is accumulated to cents without resetting old statistics',()=>{
  const c=loadContent();c.state.scoreProfit=1420;
  c.updateScoreOnTradeClose(false,0,50);c.updateScoreOnTradeClose(false,0,110);c.updateScoreOnTradeClose(true,222.64,0);
  assert.equal(c.state.scoreProfit,1482.64);assert.ok(c.storage.has('winky_live_stats_v5'));assert.ok(c.storage.has('winky_score_v3'));
});
test('automatic settlement retries through a delayed payout without advancing recovery',async()=>{
  const c=loadContent(),t=c.trade();c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};
  let checks=0;c.setBalanceReader(()=>{checks++;return checks<8?950:1046;});
  await c.onSignalTimerFinished();assert.ok(checks>=8);assert.equal(t.resultApplied,true);assert.equal(c.state.recoveryStep,0);assert.equal(c.state.lastTradeOutcome,'WIN');
});
test('a payout at the end of the settlement window wins over the debit fallback',async()=>{
  const c=loadContent(),t=c.trade(),started=c.now();t.brokerId=null;t.openConfirmed=false;t.debitObserved=true;
  c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};
  c.setBalanceReader(()=>c.now()-started<9900?950:1046);
  await c.onSignalTimerFinished();assert.equal(c.state.lastTradeOutcome,'WIN');assert.equal(c.state.recoveryStep,0);
});
test('a matched broker result overrides the loss implied by a stale balance',async()=>{
  const c=loadContent(),t=c.trade(),started=c.now();c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};
  c.setBalanceReader(()=>{if(c.now()-started>=9900)c.emit({type:'BROKER_DEAL_RESULT',orderId:t.brokerId,net:46});return 950;});
  await c.onSignalTimerFinished();assert.equal(c.state.lastTradeOutcome,'WIN');assert.equal(c.state.lastTrade.reason,'broker_closed_order');
});
test('three balance-settled losses restore 50 → 110 → 242 → 50 without a WS ID',async()=>{
  const c=loadContent(),stakes=[50];
  for(let i=0;i<3;i++){
    const t=c.trade();t.brokerId=null;t.openConfirmed=false;t.debitObserved=true;t.stake=c.state.currentStake;
    c.setBalance(1000-t.stake);c.state.botState='IN_TRADE';c.state.activeSignal={direction:'SELL'};
    const started=c.now();await c.onSignalTimerFinished();
    assert.ok(c.state.lastTrade.closedAt-started>=10000);assert.ok(c.state.lastTrade.closedAt-started<13000);
    assert.equal(c.state.lastTradeOutcome,'LOSS');stakes.push(c.state.currentStake);
  }
  assert.deepEqual(stakes,[50,110,242,50]);
});
test('an obsolete settlement callback cannot apply to a replacement trade',async()=>{
  const c=loadContent(),old=c.trade(),phases=[];let checks=0,replacement;
  c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setPhaseNotifier(phase=>phases.push(phase));
  const wins=c.state.scoreWins,losses=c.state.scoreLosses;
  c.setBalanceReader(()=>{if(++checks===2)replacement=c.trade();return 950;});
  await c.onSignalTimerFinished();assert.equal(c.state.tradeContext,replacement);assert.equal(old.resultApplied,false);
  assert.equal(c.state.scoreWins,wins);assert.equal(c.state.scoreLosses,losses);assert.deepEqual(phases,[]);
});
module.exports={loadContent,row};

test('optional generation is accepted for an identified pair, explicit obsolete generation is rejected',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  c.state.dataContexts.set('eurusdotc',{generation:4});
  assert.equal(c.acceptMarketEvidence({},'EURUSD_otc'),true);
  assert.equal(c.acceptMarketEvidence({generation:3},'EURUSD_otc'),false);
  assert.equal(c.acceptMarketEvidence({},null),false);
  assert.equal(c.acceptMarketEvidence({},'GBPUSD_otc'),false);
});
test('current partial S30 and M2 are forming, missing closed children are not fabricated',()=>{
  const c=loadContent();
  for(const period of [15,60]) {
    const bucket=Math.floor(c.now()/(period*2000))*period*2000;
    const child={open:.0000123,close:.0000124,high:.0000125,low:.0000122,time:bucket,
      candlePeriodSec:period,pair:'EUR/USD OTC',source:'broker',complete:false,incomplete:false};
    const bars=c.aggregateCandles([child],2);
    assert.equal(bars.length,1);assert.equal(bars[0].complete,false);assert.equal(bars[0].forming,true);assert.equal(bars[0].incomplete,false);
    assert.equal(bars[0].close,child.close);
    assert.equal(c.aggregateCandles([{...child,time:bucket-period*2000,complete:true}],2).length,0);
  }
});
