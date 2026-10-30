import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildContent(ActionsPermissionsWritesAndReplay|PagingRefreshAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_GUILD_(?:CONTENT_ACTION|CONTENT)_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('宗门内容和精华保留服务端权限与回执', async t => {
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
    ['guild.essences', 'get_guild_essences', {}, { page: 1 }, true],
    ['guild.intro-set', 'set_guild_intro', { content: '副宗主设置' }, { content: '副宗主设置' }, false],
    ['guild.notice-set', 'set_guild_notice', { content: '副宗主设置' }, { content: '副宗主设置' }, false],
    ['guild.essence-add', 'add_guild_essence', { content: '长老新增精华' }, { content: '长老新增精华' }, false],
    ['guild.essence-remove', 'remove_guild_essence', { essenceId: 3 }, { essenceId: 3 }, false]
  ] as const) {
    op = operation; args = expected;
    const fixture = fixtures.find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business' &&
      (read ? row.envelope.data.data?.items?.length : row.envelope.data.data?.outcome === 'result'));
    envelope = structuredClone(fixture?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'add_guild_essence') assert.equal((result.value.data as any).result.essenceId, 1);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
  const before = keys.length;
  const tooLong = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'set_guild_notice', { content: '😀'.repeat(26) }), 'ai-plugin');
  assert.equal(tooLong.value.ok, false); assert.equal(keys.length, before);
  const newline = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'add_guild_essence', { content: '内容\n其他命令' }), 'ai-plugin');
  assert.equal(newline.value.ok, false); assert.equal(keys.length, before);
  op = 'guild.essence-add'; args = { content: '长老新增精华' };
  envelope = structuredClone(fixtures.find(row => row.op === op && row.envelope.data.success && row.envelope.data.data?.outcome === 'result')?.envelope);
  assert.ok(envelope);
  const add = (intentId: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'add_guild_essence', { content: args.content, intentId }), 'ai-plugin');
  assert.equal((await add('first')).value.ok, true); const firstKey = keys.at(-1);
  assert.equal((await add('first')).value.ok, true); assert.equal(keys.at(-1), firstKey);
  assert.equal((await add('second')).value.ok, true); assert.notEqual(keys.at(-1), firstKey);
  const count = keys.length;
  assert.equal((await add('bad id')).value.ok, false); assert.equal(keys.length, count);
});
