import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSkillLearnReference$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const previews = [...output.matchAll(/EXPOSE_LEARN_REFERENCE_PREVIEW=(.+)/g)].map(match => JSON.parse(match[1]));
const confirmations = [...output.matchAll(/EXPOSE_LEARN_REFERENCE_CONFIRM=([^|]+)\|(.+)/g)].map(match => ({ reference: match[1], envelope: JSON.parse(match[2]) }));
assert.ok(previews.length > 0);
assert.equal(confirmations.length, 1);
const confirmation = confirmations[0];
const preview = previews.find(row => row.data.data.reference === confirmation.reference);
assert.ok(preview);

for (const action of ['prepare_skill_learn', 'confirm_skill_learn'] as const) test(`${action}: 原返还预览与实际学习结算`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/skill-books.learn');
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, action === 'prepare_skill_learn' ? { bookId: '2', confirm: null, exposePreview: true } : { bookId: '2', confirm: '确认', reference: confirmation.reference });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(action === 'prepare_skill_learn' ? preview : confirmation.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const input = action === 'prepare_skill_learn' ? { bookId: 2 } : { bookId: 2, reference: confirmation.reference };
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const run = await call();
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.messages, []);
  assert.deepEqual(run.actions, []);
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (!run.value.ok) return;
  const data = run.value.data as any;
  assert.equal(data.success, true);
  assert.equal(data.result.outcome, action === 'prepare_skill_learn' ? 'confirmation_required' : 'learned');
  if (action === 'prepare_skill_learn') {
    assert.equal(data.result.reference, confirmation.reference);
    assert.deepEqual(data.result.previewRefund, preview.data.data.previewRefund);
    assert.equal(data.result.previewRefund.transferredProficiency, 65);
  } else assert.deepEqual(data.result.refundInfo, preview.data.data.previewRefund);
  const retry = await call();
  assert.equal(retry.value.ok, true);
  if (retry.value.ok) assert.deepEqual(retry.value.data, run.value.data);
  assert.ok(keys[0]);
  assert.equal(keys[0], keys[1]);
});

for (const [action, input] of [
  ['prepare_skill_learn', { bookId: 2, uid: 3 }],
  ['confirm_skill_learn', { bookId: 2, reference: 'r1_1_l_x_abc' }],
  ['confirm_skill_learn', { bookId: 0, reference: confirmation.reference }],
  ['confirm_skill_learn', { bookId: 2, reference: confirmation.reference.replace('_l_', '_k_') }]
] as const) test(`${action}: 拒绝无效确认`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input reached HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
});
