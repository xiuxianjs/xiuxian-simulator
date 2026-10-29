import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotCompanionExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_COMPANION_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
assert.equal(rows.length, 4);
assert.ok(rows.some(row => row.op === 'companion.dual-cultivation' && row.envelope.data.success));
assert.ok(rows.some(row => row.op === 'companion.dual-cultivation' && !row.envelope.data.success));
const actions: Record<string, string> = { 'companion.info': 'get_companion', 'companion.tasks': 'get_companion_tasks', 'companion.dual-cultivation': 'dual_cultivate' };
test('道侣信息、任务和双修保留服务端实际状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.op === 'companion.tasks' ? { args: '' } : {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', actions[current.op], {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      if (current.op === 'companion.info') assert.equal(result.result.companion.partnerId, source.data.companion.partnerId);
      if (current.op === 'companion.tasks') assert.deepEqual(result.result.tasks, source.data.tasks);
      if (current.op === 'companion.dual-cultivation') for (const key of ['partnerId', 'experienceGained', 'creditedExperience', 'partnerCreditedExperience', 'tongxinGained']) assert.equal(result.result[key], source.data[key]);
    } else assert.equal(result.result, undefined);
    await call(); if (current.op === 'companion.dual-cultivation') assert.equal(keys.at(-1), keys.at(-2)); else assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
