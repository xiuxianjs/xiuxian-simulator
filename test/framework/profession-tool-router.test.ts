import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import router from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const command of ['替换', '切换']) {
  for (const privateChat of [false, true]) {
    test(`${command}通过真实${privateChat ? '私聊' : '群聊'}路由执行一次天工替换`, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
        mode: 'replace',
        result: {
          toolId: 1, userToolId: 2, toolName: '测试丹炉', typeName: '丹炉',
          gradeName: '凡品', gradeLevel: 1, message: '已切换测试丹炉'
        }
      }));
      await app.mount({ responseRouter: router });
      const options = { text: `/${command} 2`, platform: 'qq-bot' };
      const event = privateChat ? app.events.privateMessage(options) : app.events.groupMessage(options);
      const result = await app.dispatch(event);

      assert.deepEqual(result.errors, []);
      assert.equal(requests.length, 1);
      assert.ok(requests[0].path.endsWith('/profession.replace-tool'));
      assert.deepEqual(requests[0].body.arguments, { identifier: '2' });
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.match(inspectMessage(message.nodes).text, /已切换测试丹炉/);
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}
