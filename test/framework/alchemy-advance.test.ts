import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import alchemy from '../../src/response/alchemy/v2/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const exp of [5010, 4049]) {
  test(`炼丹房显示已有经验 ${exp}，进阶由炼制结算`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      title: '我的洞府 · 炼丹房',
      heading: '',
      text: '',
      blocks: [{ text: `等级：6\n经验：${exp} / 4050`, quoted: true }],
      buttons: [{ label: '返回洞府', command: '/我的洞府' }],
      advice: []
    }));
    const result = await app.runHandler(alchemy, app.events.groupMessage({ text: '/炼丹', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /等级：6/);
    assert.ok(view.text.includes(`经验：${exp} / 4050`));
    assert.ok(!view.commands.includes('/炼丹 进阶'));
  });
}

for (const command of ['/炼丹师进阶', '/炼丹进阶', '/炼丹 进阶']) {
  test(`${command} 发送进阶请求并展示服务端余量`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      title: '炼丹', heading: '', text: '炼丹师：6级 → 7级\n剩余经验：960\n已结算原有经验，未消耗材料。', blocks: [],
      buttons: [{ label: '返回炼丹', command: '/炼丹' }], advice: []
    }));
    const result = await app.runHandler(alchemy, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.messageText, '/炼丹 进阶');
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /剩余经验：960/);
    assert.ok(view.commands.includes('/炼丹'));
  });
}
