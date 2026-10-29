import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusiness(ExposeGuildCreate|GuildContentPagingRefreshAndReplay|GuildHistoryScopePagingAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const create = output.match(/ROBOT_GUILD_CREATE_EXPOSE=(.+)/)![1];
const rows = [...output.matchAll(/ROBOT_GUILD_(?:CONTENT|HISTORY)_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
rows.push({ op: 'guild.create', envelope: JSON.parse(create) });
test('宗门创建和信息查询使用服务端真实回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected, read] of [
    ['guild.create', 'create_guild', { name: '青云' }, { name: '青云' }, false],
    ['guild.notice', 'get_guild_notice', {}, {}, true], ['guild.intro', 'get_guild_intro', {}, {}, true],
    ['guild.logs', 'get_guild_logs', {}, { page: 1 }, true]
  ] as const) {
    op = operation; args = expected;
    envelope = structuredClone(rows.find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business')?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'create_guild') assert.equal((result.value.data as any).result.name, '青云');
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'create_guild') { envelope.data.data.receipt.name = '别宗'; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
});
