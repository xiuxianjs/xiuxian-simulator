import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestExposeLearnedBooksFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/EXPOSE_LEARNED_BOOKS=([^|]+)\|(.+)/g)].map(row => ({ state: row[1], envelope: JSON.parse(row[2]) }));
assert.equal(rows.length, 2);
test('已学功法以真实服务端返回保留资格和上限', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: 1 } } }) };
    assert.equal(path, '/api/v1/players/1/skill-books/learned');
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_learned_books', { page: 1, visibility: 'visible' }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = run.value.data as any;
    const original = current.envelope.data;
    assert.equal(actual.items.length, original.items.length);
    assert.equal(actual.inUseBooks.length, original.inUseBooks.length);
    for (const [index, book] of actual.items.entries()) for (const key of ['id', 'canHide', 'canReset', 'physicalAttack', 'maxPhysicalAttack']) assert.equal(book[key], original.items[index][key]);
  }
});

test('功法任务查看解析 Go 功法列表并拒绝不匹配页码', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; let displayPage = 1;
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'next', command: '我的资料' }, entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } }, data: { displayPage, page: current.envelope.data } } }) }) }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_learned_books', { taskInput: '我的功法' }), 'ai-plugin');
  for (current of rows) {
    const run = await call(); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { assert.equal((run.value.data as any).result.total, current.envelope.data.total); assert.equal((run.value.data as any).taskContinuation.outcome, 'next'); }
  }
  displayPage = 2; assert.equal((await call()).value.ok, false);
});
