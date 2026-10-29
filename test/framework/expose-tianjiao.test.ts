import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessTianjiaoAccessSettlementAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_TIANJIAO_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('登天梯查询、占位、战斗与失败保留服务端回执和重试语义', async t => {
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
  for (const [operation, action, input, expected, mode, read] of [
    ['tianjiao.leaderboard', 'get_tianjiao_leaderboard', {}, {}, 'board', true],
    ['tianjiao.rewards', 'get_tianjiao_rewards', {}, {}, 'rewards', true],
    ['tianjiao.challenge', 'challenge_tianjiao', { rank: 2 }, { rankArg: '2' }, 'occupy', false],
    ['tianjiao.challenge', 'challenge_tianjiao', { rank: 1 }, { rankArg: '1' }, 'won', false],
    ['tianjiao.challenge', 'challenge_tianjiao', { rank: 1 }, { rankArg: '1' }, 'lost', false]
  ] as const) {
    op = operation; args = expected;
    const rows = fixtures.filter(row => row.op === op && (mode === 'lost' ? !row.envelope.data.success && JSON.stringify(row.envelope).includes('未能撼动') :
      row.envelope.data.success && (mode === 'occupy' ? row.envelope.data.data?.directOccupy === true : mode === 'won' ? row.envelope.data.data?.battle != null : true)));
    envelope = structuredClone(rows.at(-1)?.envelope); assert.ok(envelope, mode);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${mode}: ${JSON.stringify(result.value)}`);
    if (result.value.ok) {
      const data = result.value.data as any;
      assert.equal(data.success, mode !== 'lost');
      if (mode === 'lost') assert.match(JSON.stringify(data.replies), /未能撼动/);
      if (mode === 'occupy') assert.equal(data.result.directOccupy, true);
      if (mode === 'won') assert.equal(data.result.newRank, 1);
      if (mode === 'rewards') assert.equal(data.result.view.recordTotal, 1);
    }
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
});
