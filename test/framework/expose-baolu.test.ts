import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessBooksBaoluPanelAndPartialCommit$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_BOOKS_RESPONSE=tianshi-baolu.panel\|([^|]+)\|player\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[2]) }));
for (const scenario of ['success', 'failure'] as const) test(`天师宝录：${scenario} 保留服务端回执`, async t => {
  const fixture = fixtures.find(row => row.args.category === 'all' && row.args.page === 1 && row.envelope.data.success === (scenario === 'success'));
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/tianshi-baolu.panel');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/天师宝录 全部 p1');
    assert.deepEqual(body.arguments, { category: 'all', page: 1 });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_tianshi_baolu', { category: 'all', page: 1 }), 'ai-plugin');
  const response = await call();
  assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) {
    const data = response.value.data as any;
    assert.equal(data.success, scenario === 'success');
    if (data.success) assert.deepEqual(data.result, fixture.envelope.data.data);
    else { assert.equal(data.result, undefined); assert.equal(data.replies[0].text, '查看天师宝录失败，请稍后再试'); }
  }
  await call();
  assert.equal(keys[0], keys[1]);
});
