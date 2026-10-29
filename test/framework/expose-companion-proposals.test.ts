import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import acceptHandler from '../../src/response/companion/accept/res';
import rejectHandler from '../../src/response/companion/reject/res';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotCompanionProposalExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const match = output.match(/ROBOT_COMPANION_ACTION_RESPONSE=companion\.accept\|[^|]+\|[^|]+\|(.+)/);
assert.ok(match);
const envelope = JSON.parse(match[1]);

test('道侣申请查询保留服务端原申请身份和时间', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/companion.accept');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { name: '' });
    assert.equal(body.messageText, '/同意道侣');
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_companion_proposals', {}), 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.deepEqual((run.value.data as any).result.received, envelope.data.data.received);
});

test('非道侣申请指令继续事件链', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' } } });
  t.after(() => app.dispose());
  for (const [handler, text] of [[acceptHandler, '/同意道侣工具'], [rejectHandler, '/拒绝道侣工具']] as const) {
    const run = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(run.errors, []);
    assert.equal(run.nextCalls.length, 1);
    assert.equal(run.messages.length, 0);
  }
});
