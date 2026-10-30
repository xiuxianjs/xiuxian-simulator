import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('反馈查询读取真实服务端回执并保留越权拒绝', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessFeedbackOwnershipValidationAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_FEEDBACK_RESPONSE=([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
  const categories = rows.find(row => row.operation === 'feedback.compose' && row.envelope.data.success && Array.isArray(row.envelope.data.data?.categories) && row.envelope.data.data.categories.length > 0)!;
  const mine = rows.find(row => row.operation === 'feedback.mine' && row.envelope.data.success)!;
  const detail = rows.find(row => row.operation === 'feedback.detail' && row.envelope.data.success)!;
  const denied = rows.find(row => row.operation === 'feedback.detail' && !row.envelope.data.success)!;
  assert.ok(categories && mine && detail && denied);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = mine;
  let expected: object = { page: 1 };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expected);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  current = categories; expected = { mode: 'menu', categoryId: null, content: '' };
  const categoryList = await call('get_feedback_categories', {});
  assert.equal(categoryList.value.ok, true, JSON.stringify(categoryList.value));
  if (categoryList.value.ok) assert.deepEqual((categoryList.value.data as any).result.categories, categories.envelope.data.data.categories);
  assert.equal((await call('get_feedback_categories', {})).value.ok, true);
  assert.notEqual(keys.at(-1), keys.at(-2));
  current = mine; expected = { page: 1 };
  const list = await call('get_my_feedback', {});
  assert.equal(list.value.ok, true, JSON.stringify(list.value));
  if (!list.value.ok) return;
  const feedback = (list.value.data as any).result.feedbacks[0];
  assert.equal(feedback.id, detail.envelope.data.data.id);
  assert.ok(!JSON.stringify(list.value.data).includes('他人反馈'));
  current = detail; expected = { feedbackId: feedback.id };
  const own = await call('get_feedback_detail', expected);
  assert.equal(own.value.ok, true, JSON.stringify(own.value));
  if (own.value.ok) assert.equal((own.value.data as any).result.content, feedback.content);
  current = denied; expected = { feedbackId: 99 };
  const foreign = await call('get_feedback_detail', expected);
  assert.equal(foreign.value.ok, true, JSON.stringify(foreign.value));
  if (foreign.value.ok) {
    assert.equal((foreign.value.data as any).success, false);
    assert.equal((foreign.value.data as any).result, undefined);
  }
});
