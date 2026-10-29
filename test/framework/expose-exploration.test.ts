import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeExploration$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_EXPLORATION=([^|]+)\|(.+)/g)].map(row => ({ key: row[1], envelope: JSON.parse(row[2]) }));
test('探索查询、出发与返程保留服务端预览及结算', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const [key, operation, action, input, expected] of [
    ['view', 'seclusion.command', 'get_exploration', {}, { action: 'view' }],
    ['start', 'seclusion.command', 'start_exploration', { dungeonName: '桃花镇', duration: 4 }, { action: 'start', dungeonName: '桃花镇', duration: 4 }],
    ['end', 'seclusion.end', 'end_exploration', {}, {}]
  ] as const) {
    op = operation; args = expected; const fixture = fixtures.find(row => row.key === key); assert.ok(fixture); envelope = structuredClone(fixture.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) {
      const result = (response.value.data as any).result;
      if (key === 'view') assert.equal(result.status.availableDungeons[0].name, '桃花镇');
      if (key === 'start') { assert.equal(result.code, 'OK'); assert.equal(result.record.spiritCost, 24); }
      if (key === 'end') { assert.equal(result.view.kind, 'refunded'); assert.equal(result.refundedSpirit, 24); }
    }
    await call(); if (key === 'view') assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (key === 'start') { envelope.data.data.data.record.duration = 5; assert.equal((await call()).value.ok, false); }
  }
});
