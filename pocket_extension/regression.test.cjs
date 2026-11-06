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
      rankPairCandidate, bestPairCandidate, canEnterAnalysis,
      setBalanceReader(fn) { getPocketBalance = fn; },
      setRowsReader(fn) { pocketDealRows = fn; },
      setClickBridge(fn) { requestMainWorldClickTrade = fn; },
      setDirectClick(fn) { clickPocketTradeButton = fn; },
      prepareExecution() {
        requestMainWorldSetExpiry = async () => ({ok:true,confirmed:true,observedSec:30});
        waitForOptimalMicroEntry = async () => ({ok:true});
      },
      setSearchDependencies(deps) {
        requestMainWorldEnsureChartTimeframe = async () => ({activeTf:'S15',ok:true});
        waitPocketPairReady = async () => true;
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
test('deducted balance and missing broker result remain PENDING', () => {
  const c=loadContent(); c.trade(); c.setBalance(950);
  assert.equal(c.evaluateTradeOutcome().outcome,'PENDING');
  c.tick(30000); assert.equal(c.evaluateTradeOutcome().outcome,'PENDING');
  assert.equal(c.state.recoveryStep,0);
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
test('known M1 visual fallback starts immediately, unknown period is not S15', () => {
  const c=loadContent();const bars=Array.from({length:30},(_,i)=>({open:100+i,close:100.5+i,high:101+i,low:99+i,isGreen:true,isRed:false,body:.5,bodySize:.5,totalRange:2}));
  c.state.actualChartTf='M1';const known=c.ChartAnalyzer.analyzeMarket({visualCandles:bars});
  assert.notEqual(known.vetoReason,'NOT_ENOUGH_CANDLES');
  c.state.actualChartTf=null;c.state.candles=[];
  assert.equal(c.ChartAnalyzer.analyzeMarket({visualCandles:bars}).shouldTrade,false);
  assert.equal(c.chartPeriodSeconds('M1'),60);assert.equal(c.chartPeriodSeconds('S15'),15);assert.equal(c.chartPeriodSeconds('15S'),15);
});
function searchFixture(readyPair=null, dominant=false) {
  const c=loadContent(),pairs=['EUR/USD OTC','GBP/USD OTC','AUD/USD OTC','USD/JPY OTC','EUR/JPY OTC'],executed=[],switches=[];
  c.state.targetPair=pairs[0];
  const analysis=()=>({shouldTrade:c.state.targetPair===readyPair || (dominant && c.state.allowDominantEntry && c.state.targetPair===pairs[0]),direction:'BUY',confidence:90,
    setup:'TREND_PULLBACK',trendRegime:'STRONG_UPTREND',rsi:55,sr:{distToRes:2,distToSup:1},line1:'Live setup'});
  c.setSearchDependencies({scan:()=>({visualCandles:[]}),analyze:analysis,sentiment:()=>({observed:true}),
    confluence:()=>({score:4.5,factors:Array.from({length:5},()=>({score:c.state.targetPair===pairs[0]?1:.5,detail:'factor'}))}),
    switchPair:async(target)=>{const next=target||pairs[(pairs.indexOf(c.state.targetPair)+1)%5];switches.push(next);c.state.targetPair=next;return true;},
    execute:async(a)=>executed.push({pair:c.state.targetPair,direction:a.direction})});
  return {...c,pairs,executed,switches};
}
test('a ready setup on first or second pair enters immediately',async()=>{
  for(const index of [0,1]) {
    const c=searchFixture(['EUR/USD OTC','GBP/USD OTC'][index]);
    await c.startSignalAnalysis();assert.equal(c.executed.length,1);assert.equal(c.state.pairCandidates.length,index+1);assert.equal(c.switches.length,index);
  }
});
test('after five distinct pairs search returns to highest ranked and rechecks it',async()=>{
  const c=searchFixture(null,true);await c.startSignalAnalysis();
  assert.equal(c.state.pairCandidates.length,5);assert.equal(new Set(c.state.searchSeen).size,5);
  assert.equal(c.executed.length,1);assert.equal(c.executed[0].pair,c.pairs[0]);assert.equal(c.switches.at(-1),c.pairs[0]);
});
test('hard veto is never overridden while observing best pair',async()=>{
  const c=searchFixture();let watchSamples=0;
  c.setSearchDependencies({analyze:()=>{if(c.state.allowDominantEntry)watchSamples++;return {shouldTrade:true,hardVeto:true,vetoReason:'HIGH_RISK_MARKET',direction:'BUY',confidence:95};}});
  await c.startSignalAnalysis();assert.equal(c.executed.length,0);assert.ok(watchSamples>=40);assert.equal(c.state.botState,'IDLE');
});
test('failed pair switch is not counted as a new chart',async()=>{
  const c=searchFixture();c.setSearchDependencies({switchPair:async()=>false});
  await c.startSignalAnalysis();assert.equal(c.state.pairCandidates.length,1);assert.equal(c.state.searchSeen.length,1);assert.equal(c.executed.length,0);
});
test('ranking excludes missing factors; ties use payout then freshness',()=>{
  const c=loadContent();const a={pair:'A',analysis:{},confluence:{factors:[{score:1}]},payout:90,observedAt:100};
  assert.equal(c.rankPairCandidate(a),0);
  assert.equal(c.bestPairCandidate([a,{...a,pair:'B',payout:92}]).pair,'B');
  assert.equal(c.bestPairCandidate([a,{...a,pair:'B',observedAt:200}]).pair,'B');
});
test('confirmed click failure creates no timer, result or recovery step',async()=>{
  const c=loadContent();c.prepareExecution();c.POAutomation.clickTrade=async()=>false;
  const wins=c.state.scoreWins,losses=c.state.scoreLosses;
  await c.executeTradeWithSignal({direction:'BUY',recommendedExpiry:'30s'},{score:4.5},{});
  assert.equal(c.state.tradeContext,null);assert.equal(c.state.botState,'IDLE');assert.equal(c.state.expiryInterval,null);
  assert.equal(c.state.scoreWins,wins);assert.equal(c.state.scoreLosses,losses);assert.equal(c.state.recoveryStep,0);
});
test('opening, broker countdown, final result and recovery run through existing cycle',async()=>{
  const c=loadContent();c.prepareExecution();c.state.targetPair='EUR/USD OTC';
  c.POAutomation.clickTrade=async()=>{c.emit({type:'BROKER_DEAL_OPEN',requestId:c.state.tradeContext.seq,pair:'EURUSD_otc',stake:50,orderId:'real-1',closesAt:1700000030000});return true;};
  await c.executeTradeWithSignal({direction:'SELL',recommendedExpiry:'30s'},{score:4.5},{});
  assert.equal(c.state.botState,'IN_TRADE');assert.equal(c.state.tradeEndTime,1700000030000);assert.equal(c.state.tradeContext.brokerId,'real-1');
  c.tick(30000);c.emit({type:'BROKER_DEAL_RESULT',orderId:'real-1',net:-50});
  await c.onSignalTimerFinished();assert.equal(c.state.recoveryStep,1);assert.equal(c.state.currentStake,110);assert.equal(c.state.botState,'IDLE');
});
module.exports={loadContent,row};
