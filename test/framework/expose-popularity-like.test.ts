import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessOtherBoardsLikeV1RewardRepeatLimitAndTargets$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_OTHER_BOARD_RESPONSE=popularity\.like\|([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ args: JSON.parse(m[1]), envelope: JSON.parse(m[3]) })).filter(row => row.args.target?.uid === 2 && row.args.boardType === 'battle');
assert.ok(rows.length);
test('人气点赞保留实际结算、拒绝及原消息重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/popularity.like');
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { boardType: 'battle', target: { uid: 2 } });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'like_popularity', { targetUid: 2, boardType: 'battle' }), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []); assert.deepEqual(run.messages, []); assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.envelope.data.success);
    if (result.success && result.branch === 'business') assert.deepEqual(result.result, current.envelope.data.data);
    else assert.equal(result.result, undefined);
    const again = await call(); assert.equal(again.value.ok, true); assert.equal(keys.at(-1), keys.at(-2));
  }
});
