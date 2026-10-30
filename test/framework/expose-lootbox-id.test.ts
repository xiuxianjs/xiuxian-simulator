import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { fileURLToPath } from 'node:url';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('按 ID 开礼盒不回退模糊名称并保留服务端实际数量', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/lootboxes.open');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { lootboxId: 7, lootboxName: '', openCount: 10 });
    keys.push(request.headers['idempotency-key']);
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: { lootboxName: '礼盒', openCount: 2, rewards: [] } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'open_lootbox_by_id', { lootboxId: 7, openCount: 10 }), 'ai-plugin');
  const result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.openCount, 2);
  await call(); assert.equal(keys[0], keys[1]);
});


test('按礼盒 ID 开启可解析真实服务端结算回执', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessLootboxExplicitIDReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const match = output.match(/EXPOSE_LOOTBOX_ID=(.+)/); assert.ok(match); const envelope = JSON.parse(match[1]);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { lootboxId: 1, lootboxName: '', openCount: 1 });
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'open_lootbox_by_id', { lootboxId: 1, openCount: 1 }), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.deepEqual((run.value.data as any).result, envelope.data.data);
});

test('礼盒列表的配置 ID 直接用于开启并保留库存不足的实际数量', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessLootboxListToExplicitOpen$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const read = (name: string) => { const match = output.match(new RegExp(`EXPOSE_LOOTBOX_${name}=(.+)`)); assert.ok(match); return JSON.parse(match[1]); };
  const list = read('LIST'); const settlement = read('FROM_LIST');
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: 1 } } }) };
    if (path === '/api/v1/players/1/lootboxes') return { status: 200, headers: {}, data: JSON.stringify(list) };
    assert.equal(path, '/api/v2/robot/business/lootboxes.open');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.arguments.lootboxId, list.data.items[0].lootboxId); assert.equal(body.arguments.openCount, 10);
    return { status: 200, headers: {}, data: JSON.stringify(settlement) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const view = await run('get_lootboxes', {}); assert.equal(view.value.ok, true, JSON.stringify(view.value)); if (!view.value.ok) return;
  const item = (view.value.data as any).items[0];
  const opened = await run('open_lootbox_by_id', { lootboxId: item.lootboxId, openCount: 10 }); assert.equal(opened.value.ok, true, JSON.stringify(opened.value));
  if (opened.value.ok) assert.equal((opened.value.data as any).result.openCount, item.quantity);
});
