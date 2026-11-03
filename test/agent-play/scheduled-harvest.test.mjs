import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import * as Framework from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { scheduledHarvest } from '../../src/expose/scheduled-harvest.ts';
import { signHarvestTicket, readHarvestTicket } from '../../src/agent-play/scheduled-harvest-ticket.ts';
const { Expose, registerExpose, getCurrentEvent } = Framework;
const protocol = 'agent.scheduled-action.v1';
const secret = 'fixture-scheduled-secret';

for (const scenario of ['success', 'immature', 'binding-changed', 'tampered', 'expired', 'future', 'wrong-round', 'wrong-caller', 'foreground', 'uncertain']) {
  test(`scheduled harvest original authority and actual HTTP request: ${scenario}`, { skip: !Framework.createBackgroundRunner && 'requires updated adjacent framework; run with AGENT_PLAY_FRAMEWORK_ROOT' }, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: secret } } } });
    t.after(() => app.dispose());
    let now = 1800000000000;
    t.mock.method(Date, 'now', () => now);
    let prepared, background, changed = false;
    const writes = [];
    t.mock.method(axios, 'create', () => ({ request: async request => {
      const path = new URL(request.url).pathname;
      assert.equal(request.headers['x-bid'], 'player');
      if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: changed ? 8 : 7 } } }) };
      assert.equal(getCurrentEvent(), undefined);
      assert.equal(path, '/api/v1/players/7/cave/plots/harvest');
      assert.deepEqual(typeof request.data === 'string' ? JSON.parse(request.data) : request.data, { plotIndex: 2 });
      writes.push(request.headers['idempotency-key']);
      if (scenario === 'immature') return { status: 409, headers: {}, data: JSON.stringify({ error: { code: 'CONFLICT', message: '当前没有可收割的成熟灵植' } }) };
      if (scenario === 'uncertain') throw new Error('connection lost after submit');
      return { status: 200, headers: {}, data: JSON.stringify({ data: { message: '灵田采收完成', harvestedCount: 1 } }) };
    } }));
    const origin = app.events.privateMessage({ platform: 'qq-bot', botId: '123', userId: 'player', messageId: 'schedule-message', text: '明天定时帮我采收灵田 2' });
    const first = await app.runHandler(async () => {
      registerExpose('xiuxian-game', [scheduledHarvest]);
      const result = await Expose.create().call(protocol, 'xiuxian-game', 'prepare', { dueAt: now + 1000, everyMs: 0, expiresAt: now + 60000, plotIndex: 2 });
      assert.equal(result.ok, true, JSON.stringify(result));
      prepared = result.data;
      background = Framework.createBackgroundRunner(input => Expose.create().call(protocol, 'xiuxian-game', 'execute', input));
    }, origin, 'host');
    assert.deepEqual(first.errors, []);
    assert.equal(writes.length, 0, 'signing a ticket must not harvest');
    now += scenario === 'expired' ? 60001 : scenario === 'future' ? 0 : 1000;
    changed = scenario === 'binding-changed';
    const input = { authorization: prepared.authorization, operationId: 'original-run', dueAt: prepared.dueAt + (scenario === 'wrong-round' ? 1 : 0) };
    if (scenario === 'tampered') input.authorization = input.authorization.replace(/^./u, input.authorization[0] === 'e' ? 'f' : 'e');
    const run = await app.runHandler(async () => {
      const invoke = scenario === 'foreground'
        ? args => Expose.create().call(protocol, 'xiuxian-game', 'execute', args)
        : scenario === 'wrong-caller' ? Framework.createBackgroundRunner(args => Expose.create().call(protocol, 'xiuxian-game', 'execute', args)) : background;
      const result = await invoke(input);
      if (scenario === 'foreground') {
        assert.equal(result.ok, false);
        assert.equal(result.error.code, 'FORBIDDEN');
      } else {
        assert.equal(result.ok, true, JSON.stringify(result));
        assert.equal(result.data.outcome, ({ success: 'completed', immature: 'skipped', uncertain: 'unknown' })[scenario] ?? 'rejected');
        if (scenario === 'success') {
          assert.equal(result.data.text, '灵田采收完成');
          assert.equal((await invoke({ ...input, operationId: 'different-model-retry-id' })).data.outcome, 'completed');
          assert.equal(writes[0], writes[1], 'changing the host operation id cannot manufacture another settlement');
        }
      }
    }, app.events.privateMessage({ platform: 'qq-bot', botId: '123', userId: 'other-player' }), 'other-host');
    assert.deepEqual(run.errors, []);
    assert.equal(writes.length, scenario === 'success' ? 2 : ['immature', 'uncertain'].includes(scenario) ? 1 : 0);
  });
}

test('ticket signature rejects payload changes, key rotation and truncation', () => {
  const ticket = { version: 1, caller: 'host', platform: 'qq-bot', botId: '123', userId: 'player', channelId: '', private: true, playerId: 7, inputId: 'message', backend: 'https://offline.invalid', dueAt: 100, everyMs: 0, expiresAt: 1000, plotIndex: 0 };
  const encoded = signHarvestTicket(ticket, secret);
  assert.deepEqual(readHarvestTicket(encoded, secret), ticket);
  assert.throws(() => readHarvestTicket(encoded, 'rotated'));
  assert.throws(() => readHarvestTicket(encoded.slice(0, -1), secret));
  const [payload, signature] = encoded.split('.');
  const changed = { ...JSON.parse(Buffer.from(payload, 'base64url').toString()), playerId: 8 };
  assert.throws(() => readHarvestTicket(Buffer.from(JSON.stringify(changed)).toString('base64url') + '.' + signature, secret));
});

for (const message of ['灵田怎么采收', '如何预约采收灵田', '不要预约采收灵田', '如果明天帮我采收灵田', '明天帮我采收道侣灵田']) test(`inquiry, cancellation and another player cannot issue harvest authority: ${message}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: secret } } } });
  t.after(() => app.dispose());
  let requests = 0;
  t.mock.method(axios, 'create', () => { requests++; throw new Error('must reject before backend'); });
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [scheduledHarvest]);
    const now = Date.now();
    const result = await Expose.create().call(protocol, 'xiuxian-game', 'prepare', { dueAt: now + 10000, everyMs: 0, expiresAt: now + 60000 });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'FORBIDDEN');
  }, app.events.privateMessage({ platform: 'qq-bot', botId: '123', userId: 'player', text: message }), 'host');
  assert.deepEqual(run.errors, []);
  assert.equal(requests, 0);
});

for (const [message, plotIndex] of [
  ['明天帮我采收灵田2', 3], ['明天帮我采收灵田2', undefined],
  ['明天帮我采收全部灵田', 2], ['明天帮我采收第2、3块灵田', 3],
  ['明天帮我采收灵田2和3', 2], ['明天帮我采收第2.5块灵田', 5]
]) test(`requested plot scope cannot be changed: ${message} -> ${plotIndex}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: secret } } } });
  t.after(() => app.dispose());
  let requests = 0;
  t.mock.method(axios, 'create', () => { requests++; throw new Error('scope rejection must precede backend'); });
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [scheduledHarvest]);
    const now = Date.now();
    const response = await Expose.create().call(protocol, 'xiuxian-game', 'prepare', { dueAt: now + 10000, everyMs: 0, expiresAt: now + 60000, ...(plotIndex === undefined ? {} : { plotIndex }) });
    assert.equal(response.ok, false);
    assert.equal(response.error.code, 'FORBIDDEN');
  }, app.events.privateMessage({ platform: 'qq-bot', botId: '123', userId: 'player', messageId: 'scope', text: message }), 'host');
  assert.deepEqual(run.errors, []);
  assert.equal(requests, 0);
});
