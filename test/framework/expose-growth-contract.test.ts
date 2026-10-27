import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeGrowthContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_GROWTH_HTTP=(.+)/g)].map(match => JSON.parse(match[1]));
const actions = ['get_skill_book_detail', 'comprehend_skill_book', 'upgrade_skill_book', 'get_profession_dashboard'];
for (const action of actions) test(`${action}: 真实服务端状态与结算回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length >= 6);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, current.command);
    assert.deepEqual(body.arguments, current.args);
    assert.equal(body.taskInput, undefined);
    assert.ok([...body.messageText].length <= 80);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let succeeded = 0;
  let refused = 0;
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const originalText = event.MessageText;
    const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    const run = await invoke();
    assert.deepEqual(run.errors, []);
    assert.deepEqual(run.messages, []);
    assert.deepEqual(run.actions, []);
    assert.equal(event.MessageText, originalText);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = run.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    succeeded++;
    const data = server.data;
    if (action === 'get_skill_book_detail') {
      assert.equal(actual.result.skillBookId, 2);
      assert.equal(actual.result.skillBook.id, 2);
      assert.equal(actual.result.proficiencyPoints, data.detail.proficiencyPoints);
      for (const [key, value] of Object.entries(actual.result.skillBook)) {
        if (key === 'detailDisplay' || key === 'skillEffects') continue;
        assert.deepEqual(value, data.detail.book[key], key);
      }
      assert.deepEqual(actual.result.skillBook.buffNames, data.detail.book.buffNames);
      assert.deepEqual(actual.result.skillBook.detailDisplay.effectLines, data.detail.book.detailDisplay.effectLines);
      assert.equal(actual.result.skillBook.skillEffects.length, data.detail.book.skillEffects.length);
    } else if (action === 'comprehend_skill_book') {
      assert.equal(actual.result.consumedPoints, data.consumedPoints);
      assert.equal(actual.result.successCount + actual.result.failCount, actual.result.consumedPoints);
      assert.equal(actual.result.newProficiency - actual.result.oldProficiency, actual.result.successCount);
      assert.equal(actual.result.remainingPoints, data.remainingPoints ?? 0);
    } else if (action === 'upgrade_skill_book') {
      assert.deepEqual(actual.result, data.result);
      if (current.state === 'no-exp' || current.state === 'no-money' || current.state === 'full') assert.equal(actual.result.successCount, 0);
    } else {
      assert.equal(actual.result.alchemy.level, data.alchemy.level);
      assert.equal(actual.result.alchemy.primaryAction, data.alchemy.primaryAction);
      assert.equal(actual.result.lingzhi.dailyExpGained, data.lingzhi.dailyExpGained);
      assert.equal(actual.result.alchemy.nextExpRequired, data.alchemy.nextExpRequired ?? undefined);
      assert.deepEqual(actual.result.access.features, Object.entries(data.access.features ?? {}).map(([key, value]: any) => ({ key, ...value })));
    }
    const again = await invoke();
    assert.equal(again.value.ok, true);
    assert.deepEqual(again.value.ok && again.value.data, run.value.data);
    assert.ok(requests.at(-1).headers['idempotency-key']);
    assert.equal(requests.at(-1).headers['idempotency-key'], requests.at(-2).headers['idempotency-key']);
  }
  assert.ok(succeeded > 0);
  assert.ok(refused > 0);
});

for (const action of actions) for (const mode of ['disabled', 'spoof', 'missing-id', 'cancel', 'malformed', 'mismatch'] as const) test(`${action}: ${mode}`, async t => {
  const fixture = fixtures.find(row => row.action === action && row.state === 'ready');
  assert.ok(fixture?.envelope.data.success);
  const app = createTestApp({ config: { 'xiuxian-game': { expose: { enabled: mode !== 'disabled' }, backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  const controller = new AbortController();
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    if (mode === 'cancel') return new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
      controller.abort();
    });
    const envelope = structuredClone(fixture.envelope);
    if (mode === 'malformed') envelope.data.data = {};
    if (mode === 'mismatch') {
      const data = envelope.data.data;
      if (action === 'get_skill_book_detail') data.bookId = 99;
      else if (action === 'comprehend_skill_book') data.consumedPoints = 999;
      else if (action === 'upgrade_skill_book') data.result.skillBookId = 99;
      else data.alchemy.level = 'bad';
    }
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, mode === 'spoof' ? { ...fixture.input, uid: 999 } : fixture.input, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.ok, false);
  assert.equal(calls, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
  if (!result.value.ok) assert.equal(result.value.error.outcome, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 'not_started' : 'unknown');
});
for (const [action, input] of [
  ['get_skill_book_detail', { bookId: 0 }], ['get_skill_book_detail', { bookId: 1.5 }],
  ['comprehend_skill_book', { bookId: 2, points: 0 }], ['comprehend_skill_book', { bookId: 2, points: 1.5 }],
  ['comprehend_skill_book', { bookId: 2, points: Number.MAX_SAFE_INTEGER + 1 }],
  ['upgrade_skill_book', { bookId: 2, count: 0 }], ['upgrade_skill_book', { bookId: 2, count: 37 }],
  ['get_profession_dashboard', { operation: 'admin' }]
] as const) test(`${action}: 拒绝无效输入 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, false);
  if (!run.value.ok) assert.equal(run.value.error.code, 'INVALID_INPUT');
});
