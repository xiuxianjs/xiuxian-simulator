import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotExposeEquippedTaskAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const envelope = JSON.parse(output.match(/EXPOSE_EQUIPPED_TASK=(.+)/)![1]);

test('我的装备任务保留真实套装、穿戴与任务推进回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/equipment.equipped');
    assert.equal(body.messageText, '/我的装备'); assert.equal(body.taskInput, '我的装备'); assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_equipped', { taskInput, intentId: 'equipped-1' }), 'ai-plugin');
  const first = await call('我的装备'); assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) {
    const data = first.value.data as any;
    assert.deepEqual(data.taskContinuation, envelope.data.middleware.taskContinuation);
    assert.deepEqual(data.result.items.map((item: any) => item.id), envelope.data.data.items.map((item: any) => item.id));
    assert.equal(data.result.sets.length, envelope.data.data.sets.length);
  }
  assert.equal((await call('我的装备')).value.ok, true); assert.equal(keys[0], keys[1]);
  assert.equal((await call('我的武器')).value.ok, false); assert.equal(keys.length, 2);
});
