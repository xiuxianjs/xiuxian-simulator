import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import handler from '../../src/response/groupSubscription/res';

after(() => shutdownLogger());
test('群订阅只处理明确指令，其余消息继续事件链', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' } } });
  t.after(() => app.dispose());
  for (const text of ['/开启群订阅 其他插件', '/关闭群订阅额外内容', '订阅相关讨论']) {
    const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.nextCalls.length, 1);
    assert.deepEqual(result.messages, []);
  }
});
