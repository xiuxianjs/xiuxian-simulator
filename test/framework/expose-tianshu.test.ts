import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import handler from '../../src/response/tianshu/res';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessBooksPublicAndAdmission$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).toString();
const fixtures = [...output.matchAll(/ROBOT_BOOKS_RESPONSE=tianshu.content\|\{\}\|([^|]+)\|(.+)/g)].map(row => ({ bid: row[1], envelope: JSON.parse(row[2]) }));
assert.ok(fixtures.some(row => row.bid === 'player') && fixtures.some(row => row.bid === 'guest-books'));
for (const bid of ['player', 'guest-books']) test(`天书查询：${bid}`, async t => {
  const fixture = fixtures.find(row => row.bid === bid)!;
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/tianshu.content');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/天书');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: bid });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_tianshu', {}), 'ai-plugin');
  const response = await call();
  assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) {
    const data = (response.value.data as any).result;
    assert.equal(data.intro, fixture.envelope.data.data.intro);
    const expected = structuredClone(fixture.envelope.data.data.featureCatalog);
    for (const stage of expected) for (const feature of stage.features) if (feature.entryPaths === null) delete feature.entryPaths;
    assert.deepEqual(data.featureCatalog, expected);
    assert.equal(data.commandFeatures.length, Object.keys(fixture.envelope.data.data.commandFeatures).length);
  }
  await call();
  assert.notEqual(keys[0], keys[1]);
});
test('天书非本包指令继续事件链', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  for (const text of ['/天书工具', '/其他命令', '天书介绍']) {
    const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.nextCalls.length, 1);
    assert.equal(result.messages.length, 0);
  }
});
