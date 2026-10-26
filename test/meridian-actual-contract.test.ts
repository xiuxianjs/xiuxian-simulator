import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getBackendMeridians, pulseBackendMeridian } from '../src/api/bot/meridian';
import { mockBackendConfig } from './backend-config-helper';

test('actual meridian views and committed pulses pass the robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestMeridianActualResponseContract$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/MERIDIAN_ACTUAL_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'actual meridian fixtures missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  assert.equal(Object.keys(fixtures).length, 11);
  let payload: unknown;
  let calls = 0;
  let lastRequest: unknown;
  const server = createServer((request, response) => {
    calls++;
    lastRequest = { method: request.method, url: request.url, key: request.headers['idempotency-key'] };
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const context = { requestId: 'meridian-request', idempotencyKey: 'meridian-message' };
  const view = () => getBackendMeridians('player', 1, context);
  const pulse = () => pulseBackendMeridian('player', 1, context);
  for (const [key, fixture] of Object.entries(fixtures)) {
    payload = fixture;
    assert.deepEqual(await (key.startsWith('view:') ? view() : pulse()), fixture, key);
    assert.deepEqual(lastRequest, key.startsWith('view:')
      ? { method: 'GET', url: '/api/v1/players/1/meridians', key: undefined }
      : { method: 'POST', url: '/api/v1/players/1/meridians/pulse', key: 'meridian-message' });
  }
  const source = fixtures['view:incomplete-next'];
  const pulsed = fixtures['pulse:base'];
  const invalidNumbers = [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1];
  for (const [run, fixture, fields] of [
    [view, source, ['TrueQi', 'DailyPulseRemaining', 'CompletedCount', 'progressPercent']],
    [pulse, pulsed, ['progressBefore', 'basePulseRemaining', 'extraPulseRemaining', 'trueQiRemaining', 'dailyPulseRemaining']]
  ] as const) {
    for (const field of fields) {
      for (const invalid of invalidNumbers) {
        payload = { ...fixture, [field]: invalid };
        await assert.rejects(run(), /接口返回不完整/);
      }
    }
    for (const field of ['TOTAL_COUNT', 'QI_PER_MERIDIAN', 'PULSE_QI_COST', 'PULSE_PROGRESS', 'DAILY_PULSE_MAX', 'DAILY_EXTRA_PULSE_MAX', 'FOUNDATION_STAGE_LEVEL']) {
      for (const invalid of invalidNumbers) {
        payload = { ...fixture, config: { ...(fixture.config as Record<string, unknown>), [field]: invalid } };
        await assert.rejects(run(), /接口返回不完整/);
      }
    }
  }
  const statusFields = {
    normalPulsesRemaining: invalidNumbers,
    tailJumpEscalation: [undefined, null, 1],
    index: invalidNumbers, phase: invalidNumbers, phaseIndex: invalidNumbers, phaseName: [undefined, null, 1], Progress: invalidNumbers, RequiredProgress: invalidNumbers,
    Name: [undefined, null, 1, {}], Category: [undefined, null, 1, {}], Description: [undefined, null, 1, {}], completed: [undefined, null, 0, 'false']
  };
  for (const location of ['meridians', 'current', 'next']) {
    const status = location === 'meridians' ? (source.meridians as Record<string, unknown>[])[0] : source[location] as Record<string, unknown>;
    for (const [field, values] of Object.entries(statusFields)) {
      for (const invalid of values) {
        const changed = { ...status, [field]: invalid };
        payload = { ...source, [location]: location === 'meridians' ? [changed] : changed };
        await assert.rejects(view(), /经络接口返回不完整/);
      }
    }
  }
  for (const [field, values] of Object.entries(statusFields)) {
    for (const invalid of values) {
      payload = { ...pulsed, [field]: invalid };
      await assert.rejects(pulse(), /冲脉接口返回不完整/);
    }
  }
  for (const field of ['isLocked', 'allCompleted', 'showPulseButton', 'canPulse']) {
    for (const invalid of [undefined, null, 0, 'false']) {
      payload = { ...source, [field]: invalid };
      await assert.rejects(view(), /经络接口返回不完整/);
    }
  }
  for (const invalid of [undefined, null, 0, 'false']) {
    payload = { ...pulsed, jumped: invalid };
    await assert.rejects(pulse(), /冲脉接口返回不完整/);
  }
  // Preserve signed historical state and future integer configuration entries;
  // validation must not invent a new progression rule or strip server fields.
  payload = { ...source, TrueQi: -1, config: { ...(source.config as Record<string, unknown>), FUTURE_RULE: 0 } };
  assert.deepEqual(await view(), payload);
  for (const malformed of [undefined, null, {}, [{ phase: 2 }]]) {
    payload = { ...source, phases: malformed };
    await assert.rejects(view(), /经络接口返回不完整/);
    payload = { ...pulsed, phases: malformed };
    await assert.rejects(pulse(), /冲脉接口返回不完整/);
  }
  assert.equal((fixtures['view:phase2'].current as Record<string, unknown>).phaseIndex, 1);
  assert.equal(fixtures['pulse:phase2'].phase, 2);
  const before = calls;
  for (const uid of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(getBackendMeridians('player', uid, context), /经络查询参数无效/);
    await assert.rejects(pulseBackendMeridian('player', uid, context), /冲脉参数无效/);
  }
  for (const bid of ['', ' ']) {
    await assert.rejects(getBackendMeridians(bid, 1, context), /经络查询参数无效/);
    await assert.rejects(pulseBackendMeridian(bid, 1, context), /冲脉参数无效/);
  }
  assert.equal(calls, before, 'invalid identity and UID must not reach the service');
});
