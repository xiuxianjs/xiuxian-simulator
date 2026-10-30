import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotExposeGuildHomeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUILD_DIRECTORY_RESPONSE=guild\.home\|player\|(.+)/g)].map(match => JSON.parse(match[1]));
const taskEnvelope = JSON.parse(output.match(/EXPOSE_GUILD_HOME_TASK=(.+)/)![1]);

test('宗门主页和任务步骤保留服务端会员状态及资源', async t => {
  assert.ok(rows.some(row => row.data.data?.hasGuild === true) && rows.some(row => row.data.data?.hasGuild === false));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; let task = false; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/guild.home');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {});
    if (task) { assert.equal(body.messageText, '/查看势力 管理'); assert.equal(body.taskInput, '查看势力 管理'); }
    keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(task ? taskEnvelope : current);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    if (!current.data.success || current.data.branch !== 'business') continue;
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_my_guild', {}), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = (run.value.data as any).result; const expected = current.data.data;
    assert.equal(actual.hasGuild, expected.hasGuild);
    assert.equal(actual.pendingApplications, expected.pendingApplications);
    assert.deepEqual(actual.access.features, Object.entries(expected.access.features).map(([key, value]) => ({ key, ...(value as object) })));
    if (expected.hasGuild) { assert.equal(actual.membership.guildId, expected.membership.guildId); assert.equal(actual.guild.spiritStone, expected.guild.spiritStone); }
    else { assert.equal(actual.membership, undefined); assert.equal(actual.guild, undefined); }
  }
  current = rows.find(row => row.data.success && row.data.data?.hasGuild); assert.ok(current); task = true;
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_guild_home', { taskInput, intentId: 'guild-home' }), 'ai-plugin');
  const first = await call('查看势力 管理'); assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) { assert.deepEqual((first.value.data as any).taskContinuation, taskEnvelope.data.middleware.taskContinuation); assert.equal((first.value.data as any).result.membership.guildId, taskEnvelope.data.data.membership.guildId); assert.deepEqual((first.value.data as any).result.access.features, Object.entries(taskEnvelope.data.data.access.features).map(([key, value]) => ({ key, ...(value as object) }))); }
  assert.equal((await call('查看势力 管理')).value.ok, true); assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length; assert.equal((await call('查看势力 其他')).value.ok, false); assert.equal(keys.length, before);
});

test('旧服务端缺失开放条件保持未知，错误数据不伪装为有效状态', async t => {
  const original = rows.find(row => row.data.success && !row.data.data.hasGuild); assert.ok(original);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(original);
  delete envelope.data.data.access.canCreateGuild;
  delete envelope.data.data.access.features;
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify(envelope) }) }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_my_guild', {}), 'ai-plugin');
  const old = await call(); assert.equal(old.value.ok, true, JSON.stringify(old.value));
  if (old.value.ok) {
    const access = (old.value.data as any).result.access;
    assert.equal(access.canCreateGuild, undefined);
    assert.equal(access.features, undefined);
    assert.equal(access.canCreateOrApplyGuild, original.data.data.access.canCreateOrApplyGuild);
  }
  envelope = structuredClone(original);
  envelope.data.data.access.features = { 'guild-create': { realmReached: 'yes', requiredRealm: '', lockedReason: '' } };
  assert.equal((await call()).value.ok, false);
});
