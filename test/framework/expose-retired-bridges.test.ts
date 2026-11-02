import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const config = { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'fixture' } } };
for (const privateChat of [false, true]) test(`旧教学和任务配置不能绕过玩法停用 private=${privateChat}`, async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let requests = 0;
  t.mock.method(axios, 'create', () => { requests++; throw new Error('retired command reached backend'); });
  const event = privateChat ? app.events.privateMessage({ platform: 'qq-bot', userId: 'bridge', messageId: 'bridge-private' }) : app.events.groupMessage({ platform: 'qq-bot', userId: 'bridge', messageId: 'bridge-group' });
  const run = await app.invoke(event, async () => {
    for (const prefix of ['', '/', '#', '＃', '！']) for (const command of ['宗门大比', '黑盒出价 1 D01 100', '逛店 123', '切换主题 1', '领取测试礼包 OLD', '海外仙岛 测试 货品', '限时活动 商店']) {
      const value = prefix + command;
      for (const [action, input] of [
        ['perform_onboarding_action', { version: 1, command: value }],
        ['set_task_chain_step', { slot: 1, step: 1, content: value }]
      ] as const) {
        const response = await Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input);
        assert.equal(response.ok, false, `${action}: ${value}`);
        if (!response.ok) {
          assert.equal(response.error.code, 'FORBIDDEN', JSON.stringify(response));
          assert.match(response.error.message, /该玩法已下架/);
        }
      }
    }
  }, 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(requests, 0);
});

test('普通指令参数提到下架名称不会被误拦截', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let requests = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { requests++; throw new Error('fixture transport unavailable'); } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'active-command', messageId: 'active' }), async () => {
    for (const content of ['/我是 黑盒 男', '/赠送 2 主题材料', '/我的宗门', '/回归奖励', '/礼包码 CODE']) {
      const response = await Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'set_task_chain_step', { slot: 1, step: 1, content });
      assert.equal(response.ok, false);
      if (!response.ok) assert.doesNotMatch(response.error.message, /该玩法已下架/);
    }
  }, 'ai-plugin');
  assert.deepEqual(run.errors, []);
  assert.equal(requests, 5, 'supported command must reach its normal API path');
});
