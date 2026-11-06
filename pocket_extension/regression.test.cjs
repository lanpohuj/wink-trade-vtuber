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
    setTimeout: fn => { queueMicrotask(fn); return 1; }, clearTimeout() {},
  };
  let source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  source = source.replace('  // Ensure DOM ready', `
    globalThis.testing = { state, getExpectedStake, parsePocketMoney, evaluateTradeOutcome,
      readClosedDealsFirstRow, matchesTradeEvidence, onSignalTimerFinished, aggregateCandles,
      LiveTickBuffer, ProTraderEngine, ChartAnalyzer, POAutomation, startSignalAnalysis,
      setBalanceReader(fn) { getPocketBalance = fn; },
      setRowsReader(fn) { pocketDealRows = fn; },
      setClickBridge(fn) { requestMainWorldClickTrade = fn; },
      setDirectClick(fn) { clickPocketTradeButton = fn; },
      setSearchDependencies(deps) {
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

module.exports={loadContent,row};
