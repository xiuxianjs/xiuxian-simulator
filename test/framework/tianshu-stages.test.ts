import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
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
      realm: stageLevel === 1 ? (index === 1 ? '练气一层' : ['炼气一层', '炼气二层', '炼气三层'][Math.floor(index / 4)]) : stageName, realmReached: stageLevel <= 2, visible: stageLevel <= 3, conditions: ['需持有对应材料']
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
    const foundation = await open('/天书 筑基中期');
    assert.match(foundation.text, /天书 · 筑基.*玩法2-0/s);
    assert.ok(foundation.commands.includes('/帮助 筑基'));
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
    assert.equal(requests.length, 8);
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


test('天书境界按钮进入个人帮助并可返回对应解锁页', async t => {
  const catalogue = structuredClone(content);
  catalogue.upcoming = { realm: '炼气三层', features: ['交易所', '战斗模板'] };
  catalogue.currentStage = { stageLevel: 1, stageName: '炼气', realmName: '炼气二层', unlocks: [] };
  catalogue.featureCatalog?.find(group => group.stageLevel === 1)?.features.reverse();
  catalogue.featureCatalog?.find(group => group.stageLevel === 1)?.features.push({
    id: 'herbalist',
    name: '灵药师',
    description: '完成引导后种植',
    realm: '炼气七层',
    realmReached: false,
    visible: true,
    conditions: ['须完成灵药师引导']
  });
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, request.path.endsWith('/navigation.help')
      ? {
          registered: true,
          moreVisibleCommands: [],
          foldVisibleCommands: [],
          progress: {
            realm: '炼气二层',
            features: ['profile', 'storyline', 'dungeons', 'master', 'checkin', 'equipment', 'skill-books'],
            signed: false,
            lockedRealms: { herbalist: '炼气七层' },
            activityRewards: { daily: 1, weekly: 0 },
            story: { chapter: 1, cleared: 2, total: 5, chests: 0, nextStage: 3, ready: true }
          }
        }
      : catalogue)
  );
  await app.mount({ responseRouter: app.run(createGameRouter).router });

  async function open(text: string) {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1, text);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  }

  const upcoming = await open('/天书');
  assert.match(upcoming.text, /炼气三层.*交易所、战斗模板/s);
  assert.ok(upcoming.commands.includes('/帮助 炼气三层'));
  const overview = await open('/帮助');
  assert.match(overview.text, /炼气二层.*主线 1-3/s);
  assert.ok(overview.commands.includes('/帮助 炼气二层'));
  const unlocks = await open('/天书 炼气');
  const guideCommand = unlocks.commands.find(command => command === '/帮助 炼气二层');
  assert.ok(guideCommand);
  const guide = await open(guideCommand);
  assert.match(guide.text, /当前下一步.*主线 1-3/s);
  assert.ok(guide.commands.includes('/查看主线 1'));
  assert.ok(guide.commands.includes('/我的师门'));
  const powerCommand = guide.commands.find(command => command === '/帮助 怎么提升战力');
  assert.ok(powerCommand);
  const power = await open(powerCommand);
  assert.match(power.text, /先补空装备位/);
  assert.ok(power.commands.includes('/我的装备'));
  assert.ok(power.commands.includes('/我的功法'));
  assert.ok(!power.commands.includes('/帮助 神魂和道途怎么提升'));
  const resourcesCommand = guide.commands.find(command => command === '/帮助 怎么获取资源');
  assert.ok(resourcesCommand);
  const resources = await open(resourcesCommand);
  assert.ok(resources.commands.includes('/帮助 今天还能打哪些秘境'));
  assert.ok(!resources.commands.includes('/帮助 缺的材料哪里能买'));
  const rewardsCommand = resources.commands.find(command => command === '/帮助 今天有什么奖励能领');
  assert.ok(rewardsCommand);
  const rewards = await open(rewardsCommand);
  assert.match(rewards.text, /日常活跃 1 档/);
  assert.match(rewards.text, /日常签到待完成/);
  assert.ok(rewards.commands.includes('/日常活跃'));
  assert.ok(rewards.commands.includes('/签到概览'));
  const returnCommand = guide.commands.find(command => command === '/天书 炼气二层');
  assert.ok(returnCommand);
  const returned = await open(returnCommand);
  assert.equal(returned.text, unlocks.text);
  assert.deepEqual(returned.commands, unlocks.commands);
  const locked = await open('/帮助 灵田该收还是该种');
  assert.match(locked.text, /达到炼气七层后开放/);
  const unlockCommand = locked.commands.find(command => command === '/天书 炼气七层');
  assert.ok(unlockCommand);
  const unlockPage = await open(unlockCommand);
  assert.match(unlockPage.text, /炼气七层.*灵药师.*第2\/2页/s);
  const farmGuideCommand = unlockPage.commands.find(command => command === '/帮助 炼气七层');
  assert.ok(farmGuideCommand);
  const farmGuide = await open(farmGuideCommand);
  assert.match(farmGuide.text, /先完成灵药师引导.*播种/s);
  assert.ok(farmGuide.commands.includes('/加入灵药师'));
  assert.doesNotMatch(farmGuide.text, /当前下一步/);
  const secondPage = await open('/天书 炼气 2');
  const laterCommand = secondPage.commands.find(command => command === '/帮助 炼气三层');
  assert.ok(laterCommand);
  const laterGuide = await open(laterCommand);
  const laterReturn = laterGuide.commands.find(command => command === '/天书 炼气三层');
  assert.ok(laterReturn);
  const laterReturned = await open(laterReturn);
  assert.equal(laterReturned.text, secondPage.text);
  assert.deepEqual(laterReturned.commands, secondPage.commands);
  assert.deepEqual(requests.filter(request => request.path.endsWith('/navigation.help')).map(request => request.body.arguments), [
    { topic: 'overview' }, { topic: 'overview' }, { topic: 'power' }, { topic: 'resources' }, { topic: 'rewards' }, { topic: 'farm' }, { topic: 'overview' }, { topic: 'overview' }
  ]);
});

test('筑基角色没有新解锁时可从帮助找到冲脉下一步', async t => {
  const catalogue: TianshuContent = {
    ...content,
    featureCatalog: [{
      stageLevel: 2,
      stageName: '筑基',
      features: [{
        id: 'meridians',
        name: '经络',
        description: '查看经络并冲脉',
        realm: '筑基初期',
        realmReached: true,
        visible: true,
        conditions: ['冲脉仍需满足对应经络的条件与消耗']
      }]
    }]
  };
  const { app } = await gameFixture(t, request => {
    const topic = (request.body.arguments as { topic?: string }).topic;
    return businessEnvelope(request.bid, request.path.endsWith('/navigation.help') ? {
      registered: true,
      moreVisibleCommands: [],
      foldVisibleCommands: [],
      progress: {
        realm: '筑基初期',
        features: ['profile', 'storyline', 'meridians', 'demon-tower'],
        ...(topic === 'tower' ? { tower: { started: false, finished: false, layer: 1, sweepable: true, sweepableLayers: 2 } } : {}),
        story: { chapter: 2, cleared: 2, total: 5, chests: 1, nextStage: 3, ready: false },
        ...(topic === 'meridian' ? { details: ['今日剩余 2 次 · 当前真气 8', '任脉 · 本次需要 10 真气', '真气不足'], missingPulseQi: 2 } : {})
      }
    } : catalogue);
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });

  async function open(text: string) {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1, text);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  }

  const upcoming = await open('/天书');
  assert.match(upcoming.text, /筑基中期.*暂无新增玩法/s);
  const directory = await open('/天书 筑基');
  assert.match(directory.text, /经络.*筑基初期/s);
  const overview = await open('/帮助');
  assert.match(overview.text, /主线有 1 个宝箱可领/);
  assert.ok(overview.commands.includes('/查看主线'));
  const guideCommand = overview.commands.find(command => command === '/帮助 筑基初期');
  assert.ok(guideCommand);
  const guide = await open(guideCommand);
  assert.match(guide.text, /先核对真气和剩余次数/);
  const followUp = guide.commands.find(command => command === '/帮助 今天还能冲几次脉');
  assert.ok(followUp);
  const detail = await open(followUp);
  assert.match(detail.text, /今日剩余 2 次.*当前真气 8.*需要 10 真气.*真气不足/s);
  assert.match(detail.text, /还差 2 点/);
  assert.ok(detail.commands.includes('/帮助 闭关怎么攒修为'));
  assert.ok(detail.commands.includes('/经络'));
  const towerCommand = guide.commands.find(command => command === '/帮助 妖塔接下来打哪层');
  assert.ok(towerCommand);
  const tower = await open(towerCommand);
  assert.match(tower.text, /今天可扫荡前 2 层/);
  assert.ok(tower.commands.includes('/妖塔'));
});


test('旧版天书只展示明确的解锁预告', async t => {
  const old = { ...content, upcoming: undefined };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, old));
  const event = () => app.events.privateMessage({ text: '/天书', platform: 'qq-bot' });
  const unknown = await app.runHandler(tianshu, event());
  assert.equal(unknown.messages.length, 1);
  assert.match(inspectMessage(unknown.messages[0].nodes).text, /暂无下一境界资料/);
  old.nextStage = { stageLevel: 3, stageName: '金丹', unlocks: [{ realm: '金丹初期', features: ['本命物升品'], unlocked: false }] };
  const known = await app.runHandler(tianshu, event());
  assert.equal(known.messages.length, 1);
  const message = known.messages[0];
  assert.equal(known.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /金丹初期.*最近有已知解锁的境界.*本命物升品/s);
  assert.ok(view.commands.includes('/帮助 金丹初期'));
});
