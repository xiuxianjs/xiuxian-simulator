import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusiness(ForgeLifecycleAndReplay|ProfessionToolsV1AndState)/(2ready|ready|^$)', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const forge = [...output.matchAll(/ROBOT_FORGE_EXPOSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], key: row[3], envelope: JSON.parse(row[4]) }));
const tools = [...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=profession.replace-tool\|([^|]+)\|[^|]+\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[2]) }));
test('锻造阶段和工具切换使用服务端真实回执', async t => {
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
  for (const [operation, key, action, input, expected, read] of [
    ['forge.learn', 'learn-recipes', 'learn_forge_recipes', {}, {}, false],
    ['forge.advance', 'advance-stage', 'advance_forge_profession', { expectedLevel: 0 }, { expectedLevel: 0 }, false],
    ['profession.replace-tool', 'list', 'get_replaceable_profession_tools', {}, { identifier: null }, true],
    ['profession.replace-tool', 'replace', 'replace_profession_tool', { userToolId: 2 }, { identifier: '2' }, false]
  ] as const) {
    op = operation; args = expected;
    const fixture = op === 'profession.replace-tool' ? tools.find(row => row.args.identifier === expected.identifier && row.envelope.data.success && row.envelope.data.branch === 'business') : forge.find(row => row.key === key);
    envelope = structuredClone(fixture?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'advance_forge_profession') assert.equal((result.value.data as any).result.level, 1);
    if (result.value.ok && action === 'replace_profession_tool') assert.equal((result.value.data as any).result.userToolId, 2);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'replace_profession_tool') { envelope.data.data.result.userToolId = 3; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
});
