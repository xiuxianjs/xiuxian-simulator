import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessProfileActionsFeedbackReplayAndStock$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_PROFILE_ACTION_RESPONSE=([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));

for (const entry of [
  { action: 'rename_player', op: 'profile.rename', value: '青云', command: '/改名 青云', expected: '青云' },
  { action: 'change_player_gender', op: 'profile.gender', value: '女', command: '/改性 女', expected: '女' },
  { action: 'set_player_signature', op: 'profile.signature', value: '*签名*', command: '/改签名 *签名*', expected: '\\*签名\\*' },
  { action: 'set_player_signature', op: 'profile.signature', value: '', command: '/改签名', expected: '' }
]) test(`${entry.action}: 服务端回执与同消息重试`, async t => {
  const fixture = rows.find(row => row.operation === entry.op && row.envelope.data.success && row.envelope.data.data?.value === entry.expected);
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${entry.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, entry.command);
    assert.deepEqual(body.arguments, { value: entry.value });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, { value: entry.value }), 'ai-plugin');
  const result = await call();
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result, fixture.envelope.data.data);
  await call();
  assert.equal(keys[0], keys[1]);
});
