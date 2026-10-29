import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeBlocklist$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).toString();
const fixtures = [...output.matchAll(/ROBOT_EXPOSE_BLOCKLIST=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
const listed = fixtures.find(row => row.op === 'friends.blocklist');
assert.ok(listed);
const recordId = listed.envelope.data.data.data[0].id as number;
const cases = [
  { action: 'get_friend_blocklist', op: 'friends.blocklist', input: {}, args: {}, command: '/黑名单', fixture: listed },
  { action: 'block_friend_by_name', op: 'friends.block', input: { targetName: '候选者' }, args: { targetName: '候选者' }, command: '/拉黑 候选者', fixture: fixtures.find(row => row.op === 'friends.block') },
  { action: 'unblock_friend', op: 'friends.unblock', input: { recordId }, args: { recordId: String(recordId) }, command: `/取消拉黑 ${recordId}`, fixture: fixtures.find(row => row.op === 'friends.unblock') }
];
for (const entry of cases) test(`${entry.action}: 真实社交回执和身份范围`, async t => {
  assert.ok(entry.fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${entry.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, entry.command);
    assert.deepEqual(body.arguments, entry.args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(entry.fixture!.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, entry.input), 'ai-plugin');
  const response = await call();
  assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) {
    const result = (response.value.data as any).result;
    assert.equal(result.access.ok, true);
    if (entry.op === 'friends.blocklist') assert.equal(result.data[0].blockedUserName, '候选者');
    else assert.equal(result.data.outcome, entry.op === 'friends.block' ? 'blocked' : 'removed');
  }
  await call();
  if (entry.op === 'friends.blocklist') assert.notEqual(keys[0], keys[1]);
  else assert.equal(keys[0], keys[1]);
});
