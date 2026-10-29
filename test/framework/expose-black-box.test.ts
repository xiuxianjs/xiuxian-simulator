import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBlackBoxIdentityPreviewReplayAndRecovery$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_BLACK_BOX_EXPOSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], key: row[2], envelope: JSON.parse(row[3]) }));
test('黑盒私聊操作使用服务端回执，报价保持重试幂等且不泄露隐藏字段', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const target = { eventId: 1, roomId: 'D01-1200-C' };
  const firstProbe = fixtures.find(row => row.key === 'room')!.envelope.data.data.appraisal.probes[0].id;
  const cases = [
    ['black-box.overview', 'overview', 'get_black_box_overview', {}, {}, true],
    ['black-box.history', 'history', 'get_black_box_history', {}, { page: 1 }, true],
    ['black-box.reservation', 'reserve', 'manage_black_box_reservation', { ...target, action: 'reserve' }, { ...target, action: 'reserve' }, false],
    ['black-box.room', 'room', 'get_black_box_room', target, target, true],
    ['black-box.probe', 'probe-0', 'reveal_black_box_clue', { ...target, direction: firstProbe }, { ...target, direction: firstProbe }, false],
    ['black-box.probe', 'probe-1', 'reveal_all_black_box_clues', target, { ...target, all: true }, false],
    ['black-box.bid', 'quote-1000', 'withdraw_black_box_bid', target, { ...target, amount: 0 }, false],
    ['black-box.bid-preview', 'preview', 'preview_black_box_bid', { ...target, amount: 1000 }, { ...target, amount: 1000 }, true],
    ['black-box.bid', 'quote-1000', 'submit_black_box_bid', { ...target, amount: 1000 }, { ...target, amount: 1000 }, false],
    ['black-box.room', 'final', 'get_black_box_room', target, target, true]
  ] as const;
  for (const [operation, key, action, input, expected, read] of cases) {
    op = operation; args = expected; envelope = structuredClone(fixtures.find(row => row.op === op && row.key === key)?.envelope); assert.ok(envelope, key);
    if (key === 'room') envelope.data.data.secretPlan = 'never expose';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    assert.doesNotMatch(JSON.stringify(result.value), /secretPlan|never expose|winnerId|tieOrder/);
    if (key === 'final' && result.value.ok) assert.equal(JSON.parse((result.value.data as any).result.detailsJson).result.charged, 1100);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
  const group = app.events.groupMessage({ platform: 'qq-bot', userId: 'player' }); const before = keys.length;
  for (const [, , action, input] of cases) {
    const result = await app.invoke(group, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(result.value.ok, false); assert.equal(keys.length, before);
  }
  op = 'black-box.bid-preview'; args = { ...target, amount: 1000 }; envelope = structuredClone(fixtures.find(row => row.key === 'preview')!.envelope);
  envelope.data.data.amount = 1100;
  const mismatch = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'preview_black_box_bid', args), 'ai-plugin');
  assert.equal(mismatch.value.ok, false);
});
