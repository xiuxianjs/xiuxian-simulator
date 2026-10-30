import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('词典 Expose 保留真实服务端的精确查询、模糊分页和分类结果', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGlossaryQueriesAndShortCircuit$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_GLOSSARY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({
    operation: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3])
  }));
  assert.ok(rows.length > 0);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, input, action] of [
    ['glossary.query', {}, 'search_glossary'],
    ['glossary.query', { page: 2 }, 'search_glossary'],
    ['glossary.query', { keyword: '灵石' }, 'search_glossary'],
    ['glossary.query', { keyword: '灵' }, 'search_glossary'],
    ['glossary.query', { keyword: '没有' }, 'search_glossary'],
    ['glossary.category', {}, 'browse_glossary_category'],
    ['glossary.category', { category: '错误分类' }, 'browse_glossary_category'],
    ['glossary.category', { category: '道具' }, 'browse_glossary_category']
  ] as const) {
    const expected = { keyword: 'keyword' in input ? input.keyword : '', category: 'category' in input ? input.category : '', page: 'page' in input ? input.page : 1 };
    const found = rows.find(row => row.operation === operation && JSON.stringify(row.args) === JSON.stringify(expected));
    // Go map key order is not a contract.
    current = found ?? rows.find(row => row.operation === operation && row.args.keyword === expected.keyword && row.args.category === expected.category && row.args.page === expected.page)!;
    assert.ok(current, JSON.stringify(expected));
    const response = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(response.value.ok, true, JSON.stringify(response.value));
    if (!response.value.ok) continue;
    const result = (response.value.data as any).result;
    const original = current.envelope.data.data;
    assert.equal(result.exact?.keyword, original.exact?.keyword);
    assert.equal(result.page?.total, original.page?.total);
    assert.equal(result.page?.currentPage, original.page?.page);
    assert.equal(result.policy?.categoryValid, original.policy?.categoryValid);
    if (original.page) assert.deepEqual(result.page.entries.map((item: any) => item.keyword), original.page.items.map((item: any) => item.keyword));
  }
  assert.equal(new Set(keys).size, keys.length);
});
