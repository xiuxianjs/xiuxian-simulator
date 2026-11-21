import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import cultivate from '../../src/response/cavePlot/cultivate/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

const reason = '材料不足，本次未消耗材料：\n【灵土】需要5，现有4，还缺1。';
const shortages = [{ itemId: 30, name: '灵土', required: 5, available: 4, missing: 1 }];

for (const isPrivate of [false, true]) {
  test(`缺料回执给出精确物品编号的获取途径入口 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(
      t,
      request =>
        businessEnvelope(request.bid, undefined, [
          { title: '', heading: '', text: reason, buttons: [], advice: [], shortages }
        ]),
      200
    );
    const event = isPrivate
      ? app.events.privateMessage({ text: '/开垦 5', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/开垦 5', platform: 'qq-bot' });
    const result = await app.runHandler(cultivate, event);

    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);

    // The exact refusal stays authoritative; the bot only adds the entry.
    assert.ok(view.text.includes(reason), view.text);
    assert.ok(view.text.includes('还缺1'), view.text);
    // The source entry is a real footer button carrying the catalog id, never a
    // name the bot guessed from the server text.
    assert.ok(view.commands.includes('/物品详情 材料 30'), JSON.stringify(view.commands));
    // Returning stays available.
    assert.ok(view.commands.includes('/灵田'), JSON.stringify(view.commands));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('没有 shortages 的旧响应保持原有回执，不出现获取途径入口', async t => {
  const { app } = await gameFixture(
    t,
    request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]),
    200
  );
  const event = app.events.groupMessage({ text: '/开垦 5', platform: 'qq-bot' });
  const result = await app.runHandler(cultivate, event);
  const view = inspectMessage(result.messages[0].nodes);

  assert.ok(view.text.includes(reason), view.text);
  assert.ok(!view.commands.some(command => command.startsWith('/物品详情')), JSON.stringify(view.commands));
  assert.ok(view.commands.includes('/灵田'), JSON.stringify(view.commands));
});

test('缺料入口指令不超过 80 个 Unicode 字符', async t => {
  const longest = '/物品详情 材料 9007199254740991';

  assert.ok([...longest].length <= 80);
  const { app } = await gameFixture(
    t,
    request =>
      businessEnvelope(request.bid, undefined, [
        {
          title: '',
          heading: '',
          text: reason,
          buttons: [],
          advice: [],
          shortages: [{ itemId: 9007199254740991, name: '灵土', required: 5, available: 4, missing: 1 }]
        }
      ]),
    200
  );
  const event = app.events.groupMessage({ text: '/开垦 5', platform: 'qq-bot' });
  const result = await app.runHandler(cultivate, event);
  const view = inspectMessage(result.messages[0].nodes);

  assert.ok(view.commands.includes(longest), JSON.stringify(view.commands));
});
