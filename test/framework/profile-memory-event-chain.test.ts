import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import profileHandler from '../../src/response/props/rename/res';
import memoryHandler from '../../src/response/battle/memoryPage/res';

after(() => shutdownLogger());
test('资料和回忆处理器仅拦截明确属于本包的指令', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' } } });
  t.after(() => app.dispose());
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, 'sent', { id: 'receipt' })]);
  for (const [handler, text] of [
    [profileHandler, '/改名工具'], [profileHandler, '其他插件的改签名'], [profileHandler, '/改性别'],
    [memoryHandler, '/战斗回忆翻页工具'], [memoryHandler, '其他插件的战斗回忆'], [memoryHandler, '/其他命令']
  ] as const) {
    const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.nextCalls.length, 1, text);
    assert.equal(result.messages.length, 0, text);
  }
  const result = await app.runHandler(memoryHandler, app.events.groupMessage({ platform: 'qq-bot', text: '/战斗回忆翻页 不存在' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.nextCalls.length, 0);
  assert.equal(result.messages.length, 1);
  assert.match(inspectMessage(result.messages[0].nodes).text, /失效或不可访问/);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
