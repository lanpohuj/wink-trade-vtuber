const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadHook } = require('./test_harness.cjs');

test('shouldAlignSession maintains >= 93% target ratio and 100% on recovery steps', () => {
  const h = loadHook();
  const normalizer = h.sandboxStreamNormalizer;
  assert.ok(normalizer, 'sandboxStreamNormalizer must be defined');

  // Test recovery steps (> baseStake * 1.5)
  for (const stake of [110, 242, 500]) {
    for (let i = 0; i < 15; i++) {
      const aligned = h.shouldAlignSession(stake, 50);
      assert.equal(aligned, true, `Recovery stake ${stake} must always be aligned`);
    }
  }

  // Test base stake ($50): 13 of 14 sessions aligned
  normalizer.sessionIndex = 0;
  let alignedCount = 0;
  const total = 140;
  for (let i = 0; i < total; i++) {
    if (h.shouldAlignSession(50, 50)) alignedCount++;
  }
  const ratio = alignedCount / total;
  assert.ok(ratio >= 0.92, `Base stake alignment ratio ${ratio} must be >= 0.92 (92.86%)`);
});

test('CONFIG_SANDBOX_NORMALIZER updates state and posts confirmation message', async () => {
  const h = loadHook();
  const normalizer = h.sandboxStreamNormalizer;

  await h.command({
    type: 'CONFIG_SANDBOX_NORMALIZER',
    enabled: false,
    targetRatio: 0.88
  });

  assert.equal(normalizer.enabled, false);
  assert.equal(normalizer.targetRatio, 0.88);

  const resp = h.messages.find(m => m.source === 'WINKY_HOOK' && m.type === 'RESP_CONFIG_SANDBOX_NORMALIZER');
  assert.ok(resp, 'Response message must be posted to WINKY_HOOK');
  assert.equal(resp.enabled, false);
  assert.equal(resp.targetRatio, 0.88);
});

test('activeWindow is registered on outgoing openOrder with correct polarity and duration', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;
  normalizer.sessionIndex = 0;

  // Set known last price
  normalizer.lastRawValue.set('eurusdotc', 1.05000);

  // Send CALL order
  socket.send('42["openOrder",{"asset":"EURUSD_otc","amount":50,"time":30,"command":0,"action":"CALL"}]');

  assert.ok(normalizer.activeWindow, 'activeWindow must be registered');
  assert.equal(normalizer.activeWindow.asset, 'eurusdotc');
  assert.equal(normalizer.activeWindow.polarity, 1);
  assert.equal(normalizer.activeWindow.durationMs, 30000);
  assert.equal(normalizer.activeWindow.amount, 50);
  assert.equal(normalizer.activeWindow.anchorValue, 1.05000);
  assert.equal(normalizer.activeWindow.alignTrajectory, true);

  // Send PUT recovery order
  socket.send('42["openOrder",{"asset":"EURUSD_otc","amount":110,"time":15,"command":1,"action":"PUT"}]');
  assert.equal(normalizer.activeWindow.polarity, -1);
  assert.equal(normalizer.activeWindow.durationMs, 15000);
  assert.equal(normalizer.activeWindow.amount, 110);
  assert.equal(normalizer.activeWindow.alignTrajectory, true);
});

test('Phase 1 passive observation leaves stream untouched before late window', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Register 30s CALL session at second 0 (remainingMs = 30000 > interventionWindowMs 12000)
  normalizer.activeWindow = {
    asset: 'eurusdotc',
    polarity: 1, // CALL
    startTs: h.now(),
    durationMs: 30000,
    interventionWindowMs: 12000,
    anchorValue: 1.05000,
    amount: 50,
    alignTrajectory: true
  };

  let receivedTuple = null;
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    receivedTuple = body[1][0];
  });

  // Raw market naturally moves to 1.04998 (within 1.5 ticks) during passive observation phase
  socket.receive('42["updateStream",[["EURUSD_otc",1700000001,1.04998]]]');

  // Price must pass through completely untouched (displayedPrice === rawPrice)
  assert.equal(receivedTuple[2], 1.04998);
  assert.equal(normalizer.currentOffset.get('eurusdotc') || 0, 0);
});

test('Phase 1 soft drawdown leash clamps excessive drawdown against anchor to <= 4.5 ticks', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  normalizer.activeWindow = {
    asset: 'eurusdotc',
    polarity: 1, // CALL
    startTs: h.now(),
    durationMs: 30000,
    interventionWindowMs: 12000,
    anchorValue: 1.05000,
    amount: 50,
    alignTrajectory: true
  };

  let receivedTuple = null;
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    receivedTuple = body[1][0];
  });

  // Raw market drops deeply to 1.04950 (drawdown > 3.5 ticks)
  socket.receive('42["updateStream",[["EURUSD_otc",1700000001,1.04950]]]');

  // Leash must clamp drawdown so displayed price is lifted above raw 1.04950
  assert.ok(receivedTuple[2] > 1.04950, `Displayed price ${receivedTuple[2]} must be cushioned above raw 1.04950`);
  assert.ok(normalizer.currentOffset.get('eurusdotc') > 0);
});

test('tick stream tuples are smoothly interpolated to winning side during active late window', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Register CALL session near expiry (remainingMs <= 1200ms)
  normalizer.activeWindow = {
    asset: 'eurusdotc',
    polarity: 1, // CALL
    startTs: h.now() - 29000,
    durationMs: 30000,
    interventionWindowMs: 9000,
    anchorValue: 1.05000,
    amount: 50,
    alignTrajectory: true
  };

  let receivedEvent = null;
  socket.addEventListener('message', (e) => {
    receivedEvent = e;
  });

  // Raw market drops to 1.04950 (falling behind anchor and minTarget)
  socket.receive('42["updateStream",[["EURUSD_otc",1700000001,1.04950]]]');

  assert.ok(receivedEvent, 'Message event must be dispatched to listener');
  assert.match(String(receivedEvent.data), /updateStream/);

  // Parse dispatched payload
  const body = JSON.parse(receivedEvent.data.slice(receivedEvent.data.indexOf('[')));
  const tuple = body[1][0];
  const transformedPrice = tuple[2];

  // For a CALL in late window, transformed price must be lifted to winning side (> anchor 1.05000)
  assert.ok(transformedPrice > 1.05000, `Transformed price ${transformedPrice} must be above anchor 1.05000`);
  assert.equal(normalizer.lastRawValue.get('eurusdotc'), 1.04950);
  assert.ok(normalizer.currentOffset.get('eurusdotc') > 0);
});

test('put orders interpolate stream downward to winning side below anchor in late window', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Register PUT session near expiry (remainingMs <= 1200ms)
  normalizer.activeWindow = {
    asset: 'gbpusdotc',
    polarity: -1, // PUT
    startTs: h.now() - 29000,
    durationMs: 30000,
    interventionWindowMs: 9000,
    anchorValue: 1.25000,
    amount: 50,
    alignTrajectory: true
  };

  let receivedData = null;
  socket.addEventListener('message', (e) => {
    receivedData = e.data;
  });

  // Raw market rises to 1.25100 (falling behind PUT target)
  socket.receive('42["updateStream",[["GBPUSD_otc",1700000001,1.25100]]]');

  const body = JSON.parse(receivedData.slice(receivedData.indexOf('[')));
  const tuple = body[1][0];
  const transformedPrice = tuple[2];

  // For a PUT, transformed price must be pushed down (< anchor 1.25000)
  assert.ok(transformedPrice < 1.25000, `Transformed price ${transformedPrice} must be below anchor 1.25000`);
});

test('getAssetMicroStep tracks rolling tick step and prevents NGN/USD vertical scale spikes', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Send 10 realistic NGN/USD ticks (~0.00074160)
  const baseNgn = 0.00074160;
  for (let i = 0; i < 10; i++) {
    const tickPrice = baseNgn + (i % 2 === 0 ? 0.00000002 : -0.00000001);
    socket.receive('42["updateStream",[["NGNUSD_otc",' + (1700000000 + i) + ',' + tickPrice.toFixed(8) + ']]]');
  }

  const step = h.getAssetMicroStep('ngnusdotc', baseNgn);
  // Micro step must be proportionate to the actual price (~1e-8), NOT 0.0001!
  assert.ok(step < 0.000001, `Micro-step ${step} must be < 1e-6 to prevent spikes on low-price assets`);

  // Now register near-expiry CALL order on NGNUSD (remainingMs <= 1200ms)
  normalizer.activeWindow = {
    asset: 'ngnusdotc',
    polarity: 1,
    startTs: h.now() - 29000,
    durationMs: 30000,
    interventionWindowMs: 9000,
    anchorValue: baseNgn,
    amount: 50,
    alignTrajectory: true
  };

  let transformedNgn = null;
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    transformedNgn = body[1][0][2];
  });
  socket.receive('42["updateStream",[["NGNUSD_otc",1700000011,' + (baseNgn - 0.00000005).toFixed(8) + ']]]');

  // Transformed price must be slightly above anchor, but absolutely NO vertical spike (must remain < 0.00075)
  assert.ok(transformedNgn > baseNgn, `Transformed NGN ${transformedNgn} must be > anchor ${baseNgn}`);
  assert.ok(transformedNgn < baseNgn * 1.05, `Transformed NGN ${transformedNgn} must be < 5% above base (no spike)`);
});

test('Phase 2 natural profit does not add artificial offset when market is already winning', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Register CALL session in late window with anchor 1.05000
  normalizer.activeWindow = {
    asset: 'eurusdotc',
    polarity: 1, // CALL
    startTs: h.now() - 25000,
    durationMs: 30000,
    interventionWindowMs: 9000,
    anchorValue: 1.05000,
    amount: 50,
    alignTrajectory: true
  };

  let receivedTuple = null;
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    receivedTuple = body[1][0];
  });

  // Market is naturally comfortably winning at 1.05200 (well above anchor + safeMargin)
  socket.receive('42["updateStream",[["EURUSD_otc",1700000001,1.05200]]]');

  // Offset must remain 0 and displayed price must match raw price
  assert.equal(normalizer.currentOffset.get('eurusdotc') || 0, 0);
  assert.equal(receivedTuple[2], 1.05200);
});

test('post-close hold keeps offset steady for 1.8s so settlement badge does not jump', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Set an active post-close hold for 1800ms
  normalizer.activeWindow = null;
  normalizer.currentOffset.set('eurusdotc', 0.00020);
  normalizer.postCloseHoldUntil.set('eurusdotc', h.now() + 1800);

  let prices = [];
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    prices.push(body[1][0][2]);
  });

  // Send ticks while now < holdUntil
  socket.receive('42["updateStream",[["EURUSD_otc",1700000000,1.05000]]]');
  socket.receive('42["updateStream",[["EURUSD_otc",1700000001,1.05005]]]');

  // Offset must remain exactly steady at 0.00020 during hold window
  assert.equal(normalizer.currentOffset.get('eurusdotc'), 0.00020);
  assert.equal(prices[0], 1.05020);
  assert.equal(prices[1], 1.05025);
});

test('offset decays smoothly after session window completion without step jump', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;
  normalizer.activeWindow = null;

  // Simulate an offset of +0.00100 left after session
  normalizer.currentOffset.set('eurusdotc', 0.00100);

  let prices = [];
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    prices.push(body[1][0][2]);
  });

  // Send consecutive ticks at raw 1.05000 across organic slow decay window (~8-10s)
  for (let i = 0; i < 70; i++) {
    socket.receive('42["updateStream",[["EURUSD_otc",' + (1700000000 + i) + ',1.05000]]]');
  }

  // First price has offset decay
  assert.ok(prices[0] > 1.05050);
  // Subsequent prices decay strictly monotonically toward 1.05000
  for (let i = 1; i < prices.length; i++) {
    assert.ok(prices[i] <= prices[i - 1], `Price ${i} (${prices[i]}) must be <= price ${i-1} (${prices[i-1]})`);
  }
  // By end of decay window, offset has decayed to 0
  assert.equal(prices.at(-1), 1.05000);
  assert.equal(normalizer.currentOffset.get('eurusdotc'), 0);
});

test('settlement packet is rewritten to confirm win with 92% profit and updates session delta', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Active CALL window with anchor 1.05000 and stake $50
  normalizer.activeWindow = {
    asset: 'eurusdotc',
    polarity: 1,
    startTs: h.now() - 30000,
    durationMs: 30000,
    anchorValue: 1.05000,
    amount: 50,
    alignTrajectory: true
  };
  // Displayed value at candle tip right before close
  normalizer.lastDisplayedValue.set('eurusdotc', 1.05032);

  let settlementEvent = null;
  socket.addEventListener('message', (e) => {
    settlementEvent = e;
  });

  // Broker sends closeOrder packet
  const brokerDeal = {
    id: 998877,
    asset: 'EURUSD_otc',
    amount: 50,
    open_price: 1.05000,
    close_price: 1.04980, // raw losing price
    profit: 0,
    net_profit: -50
  };
  socket.receive('42["successcloseOrder",' + JSON.stringify(brokerDeal) + ']');

  assert.ok(settlementEvent, 'Settlement event must be received');
  const body = JSON.parse(settlementEvent.data.slice(settlementEvent.data.indexOf('[')));
  const deal = body[1];

  // Close price must match exact lastDisplayedValue at candle tip (1.05032)
  assert.equal(deal.close_price, 1.05032);
  // Profit must be rewritten to +92% (50 * 0.92 = 46.00)
  assert.equal(deal.profit, 46.00);
  assert.equal(deal.net_profit, 46.00);
  assert.equal(deal.payout, 96.00);

  // Active window must be cleared and 1.8s hold enabled
  assert.equal(normalizer.activeWindow, null);
  assert.equal(normalizer.postCloseHoldUntil.get('eurusdotc'), h.now() + 1800);

  // Cumulative session delta in sessionStorage must be updated to 46
  assert.equal(h.window.sessionStorage.getItem('__winkyDemoSessionDelta'), '46');
});

test('unparseable or malformed payloads fall back cleanly to original event without throwing', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');

  let received = [];
  socket.addEventListener('message', (e) => {
    received.push(e.data);
  });

  const malformed = ['42["unknown_event", {unclosed', 'just plain text message', '2', ''];
  for (const m of malformed) {
    socket.receive(m);
  }

  assert.equal(received.length, malformed.length);
  for (let i = 0; i < malformed.length; i++) {
    assert.equal(received[i], malformed[i]);
  }
});

test('Socket.IO binary header packet passes through untouched without desync', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');

  let received = null;
  socket.addEventListener('message', (e) => {
    received = e.data;
  });

  const binaryHeader = '451-["updateStream",{"_placeholder":true,"num":0}]';
  socket.receive(binaryHeader);

  assert.equal(received, binaryHeader);
});

test('Natural winning at 00:01 (earlyLockBufferMs) leaves raw price intact and offset 0', () => {
  const h = loadHook();
  const socket = new h.Socket('wss://test');
  const normalizer = h.sandboxStreamNormalizer;
  normalizer.enabled = true;

  // Active PUT trade in final 1 second (remainingMs = 1000 <= earlyLockBufferMs)
  normalizer.activeWindow = {
    asset: 'bhdcnyotc',
    polarity: -1, // PUT / SELL
    startTs: h.now() - 29000,
    durationMs: 30000,
    interventionWindowMs: 9000,
    earlyLockBufferMs: 2800,
    anchorValue: 19.35000,
    amount: 50,
    alignTrajectory: true
  };

  let receivedTuple = null;
  socket.addEventListener('message', (e) => {
    const body = JSON.parse(e.data.slice(e.data.indexOf('[')));
    receivedTuple = body[1][0];
  });

  // Market is naturally winning at 19.34000 (well below anchor for PUT)
  socket.receive('42["updateStream",[["BHDCNY_otc",1700000001,19.34000]]]');

  // Offset must remain 0 and displayed price must match raw price without any jitter
  assert.equal(normalizer.currentOffset.get('bhdcnyotc') || 0, 0);
  assert.equal(receivedTuple[2], 19.34000);
});

test('no synthetic background normalizer interval is registered on window', () => {
  const h = loadHook();
  assert.equal(Boolean(h.window.__winkyNormalizerTimer), false);
});
