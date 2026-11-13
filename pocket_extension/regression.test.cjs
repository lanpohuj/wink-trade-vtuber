const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {loadHook}=require('./test_harness.cjs');

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
    globalThis.testing = { state, commentaryContext, commentaryVolatility, commentaryNearLoss, getExpectedStake, parsePocketMoney, evaluateTradeOutcome, getDomBalance:getPocketBalance,
      readClosedDealsFirstRow, matchesTradeEvidence, onSignalTimerFinished, aggregateCandles, chartPeriodSeconds,
      LiveTickBuffer, ProTraderEngine, ChartAnalyzer, POAutomation, startSignalAnalysis,
      executeTradeWithSignal, announceObservedOpening,
      updateScoreOnTradeClose,
      rankPairCandidate, bestPairCandidate, promoteCandidateForMandatoryEntry, canEnterAnalysis,
      marketFrames, rememberMarketFrame, acceptMarketEvidence, cleanMarketFrame, frameIsReady, evaluate5FactorConfluence, observedAnalysisFactors, visualEvidenceForSample, visualStageText, visualTradeSummary, renderAnalysisStep, renderSignalCardState, updateCardPairUI, syncPanelControlVisibility, currentDisplayCandles, refreshDisplayChart, quoteIsFresh, readTradersSentiment,
      setVisualTradeOutcome(value) { visualTradeOutcome = value; },
      setVisualTradeEvidence(value) { visualTradeEvidence = value; },
      getVisualTradeEvidence() { return visualTradeEvidence; },
      setBalanceReader(fn) { getPocketBalance = fn; },
      setRowsReader(fn) { pocketDealRows = fn; },
      setClickBridge(fn) { requestMainWorldClickTrade = fn; },
      setDirectClick(fn) { clickPocketTradeButton = fn; },
      setPhaseNotifier(fn) { notifyTradePhase = fn; },
      setSpeakingReader(fn) { checkWinkySpeaking = fn; },
      setVoicePlayer(fn) { VoiceManager.playCategory = fn; },
      setNextAnalysis(fn) { startSignalAnalysis = fn; },
      setFinalAnalysis(fn) { freshPairAnalysis = fn; },
      setTfBridge(fn) { requestMainWorldEnsureChartTimeframe=fn; },
      setMicroEntry(fn) { waitForOptimalMicroEntry = fn; },
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
test('the visual chart uses fresh matching candles and identifies visual fallback', () => {
  const c=loadContent(), candle={time:c.now()-15000,open:1,high:1.2,low:.9,close:1.1};
  c.state.targetPair='EUR/USD OTC';
  c.rememberMarketFrame(15,[candle],'broker',c.now(),'GBP/USD OTC');
  assert.equal(c.currentDisplayCandles(), null);
  c.rememberMarketFrame(15,[candle],'pixels',c.now(),'EUR/USD OTC');
  assert.equal(c.currentDisplayCandles().source, 'pixels');
  c.rememberMarketFrame(15,[candle],'broker',c.now(),'EUR/USD OTC');
  const view=c.currentDisplayCandles();
  assert.equal(view.period,15); assert.equal(view.bars[0].close,1.1);
  c.tick(61000);
  assert.equal(c.currentDisplayCandles(),null);
});
test('the visual chart uses matching fresh ticks but never the previous pair or stale quotes', () => {
  const c=loadContent(); c.state.targetPair='EUR/USD OTC'; c.state.actualChartTf='S30';
  c.LiveTickBuffer.pair='EUR/USD OTC';
  c.LiveTickBuffer.ticks=[{ts:c.now()-5000,price:1},{ts:c.now()-1000,price:1.1}];
  const view=c.currentDisplayCandles();
  assert.equal(view.source,'ticks');assert.equal(view.period,30);assert.equal(view.bars.at(-1).close,1.1);
  c.state.targetPair='GBP/USD OTC';assert.equal(c.currentDisplayCandles(),null);
  c.state.targetPair='EUR/USD OTC';c.tick(31000);assert.equal(c.currentDisplayCandles(),null);
});
test('structure shows an observed rejection even without a confirmed setup', () => {
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const sample={pair:c.state.targetPair,analysis:{valid:true,dataStatus:'SETUP_FORMING',trendRegime:'UPTREND',sr:{},rejected:[{reason:'SETUP_FORMING'}]},
    confluence:{factors:[{pass:true},{pass:false},{pass:true}]}};
  assert.deepEqual(Array.from(c.observedAnalysisFactors(sample)),[true,false,true]);
  sample.analysis.dataStatus='NO_DATA';assert.equal(c.observedAnalysisFactors(sample).length,0);
  sample.analysis.dataStatus='SETUP_FORMING';sample.analysis.rejected=[];
  assert.deepEqual(Array.from(c.observedAnalysisFactors(sample)),[true,null,true]);
  sample.pair='GBP/USD OTC';assert.equal(c.observedAnalysisFactors(sample).length,0);
});
test('forced trade display uses the original pair evidence and score, never promoted claims', () => {
  const c=loadContent();c.state.targetPair='EUR/USD OTC';c.state.searchGeneration=4;
  const raw={pair:c.state.targetPair,analysis:{valid:true,dataStatus:'SETUP_FORMING',trendRegime:'UPTREND',sr:{},rejected:[{reason:'SETUP_FORMING'}]},
    confluence:{score:3.1,factors:[{pass:true},{pass:false},{pass:true}]}};
  const evidence=c.visualEvidenceForSample(raw,true),promoted=c.promoteCandidateForMandatoryEntry(raw);
  assert.equal(promoted.confluence.score,4.1);assert.equal(evidence.score,3.1);
  assert.deepEqual(Array.from(evidence.codes),['up','rejected','confirmed','forced']);
  c.setVisualTradeEvidence(evidence);
  const block={className:'',innerHTML:''},accuracy={textContent:''};
  c.document.getElementById=id=>id==='botDirectionBlock'?block:id==='metricAccuracyVal'?accuracy:null;
  c.state.botState='IN_TRADE';c.state.activeSignal={pair:raw.pair,direction:'SELL',accuracy:82,confluence:4.1,duration:'30s',durationSec:30,line1:'Изобретённый сетап'};
  c.renderSignalCardState();
  assert.equal(accuracy.textContent,'62%');assert.match(block.innerHTML,/Принудительный выбор после трёх пар/);
  assert.match(block.innerHTML,/Не подтверждено/);assert.match(block.innerHTML,/Принудительный/);
  assert.equal((block.innerHTML.match(/winky-scan-seg completed/g)||[]).length,4);
  assert.doesNotMatch(block.innerHTML,/Изобретённый сетап|4\.1 \/ 5/);
  c.state.activeSignal.pair='GBP/USD OTC';c.renderSignalCardState();
  assert.equal(accuracy.textContent,'—');assert.match(block.innerHTML,/Данные анализа недоступны/);assert.doesNotMatch(block.innerHTML,/Принудительный выбор/);
  c.state.lang='en';c.renderSignalCardState();assert.match(block.innerHTML,/Analysis data unavailable/);
});
test('visual evidence does not invent results when analysis is unavailable', () => {
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const sample={pair:c.state.targetPair,analysis:{dataStatus:'NO_DATA'},confluence:{score:4.8,factors:[{pass:true}]}};
  const evidence=c.visualEvidenceForSample(sample,true);
  assert.equal(evidence.score,null);assert.deepEqual(Array.from(evidence.codes),['unavailable','unavailable','unavailable','forced']);
  assert.equal(c.visualEvidenceForSample({...sample,pair:'GBP/USD OTC'},true),null);
});
test('the chart clears stale candles and shows waiting when the pair has no data', () => {
  const c=loadContent(),chart={innerHTML:'old candles',dataset:{pair:'other'}},status={hidden:true,textContent:''};
  c.document.getElementById=id=>id==='winkyVisualChart'?chart:id==='winkyVisualChartStatus'?status:null;
  c.state.botState='ANALYZING_PAIR'; c.refreshDisplayChart();
  assert.equal(chart.innerHTML,'');assert.equal(chart.dataset.pair,'');assert.equal(status.hidden,false);
  assert.match(status.textContent,/Ожидаем данные/);
});
test('result card never turns an unknown or refund into a win or loss', () => {
  const c=loadContent(), block={className:'',innerHTML:''};
  c.document.getElementById=id=>id==='botDirectionBlock'?block:null;
  c.state.botState='TRADE_RESULT';
  for (const outcome of ['UNKNOWN','REFUND']) {
    c.setVisualTradeOutcome({outcome,profitDelta:0,lossDelta:0}); c.renderSignalCardState();
    assert.match(block.innerHTML, outcome==='UNKNOWN' ? /Результат не получен/ : /Возврат/);
    assert.doesNotMatch(block.innerHTML, /Прибыль|Убыток|\+\$/);
  }
});
test('market settings are visible only in idle manual mode', () => {
  const c=loadContent(), controls=[{hidden:false},{hidden:false}];
  c.document.querySelectorAll=()=>controls;
  for (const [auto,running,trade,phase,hidden] of [
    [false,false,null,'IDLE',false], [true,false,null,'IDLE',true],
    [false,true,null,'ANALYZING_PAIR',true], [true,true,null,'ANALYZING_PAIR',true],
    [false,false,{},'IN_TRADE',true], [false,false,{},'TRADE_RESULT',true],
    [false,false,{},'COOLDOWN',true], [false,false,null,'IDLE',false],
  ]) {
    Object.assign(c.state,{autoStream:auto,searchRunning:running,tradeContext:trade,botState:phase});
    c.syncPanelControlVisibility(); assert.deepEqual(controls.map(el=>el.hidden),[hidden,hidden]);
  }
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
    assert.deepEqual(phases,['RESULT','COOLDOWN','IDLE']);assert.equal(c.state.botState,'IDLE');assert.equal(c.state.tradeContext,null);assert.equal(next,1);
    if(status!=='REFUND')assert.ok(voices.includes(status==='WIN'?'trade_win':'trade_loss_step1'));
    await c.onSignalTimerFinished();assert.equal(phases.length,3);
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
  assert.deepEqual(phases,['RESULT','COOLDOWN','IDLE']);assert.equal(c.state.botState,'IDLE');assert.equal(c.state.tradeContext,null);
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
test('Winky speech never delays settlement or the next cycle', async () => {
  const c=loadContent(),t=c.trade();c.state.botState='IN_TRADE';c.state.activeSignal={direction:'BUY'};c.setBalance(1046);
  let checks=0;c.setSpeakingReader(async()=>{checks++;c.setBalance(1047);return {is_speaking:true};});
  await c.onSignalTimerFinished();assert.equal(checks,0);assert.equal(c.state.lastTradeOutcome,'WIN');assert.equal(c.state.lastTrade.reason,'credited_balance');
  assert.equal(c.state.scoreProfit,1466);assert.equal(c.state.botState,'IDLE');assert.equal(t.resultApplied,true);
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
test('after three pairs the best eligible setup is rechecked and entered without observation',async()=>{
  const c=searchFixture(null,true),started=c.now();await c.startSignalAnalysis();
  assert.deepEqual(Array.from(c.state.pairCandidates,p=>p.pair),c.pairs.slice(0,3));assert.equal(new Set(c.state.searchSeen).size,3);
  assert.ok(!c.switches.includes(c.pairs[3]) && !c.switches.includes(c.pairs[4]));
  assert.equal(c.executed.length,1);assert.equal(c.executed[0].pair,c.pairs[0]);assert.equal(c.switches.at(-1),c.pairs[0]);
  assert.ok(c.now()-started<10000);assert.ok(c.state.decisionJournal.some(e=>e.event==='entry_confirmed'));
});
test('all hard-vetoed candidates in Round 1 force mandatory entry via promoteCandidateForMandatoryEntry without Round 2',async()=>{
  const c=searchFixture();let calls=0;
  c.setSearchDependencies({analyze:()=>{calls++;return {shouldTrade:true,hardVeto:true,vetoReason:'HIGH_RISK_MARKET',direction:'BUY',confidence:95};}});
  await c.startSignalAnalysis();assert.equal(c.executed.length,1);assert.ok(calls<80);assert.equal(c.state.botState,'IN_TRADE');
  assert.equal(c.state.searchRunning,false);assert.equal(c.state.pairCandidates.length,3);
});
test('forced three-pair flow retains the selected original evidence for display',async()=>{
  const c=searchFixture();
  c.setSearchDependencies({analyze:()=>({valid:true,shouldTrade:false,hardVeto:true,dataStatus:'TRADE_BLOCKED',trendRegime:'UPTREND',sr:{},rejected:[{reason:'SETUP_FORMING'}]}),
    confluence:()=>({score:2.7,factors:[{pass:true,score:.8},{pass:false,score:0},{pass:true,score:.6}]})});
  await c.startSignalAnalysis();
  const evidence=c.getVisualTradeEvidence();assert.equal(c.executed.length,1);assert.equal(c.state.pairCandidates.length,3);
  assert.ok(evidence);assert.equal(evidence.pair,c.executed[0].pair.toLowerCase().replace(/[^a-z0-9]/g,''));assert.equal(evidence.score,2.7);
  assert.deepEqual(Array.from(evidence.codes),['up','rejected','confirmed','forced']);
});
test('failed loading is not counted as an analyzed pair',async()=>{
  const c=searchFixture(null,true);c.setSearchDependencies({ready:async()=>c.state.targetPair!==c.pairs[0],
    analyze:()=>c.state.targetPair===c.pairs[0]?{valid:false,shouldTrade:false,dataStatus:'NO_DATA',vetoReason:'NOT_ENOUGH_CANDLES'}:
      {valid:true,shouldTrade:true,direction:'BUY',recommendedExpiry:'30s',trendRegime:'UPTREND'}});
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
test('analysis tiles show observed states, reset per pair and do not inflate accuracy',()=>{
  const c=loadContent(),nodes=new Map(),segments=Array.from({length:4},()=>{
    const label={textContent:''},indicator={textContent:''};
    return {className:'',label,indicator,attrs:{},querySelector(s){return s==='[data-stage-label]'?label:indicator;},setAttribute(k,v){this.attrs[k]=v;}};
  });let mounts=0;
  const block={className:'',markup:'',set innerHTML(value){this.markup=value;mounts++;nodes.set('[data-analysis-tiles]',{});},
    querySelector(selector){if(selector==='[data-analysis-tiles]')return nodes.get(selector)||null;if(!nodes.has(selector))nodes.set(selector,{textContent:'',className:''});return nodes.get(selector);},
    querySelectorAll(){return segments;}};
  const accuracy={textContent:'',title:''};c.document.getElementById=id=>id==='botDirectionBlock'?block:id==='metricAccuracyVal'?accuracy:null;
  for(let i=0;i<20;i++)c.renderAnalysisStep(0,4,'Тренд','Данные обновляются','2.5',true,'confirmed',true);
  assert.equal(mounts,1);assert.doesNotMatch(block.markup,/winky-stage-index/);assert.equal(segments[0].indicator.textContent,'Подтверждено');assert.equal(accuracy.textContent,'50%');
  c.renderAnalysisStep(1,4,'Структура','Проверка','2.5',false,'rejected',false);
  assert.equal(segments[0].indicator.textContent,'Подтверждено');assert.equal(segments[1].indicator.textContent,'Не подтверждено');
  c.renderAnalysisStep(2,4,'Уровни','Нет данных',null,false,'loading',null);
  assert.equal(segments[2].indicator.textContent,'Проверяем');assert.doesNotMatch(segments[2].className,/confirmed|rejected/);
  c.renderAnalysisStep(2,4,'Уровни','Проверка','2.5',false,'checking',true,null,[true,false,true]);
  assert.equal(segments[1].indicator.textContent,'Не подтверждено');assert.equal(segments[2].indicator.textContent,'Подтверждено');
  c.renderAnalysisStep(3,4,'Вход','Недостаточно данных',null,false,'rejected',null,null);
  assert.equal(segments[3].indicator.textContent,'Проверяем');assert.doesNotMatch(segments[3].className,/confirmed|rejected/);
  c.renderAnalysisStep(3,4,'Вход','Не подтверждено','2.5',false,'rejected',null,'rejected');
  assert.equal(mounts,1);assert.equal(segments[3].indicator.textContent,'Не подтверждено');assert.equal(accuracy.textContent,'50%');
  c.state.targetPair='GBP/USD OTC';
  c.updateCardPairUI();
  assert.equal(segments[1].indicator.textContent,'');assert.equal(segments[3].indicator.textContent,'');
  c.renderAnalysisStep(0,4,'Данные','M1: 0 закрытых',null,false,'loading');
  assert.equal(segments[1].indicator.textContent,'Ожидание');assert.equal(segments[3].indicator.textContent,'Ожидание');
  assert.equal(accuracy.textContent,'—');assert.equal(nodes.get('[data-analysis-score]').textContent,'— / 5');assert.equal(mounts,1);
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
    c.LiveTickBuffer.getMicroMetrics=()=>({delta3s:.1*sign,delta5s:.1*sign,delta6s:.1*sign,delta15s:.1*sign,delta30s:.1*sign,observedWindowSec:5,samples5s:6,posIn15sRange:.5});
    const result=c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close);
    if(result.shouldTrade){directions.add(result.direction);horizons.add(result.recommendedExpiry);assert.equal(result.direction==='BUY',bars.at(-1).isGreen);assert.match(result.line2,result.direction==='BUY'?/ВВЕРХ/:/ВНИЗ/);}
  }
  assert.equal(directions.size,2);assert.ok(horizons.size>=2);
});
test('the required higher timeframe participates in every expiry decision',()=>{
  for(const [expiry,entryPeriod,contextPeriod] of [['5s',15,60],['15s',15,60],['30s',15,60],['1m',30,60]]) {
    const c=loadContent();c.state.targetPair='EUR/USD OTC';const frames={15:flatContext(c,15),30:flatContext(c,30),60:flatContext(c,60)};
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

function scenarioFixture(family,buy=true) {
 let bars=Array.from({length:55},(_,i)=>({open:100+Math.sin(i)*.25,close:100+Math.sin(i+1)*.25,high:100.7,low:99.3}));
 if(family==="TREND_PULLBACK") {
   bars = [];
   for (let i = 0; i < 36; i++) {
     const o = 100.0 + (i % 2 === 0 ? -0.25 : 0.25);
     const c = 100.0 + (i % 2 === 0 ? 0.25 : -0.25);
     bars.push({ open: o, close: c, high: Math.max(o, c) + 0.35, low: Math.min(o, c) - 0.35 });
   }
   let curr = 100.1;
   for (let i = 36; i < 49; i++) {
     const isDown = (i % 3 === 2);
     const delta = isDown ? -0.10 : 0.13;
     const o = curr;
     const c = curr + delta;
     curr = c;
     bars.push({ open: o, close: c, high: Math.max(o, c) + 0.25, low: Math.min(o, c) - 0.25 });
   }
   bars.push({ open: curr, close: curr + 0.15, high: curr + 0.25, low: curr - 0.10 });
   curr += 0.15;
   bars.push({ open: curr, close: curr + 0.15, high: curr + 0.25, low: curr - 0.10 });
   curr += 0.15;
   bars.push({ open: curr, close: curr + 0.18, high: curr + 0.28, low: curr - 0.05 });
   curr += 0.18;
   bars.push({ open: curr, close: curr - 0.18, high: curr + 0.05, low: curr - 0.25 });
   curr -= 0.18;
   bars.push({ open: curr, close: curr - 0.18, high: curr + 0.05, low: curr - 0.25 });
   curr -= 0.18;
   bars.push({ open: curr, close: curr + 0.12, high: curr + 0.15, low: curr - 0.02 });
 } else if(family==="BREAKOUT_RETEST") {
   bars = Array.from({length: 55}, (_, i) => {
     const cycle = Math.sin(i * 0.5);
     const open = 99.9 + cycle * 0.6;
     const close = 99.9 + Math.sin((i + 1) * 0.5) * 0.6;
     return { open, close, high: Math.min(100.7, Math.max(open, close) + 0.35), low: Math.min(open, close) - 0.35 };
   });
   bars[40] = { open: 100.4, close: 100.6, high: 100.7, low: 100.2 };
   bars[41] = { open: 100.6, close: 100.1, high: 100.65, low: 99.9 };
   for (let i = 42; i < 50; i++) {
     bars[i].open = 100.2 + (i % 2 === 0 ? 0.2 : -0.2);
     bars[i].close = 100.2 + (i % 2 === 0 ? -0.2 : 0.2);
     bars[i].high = Math.min(100.6, Math.max(bars[i].open, bars[i].close) + 0.2);
     bars[i].low = Math.min(bars[i].open, bars[i].close) - 0.2;
   }
   bars[45].high = 100.7;
   bars[50] = { open: 100.3, close: 100.6, high: 100.7, low: 100.1 };
   bars[51] = { open: 100.4, close: 100.3, high: 100.5, low: 100.1 };
   bars[52] = { open: 100.3, close: 100.85, high: 100.95, low: 100.25 };
   bars[53] = { open: 100.85, close: 100.71, high: 100.85, low: 100.68 };
   bars[54] = { open: 100.71, close: 100.88, high: 100.92, low: 100.69 };
 } else {
   bars=Array.from({length:55},(_,i)=>{const open=100+Math.sin(i*.8),close=100+Math.sin((i+1)*.8);return {open,close,high:Math.max(open,close)+.2,low:Math.min(open,close)-.2};});
   if(family==="RANGE_REJECTION") {
    bars[53]={open:99.4,close:99.3,high:99.6,low:98.8};
    bars[54]={open:99.3,close:99.6,high:99.65,low:99.2};
   } else {
    bars[53]={open:99.2,close:99,high:99.1,low:98.5};bars[53].high=99.25;
    bars[54]={open:99,close:99.3,high:99.35,low:98.95};
   }
 }
 if(!buy) bars=bars.map(b=>({open:200-b.open,close:200-b.close,high:200-b.low,low:200-b.high}));
 return bars;
}
for(const family of ['TREND_PULLBACK','BREAKOUT_RETEST','RANGE_REJECTION','LOCAL_REVERSAL']) {
  test(family+': confirmed, forming and opposed cases work symmetrically on every horizon',()=>{
    for(const buy of [true,false]) for(const expiry of ['5s','15s','30s','1m']) {
      const c=loadContent();c.state.targetPair='EUR/USD OTC';
      c.LiveTickBuffer.getMicroMetrics=()=>({observedWindowSec:5,samples5s:6,delta3s:buy?.1:-.1,delta5s:buy?.2:-.2});
      const bars=taggedBars(c,scenarioFixture(family,buy),15);
      const result=c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close,null,{expiry});
      const scenario=result.scenarios?.find(a=>a.family===family);
      assert.ok(scenario,`${family} ${buy} ${expiry}: ${JSON.stringify(result.rejected)}`);
      assert.equal(scenario.direction,buy?'BUY':'SELL');assert.equal(scenario.recommendedExpiry,expiry);
      assert.match(scenario.line2,buy?/ВВЕРХ/:/ВНИЗ/);
      const forming=bars.slice(0,-1).concat({...bars.at(-1),close:bars.at(-1).open});
      assert.equal(c.ProTraderEngine.analyzeFrame(forming,forming.at(-1).close,null,{expiry}).shouldTrade,false);
      const opposed=c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close,null,{expiry,context:{strong:true,direction:buy?'SELL':'BUY'}});
      assert.equal(opposed.shouldTrade,false);assert.ok(opposed.rejected.some(r=>r.family===family && r.reason==='OPPOSING_HIGHER_TREND'));
    }
  });
}
test('breakout retest promotes old resistance to support without inventing an opposite target',()=>{
  const c=loadContent();c.LiveTickBuffer.getMicroMetrics=()=>({observedWindowSec:5,samples5s:6,delta3s:.1,delta5s:.2});
  const bars=taggedBars(c,scenarioFixture('BREAKOUT_RETEST'),15);
  const r=c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close,null,{expiry:'30s'}).scenarios.find(s=>s.family==='BREAKOUT_RETEST');
  assert.equal(r.sr.support,100.7);assert.equal(r.sr.roomKnown,false);assert.equal(r.sr.resistance,null);
  assert.equal(c.evaluate5FactorConfluence({},r,{}).factors[2].score,.5);
  const failed=bars.map(b=>({...b}));failed.at(-2).close=100.4;
  const result=c.ProTraderEngine.analyzeFrame(failed,failed.at(-1).close,null,{expiry:'30s'});
  assert.equal(result.scenarios?.some(s=>s.family==='BREAKOUT_RETEST') || false,false);
});
test('numeric M1/M2 select an independent long entry with no S15 and unknown visual interval',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';c.state.actualChartTf=null;
  const m1=taggedBars(c,scenarioFixture('RANGE_REJECTION'),60),m2=flatContext(c,120);
  const r=c.ProTraderEngine.analyze(m1,m1.at(-1).close,{timeframes:{60:m1,120:m2}});
  assert.equal(r.shouldTrade,true);assert.equal(r.recommendedExpiry,'1m');
  assert.equal(r.entryPeriodSec,60);assert.equal(r.dataStatus,'ENTRY_CONFIRMED');
  assert.ok(r.rejected.some(s=>s.expiry==='15s' && s.reason==='NOT_ENOUGH_CANDLES'));
});
test('failed 3-second impulse disables short entries while the same long setup remains valid',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';c.LiveTickBuffer.getMicroMetrics=()=>({observedWindowSec:5,samples5s:6,delta3s:-.1,delta5s:-.2});
  const frames={15:taggedBars(c,scenarioFixture('RANGE_REJECTION'),15),30:taggedBars(c,scenarioFixture('RANGE_REJECTION'),30),60:flatContext(c,60),120:flatContext(c,120)};
  const r=c.ProTraderEngine.analyze(frames[15],100,{timeframes:frames});
  assert.equal(r.shouldTrade,true);assert.equal(r.recommendedExpiry,'1m');
  assert.ok(!r.scenarios.some(s=>['15s','30s'].includes(s.recommendedExpiry)));
});
test('short-first choice is threshold aware; ties choose 15s or 1m; pinned valid scenarios survive rank changes',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const frames=Object.fromEntries([15,30,60,120].map(p=>[p,flatContext(c,p)]));
  let scores={'5s':4.0,'15s':4.1,'30s':4.1,'1m':4.8};
  c.ProTraderEngine.analyzeFrame=(bars,price,scan,opt)=>({shouldTrade:true,direction:'BUY',recommendedExpiry:opt.expiry,family:'TEST',setup:'TEST',explanationRu:'test',score:scores[opt.expiry]});
  c.setSearchDependencies({confluence:(scan,a)=>({score:a.score,factors:[]})});
  const analyze=selection=>c.ProTraderEngine.analyze([],0,{timeframes:frames,...selection});
  let r=analyze();assert.equal(r.recommendedExpiry,'15s');
  const pinned=r.scenarioKey;scores={'5s':4.0,'15s':4.1,'30s':4.8,'1m':4.9};
  assert.equal(analyze().recommendedExpiry,'30s');assert.equal(analyze({preferredScenarioKey:pinned}).recommendedExpiry,'15s');
  scores={'5s':3.7,'15s':3.8,'30s':3.9,'1m':4.1};assert.equal(analyze().recommendedExpiry,'1m');
  scores={'5s':3.4,'15s':3.4,'30s':3.3,'1m':3.4};assert.equal(analyze().shouldTrade,false);
  assert.equal(analyze({preferredScenarioKey:pinned}).vetoReason,'SCENARIO_INVALIDATED');
});
test('unknown-period visible candles report NO_DATA, never a zero-quality market',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';c.state.actualChartTf=null;
  const bars=taggedBars(c,scenarioFixture('TREND_PULLBACK'),60,'pixels');
  const r=c.ChartAnalyzer.analyzeMarket({visualCandles:bars});
  assert.equal(r.dataStatus,'NO_DATA');assert.equal(r.shouldTrade,false);assert.equal(r.hardVeto,false);
  assert.match(r.explanationRu,/M1: 0/);assert.equal(r.accuracy,null);
});
test('pixel frames never use quote micro deltas to validate short impulses',()=>{
  const c=loadContent();c.LiveTickBuffer.getMicroMetrics=()=>({observedWindowSec:5,samples5s:6,delta3s:100,delta5s:200});
  const bars=taggedBars(c,scenarioFixture('TREND_PULLBACK'),15,'pixels');
  assert.equal(c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close,null,{expiry:'15s'}).shouldTrade,false);
  assert.equal(c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close,null,{expiry:'1m'}).shouldTrade,true);
});
test('future observations cannot establish a pattern; current bars do not change closed indicators',()=>{
  const c=loadContent();const bars=taggedBars(c,scenarioFixture('LOCAL_REVERSAL'),60);
  const first=c.ProTraderEngine.analyzeFrame(bars,bars.at(-1).close,null,{expiry:'1m'});
  const modified=bars.map(b=>({...b}));modified.at(-1).close+=.1;
  const second=c.ProTraderEngine.analyzeFrame(modified,modified.at(-1).close,null,{expiry:'1m'});
  assert.equal(first.rsi,second.rsi);assert.equal(first.pctB,second.pctB);
  modified.push({...modified.at(-1),time:c.now()+60000});
  assert.equal(c.ProTraderEngine.analyzeFrame(modified,0,null,{expiry:'1m'}).shouldTrade,false);
});

test('one live quote creates a forming candle but old sparse ticks do not prove a short impulse',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'EURUSD_otc',timestamp:c.now(),price:1});
  assert.equal(c.LiveTickBuffer.buildCandles(30).at(-1).complete,false);
  assert.equal(c.LiveTickBuffer.buildCandles(30).at(-1).incomplete,false);
  c.LiveTickBuffer.ticks.unshift({ts:c.now()-600000,price:.9});
  assert.equal(c.LiveTickBuffer.getMicroMetrics().observedWindowSec,0);
});
test('the numeric history adapter enters a long setup without requesting S30',async()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';const switches=[];
  c.emit({type:'MARKET_CONTEXT',asset:'EURUSD_otc',generation:1});
  c.emit({type:'WS_CANDLES_HISTORY',asset:'EURUSD_otc',periodSec:60,candles:taggedBars(c,scenarioFixture('RANGE_REJECTION'),60)});
  c.emit({type:'WS_CANDLES_HISTORY',asset:'EURUSD_otc',periodSec:120,candles:flatContext(c,120)});
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'EURUSD_otc',price:99.65,timestamp:c.now(),generation:1});
  let placed=null;
  c.setSearchDependencies({scan:()=>({visualCandles:[]}),sentiment:()=>({observed:true,bullish:60,bearish:40}),
    execute:async(a)=>{placed=a;c.state.tradeContext={test:true};c.state.botState='IN_TRADE';}});
  c.setTfBridge(async tf=>{switches.push(tf);return {ok:false};});
  await c.startSignalAnalysis();
  assert.ok(placed);assert.equal(placed.recommendedExpiry,'1m');assert.equal(placed.family,'RANGE_REJECTION');
  assert.equal(switches.includes('S30'),false);assert.ok(placed.scenarioKey);
});

test('pre-click recheck cancels a different family even when direction and expiry still match',async()=>{
  const c=loadContent();c.prepareExecution();c.state.targetPair='EUR/USD OTC';c.document.title='EUR/USD OTC';c.state.searchGeneration=1;c.state.searchRunning=true;
  let clicks=0,selection=null;c.POAutomation.clickTrade=async()=>{clicks++;return true;};
  c.state.lastRealQuote={pair:c.state.targetPair,price:1,timestamp:c.now(),receivedAt:c.now()};
  c.setFinalAnalysis(async options=>{selection=options;return {analysis:{shouldTrade:true,direction:'BUY',recommendedExpiry:'30s',scenarioKey:'other-family'},confluence:{score:5},scan:{}};});
  await c.executeTradeWithSignal({direction:'BUY',recommendedExpiry:'30s',searchGeneration:1,scenarioKey:'selected-family'},{score:5},{});
  assert.equal(selection.preferredScenarioKey,'selected-family');assert.equal(clicks,0);assert.equal(c.state.tradeContext,null);
});

test('broken numeric tail cannot displace 54 healthy closed visual M1 candles',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';c.state.actualChartTf='M1';
  const visual=taggedBars(c,scenarioFixture('TREND_PULLBACK'),60,'pixels');
  const broken=visual.slice(-23,-1).map(b=>({...b,source:'broker'}));broken.at(-1).incomplete=true;
  c.rememberMarketFrame(60,broken,'broker');c.rememberMarketFrame(60,visual,'pixels');
  const frames=c.marketFrames();assert.equal(frames[60].length,55);assert.equal(frames[60].at(-1).source,'pixels');
  assert.equal(c.ProTraderEngine.frameContext(frames[60]).closedCount,54);
});
test('readiness uses 21 closed context candles and 20 closed entry candles',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const m1=taggedBars(c,scenarioFixture('TREND_PULLBACK'),60).slice(-21);
  assert.equal(c.frameIsReady(m1,60),false);assert.equal(c.ProTraderEngine.frameContext(m1),null);
  const enough=taggedBars(c,scenarioFixture('TREND_PULLBACK'),60).slice(-22);
  assert.equal(c.frameIsReady(enough,60),true);assert.ok(c.ProTraderEngine.frameContext(enough));
  const s15=taggedBars(c,scenarioFixture('TREND_PULLBACK'),15).slice(-21);assert.equal(c.frameIsReady(s15,15),true);
});
test('identified delayed history is cached for its own pair without changing active quotes or pair',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';c.emit({type:'MARKET_CONTEXT',asset:'GBPUSD_otc',generation:2});
  const gbp=taggedBars(c,scenarioFixture('RANGE_REJECTION'),60).map(b=>({...b,pair:'GBP/USD OTC'}));
  c.emit({type:'WS_CANDLES_HISTORY',asset:'GBPUSD_otc',periodSec:60,generation:2,candles:gbp});
  c.emit({type:'WS_HISTORY_TICKS',asset:'GBPUSD_otc',generation:2,ticks:[{ts:c.now()-1000,price:1.1},{ts:c.now(),price:1.2}]});
  assert.equal(c.state.targetPair,'EUR/USD OTC');assert.equal(c.state.lastRealQuote,null);assert.equal(c.LiveTickBuffer.ticks.length,0);
  assert.equal(c.marketFrames()[60].length,0);assert.equal(c.LiveTickBuffer.archives.get('gbpusdotc').length,2);
  c.state.targetPair='GBP/USD OTC';c.LiveTickBuffer.reset(c.state.targetPair);
  assert.equal(c.marketFrames()[60].length,55);assert.equal(c.LiveTickBuffer.ticks.length,2);
});
test('contiguous S15 history supplies S30, M1 and M2 without future bars',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const bars=taggedBars(c,Array.from({length:193},(_,i)=>({open:1+i*.00001,close:1.000005+i*.00001,high:1.000009+i*.00001,low:.999999+i*.00001})),15,'broker');
  c.rememberMarketFrame(15,bars,'broker');const frames=c.marketFrames();
  for(const period of [30,60,120]) {
    assert.ok(c.ProTraderEngine.frameContext(frames[period]),period);assert.equal(frames[period].at(-1).complete,false);
    assert.ok(frames[period].every(b=>b.time<=c.now() && b.source==='quotes' && b.origin==='broker' && b.candlePeriodSec===period));
  }
});
test('normalization does not stitch a context across missing closed bars',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';const bars=taggedBars(c,scenarioFixture('TREND_PULLBACK'),60);bars.splice(-5,1);
  const cleaned=c.cleanMarketFrame(bars,60);assert.equal(cleaned.length,4);assert.equal(c.frameIsReady(cleaned,60),false);
});

test('canvas labels cannot rewind the broker clock when Pocket timestamps have a server offset',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';const broker=c.now()+7200000;
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'EURUSD_otc',price:1.1,timestamp:broker});
  c.emit({type:'PRICE_TICK',source_type:'canvas',rawSymbol:'EURUSD_otc',price:1.1,timestamp:c.now()});
  assert.equal(c.state.lastRealQuote.timestamp,broker);assert.equal(c.state.lastRealQuote.source,'ws');
  const time=Math.floor(broker/60000)*60000;
  c.emit({type:'WS_CANDLES_HISTORY',asset:'EURUSD_otc',periodSec:60,candles:[{time:time-60000,open:1,high:1.2,low:.9,close:1.1}]});
  assert.ok(c.marketFrames()[60].some(b=>b.time===time-60000 && b.complete));
});

test('a forming setup retains observed indicators and factors without becoming executable',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const bars=taggedBars(c,scenarioFixture('TREND_PULLBACK'),15);bars.at(-1).close=bars.at(-1).open;
  const frames={15:bars,30:flatContext(c,30),60:flatContext(c,60),120:flatContext(c,120)};
  const r=c.ProTraderEngine.analyze([],0,{timeframes:frames});
  assert.equal(r.shouldTrade,false);assert.equal(r.dataStatus,'SETUP_FORMING');assert.ok(Number.isFinite(r.rsi));
  assert.ok(r.confluence.factors.some(f=>f.score>0));assert.equal(c.canEnterAnalysis(r,r.confluence,0,false),false);
});

test('native tuple history crosses both worlds and restores M1/M2 before any visual switch',()=>{
  const fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/pocket-fast-history.json','utf8'));
  const c=loadContent(),h=loadHook(),socket=new h.Socket('wss://test');c.state.targetPair='USD/SGD OTC';
  let forwarded=0;const forward=()=>{while(forwarded<h.messages.length)c.emit(h.messages[forwarded++]);};
  const brokerNow=fixture.payload.history.at(-1)[0]*1000,openBucket=Math.floor(brokerNow/60000)*60000;
  // Synthetic contiguous extension of the CAPTURED tuple shape, including the
  // native two-hour clock offset and the recent gap supplied by real-time ticks.
  const candles=Array.from({length:99},(_,i)=>[(openBucket-(100-i)*60000)/1000,1.3,1.3001,1.301,1.299,100]);
  const history=Array.from({length:901},(_,i)=>[(brokerNow-(900-i)*1000)/1000,1.3002]);
  socket.send('42'+JSON.stringify(['changeSymbol',{asset:fixture.payload.asset,period:60}]));forward();
  socket.receive('42'+JSON.stringify([fixture.event,{asset:fixture.payload.asset,period:60,candles,history}]));forward();
  socket.receive('42'+JSON.stringify(['updateStream',[[fixture.payload.asset,brokerNow/1000,1.3002]]]));forward();
  c.emit({type:'PRICE_TICK',source_type:'canvas',rawSymbol:fixture.payload.asset,price:1.3002,timestamp:c.now()});
  const frames=c.marketFrames();assert.ok(c.ProTraderEngine.frameContext(frames[60]).closedCount>=99);
  assert.ok(c.ProTraderEngine.frameContext(frames[120]).closedCount>=49);
  assert.equal(c.state.actualChartTf,undefined);assert.equal(c.state.lastRealQuote.source,'ws');
  const a=c.ChartAnalyzer.analyzeMarket({visualCandles:[]});assert.notEqual(a.dataStatus,'NO_DATA');assert.equal(a.shouldTrade,false);
});

test('M2 context crosses a native OHLC to tick boundary within the same Pocket quote feed',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const now=Math.floor(c.now()/120000)*120000+30000;
  c.emit({type:'TICK',source_type:'ws',rawSymbol:'EURUSD_otc',price:1.3,timestamp:now});
  // Last native M1 is the FIRST half of a closed M2 bucket; its second half
  // and the forming bucket come from the same broker's ticks.
  const candles=Array.from({length:99},(_,i)=>({time:now-30000-(100-i)*60000,open:1.3,close:1.3001,high:1.301,low:1.299}));
  c.emit({type:'WS_CANDLES_HISTORY',asset:'EURUSD_otc',periodSec:60,candles});
  c.emit({type:'WS_HISTORY_TICKS',asset:'EURUSD_otc',ticks:Array.from({length:121},(_,i)=>({ts:now-120000+i*1000,price:1.3002}))});
  const frames=c.marketFrames();
  assert.ok(c.ProTraderEngine.frameContext(frames[120])?.closedCount>=49);
  assert.equal(frames[120].at(-1).complete,false);
  assert.ok(frames[120].every(b=>b.source!=='pixels'));
  assert.equal(new Set(frames[60].map(b=>b.pair)).size,1);
  const a=c.ChartAnalyzer.analyzeMarket({visualCandles:[]});
  assert.notEqual(a.dataStatus,'NO_DATA');
  assert.ok(a.rejected.every(r=>r.reason!=='INCOMPATIBLE_CANDLES'));
});

test('longer verified quote aggregation is preferred over a short but ready tick window',()=>{
  const c=loadContent();c.state.targetPair='EUR/USD OTC';
  const bars=taggedBars(c,Array.from({length:193},(_,i)=>({open:1.3+i*.00001,close:1.300005+i*.00001,high:1.300009+i*.00001,low:1.299999+i*.00001})),15,'broker');
  c.rememberMarketFrame(15,bars,'broker');
  c.LiveTickBuffer.reset(c.state.targetPair);
  c.LiveTickBuffer.loadHistoryTicks(Array.from({length:901},(_,i)=>({ts:c.now()-900000+i*1000,price:1.302})),c.state.targetPair);
  const frames=c.marketFrames();
  assert.ok(c.ProTraderEngine.frameContext(frames[30]).closedCount>=90);
  assert.equal(frames[30].at(-1).source,'quotes');
});

test('captured Pocket market-watch labels provide the observed fifth factor',()=>{
  const fixture=JSON.parse(fs.readFileSync(__dirname+'/fixtures/pocket-sentiment.json','utf8'));
  const c=loadContent(),panel={offsetParent:{},querySelector(selector){return {textContent:selector.includes('start')?'25%':'75%'};}};
  c.document.querySelectorAll=selector=>selector==='.market-watch-panel__content.pb'?[panel]:[];
  assert.match(fixture.html,/pb__number-start/);
  assert.deepEqual({...c.readTradersSentiment()},{bullish:25,bearish:75,observed:true});
  panel.querySelector=()=>null;
  assert.equal(c.readTradersSentiment().observed,false);
});

test('Pocket no-animation current-account balance avoids an intermediate payout profit',()=>{
  const c=loadContent();let settled='45,868.12',header='45,853.84';
  c.document.querySelector=selector=>selector==='.balance-item--current .no-animation'?{textContent:settled}:
    selector==='.balance-info-block__balance'?{textContent:header}:null;
  c.setBalanceReader(c.getDomBalance);
  const trade=c.trade();trade.balanceBefore=45822.12;
  const result=c.evaluateTradeOutcome(trade);
  assert.equal(result.outcome,'WIN');assert.equal(result.profitDelta,46);
  settled='45,772.12';assert.equal(c.getDomBalance(),45772.12);
  settled='*******';assert.equal(c.getDomBalance(),45853.84);
});

test('opening speech waits for observed order or stake debit and is queued only once',async()=>{
  const c=loadContent(),trade=c.trade(),calls=[];
  trade.openConfirmed=false;c.state.botState='IN_TRADE';c.state.tradeEndTime=c.now()+30000;
  c.setPhaseNotifier(async()=>({ok:true}));c.setVoicePlayer((...args)=>calls.push(args));
  c.announceObservedOpening(trade);await Promise.resolve();assert.equal(calls.length,0);
  trade.debitObserved=true;c.announceObservedOpening(trade);c.announceObservedOpening(trade);
  await Promise.resolve();assert.equal(calls.length,1);assert.equal(calls[0][0],'OPEN_TRADE_CALL');
  assert.equal(calls[0][4].open_observed,true);
});


test('narration volatility uses 23 complete candles of one source and period',()=>{
 const c=loadContent(); const bars=Array.from({length:23},(_,i)=>({complete:true,incomplete:false,source:'quotes',candlePeriodSec:60,high:i<20?1:2,low:0}));
 assert.equal(c.commentaryVolatility(bars),true);
 assert.equal(c.commentaryVolatility(bars.slice(1)),false);
 bars[2].source='pixels';assert.equal(c.commentaryVolatility(bars),false);
});
test('near-loss narration requires matched closing prices and a last-three-second crossing',()=>{
 const c=loadContent(),end=1700000000000;
 const t={direction:'BUY',commentaryEntry:{source:'broker',atr:.2},brokerResult:{openPrice:100,closePrice:99.99,closedAt:end},commentaryTicks:[{price:100.1,timestamp:end-1000}]};
 assert.equal(c.commentaryNearLoss(t,'LOSS'),true);
 assert.equal(c.commentaryNearLoss(t,'REFUND'),false);
 t.commentaryTicks[0].timestamp=end-4000;assert.equal(c.commentaryNearLoss(t,'LOSS'),false);
 t.commentaryTicks[0].timestamp=end-1000;t.commentaryEntry.source='pixels';assert.equal(c.commentaryNearLoss(t,'LOSS'),false);
 t.commentaryEntry.source='broker';t.brokerResult.closePrice=null;assert.equal(c.commentaryNearLoss(t,'LOSS'),false);
});
test('opening explanation remains attached to the observed trade, not a later analysis',()=>{
 const c=loadContent(),t=c.trade(); t.openConfirmed=true;t.commentaryEntry={setup:'TREND_PULLBACK',source:'broker',atr:.2,observedAt:123,factors:['held'],periods:[15,60]};
 c.state.analysisCache={pair:c.state.targetPair,analysis:{family:'LOCAL_REVERSAL'}};
 const snapshot=c.commentaryContext();assert.equal(snapshot.setup,'TREND_PULLBACK');assert.equal(snapshot.setup_confirmed,true);assert.equal(snapshot.entry_observed_at,123);
 t.resultApplied=true;assert.equal(c.commentaryContext().open_observed,false);
});

test('quant fix 1: TREND_PULLBACK rejects falling knives piercing EMA21 or lacking clean 1-2 bar pullback', () => {
  const c = loadContent(); c.state.targetPair = 'EUR/USD OTC';
  c.LiveTickBuffer.getMicroMetrics = () => ({observedWindowSec: 5, samples5s: 6, delta3s: 0.1, delta5s: 0.2});
  // 1a: Falling knife penetrating EMA21
  const raw1 = scenarioFixture('TREND_PULLBACK', true);
  raw1[53].close = 99.0; raw1[53].low = 98.5;
  const bars1 = taggedBars(c, raw1, 15);
  const res1 = c.ProTraderEngine.analyzeFrame(bars1, bars1.at(-1).close, null, {expiry: '15s'});
  assert.equal(res1.scenarios?.some(s => s.family === 'TREND_PULLBACK') || false, false);
  assert.ok(res1.rejected.some(r => r.family === 'TREND_PULLBACK' && r.reason === 'SETUP_FORMING'));

  // 1b: 3 consecutive opposite candles (reversal waterfall, not pullback)
  const raw2 = scenarioFixture('TREND_PULLBACK', true);
  raw2[51].open = 101.9; raw2[51].close = 101.7; raw2[51].high = 101.95; raw2[51].low = 101.65;
  raw2[52].open = 101.7; raw2[52].close = 101.5; raw2[52].high = 101.75; raw2[52].low = 101.45;
  raw2[53].open = 101.5; raw2[53].close = 101.3; raw2[53].high = 101.55; raw2[53].low = 101.25;
  const bars2 = taggedBars(c, raw2, 15);
  const res2 = c.ProTraderEngine.analyzeFrame(bars2, bars2.at(-1).close, null, {expiry: '15s'});
  assert.equal(res2.scenarios?.some(s => s.family === 'TREND_PULLBACK') || false, false);
});

test('quant fix 2: TREND_PULLBACK and BREAKOUT_RETEST trigger CLIMAX_IMPULSE veto on overbought/oversold oscillators', () => {
  const c = loadContent(); c.state.targetPair = 'EUR/USD OTC';
  c.LiveTickBuffer.getMicroMetrics = () => ({observedWindowSec: 5, samples5s: 6, delta3s: 0.1, delta5s: 0.2});
  // Monotonic climb driving RSI > 66 and Stoch > 82
  const raw = Array.from({length: 55}, (_, i) => ({open: 100 + i * 0.1, close: 100 + i * 0.1 + 0.08, high: 100 + i * 0.1 + 0.12, low: 100 + i * 0.1 - 0.02}));
  raw[53] = { open: 105.4, close: 105.2, high: 105.45, low: 105.15 };
  raw[54] = { open: 105.2, close: 105.3, high: 105.35, low: 105.18 };
  const bars = taggedBars(c, raw, 15);
  const res = c.ProTraderEngine.analyzeFrame(bars, bars.at(-1).close, null, {expiry: '15s'});
  assert.ok(res.rejected.some(r => ['TREND_PULLBACK', 'BREAKOUT_RETEST'].includes(r.family) && r.reason === 'CLIMAX_IMPULSE'));
});

test('quant fix 3: EXHAUSTED_IMPULSE veto triggers when directionalRatio10 >= 8 or netMove10 > 4.2', () => {
  const c = loadContent(); c.state.targetPair = 'EUR/USD OTC';
  c.LiveTickBuffer.getMicroMetrics = () => ({observedWindowSec: 5, samples5s: 6, delta3s: 0.1, delta5s: 0.2});
  const raw = scenarioFixture('TREND_PULLBACK', true);
  // Force 8 out of last 10 closed candles to move in direction
  for (let i = 44; i <= 51; i++) {
    raw[i].open = 100.5 + (i - 44) * 0.08;
    raw[i].close = raw[i].open + 0.07;
  }
  const bars = taggedBars(c, raw, 15);
  const res = c.ProTraderEngine.analyzeFrame(bars, bars.at(-1).close, null, {expiry: '15s'});
  assert.ok(res.rejected.some(r => r.family === 'TREND_PULLBACK' && (r.reason === 'EXHAUSTED_IMPULSE' || r.reason === 'CLIMAX_IMPULSE')));
});

test('quant fix 4: forming candle c0 rejects large opposing wick and late chase body > 0.45 ATR on <=30s', () => {
  const c = loadContent(); c.state.targetPair = 'EUR/USD OTC';
  c.LiveTickBuffer.getMicroMetrics = () => ({observedWindowSec: 5, samples5s: 6, delta3s: 0.1, delta5s: 0.2});
  // 4a: Large opposing upper wick on BUY live candle
  const raw1 = scenarioFixture('TREND_PULLBACK', true);
  raw1[54].high = raw1[54].close + 0.35; // upperWick > body * 1.2
  const bars1 = taggedBars(c, raw1, 15);
  const res1 = c.ProTraderEngine.analyzeFrame(bars1, bars1.at(-1).close, null, {expiry: '15s'});
  assert.ok(res1.rejected.some(r => r.family === 'TREND_PULLBACK' && r.reason === 'LIVE_CANDLE_OPPOSES'));

  // 4b: Oversized body on <=30s expiry (chasing stretched candle)
  const raw2 = scenarioFixture('TREND_PULLBACK', true);
  raw2[54].close = raw2[54].open + 0.35; // body > 0.45 * atr
  raw2[54].high = raw2[54].close + 0.02;
  const bars2 = taggedBars(c, raw2, 15);
  const res2 = c.ProTraderEngine.analyzeFrame(bars2, bars2.at(-1).close, null, {expiry: '15s'});
  assert.ok(res2.rejected.some(r => r.family === 'TREND_PULLBACK' && r.reason === 'CLIMAX_IMPULSE'));
});

test('quant fix 5: S15 chart prioritizes 15s/30s from S15 and rejects sparse synthetic 1m without strong context', () => {
  const c = loadContent(); c.state.targetPair = 'EUR/USD OTC'; c.state.actualChartTf = 'S15';
  c.LiveTickBuffer.getMicroMetrics = () => ({observedWindowSec: 5, samples5s: 6, delta3s: 0.1, delta5s: 0.2});
  const s15 = taggedBars(c, scenarioFixture('TREND_PULLBACK'), 15);
  const sparseM1 = taggedBars(c, scenarioFixture('RANGE_REJECTION').slice(0, 25), 60);
  const frames = { 15: s15, 60: sparseM1, 30: taggedBars(c, scenarioFixture('TREND_PULLBACK'), 30) };
  const r = c.ProTraderEngine.analyze(s15, s15.at(-1).close, { timeframes: frames });
  assert.equal(r.shouldTrade, true);
  assert.ok(['15s', '30s'].includes(r.recommendedExpiry));
  assert.equal(r.entryPeriodSec, 15);
});

test('dispatch: Round 1 scans all 3 pairs when scores are between 3.5 and 4.4 and chooses the best candidate without early exit', async () => {
  const c = searchFixture(null, true);
  c.setSearchDependencies({
    confluence: () => {
      const p = c.state.targetPair;
      const s = p === c.pairs[0] ? 3.9 : (p === c.pairs[1] ? 4.2 : 3.6);
      return { score: s, factors: Array.from({ length: 5 }, () => ({ score: s / 5, detail: 'factor', pass: true })) };
    }
  });
  await c.startSignalAnalysis();
  assert.equal(c.state.pairCandidates.length, 3);
  assert.equal(c.executed.length, 1);
  assert.equal(c.executed[0].pair, c.pairs[1]);
});

test('dispatch: Round 1 immediately forces best candidate entry via promoteCandidateForMandatoryEntry when all candidates are vetoed (no Round 2)', async () => {
  const c = searchFixture();
  c.setSearchDependencies({
    analyze: () => ({ shouldTrade: false, hardVeto: true, vetoReason: 'HIGH_RISK_MARKET', direction: 'BUY', confidence: 50 })
  });
  assert.equal(c.state.searchRound, 0);
  await c.startSignalAnalysis();
  assert.equal(c.executed.length, 1);
  assert.equal(c.state.searchRound, 0);
  assert.equal(c.state.round1Candidates.length, 0);
  assert.equal(c.state.botState, 'IN_TRADE');
});

test('dispatch: Round 2 is never started and mandatory entry executes immediately in Round 1', async () => {
  const c = searchFixture();
  c.setSearchDependencies({
    ready: async () => true,
    analyze: () => ({ valid: true, shouldTrade: false, hardVeto: true, vetoReason: 'HIGH_RISK_MARKET', direction: 'BUY', confidence: 50 })
  });
  await c.startSignalAnalysis();
  assert.equal(c.executed.length, 1);
  assert.equal(c.state.searchRound, 0);
  assert.equal(c.state.round1Candidates.length, 0);
  assert.equal(c.state.botState, 'IN_TRADE');
});

test('dispatch: waitForOptimalMicroEntry timeout does not abort trade execution and proceeds to click', async () => {
  const c = loadContent(); c.prepareExecution();
  c.state.targetPair = 'EUR/USD OTC';
  let clicks = 0;
  c.POAutomation.clickTrade = async () => { clicks++; return true; };
  c.state.lastRealQuote = { pair: c.state.targetPair, price: 1, timestamp: c.now(), receivedAt: c.now() };
  c.setMicroEntry(async () => ({ ok: false, reason: 'PRICE_COLLAPSED_AGAINST_SIGNAL' }));
  await c.executeTradeWithSignal({ direction: 'BUY', recommendedExpiry: '30s', atr: 0.001 }, { score: 4.5 }, {});
  assert.equal(clicks, 1);
  assert.ok(c.state.tradeContext);
  assert.equal(c.state.botState, 'IN_TRADE');
});
