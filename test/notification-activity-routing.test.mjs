import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';

after(() => shutdownLogger());
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const state = globalThis.__activityRouting = { subscription: null, candidates: [], reads: 0, sent: [], receipts: [], states: {}, failures: {}, unavailable: [] };
const bundle = await build({ entryPoints: ['src/notification/service.ts'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name: 'routing-seams', setup(b) {
  b.onResolve({ filter: /^axios$/ }, () => ({ path: pathToFileURL(resolve('node_modules/axios/index.js')).href, external: true }));
  b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
  b.onResolve({ filter: /(^@src\/api\/bot\/notification-(cache|relay)$|^\.\/channel$)/ }, a => ({ path: a.path, namespace: 'seam' }));
  b.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
    const s=globalThis.__activityRouting;
    export const getNotificationSubscriptionTarget=async()=>s.subscription;
    export const recordNotificationSubscriptionDelivery=async(...args)=>s.receipts.push(args);
    export const readPlatformGroupCandidates=async()=>{s.reads++;return s.candidates};
    export const readPlatformAvailability=async(t)=>s.unavailable.includes(t.targetId)?{available:false,updatedAt:100}:null;
    export const readPlatformDeliveryReceipt=async()=>null;
    export const storePlatformDeliveryReceipt=async()=>{};
    export const getNotificationPrivateTarget=async()=>s.privateTarget??null;
    export const refreshNotificationPermission=async(t)=>s.states[t.targetId]??null;
    export const notificationChannel={
      read:async(t)=>s.states[t.targetId]??null,
      refreshAfterFailure:async(t)=>s.failures[t.targetId]?{state:'blocked',source:'query',updatedAt:100}:null,
      recordFailure:async()=>{},
      send:async(t)=>{s.sent.push(t.targetId);if(s.failures[t.targetId])throw new Error('explicit refusal')}
    };
  ` }));
} }] });
const { deliverPlayerNotification } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const activity = id => ({ target: { platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: id }, occurredAt: 100 });
const reset = () => Object.assign(state, { subscription: null, candidates: ['first','second','third'].map(activity), reads: 0, sent: [], receipts: [], states: {}, failures: {}, unavailable: [], privateTarget: null });

test('three activity candidates skip blocked/departed groups and stop after first success', async () => {
  process.env.login = 'qq-bot';
  reset();
  state.subscription = { platform: 'qq-bot', botId: 'bot', targetScope: 'group', channelId: 'first', isEnabled: true };
  state.states.first = { state: 'blocked', source: 'event', updatedAt: 100 };
  state.unavailable = ['second'];
  assert.equal((await deliverPlayerNotification(1, 'player', [], true)).route, 'group');
  assert.deepEqual(state.sent, ['third']);
});

test('selected group precedes fallback; a confirmed permission refusal switches immediately', async () => {
  reset();
  state.subscription = { platform: 'qq-bot', botId: 'bot', targetScope: 'group', channelId: 'selected', isEnabled: true };
  await deliverPlayerNotification(1, 'player', [], true);
  assert.deepEqual(state.sent, ['selected']);
  assert.equal(state.reads, 0, 'successful selected group needs no candidate API');
  state.sent = [];
  state.failures = { selected: true, first: true };
  state.candidates.unshift(activity('selected'));
  await deliverPlayerNotification(1, 'player', [], true);
  assert.deepEqual(state.sent, ['selected', 'first', 'second']);
  assert.equal(state.receipts.length, 2, 'only selected-group sends affect subscription diagnostics');
});

test('explicit disable and global disable never activate activity fallback', async () => {
  reset();
  state.subscription = { platform: 'qq-bot', botId: 'bot', targetScope: 'group', channelId: 'selected', isEnabled: false };
  assert.equal((await deliverPlayerNotification(1, 'player', [], true)).route, 'history');
  assert.equal(state.reads, 0);
  assert.deepEqual(state.sent, []);
  state.subscription = null;
  assert.equal((await deliverPlayerNotification(1, 'player', [], false)).reason, 'proactive_disabled');
  assert.equal(state.reads, 0);
});

for (const subscribed of [null, false]) {
  test(`群订阅状态 ${subscribed} 即使存在可用群也不读取或发送候选群`, async () => {
    reset();
    if (subscribed === false) state.subscription = { platform: 'qq-bot', botId: 'bot', targetScope: 'group', channelId: 'selected', isEnabled: false };
    assert.equal((await deliverPlayerNotification(1, 'player', [], true)).route, 'history');
    assert.equal(state.reads, 0);
    assert.deepEqual(state.sent, []);
    assert.deepEqual(state.receipts, []);
    state.privateTarget = { platform: 'qq-bot', scope: 'c2c', targetId: 'private-player', BotId: 'bot' };
    assert.equal((await deliverPlayerNotification(1, 'player', [], true)).route, 'private');
    assert.equal(state.reads, 0);
    assert.deepEqual(state.sent, ['private-player']);
    assert.deepEqual(state.receipts, []);
  });
}

test('仅私聊通知即使开启群订阅也不读取候选群', async () => {
  reset();
  state.subscription = { platform: 'qq-bot', botId: 'bot', targetScope: 'group', channelId: 'selected', isEnabled: true };
  state.privateTarget = { platform: 'qq-bot', scope: 'c2c', targetId: 'private-player', BotId: 'bot' };
  assert.equal((await deliverPlayerNotification(1, 'player', [], true, { privateOnly: true })).route, 'private');
  assert.equal(state.reads, 0);
  assert.deepEqual(state.sent, ['private-player']);
});
