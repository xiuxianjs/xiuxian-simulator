import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotItemDetailExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_ITEM_DETAIL_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[2]) }));
assert.equal(rows.length, 4);
assert.ok(rows.some(row => row.envelope.data.data.entries.length > 0));
assert.ok(rows.some(row => row.envelope.data.data.entries.length === 0));
test('物品模板查询返回真实详情和空结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/items.detail');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const action = current.args.name ? 'find_item_detail' : 'get_item_detail_by_id';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.args), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data.data;
    assert.equal(result.success, true); assert.equal(result.result.entries.length, source.entries.length);
    for (let i = 0; i < source.entries.length; i++) {
      assert.equal(result.result.entries[i].entryId, source.entries[i].record.id);
      assert.deepEqual(JSON.parse(result.result.entries[i].detailsJson), source.entries[i]);
    }
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
