import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import ranking from '../../src/response/shop/playerShop/ranking/res';
import help from '../../src/response/help';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const page of [1, 2, 3]) {
  test(`小店排行第 ${page} 页保留真实名次`, async t => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      rank: index + 1, shopName: `店铺${index + 1}`, ownerName: '掌柜',
      heatScore: 100 - index, levelName: '小店', totalSales: 1
    }));
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(ranking, app.events.groupMessage({ text: `/小店排行 ${page}`, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const { text } = inspectMessage(message.nodes);
    for (let rank = (page - 1) * 5 + 1; rank <= Math.min(page * 5, 12); rank++) {
      const marker = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `【${rank}】`;
      assert.ok(text.includes(`${marker} 「店铺${rank}」 小店`), text);
    }
    assert.doesNotMatch(text, /(?:^|\n)\d+\.\s/);
  });
}

for (const [stage, count] of [[1, 5], [2, 6], [3, 5]]) {
  test(`帮助阶段 ${stage} 的独立引用块保留清单序号`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
      registered: true, moreVisibleCommands: [], foldVisibleCommands: []
    }));
    const result = await app.runHandler(help, app.events.groupMessage({ text: `/帮助 ${stage}`, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const { text } = inspectMessage(message.nodes);
    for (let index = 1; index <= count; index++) assert.ok(text.includes(`【${index}】 `), text);
    assert.doesNotMatch(text, /(?:^|\n|>\s*)\d+\.\s/);
  });
}
