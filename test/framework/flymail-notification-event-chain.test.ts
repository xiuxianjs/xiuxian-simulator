import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import home from '../../src/response/flyMail/home/res';
import send from '../../src/response/flyMail/send/res';
import mute from '../../src/response/flyMail/mute/res';
import settings from '../../src/response/notification/settings/res';
import history from '../../src/response/notification/history/res';
import community from '../../src/response/notification/community/res';
import guildSubscription from '../../src/response/flyMail/guildSubscription/res';

after(() => shutdownLogger());
test('飞信和通知设置未匹配内容继续交给其他插件', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' } } });
  t.after(() => app.dispose());
  for (const handler of [home, send, mute, settings, history, community, guildSubscription]) {
    for (const text of ['/其他插件 指令', '讨论飞信和通知设置']) {
      const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.nextCalls.length, 1, text);
      assert.deepEqual(result.messages, []);
    }
  }
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, 'sent', { id: 'receipt' })]);
  for (const text of ['/宗门群订阅', '/取消师门群订阅']) {
    const result = await app.runHandler(guildSubscription, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.nextCalls.length, 0);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  }
});
