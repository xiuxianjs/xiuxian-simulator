import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { challengeBackendScarecrow } from '../src/api/bot/scarecrow';
import { mockBackendConfig } from './backend-config-helper';

test('actual scarecrow battles preserve round text, live attributes and summary projection', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestScarecrowActualResponseContract$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/SCARECROW_ACTUAL_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'actual scarecrow fixtures missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  assert.equal(Object.keys(fixtures).length, 6);
  const inputs: Record<string, string | undefined> = { default: undefined, zero: '0', 'leading-zero': '0001', twenty: '20', huge: '999999999999999999999999999', 'live-change': '1' };
  let payload: unknown;
  let calls = 0;
  let lastRequest: unknown;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    lastRequest = { url: request.url, body: JSON.parse(Buffer.concat(chunks).toString()), key: request.headers['idempotency-key'] };
    calls++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const context = { requestId: 'scarecrow-request', idempotencyKey: 'scarecrow-message' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    payload = fixture;
    assert.deepEqual(await challengeBackendScarecrow('player', 1, inputs[key], context), { summary: fixture.summary, logId: fixture.logId, rounds: fixture.rounds }, key);
    assert.deepEqual(lastRequest, { url: '/api/v1/players/1/scarecrow/challenge', body: inputs[key] === undefined ? {} : { roundsText: inputs[key] }, key: 'scarecrow-message' });
  }
  const source = fixtures.default;
  const summary = source.summary as Record<string, unknown>;
  for (const field of ['totalDamage', 'skillDamage', 'buffDamage', 'totalSkillAttacks', 'critCount', 'maxSingleDamage', 'maxSingleDamageRound']) {
    for (const invalid of [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...source, summary: { ...summary, [field]: invalid } };
      await assert.rejects(challengeBackendScarecrow('player', 1, undefined, context), /稻草人测试响应不完整/);
    }
  }
  const skill = (summary.skills as Record<string, unknown>[])[0];
  assert.ok(skill, 'actual challenge must produce skill stats');
  for (const field of ['count', 'totalDamage']) {
    for (const invalid of [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...source, summary: { ...summary, skills: [{ ...skill, [field]: invalid }] } };
      await assert.rejects(challengeBackendScarecrow('player', 1, undefined, context), /稻草人测试响应不完整/);
    }
  }
  for (const invalid of [null, '1', 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    payload = { ...source, rounds: invalid };
    await assert.rejects(challengeBackendScarecrow('player', 1, undefined, context), /稻草人测试响应不完整/);
  }
  for (const invalid of [undefined, null, 1, [], {}]) {
    payload = { ...source, summary: { ...summary, maxSingleDamageSkill: invalid } };
    await assert.rejects(challengeBackendScarecrow('player', 1, undefined, context), /稻草人测试响应不完整/);
  }
  payload = { ...source, summary: { ...summary, maxSingleDamageSkill: '', critRate: 1.25 } };
  const fractional = await challengeBackendScarecrow('player', 1, undefined, context);
  assert.equal(fractional.summary.critRate, 1.25);
  assert.equal(fractional.summary.maxSingleDamageSkill, '');
  const before = calls;
  for (const input of ['', '-1', '1.5', '2x']) {
    await assert.rejects(challengeBackendScarecrow('player', 1, input, context), /稻草人测试参数无效/);
  }
  for (const uid of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(challengeBackendScarecrow('player', uid, undefined, context), /稻草人测试参数无效/);
  }
  assert.equal(calls, before, 'invalid request parameters must not execute a battle');
});
