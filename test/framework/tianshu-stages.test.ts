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
  upcoming: { realm: '筑基中期', features: [] },
  intro: '不应重复展示的总说明', realmUnlocks: [], notes: [],
  currentStage: { stageLevel: 2, stageName: '筑基', realmName: '筑基初期', unlocks: [] },
  nextStage: { stageLevel: 3, stageName: '金丹', unlocks: [] },
  featureCatalog: ['通用', '炼气', '筑基', '金丹', '元婴'].map((stageName, stageLevel) => ({
    stageLevel, stageName,
    features: stageLevel === 4 ? [] : Array.from({ length: stageLevel === 1 ? 12 : 1 }, (_, index) => ({
      id: `${stageLevel}-${index}`, name: `玩法${stageLevel}-${index}`, description: `内容${stageLevel}-${index}`,
      realm: stageLevel === 1 ? ['炼气一层', '炼气二层', '炼气三层'][Math.floor(index / 4)] : stageName, realmReached: stageLevel <= 2, visible: stageLevel <= 3, conditions: ['需持有对应材料']
    }))
  }))
};
for (const isPrivate of [true, false]) {
  test(`天书简版及境界页 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, content));
    async function open(command: string) {
      const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
      const result = await app.runHandler(tianshu, event);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      return inspectMessage(message.nodes);
    }
    const summary = await open('/天书');
    assert.match(summary.text, /筑基中期.*暂无新增玩法/s);
    assert.doesNotMatch(summary.text, /玩法[23]-|需持有对应材料/);
    assert.ok(summary.commands.includes('/天书 目录'));
    assert.ok(summary.commands.includes('/帮助 筑基中期'));
    const first = await open('/天书 练气');
    assert.match(first.text, /炼气.*第1\/2页/s);
    assert.equal(first.text.split("\n").filter(line => line.includes("玩法：")).join("").match(/玩法1-\d+/g)?.length, 8);
    assert.match(first.text, /炼气一层.*玩法1-0、玩法1-1、玩法1-2、玩法1-3/s);
    assert.doesNotMatch(first.text, /炼气三层/);
    assert.ok(first.commands.includes('/帮助 炼气一层'));
    assert.ok(first.commands.includes('/帮助 炼气二层'));
    const next = first.commands.find(command => command === '/天书 炼气 2');
    assert.ok(next);
    const second = await open(next);
    assert.match(second.text, /玩法1-11.*第2\/2页/s);
    assert.doesNotMatch(second.text, /玩法1-0/);
    assert.ok(second.commands.includes('/天书 炼气 1'));
    assert.match((await open('/天书 1')).text, /玩法1-0/);
    assert.match((await open('/天书 通用')).text, /玩法0-0/);
    assert.match((await open('/天书 99999999999999999999999')).text, /此境界暂无新增玩法/);
    const invalid = await open('/天书 占位文本');
    assert.match(invalid.text, /境界目录/);
    assert.doesNotMatch(invalid.text, /占位文本/);
    assert.ok(invalid.commands.includes('/天书 炼气'));
    assert.equal(requests.length, 7);
  });
}
for (const guest of [true, false]) {
  test(`缺少当前境界或已至末境 guest=${guest}`, async t => {
    const data = { ...content, upcoming: guest ? { realm: '炼气一层', features: ['主线挑战'] } : { realm: '', features: [] }, currentStage: guest ? undefined : { stageLevel: 4, stageName: '元婴', unlocks: [] }, nextStage: guest ? { stageLevel: 1, stageName: '炼气', unlocks: [] } : undefined };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(tianshu, app.events.privateMessage({ text: '/天书', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, guest ? /炼气一层.*主线挑战/s : /暂无下一境界资料/);
    assert.doesNotMatch(view.text, /玩法[23]-/);
  });
}
