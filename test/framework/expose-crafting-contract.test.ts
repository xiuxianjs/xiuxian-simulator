import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExpose(Alchemy|Forge)References$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const alchemyRows = [...output.matchAll(/EXPOSE_ALCHEMY_REPLY=([^|]+)\|(.+)/g)].map(match => ({ command: match[1], reply: JSON.parse(match[2]) }));
assert.ok(alchemyRows.length >= 5);
test('炼丹：真实预览、原引用确认、重复确认与同消息命令幂等隔离', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = alchemyRows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, current.command);
    assert.deepEqual(body.arguments, {});
    if (current.command.startsWith('/炼丹 确认 ')) {
      const chars = [...body.messageText].length;
      const bytes = Buffer.byteLength(body.messageText, 'utf8');
      assert.ok(chars <= 80, `${chars} Unicode characters, ${bytes} UTF-8 bytes`);
      assert.ok(bytes > chars);
    }
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: current.reply } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  let confirmation = '';
  for (current of alchemyRows) {
    const preview = current.command.match(/^\/炼丹 预览 (\d+) (\d+)$/);
    const reference = current.command.match(/^\/炼丹 确认 (.+)$/)?.[1];
    const action = preview ? 'preview_alchemy' : reference ? 'confirm_alchemy' : current.command === '/炼丹 入门' ? 'enroll_alchemist' : current.command.includes('丹方') ? 'get_alchemy_recipes' : 'get_alchemy_dashboard';
    const input = preview ? { recipeId: Number(preview[1]), count: Number(preview[2]) } : reference ? { reference } : action === 'get_alchemy_recipes' ? { page: 1 } : {};
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const data = (result.value.data as any).result;
    assert.equal(data.reply.text, current.reply.text);
    if (preview) { confirmation = data.confirmations[0].reference; assert.ok(current.reply.blocks[0].inlineButtons[0].command.endsWith(confirmation)); }
    if (reference) assert.equal(reference, confirmation);
  }
  // The final two rows retry the same reference; every earlier command differs.
  assert.equal(keys.at(-1), keys.at(-2));
  assert.equal(new Set(keys.slice(0, -1)).size, keys.length - 1);
});

test('锻造：真实入门及普通预览、确认、作品重放回执', async t => {
  const rows = [...output.matchAll(/EXPOSE_FORGE_HTTP=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], args: JSON.parse(match[2]), result: JSON.parse(match[3]) })).filter(row => row.operation !== 'forge.learn');
  assert.ok(rows.length >= 6);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    if (current.operation === 'forge.confirm') {
      assert.equal(body.arguments.token, current.args.token);
      const chars = [...body.messageText].length;
      const bytes = Buffer.byteLength(body.messageText, 'utf8');
      assert.ok(chars <= 80, `${chars} Unicode characters, ${bytes} UTF-8 bytes`);
      assert.ok(bytes > chars);
    }
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  for (current of rows) {
    const action = current.operation === 'forge.overview' ? 'get_forge_overview' : current.operation === 'forge.confirm' ? 'confirm_forge' : current.args.tutorial ? 'preview_forge_tutorial' : 'preview_forge';
    const input = action === 'confirm_forge' ? { reference: current.args.token } : action === 'preview_forge' ? { recipeId: current.args.recipeId } : {};
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = (result.value.data as any).result;
    for (const key of ['token', 'expiresAt', 'craftId', 'replayed', 'spiritStoneCost', 'joined']) if (key in current.result.data) assert.equal(actual[key], current.result.data[key]);
    if (current.result.data.materials) assert.deepEqual(actual.materials, current.result.data.materials);
    if (current.result.data.equipment) assert.equal(actual.equipment.id, current.result.data.equipment.id);
  }
});

test('锻造概览同一消息内重复读取使用新快照', async t => {
  const row = [...output.matchAll(/EXPOSE_FORGE_HTTP=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], result: JSON.parse(match[3]) })).find(item => item.operation === 'forge.overview');
  assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => { keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify({ data: row.result }) }; } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (let i = 0; i < 2; i++) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_forge_overview', {}), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
  }
  assert.notEqual(keys[0], keys[1]);
});

test('炼丹丹方同一消息内重复读取使用新快照', async t => {
  const row = alchemyRows.find(item => item.command === '/炼丹 丹方 1');
  assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: row.reply } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (let i = 0; i < 2; i++) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_alchemy_recipes', { page: 1 }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
  }
  assert.notEqual(keys[0], keys[1]);
});
