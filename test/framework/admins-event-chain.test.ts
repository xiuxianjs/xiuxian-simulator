import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/admins/res';

after(() => shutdownLogger());
test('权限入口仅拦截明确指令，其他平台和文本继续事件链', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' } } });
  t.after(() => app.dispose());
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, 'sent', { id: 'receipt' })]);
  for (const [platform, text] of [['qq-bot', '/设置 其他插件'], ['qq-bot', '/管理 123 多余'], ['other', '/设置'], ['qq-bot', '这是权限说明']] as const) {
    const result = await app.runHandler(handler, app.events.groupMessage({ platform, text }));
    assert.deepEqual(result.errors, []); assert.equal(result.nextCalls.length, 1, text); assert.equal(result.messages.length, 0);
  }
  const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text: '/设置' }));
  assert.deepEqual(result.errors, []); assert.equal(result.nextCalls.length, 0); assert.equal(result.messages.length, 1);
  assert.match(inspectMessage(result.messages[0].nodes).text, /权限设置/);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
