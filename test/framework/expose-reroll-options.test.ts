import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeRerollOptions$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const match = output.match(/REROLL_OPTIONS_EXPOSE=(.+)/); assert.ok(match); const original = JSON.parse(match[1]);
test('换词候选返回真实词条和库存，不生成随机结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(original); const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/skill-books.reroll');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { mode: 'preview', bookId: '2', attrLabel: null }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_skill_reroll_options', { bookId: 2 }), 'ai-plugin');
  const response = await call(); assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) { const data = (response.value.data as any).result; assert.equal(data.ownedCount, 2); assert.equal(data.skillBook.id, 2); assert.ok(data.availableAttrs.some((item: any) => item.label === '物攻')); }
  await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  envelope = structuredClone(original); envelope.data.data.bookId = 3; assert.equal((await call()).value.ok, false);
});
