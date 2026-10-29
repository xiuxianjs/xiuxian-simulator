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
