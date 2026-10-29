import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeStorageCategoryLock$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_STORAGE_CATEGORY_EXPOSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], token: row[2], envelope: JSON.parse(row[3]) })).filter(row => /^(装备|天工|功法)-/.test(row.token));
test('按服务端类型批量锁定和解锁', async t => {
  assert.equal(fixtures.length, 6);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let fixture = fixtures[0]; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/storage.${fixture.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { args: [fixture.token] }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const row of fixtures) {
    fixture = row; envelope = structuredClone(row.envelope); const [category, typeName] = row.token.split('-');
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const action = row.op === 'lock' ? 'lock_storage_type' : 'unlock_storage_type';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { category, typeName }), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, JSON.stringify(response.value));
    if (response.value.ok) { const result = (response.value.data as any).result; assert.equal(result.category, category); assert.equal(result.typeName, typeName); assert.equal(result.count, row.envelope.data.data.result.category.count); }
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    envelope.data.data.category = '装备-错误'; assert.equal((await call()).value.ok, false);
  }
});
