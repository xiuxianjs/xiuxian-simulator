import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeTongtianContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_TONGTIAN_HTTP=(.+)/g)].map(match => JSON.parse(match[1]));
const actions = ['get_tongtian_tower', 'challenge_tongtian_rank', 'batch_challenge_tongtian', 'sweep_tongtian_rank', 'get_tongtian_first_rewards', 'get_tongtian_monthly_rewards', 'claim_tongtian_first_reward', 'claim_all_tongtian_first_rewards', 'claim_tongtian_monthly_reward', 'claim_all_tongtian_monthly_rewards'];
for (const action of actions) test(`${action}: 真实服务端状态与结算回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, current.command);
    assert.deepEqual(body.arguments, current.args);
    assert.equal(body.taskInput, undefined);
    assert.ok([...body.messageText].length <= 80);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let succeeded = 0;
  let refused = 0;
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const originalText = event.MessageText;
    const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    const run = await invoke();
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(event.MessageText, originalText);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = run.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    succeeded++;
    const data = server.data;
    if (action === 'get_tongtian_tower') {
      assert.deepEqual(actual.result, { view: data.view, tianjiaoVisible: data.tianjiaoVisible });
    } else if (action === 'challenge_tongtian_rank') {
      for (const key of ['success', 'message', 'oldRank', 'newRank', 'rankImproved', 'experienceGained', 'baseExperience', 'experienceBonusText', 'reputationGained']) assert.deepEqual(actual.result[key], data[key], key);
      assert.equal(actual.result.battle.winner, data.battle.Winner ?? data.battle.winner);
      assert.equal(actual.result.battle.sideA.length, (data.battle.SideA ?? data.battle.sideA).length);
      assert.equal(actual.result.battle.sideB.length, (data.battle.SideB ?? data.battle.sideB).length);
    } else if (action === 'batch_challenge_tongtian') {
      for (const key of ['startRank', 'finalRank', 'winCount', 'lossCount', 'experienceGained', 'experienceBonusText', 'reputationGained', 'stopReason']) assert.deepEqual(actual.result[key], data[key], key);
      assert.equal(actual.result.rounds.length, data.rounds.length);
      assert.equal(actual.result.winCount + actual.result.lossCount, actual.result.rounds.length);
      assert.equal(actual.result.events.length, data.events.length);
      for (let i = 0; i < data.events.length; i++) for (const key of ['index', 'targetRank', 'outcome', 'message', 'displayText', 'logId', 'needPotion']) assert.deepEqual(actual.result.events[i][key], data.events[i][key], key);
    } else if (action === 'sweep_tongtian_rank') {
      assert.deepEqual(actual.result, data.data);
      assert.equal(actual.result.targetRank, current.input.targetRank);
      assert.equal(actual.result.sweepCount, current.input.count);
    } else if (action.startsWith('get_tongtian_')) {
      const clean = JSON.parse(JSON.stringify(data), (_key, value) => value === null ? undefined : value);
      assert.deepEqual(actual.result, clean);
      if (!data.isOpen || !data.canUseFifthLayerFeature) assert.equal(actual.result.hasClaimableReward, false);
    } else {
      assert.equal(actual.result.outcome, data.outcome);
      assert.deepEqual(actual.result.rewardTexts, data.rewardTexts);
      if (data.ranking !== undefined) assert.equal(actual.result.ranking, data.ranking);
      if (data.claimedCount !== undefined) assert.equal(actual.result.claimedCount, data.claimedCount);
    }
    const again = await invoke();
    assert.equal(again.value.ok, true);
    assert.deepEqual(again.value.ok && again.value.data, run.value.data);
    assert.ok(requests.at(-1).headers['idempotency-key']);
    assert.equal(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
  }
  assert.ok(succeeded > 0);
  if (action.startsWith('claim_') || action === 'challenge_tongtian_rank' || action === 'sweep_tongtian_rank') assert.ok(refused > 0);
});

for (const action of actions) for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'malformed'] as const) test(`${action}: ${mode}`, async t => {
  const fixture = fixtures.find(row => row.action === action && row.envelope.data.success);
  assert.ok(fixture?.envelope.data.success);
  const app = createTestApp({ config: { 'xiuxian-game': { expose: { enabled: mode !== 'disabled' }, backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  const controller = new AbortController();
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    if (mode === 'cancel') return new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
      controller.abort();
    });
    const envelope = structuredClone(fixture.envelope);
    if (mode === 'malformed') envelope.data.data = {};
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, mode === 'spoof' ? { ...fixture.input, uid: 999 } : fixture.input, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.ok, false);
  assert.equal(calls, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
  if (!result.value.ok) assert.equal(result.value.error.outcome, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 'not_started' : 'unknown');
});
for (const [action, input] of [
  ['challenge_tongtian_rank', { targetRank: 0 }], ['challenge_tongtian_rank', { targetRank: 2000 }],
  ['sweep_tongtian_rank', { targetRank: 1901, count: 0 }], ['sweep_tongtian_rank', { targetRank: 1901, count: 11 }],
  ['claim_tongtian_first_reward', { ranking: 0 }], ['claim_tongtian_monthly_reward', { rewardId: 1.5 }],
  ['claim_tongtian_monthly_reward', { rewardId: Number.MAX_SAFE_INTEGER + 1 }],
  ['batch_challenge_tongtian', { force: true }]
] as const) test(`${action}: 拒绝无效输入 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});
