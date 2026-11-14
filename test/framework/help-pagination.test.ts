import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

for (const registered of [false, true]) {
  test(`个人帮助追问及旧数字入口 registered=${registered}`, async t => {
    let farm: { planted: number; mature: number; abnormal: number; empty?: number } | undefined = { planted: 2, mature: 1, abnormal: 0 };
    let farmNeedsGuide = false;
    let guildNeedsJoin = true;
    let inTeam = false;
    let soloFree = 1;
    let exhausted = false;
    let dungeonRead: "empty" | "unavailable" | undefined;
    let extraDungeons = false;
    let explorationStatus: { active: boolean; completed: boolean; remaining: number; settleable: number } | undefined;
    let meditation: { active: boolean; minutes: number; experience: number; trueQi: number; canStart?: boolean; startReason?: string } | undefined;
    let alchemyUnlocked = false;
    let fishingBuild = { level: 0, missingStone: 2500 };
    let realm = '元婴初期';
    let story = { chapter: 3, cleared: 2, total: 5, chests: 0, nextStage: 3, ready: true, blocker: '', blockerCode: '', allVisibleCleared: false };
    let activityRewards = { daily: 2, weekly: 0 };
    let tower: { started: boolean; finished: boolean; layer: number; stage?: number; targetLayer?: number; sweepable?: boolean; sweepableLayers?: number; canChallenge?: boolean; score?: number };
    let growth = { kind: '突破', experience: 8200, required: 10000, target: '元婴中期', ready: false, reason: '', materials: [] as { itemName: string; currentQuantity: number; requiredQuantity: number }[] };
    const { app, requests } = await gameFixture(t, request => {
      const response = businessEnvelope(request.bid, {
        registered,
        moreVisibleCommands: registered ? ['/查看主线'] : [],
        foldVisibleCommands: [],
        ...(registered && (request.body.arguments as { topic?: string }).topic ? {
          progress: {
            realm,
            features: ['profile', 'storyline', 'dungeons', 'exploration', 'herbalist', 'soul-path', 'checkin', 'tongtian-tower', 'meridians', 'market', 'demon-tower', 'teams', 'equipment', 'skill-books', 'alchemy', 'fishing-build', 'tribulation', 'guilds', 'guild-mining', 'guild-storyline'],
            growth,
            story,
            farm,
            farmNeedsGuide,
            exploration: explorationStatus,
            meditation,
            alchemyUnlocked,
            fishingBuild,
            guildNeedsJoin,
            inTeam,
            seclusion: { active: true, canEnd: true, remaining: 0 },
            tower,
            mental: 3,
            activityRewards,
            dungeonTotal: dungeonRead === "empty" ? 0 : dungeonRead ? undefined : exhausted ? 3 : 7,
            dungeons: dungeonRead === "empty" ? [] : dungeonRead ? undefined : [
              { name: '已打完', used: 2, limit: 2, free: 0, cost: 12, single: true, contributionCost: 0 },
              { name: '组队秘境', used: exhausted ? 2 : 0, limit: 2, free: exhausted ? 0 : 1, cost: 12, single: false, minPlayers: 3, contributionCost: 0 },
              ...(extraDungeons ? [
                { name: '古阵', used: 2, limit: 2, free: 0, cost: 12, single: true, contributionCost: 0 },
                { name: '石窟', used: 2, limit: 2, free: 0, cost: 12, single: true, contributionCost: 0 }
              ] : []),
              { name: '桃花镇', used: exhausted ? 2 : 0, limit: 2, free: soloFree, cost: 12, single: true, contributionCost: 0 }
            ],
            signed: true,
            ...((request.body.arguments as { topic?: string }).topic === 'tongtian' ? { details: ['通天塔每月 2-28 日开放，当前处于关闭阶段'] } : {}),
            ...((request.body.arguments as { topic?: string }).topic === 'meridian' ? { details: ['今日剩余 2 次 · 当前真气 8', '任脉 · 本次需要 10 真气', '真气不足'] } : {})
          }
        } : {})
      });
      return registered ? response : {
        ...response,
        middleware: {
          outcome: 'allow',
          reason: 'UNREGISTERED',
          identity: { bid: request.bid, account: { status: 'unregistered', playerId: null } },
          replies: [],
          contextWarnings: []
        }
      };
    }, 200, {}, 20_000);
    await app.mount({ responseRouter: app.run(createGameRouter).router });

    async function open(text: string) {
      const event = registered
        ? app.events.groupMessage({ text, platform: 'qq-bot' })
        : app.events.privateMessage({ text, platform: 'qq-bot' });
      const result = await app.dispatch(event);
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1, text);
      const [message] = result.messages;
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      return inspectMessage(message.nodes);
    }

    const overview = await open('/修仙帮助');
    assert.ok(!overview.commands.includes('/帮助 1'));
    if (registered) {
      assert.match(overview.text, /元婴初期/);
      assert.match(overview.text, /主线.*第 3 章/);
      assert.match(overview.text, /灵田.*1 块已成熟/);
      assert.ok(overview.commands.includes('/帮助 元婴初期'));
      assert.ok(overview.commands.includes('/查看主线 3'));
      const question = overview.commands.find(command => command === '/帮助 我离突破还有多远');
      assert.ok(question);
      const detail = await open(question);
      assert.match(detail.text, /还差 1,800/);
      assert.ok(detail.commands.includes('/帮助'));
      assert.match((await open('/帮助 道途突破缺什么')).text, /神魂和道途怎么提升/);
      const field = await open('/帮助 灵田该收还是该种');
      assert.match(field.text, /成熟 1 块[\s\S]*先到灵田收获/);
      assert.ok(field.commands.includes('/我的灵田'));
    } else {
      assert.ok(overview.commands.includes('/踏入仙途'));
    }

    for (const page of [1, 2, 3]) {
      const legacy = await open(`/帮助 ${page}`);
      assert.equal(legacy.text, overview.text);
      assert.deepEqual(legacy.commands, overview.commands);
      assert.deepEqual(requests.at(-1)?.body.arguments, { topic: 'overview' });
    }

    const projected = await open('/帮助 炼气七层');
    assert.match(projected.text, /修仙帮助 · 炼气七层/);
    assert.match(projected.text, /先完成灵药师引导.*空地选种播种/);
    assert.ok(projected.commands.includes('/我的灵田'));
    assert.doesNotMatch(projected.text, /8,200|元婴初期/);
    if (registered) {
      const ownStage = await open('/帮助 元婴');
      assert.match(ownStage.text, /先看温养与补给条件/);
      assert.match(ownStage.text, /当前下一步.*主线 3-3/s);
      assert.ok(ownStage.commands.includes('/查看主线 3'));
      assert.ok(ownStage.commands.includes('/帮助'));
      assert.ok(ownStage.commands.includes('/帮助 怎么提升战力'));
      assert.ok(ownStage.commands.includes('/帮助 怎么获取资源'));
      const tower = await open('/帮助 通天塔和声望怎么用');
      assert.match(tower.text, /当前处于关闭阶段/);
      assert.ok(tower.commands.includes('/商店 声望'));
      const meridian = await open('/帮助 今天还能冲几次脉');
      assert.match(meridian.text, /今日剩余 2 次.*当前真气 8[\s\S]*本次需要 10 真气[\s\S]*真气不足/);
      assert.ok(meridian.commands.includes('/经络'));
    }

    if (registered) {
      const secondLayer = await open('/帮助 炼气二层');
      assert.match(secondLayer.text, /先找境界高于自己的道友/);
      assert.ok(secondLayer.commands.includes('/我的师门'));
      const thirdLayer = await open('/帮助 炼气三层');
      assert.match(thirdLayer.text, /缺哪种材料、缺几个/);
      assert.ok(thirdLayer.commands.includes('/交易所'));
      const caveVoid = await open('/帮助 洞虚初期');
      assert.match(caveVoid.text, /比较当前本命物和灵宝/);
      assert.ok(caveVoid.commands.includes('/我的本命物'));
      const greatVehicle = await open('/帮助 大乘初期');
      assert.match(greatVehicle.text, /仙器升品所缺材料/);
      assert.ok(greatVehicle.commands.includes('/我的本命物'));
    }

    const invalid = await open('/帮助 输入42');
    assert.doesNotMatch(invalid.text, /输入42|第3\/3页/);
    if (registered) {
      const rewards = await open('/帮助 今天有什么奖励能领');
      assert.match(rewards.text, /日常活跃 2 档/);
      assert.ok(rewards.commands.includes('/日常活跃'));
      assert.ok(!rewards.commands.includes('/周常活跃'));
      activityRewards = { daily: 0, weekly: 0 };
      const emptyRewards = await open('/帮助 今天有什么奖励能领');
      assert.match(emptyRewards.text, /签到已完成，当前没有待领/);
      assert.ok(emptyRewards.commands.includes('/任务面板'));
      const dungeon = await open('/帮助 今天还能打哪些秘境');
      assert.match(dungeon.text, /已打完.*今日剩 0 次/);
      assert.match(dungeon.text, /组队秘境.*至少 3 人/);
      assert.match(dungeon.text, /当前显示 3\/7 个秘境/);
      assert.ok(dungeon.commands.includes('/秘境详情 桃花镇'));
      assert.ok(!dungeon.commands.includes('/秘境详情 组队秘境'));
      extraDungeons = true;
      const laterDungeon = await open('/帮助 今天还能打哪些秘境');
      assert.match(laterDungeon.text, /桃花镇.*今日剩 2 次/);
      assert.match(laterDungeon.text, /当前显示 4\/7 个秘境/);
      assert.ok(laterDungeon.commands.includes('/秘境详情 桃花镇'));
      assert.equal(laterDungeon.text.split('\n').filter(line => line.includes('进度：')).length, 4);
      extraDungeons = false;
      inTeam = true;
      const grouped = await open('/帮助 今天还能打哪些秘境');
      assert.ok(grouped.commands.includes('/我的队伍'));
      assert.ok(!grouped.commands.includes('/秘境详情 桃花镇'));
      inTeam = false;
      soloFree = 0;
      const teamDungeon = await open('/帮助 今天还能打哪些秘境');
      assert.match(teamDungeon.text, /先查看队伍和秘境的人数要求/);
      assert.match(teamDungeon.text, /桃花镇.*精力还差 9/);
      assert.doesNotMatch(teamDungeon.text, /已打完.*精力还差/);
      assert.ok(teamDungeon.commands.includes('/帮助 我怎么找队伍'));
      assert.ok(!teamDungeon.commands.includes('/秘境详情 桃花镇'));
      exhausted = true;
      const noAttempts = await open('/帮助 今天还能打哪些秘境');
      assert.match(noAttempts.text, /今日挑战次数均已用完/);
      assert.ok(noAttempts.commands.includes('/帮助 怎么获取资源'));
      assert.ok(!noAttempts.commands.includes('/帮助 我怎么找队伍'));
      inTeam = true;
      const noTeamRewards = await open('/帮助 今天还能打哪些秘境');
      assert.match(noTeamRewards.text, /至少一名队友能获得收益.*仍可参战.*本人无秘境结算奖励/);
      assert.ok(noTeamRewards.commands.includes('/我的队伍'));
      inTeam = false;
      exhausted = false;
      dungeonRead = 'empty';
      const emptyDungeons = await open('/帮助 今天还能打哪些秘境');
      assert.match(emptyDungeons.text, /当前境界范围内暂无可挑战的秘境/);
      assert.ok(emptyDungeons.commands.includes('/帮助 怎么获取资源'));
      dungeonRead = 'unavailable';
      const missingDungeons = await open('/帮助 今天还能打哪些秘境');
      assert.match(missingDungeons.text, /暂时无法读取秘境进度/);
      assert.ok(missingDungeons.commands.includes('/秘境列表'));
      dungeonRead = undefined;
      const experience = await open('/帮助 现在去哪攒修为');
      assert.match(experience.text, /先推主线 3-3/);
      assert.ok(experience.commands.includes('/查看主线 3'));
      const previousStory = story;
      story = { ...story, chapter: 2, cleared: 0, nextStage: 1 };
      const nextChapter = await open('/帮助 主线接下来打哪关');
      assert.match(nextChapter.text, /2-1.*可查看并挑战/);
      assert.ok(nextChapter.commands.includes('/查看主线 2'));
      assert.ok(!nextChapter.commands.includes('/查看主线 3'));
      story = { ...story, cleared: story.total, nextStage: 0, ready: false, allVisibleCleared: true };
      const cleared = await open('/帮助 主线接下来打哪关');
      assert.match(cleared.text, /当前已开放的主线关卡均已通关/);
      assert.ok(cleared.commands.includes('/帮助 现在去哪攒修为'));
      story = previousStory;
    }
    if (registered) {
      growth = { ...growth, kind: '渡劫', target: '化神初期', reason: '请准备材料', materials: [{ itemName: '渡劫丹', currentQuantity: 1, requiredQuantity: 3 }] };
      const tribulation = await open('/帮助 我离突破还有多远');
      assert.match(tribulation.text, /渡劫丹还差 2/);
      assert.match(tribulation.text, /修为和材料都要补齐/);
      assert.ok(tribulation.commands.includes('/我的渡劫'));
      const tribulationQuestion = await open('/帮助 渡劫还差什么');
      assert.match(tribulationQuestion.text, /渡劫丹还差 2/);
      assert.ok(tribulationQuestion.commands.includes('/我的渡劫'));
      assert.ok(tribulation.commands.includes('/帮助 缺的材料哪里能买'));
      tower = { started: false, finished: false, layer: 1, sweepable: true, sweepableLayers: 3 };
      const sweep = await open('/帮助 妖塔接下来打哪层');
      assert.match(sweep.text, /可扫荡前 3 层/);
      assert.ok(sweep.commands.includes('/妖塔'));
      tower = { started: true, finished: false, layer: 4, stage: 2, targetLayer: 4, canChallenge: true };
      const challenge = await open('/帮助 妖塔接下来打哪层');
      assert.match(challenge.text, /第 4 层 · 第 2 关/);
      assert.match(challenge.text, /比较第 4 层各星级的战力/);
      tower = { started: true, finished: true, layer: 4, score: 159 };
      const finished = await open('/帮助 妖塔接下来打哪层');
      assert.match(finished.text, /积分：159/);
      assert.ok(finished.commands.includes('/商店 积分'));
      const market = await open('/帮助 渡劫丹哪里买');
      assert.match(market.text, /渡劫丹还差 2/);
      assert.ok(market.commands.includes('/珍宝楼 搜索 渡劫丹'));
      farm = { planted: 2, mature: 0, abnormal: 0, empty: 1 };
      const sow = await open('/帮助 灵田该收还是该种');
      assert.match(sow.text, /还有 1 块空地/);
      assert.ok(sow.commands.includes('/播种'));
      farm = undefined;
      farmNeedsGuide = true;
      const guide = await open('/帮助 灵田该收还是该种');
      assert.match(guide.text, /先完成灵药师引导/);
      assert.ok(guide.commands.includes('/加入灵药师'));
    }
    if (registered) {
      meditation = { active: true, minutes: 30, experience: 60, trueQi: 2 };
      const readyOverview = await open('/帮助');
      assert.match(readyOverview.text, /闭关.*已进行 30 分钟/);
      assert.match(readyOverview.text, /本次闭关已有预计收益/);
      assert.ok(readyOverview.commands.includes('/闭关'));
      assert.ok(!readyOverview.commands.includes('/出关'));
      const followUp = readyOverview.commands.find(command => command === '/帮助 闭关怎么攒修为');
      assert.ok(followUp);
      const detail = await open(followUp);
      assert.match(detail.text, /已进行 30 分钟/);
      assert.ok(detail.commands.includes('/闭关'));
    }
    if (registered) {
      const team = await open('/帮助 秘境怎么组队');
      assert.match(team.text, /我怎么找队伍/);
      assert.ok(team.commands.includes('/队伍列表'));
      inTeam = true;
      const joinedTeam = await open('/帮助 秘境怎么组队');
      assert.match(joinedTeam.text, /已在队伍中/);
      assert.ok(joinedTeam.commands.includes('/我的队伍'));
      assert.ok(!joinedTeam.commands.includes('/队伍列表'));
      story = { ...story, chests: 2 };
      const chests = await open('/帮助 主线宝箱怎么领');
      assert.match(chests.text, /主线宝箱 2 个/);
      assert.ok(chests.commands.includes('/查看主线'));
      assert.ok(chests.commands.includes('/查看主线 3'));
      story = { ...story, chests: 0 };
      assert.match(chests.text, /主线接下来打哪关/);
    }
    if (registered) {
      const power = await open('/帮助 战力不够怎么办');
      assert.match(power.text, /先补空装备位/);
      assert.ok(power.commands.includes('/我的装备'));
      assert.ok(power.commands.includes('/我的功法'));
      assert.ok(power.commands.includes('/帮助 神魂和道途怎么提升'));
    }
    if (registered) {
      story = { ...story, ready: false, blocker: '精力不足，还差 3', blockerCode: 'mental' };
      const blocked = await open('/帮助 主线接下来打哪关');
      assert.match(blocked.text, /精力不足，还差 3/);
      assert.ok(blocked.commands.includes('/帮助 现在去哪攒修为'));
      assert.ok(!blocked.commands.includes('/帮助 怎么提升战力'));
      const experienceCommand = blocked.commands.find(command => command === '/帮助 现在去哪攒修为');
      assert.ok(experienceCommand);
      meditation = { active: false, minutes: 0, experience: 0, trueQi: 0, canStart: true };
      const overviewAfterBlock = await open('/帮助');
      assert.match(overviewAfterBlock.text, /当前可以闭关攒修为/);
      assert.ok(overviewAfterBlock.commands.includes('/闭关'));
      const available = await open(experienceCommand);
      assert.match(available.text, /可开始闭关，出关后结算修为/);
      assert.ok(available.commands.includes('/闭关'));
      meditation = { ...meditation, canStart: false, startReason: 'daily_qi_limit' };
      const unavailable = await open(experienceCommand);
      assert.match(unavailable.text, /今日真气已达上限/);
      assert.ok(unavailable.commands.includes('/任务面板 修炼'));
      assert.ok(!unavailable.commands.includes('/闭关'));
    }
    if (registered) {
      realm = '炼气七层';
      farm = { planted: 2, mature: 1, abnormal: 0 };
      farmNeedsGuide = false;
      const garden = await open('/帮助 炼气七层');
      assert.match(garden.text, /先收成熟作物/);
      assert.ok(garden.commands.includes('/我的灵田'));
      assert.ok(!garden.commands.includes('/加入灵药师'));
      farm = { planted: 2, mature: 0, abnormal: 1, empty: 1 };
      const farmOverview = await open('/帮助');
      assert.match(farmOverview.text, /有 1 块灵田异常，可以先处理/);
      assert.ok(farmOverview.commands.includes('/我的灵田'));
      assert.ok(farmOverview.commands.includes('/帮助 灵田该收还是该种'));
      const abnormal = await open('/帮助 炼气七层');
      assert.match(abnormal.text, /先处理异常地块/);
      assert.ok(!abnormal.commands.includes('/播种'));
      farm = { ...farm, abnormal: 0 };
      const empty = await open('/帮助 炼气七层');
      assert.match(empty.text, /还有 1 块空地/);
      assert.ok(empty.commands.includes('/播种'));
      farm = undefined;
      const unknown = await open('/帮助 炼气七层');
      assert.ok(unknown.commands.includes('/我的灵田'));
      assert.ok(!unknown.commands.includes('/加入灵药师'));
      farmNeedsGuide = true;
      const uninitialized = await open('/帮助 炼气七层');
      assert.ok(uninitialized.commands.includes('/加入灵药师'));
    }
    if (registered) {
      growth = { ...growth, kind: '突破', experience: 10000, required: 10000, ready: false, materials: [{ itemName: '培元丹', currentQuantity: 1, requiredQuantity: 3 }] };
      const missingMaterial = await open('/帮助');
      assert.match(missingMaterial.text, /突破还缺培元丹 2 个/);
      const gap = missingMaterial.commands.find(command => command === '/帮助 我离突破还有多远');
      assert.ok(gap);
      assert.equal(missingMaterial.commands.filter(command => command === gap).length, 1);
      const materials = await open(gap);
      assert.ok(materials.commands.includes('/帮助 缺的材料哪里能买'));

      growth = { ...growth, ready: true, materials: [] };
      const ready = await open('/帮助');
      assert.match(ready.text, /已满足突破条件/);
      assert.ok(ready.commands.includes('/我的境界'));
      growth = { ...growth, kind: '渡劫' };
      meditation = { active: true, minutes: 30, experience: 60, trueQi: 2 };
      const readyTribulation = await open('/帮助');
      assert.match(readyTribulation.text, /闭关.*已进行 30 分钟/);
      assert.doesNotMatch(readyTribulation.text, /本次闭关已有预计收益/);
      meditation = undefined;
      assert.match(readyTribulation.text, /已满足渡劫条件/);
      assert.ok(readyTribulation.commands.includes('/我的渡劫'));
    }
    if (registered) {
      realm = '炼气九层';
      const alchemyGuide = await open('/帮助 炼气九层');
      const followUp = alchemyGuide.commands.find(command => command === '/帮助 这炉丹还缺什么');
      assert.ok(followUp);
      assert.equal(alchemyGuide.commands.filter(command => command === followUp).length, 1);
      const novice = await open(followUp);
      assert.match(novice.text, /先完成炼丹师引导/);
      assert.ok(novice.commands.includes('/炼丹 入门'));
      assert.ok(!novice.commands.includes('/炼丹 丹方'));
      alchemyUnlocked = true;
      const learned = await open(followUp);
      assert.ok(learned.commands.includes('/炼丹 丹方'));
      const guildQuestion = alchemyGuide.commands.find(command => command === '/帮助 宗门今天还能做什么');
      assert.ok(guildQuestion);
      const guild = await open(guildQuestion);
      assert.match(guild.text, /先打开宗门列表申请加入/);
      assert.ok(guild.commands.includes('/宗门列表'));
      assert.ok(!guild.commands.includes('/宗门主线'));
      guildNeedsJoin = false;
      const joined = await open(guildQuestion);
      assert.ok(joined.commands.includes('/宗门日常'));
      assert.ok(joined.commands.includes('/宗门主线'));
      assert.ok(!joined.commands.includes('/宗门挖矿'));
      const fishingQuestion = alchemyGuide.commands.find(command => command === '/帮助 我现在能开塘吗');
      assert.ok(fishingQuestion);
      const shortage = await open(fishingQuestion);
      assert.match(shortage.text, /还差 2,500/);
      assert.ok(!shortage.commands.includes('/垂钓 建塘'));
      fishingBuild = { level: 0, missingStone: 0 };
      const ready = await open('/帮助 我现在能开塘吗');
      assert.ok(ready.commands.includes('/垂钓 建塘'));
      fishingBuild = { level: 2, missingStone: 0 };
      const built = await open('/帮助 我现在能开塘吗');
      assert.match(built.text, /已开辟 2 阶水塘/);
      assert.ok(built.commands.includes('/垂钓 状态'));
    }
    if (registered) {
      const resources = await open('/帮助 资源不够怎么办');
      assert.match(resources.text, /先查今天可领的奖励/);
      assert.ok(resources.commands.includes('/帮助 今天有什么奖励能领'));
      assert.ok(resources.commands.includes('/帮助 今天还能打哪些秘境'));
      assert.ok(resources.commands.includes('/帮助 灵田该收还是该种'));
      assert.ok(resources.commands.includes('/帮助 缺的材料哪里能买'));
      const explorationCommand = resources.commands.find(command => command === '/帮助 秘境探索怎么开始');
      assert.ok(explorationCommand);
      const exploration = await open(explorationCommand);
      assert.match(exploration.text, /各时长的精力消耗/);
      assert.ok(exploration.commands.includes('/探索秘境'));
      assert.ok(!exploration.commands.includes('/秘境列表'));
      explorationStatus = { active: true, completed: false, remaining: 2, settleable: 1 };
      const active = await open(explorationCommand);
      assert.match(active.text, /探索中.*剩余约 2 小时.*可结算 1 小时/);
      assert.ok(!active.commands.includes('/闭关'));
      explorationStatus = { ...explorationStatus, completed: true };
      assert.match((await open(explorationCommand)).text, /探索已完成.*返程/);
      meditation = { active: true, minutes: 30, experience: 60, trueQi: 2 };
      const progress = await open('/帮助 闭关怎么攒修为');
      assert.match(progress.text, /已进行 30 分钟.*修为 60.*真气 2/);
      assert.ok(progress.commands.includes('/闭关'));
    }
    assert.equal(requests.length, registered ? 70 : 6);
    assert.deepEqual(requests[0].body.arguments, { topic: 'overview' });
    if (registered) assert.deepEqual(requests.slice(1, 4).map(request => request.body.arguments), [
      { topic: 'realm' }, { topic: 'soul' }, { topic: 'farm' }
    ]);
    assert.ok(requests.every(request => request.path.endsWith('/navigation.help')));
  });
}
