import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotExposeTitleTaskAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/EXPOSE_TITLE_TASK=([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], envelope: JSON.parse(match[2]) }));

test('称号连锁任务保留真实服务端推进和业务结果', async t => {
  assert.equal(rows.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const activate = current.operation === 'titles.activate';
    const action = activate ? 'activate_title' : 'deactivate_title';
    const input = activate ? { titleId: 101, taskInput: '佩戴称号 101' } : { taskInput: '卸下称号' };
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const actual = run.value.data as any;
      assert.equal(actual.success, true);
      assert.deepEqual(actual.taskContinuation, current.envelope.data.middleware.taskContinuation);
      if (activate) assert.equal(actual.result.id, 101);
      else assert.equal(actual.result.removed, true);
    }
  }
});
