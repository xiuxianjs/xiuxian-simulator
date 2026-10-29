import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusiness(ExposeWorldMilestone|NativeComebackEntryOverviewClaimAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const milestones = [...output.matchAll(/ROBOT_MILESTONE_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
const comeback = [...output.matchAll(/ROBOT_NATIVE_COMEBACK_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('里程碑与回归奖励按服务端状态和结算回执执行', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, read] of [
    ['world-milestones.view', 'get_world_milestones', true], ['world-milestones.claim-all', 'claim_world_milestones', false],
    ['native-comeback.overview', 'get_native_comeback', true], ['native-comeback.claim', 'claim_native_comeback', false]
  ] as const) {
    op = operation;
    const rows = [...milestones, ...comeback].filter(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business' &&
      (op !== 'native-comeback.overview' || row.envelope.data.data.current));
    envelope = structuredClone(rows[0]?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'claim_native_comeback') assert.ok((result.value.data as any).result.rewardSummary.length);
    if (result.value.ok && action === 'claim_world_milestones') assert.ok((result.value.data as any).result.count > 0);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
});
