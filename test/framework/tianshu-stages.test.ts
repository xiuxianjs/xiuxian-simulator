import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import tianshu from '../../src/response/tianshu/res';
import type { TianshuContent } from '../../src/api/bot/tianshu-content';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const content: TianshuContent = {
  intro: '不应重复展示的总说明', realmUnlocks: [], notes: [],
  currentStage: { stageLevel: 2, stageName: '筑基', realmName: '筑基初期', unlocks: [] },
  nextStage: { stageLevel: 3, stageName: '金丹', unlocks: [] },
  featureCatalog: ['通用', '炼气', '筑基', '金丹', '元婴'].map((stageName, stageLevel) => ({
    stageLevel, stageName,
    features: stageLevel === 4 ? [] : Array.from({ length: stageLevel === 1 ? 12 : 1 }, (_, index) => ({
      id: `${stageLevel}-${index}`, name: `玩法${stageLevel}-${index}`, description: `内容${stageLevel}-${index}`,
      realm: stageName, realmReached: stageLevel <= 2, visible: stageLevel <= 3, conditions: ['需持有对应材料']
    }))
  }))
};
for (const isPrivate of [true, false]) {
  for (const command of ['/天书', '/天书 1', '/天书 2', '/天书 3', '/天书 4', '/天书 99999999999999999999999', '/天书 通用']) {
    test(`境界翻阅 ${command} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, content));
      const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
      const result = await app.runHandler(tianshu, event);
      assert.equal(requests.length, 1);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.doesNotMatch(view.text, /不应重复|开放状态仅表示/);
      if (command === '/天书') {
        assert.match(view.text, /当前大境界：筑基/);
        assert.match(view.text, /下一大境界：金丹/);
        assert.match(view.text, /玩法2-0 · 已开放/);
        assert.match(view.text, /玩法3-0 · 待开放/);
        assert.doesNotMatch(view.text, /玩法[01]-/);
        assert.ok(view.commands.includes('/天书 1'));
      } else if (command === '/天书 通用') {
        assert.match(view.text, /玩法0-0/);
        assert.doesNotMatch(view.text, /玩法[123]-/);
      } else {
        const page = Math.min(Number(command.split(' ')[1]), 4);
        assert.match(view.text, new RegExp(`第${page}/4页`));
        assert.ok(view.commands.includes('/天书'));
        if (page < 4) {
          for (const feature of content.featureCatalog![page].features) assert.ok(view.text.includes(feature.name));
          assert.ok(view.commands.includes(`/天书 ${page + 1}`));
        } else assert.match(view.text, /此境界暂无新增玩法/);
        if (page > 1) assert.ok(view.commands.includes(`/天书 ${page - 1}`));
      }
    });
  }
}
for (const guest of [true, false]) {
  test(`缺少当前境界或已至末境 guest=${guest}`, async t => {
    const data = { ...content, currentStage: guest ? undefined : { stageLevel: 4, stageName: '元婴', unlocks: [] }, nextStage: guest ? { stageLevel: 1, stageName: '炼气', unlocks: [] } : undefined };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(tianshu, app.events.privateMessage({ text: '/天书', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, guest ? /下一大境界：炼气/ : /已至天书末境/);
    assert.doesNotMatch(view.text, /玩法[23]-/);
  });
}
