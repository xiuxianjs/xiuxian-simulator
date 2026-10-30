import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotTaskExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_TASK_EXPOSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], state: row[2], envelope: JSON.parse(row[3]) }));
assert.equal(rows.length, 11);
const actions: Record<string, { action: string; input: any; args: any }> = {
  'tasks.settings': { action: 'set_task_chain_step', input: { slot: 1, step: 1, content: '签到' }, args: { slot: '1', step: '1', content: '签到' } },
  'tasks.alias': { action: 'set_task_chain_alias', input: { slot: 1, alias: '日常' }, args: { slot: '1', alias: '日常' } },
  'tasks.clear': { action: 'clear_task_chain_slot', input: { slot: 1 }, args: { slot: '1' } },
  'tasks.overview': { action: 'get_task_chain', input: {}, args: {} },
  'tasks.start': { action: 'start_task_chain', input: { slot: 1 }, args: { slot: '1' } },
  'tasks.skip': { action: 'skip_task_chain_step', input: {}, args: {} },
  'tasks.cancel': { action: 'cancel_task_chain', input: {}, args: {} }
};
test('连锁任务回执区分运行状态、待执行指令和拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.operation === 'tasks.settings' && !current.envelope.data.success ? { slot: '1', step: '10', content: '签到' } : actions[current.operation].args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const spec = current.operation === 'tasks.settings' && !current.envelope.data.success
      ? { action: 'set_task_chain_step', input: { slot: 1, step: 10, content: '签到' }, args: { slot: '1', step: '10', content: '签到' } }
      : actions[current.operation];
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', spec.action, spec.input), 'ai-plugin');
    const result = await call(); assert.deepEqual(result.errors, []); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const data = result.value.data as any;
    assert.equal(data.success, current.envelope.data.success);
    if (data.success && data.branch === 'business') assert.deepEqual(data.result, current.envelope.data.data);
    else assert.equal(data.result, undefined);
    const again = await call(); assert.equal(again.value.ok, true);
    if (current.operation === 'tasks.overview') assert.notEqual(keys.at(-1), keys.at(-2));
    else assert.equal(keys.at(-1), keys.at(-2));
    if (data.success && ['tasks.settings', 'tasks.alias', 'tasks.clear'].includes(current.operation)) {
      const invokeIntent = (intentId: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', spec.action, { ...spec.input, intentId }), 'ai-plugin');
      assert.equal((await invokeIntent('first')).value.ok, true);
      const first = keys.at(-1);
      assert.equal((await invokeIntent('first')).value.ok, true);
      assert.equal(keys.at(-1), first);
      assert.equal((await invokeIntent('second')).value.ok, true);
      assert.notEqual(keys.at(-1), first);
      const before = keys.length;
      assert.equal((await invokeIntent('invalid intent')).value.ok, false);
      assert.equal(keys.length, before);
    }
  }
});
