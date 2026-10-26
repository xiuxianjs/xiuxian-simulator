import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import sweepStory from '../../src/response/storyline/sweep/res';
import challengeStory from '../../src/response/storyline/challenge/res';
import chest from '../../src/response/storyline/claimChest/res';
import allChests from '../../src/response/storyline/claimAllChests/res';
import sweepDungeon from '../../src/response/dungeon/sweep/res';
import challengeDungeon from '../../src/response/dungeon/enter/res';
import catalogDungeon from '../../src/response/dungeon/list/res';
import detailDungeon from '../../src/response/dungeon/detail/res';
import catalogStory from '../../src/response/storyline/list/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

const cases = [
  { handler: catalogStory, command: '/查看主线 2', reason: '第2章尚未解锁，需通关第1章精英关卡', commands: ['/查看主线'] },
  { handler: catalogStory, command: '/查看主线 2', reason: '该章节暂无关卡', commands: ['/查看主线'] },
  { handler: catalogDungeon, command: '/查看秘境 2', reason: 'page 必须为正整数', commands: ['/查看秘境'] },
  { handler: detailDungeon, command: '/秘境详情 幽谷', reason: '未找到秘境「幽谷」', commands: ['/查看秘境'] },
  { handler: sweepStory, command: '/主线扫荡 1-1 5', reason: '该关卡需三星通关后才能扫荡', commands: ['/查看主线', '/我的功法'] },
  { handler: sweepStory, command: '/主线扫荡 1-1 5', reason: '组队状态下无法使用主线扫荡，请先离队或使用挑战', commands: ['/我的队伍'] },
  { handler: sweepStory, command: '/主线扫荡 1-1 5', reason: '该关卡今日次数已达上限（5/5）', commands: ['/查看主线'] },
  { handler: sweepStory, command: '/主线扫荡 1-1 5', reason: '该关卡今日剩余次数不足（剩余2次）', commands: ['/查看主线'] },
  { handler: challengeStory, command: '/主线挑战 2-1', reason: '第2章尚未解锁，需通关第1章精英关卡', commands: ['/查看主线'] },
  { handler: challengeStory, command: '/主线挑战 1-2', reason: '请先通关 1-1（至少1星）后才能挑战本关', commands: ['/查看主线'] },
  { handler: challengeStory, command: '/主线挑战 1-1', reason: '组队状态下只有队长可以发起主线挑战', commands: ['/我的队伍'] },
  { handler: challengeStory, command: '/主线挑战 1-1', reason: '战斗会话不存在或无权操作', commands: ['/查看主线'] },
  { handler: chest, command: '/领取宝箱 1 1', reason: '星数不足，需要6⭐（当前3⭐）', commands: ['/查看主线'] },
  { handler: allChests, command: '/一键领取宝箱', reason: '当前没有可领取的宝箱', commands: ['/查看主线'] },
  { handler: sweepDungeon, command: '/扫荡秘境 幽谷 5', reason: '该秘境需要成功通关后才能扫荡', commands: ['/查看秘境'] },
  { handler: sweepDungeon, command: '/扫荡秘境 幽谷 5', reason: '当前境界超过该秘境上限', commands: ['/查看秘境'] },
  { handler: sweepDungeon, command: '/扫荡免费秘境', reason: '当前没有可用的秘境免费次数', commands: ['/查看秘境'] },
  { handler: sweepDungeon, command: '/扫荡秘境 幽谷 5', reason: '精力不足（当前 1，需要 3）', commands: ['/我的信息', '/储物袋 道具 丹药'] },
  { handler: challengeDungeon, command: '/秘境挑战 幽谷', reason: '该秘境最低需要2人', commands: ['/我的队伍'] },
  { handler: challengeDungeon, command: '/秘境挑战 幽谷', reason: '队伍成员境界不足', commands: ['/我的队伍'] },
  { handler: challengeDungeon, command: '/秘境挑战 幽谷', reason: '队伍成员境界超过秘境上限', commands: ['/我的队伍'] },
  { handler: sweepDungeon, command: '/扫荡秘境 幽谷 2', reason: '扫荡次数仅支持 1、5、10', commands: ['/查看秘境'] },
  { handler: challengeDungeon, command: '/秘境挑战', reason: '请输入秘境名称', commands: ['/查看秘境'] }
];

for (const entry of cases) {
  for (const privateChat of [false, true]) {
    for (const mode of ['http', 'feedback'] as const) {
      test(`${entry.command} ${mode} ${privateChat}：${entry.reason}`, async t => {
        const { app, requests } = await gameFixture(
          t,
          request =>
            mode === 'http'
              ? { code: 'CONFLICT', message: entry.reason }
              : businessEnvelope(request.bid, undefined, [
                  {
                    title: '操作未完成',
                    heading: '',
                    text: entry.reason,
                    buttons: entry.reason.startsWith('精力不足') ? [{ label: '服用精力丹', command: '/服用 精力丹 3' }] : [],
                    advice: []
                  }
                ]),
          mode === 'http' ? 409 : 200
        );
        const event = privateChat
          ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
          : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
        const result = await app.runHandler(entry.handler, event);
        assert.equal(requests.length, 1);
        assert.ok(requests[0].idempotencyKey);
        assert.equal(result.nextCalls.length, 0);
        assert.equal(result.messages.length, 1);
        const message = result.messages[0];
        const view = inspectMessage(message.nodes);
        assert.ok(view.text.includes(entry.reason));
        assert.doesNotMatch(view.text, /建议：/);
        for (const command of entry.commands) assert.ok(view.commands.includes(command), JSON.stringify(view));
        assert.ok(!view.commands.some(command => /^\/(主线挑战|主线扫荡|秘境挑战|扫荡秘境|退出队伍|服用 精力丹)(\s|$)/.test(command)));
        if (entry.reason.includes('境界超过')) {
          assert.ok(!view.commands.includes('/闭关'));
          assert.ok(!view.text.includes('优先推进主线'));
        }
        assert.equal(message.target?.targetId, privateChat ? event.UserId : event.ChannelId);
        assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      });
    }
  }
}

for (const actual of [2, 5]) {
  test(`秘境扫荡按服务端 ${actual}/5 次保留真实收益并决定是否继续`, async t => {
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        outcome: 'result',
        data: { dungeonName: '幽谷', times: actual, totalSpiritCost: actual * 3, totalExp: actual * 10, currency: [], items: [] }
      })
    );
    const result = await app.runHandler(sweepDungeon, app.events.privateMessage({ text: '/扫荡秘境 幽谷 5', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`精力 -${actual * 3}`));
    assert.ok(view.text.includes(`修为 +${actual * 10}`));
    assert.equal(
      view.commands.some(command => command.startsWith('/扫荡秘境 ')),
      actual === 5
    );
    if (actual < 5) {
      assert.ok(view.text.includes('实际完成 2/5 次'));
      assert.ok(view.commands.includes('/查看秘境'));
      assert.ok(view.commands.includes('/我的信息'));
    }
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('免费秘境部分成功逐条附建议，不以重试抹掉已结算结果', async t => {
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, {
      sweptDungeons: [{ dungeonName: '溪谷', times: 2, totalSpiritCost: 0, totalExp: 20, currency: [], items: [] }],
      skippedDungeons: [
        { dungeonName: '幽谷', message: '该秘境需要成功通关后才能扫荡' },
        { dungeonName: '古境', message: '当前境界超过该秘境上限' },
        { dungeonName: '远境', message: '服务暂时不可用，后续扫荡已停止' }
      ],
      totalTimes: 2,
      totalExp: 20,
      totalSpiritCost: 0
    })
  );
  const result = await app.runHandler(sweepDungeon, app.events.groupMessage({ text: '/扫荡免费秘境', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('免费扫荡 2 次 | 修为 +20'));
  assert.ok(view.text.includes('溪谷 × 2'));
  assert.ok(view.text.includes('已高于该秘境允许范围'));
  assert.ok(view.text.includes('已经结算的次数和奖励'));
  assert.ok(!view.commands.includes('/扫荡免费秘境'));
  const quotes = message.nodes?.flatMap(node => (node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : [])) ?? [];
  for (const name of ['幽谷', '古境', '远境'])
    assert.ok(
      quotes.some(quote => {
        if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) return false;
        const item = inspectMessage([{ type: 'Markdown', value: quote.value }]);
        return item.text.includes(name) && item.commands.includes('/查看秘境');
      })
    );
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('免费秘境全拒绝的不同原因分别给建议，不把超境界误导为继续升级', async t => {
  const reason = '古境：当前境界超过该秘境上限\n远境：境界不足';
  const { app } = await gameFixture(t, request =>
    businessEnvelope(request.bid, undefined, [{ title: '秘境免费扫荡', heading: '', text: reason, buttons: [], advice: [] }])
  );
  const result = await app.runHandler(sweepDungeon, app.events.privateMessage({ text: '/扫荡免费秘境', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes(reason));
  assert.ok(view.text.includes('古境：当前境界超过该秘境上限；选择适合境界的秘境'));
  assert.ok(view.text.includes('远境：境界不足；优先推进主线'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const reason of ['daily_limit', 'team_no_mental', 'mental_insufficient', 'future_reason']) {
  test(`秘境胜利但本人无收益：${reason}`, async t => {
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        outcome: 'result',
        data: {
          dungeonId: 1,
          won: true,
          experienceGained: 30,
          spiritStoneGained: 0,
          battle: { winner: 'A', rounds: 2 },
          drops: [],
          logId: 'memory-1',
          rewardsByUser: [{ userId: 1, eligible: false, noRewardReason: reason, spiritCostPaid: 0, experienceGained: 0, currency: [], items: [] }]
        }
      })
    );
    const result = await app.runHandler(challengeDungeon, app.events.privateMessage({ text: '/秘境挑战 幽谷', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('本次参战无收益'));
    assert.ok(!view.text.includes('修为 +30'));
    assert.ok(view.commands.includes('/查看战斗过程 memory-1'));
    assert.ok(!view.commands.includes('/秘境挑战 幽谷'));
    if (reason === 'team_no_mental') {
      assert.ok(view.text.includes('不消耗也不结算收益'));
      assert.ok(view.commands.includes('/我的设置'));
      assert.ok(!view.commands.includes('/储物袋 道具 丹药'));
    } else if (reason === 'mental_insufficient') assert.ok(view.commands.includes('/储物袋 道具 丹药'));
    else if (reason === 'daily_limit') {
      assert.ok(view.text.includes('补精力不会恢复'));
      assert.ok(!view.commands.includes('/储物袋 道具 丹药'));
    } else assert.ok(view.text.includes('future_reason'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const won of [false, true]) {
  test(`秘境已完成战斗 ${won} 保留本人消耗，失败先建议培养`, async t => {
    const { app } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        outcome: 'result',
        data: {
          dungeonId: 1,
          won,
          experienceGained: won ? 30 : 0,
          spiritStoneGained: 0,
          battle: { winner: won ? 'A' : 'B', rounds: 2 },
          drops: [],
          rewardsByUser: [{ userId: 1, eligible: true, spiritCostPaid: 3, experienceGained: won ? 30 : 0, currency: [], items: [] }]
        }
      })
    );
    const result = await app.runHandler(challengeDungeon, app.events.privateMessage({ text: '/秘境挑战 幽谷', platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('精力 -3'));
    assert.equal(view.commands.includes('/秘境挑战 幽谷'), won);
    if (!won) assert.ok(view.commands.includes('/我的功法'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const won of [false, true]) {
  test(`主线已结算 ${won} 保留消耗和记录，失败附培养建议且不自动重结算`, async t => {
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        sessionId: 'battle-1',
        finished: true,
        winner: won ? 'A' : 'B',
        events: [],
        logId: 'log-1',
        settlement: {
          chapterNumber: 1,
          stageNumber: 1,
          stageLabel: '1-1',
          stars: won ? 3 : 0,
          spiritCostPaid: 3,
          experienceGained: won ? 30 : 0,
          monsterName: '山狼',
          showNextStage: won,
          showPrevStage: false,
          drops: [],
          battle: { Rounds: 2 }
        }
      })
    );
    const result = await app.runHandler(challengeStory, app.events.privateMessage({ text: '/主线挑战 1-1', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('消耗精力：3'));
    assert.ok(view.commands.includes('/查看战斗过程 log-1'));
    assert.ok(view.commands.includes('/主线挑战 1-1'));
    if (!won) assert.ok(view.commands.includes('/我的境界'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const all of [false, true]) {
  test(`宝箱接口成功响应但未领取 ${all} 仍显示原因与下一步`, async t => {
    const { app } = await gameFixture(t, request =>
      businessEnvelope(
        request.bid,
        all
          ? { success: false, message: '当前没有可领取的宝箱', totalReward: 0, claimedCount: 0, details: [] }
          : { success: false, message: '星数不足，需要6⭐（当前3⭐）', chapterNumber: 1, claimedIndexes: [], totalReward: 0, chests: [] }
      )
    );
    const result = await app.runHandler(
      all ? allChests : chest,
      app.events.groupMessage({ text: all ? '/一键领取宝箱' : '/领取宝箱 1 1', platform: 'qq-bot' })
    );
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(all ? '当前没有可领取' : '星数不足'));
    assert.ok(view.text.includes('提高该章未满星关卡'));
    assert.ok(view.commands.includes('/查看主线'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const empty of [true, false]) {
  test(`秘境列表 ${empty ? '为空' : '超过实际页数'} 给出可继续的读取入口`, async t => {
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        mentalValue: 10,
        inTeam: false,
        realmLevel: 1,
        realmStageLevel: 1,
        canUseMeridian: false,
        canMatchDungeon: false,
        currentPage: empty ? 1 : 7,
        totalPages: 1,
        total: empty ? 0 : 1,
        items: []
      })
    );
    const result = await app.runHandler(catalogDungeon, app.events.groupMessage({ text: empty ? '/查看秘境' : '/查看秘境 7', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    if (empty) {
      assert.ok(view.commands.includes('/天书'));
      assert.ok(view.commands.includes('/查看主线'));
      assert.ok(!view.commands.includes('/扫荡免费秘境'));
    } else {
      assert.ok(view.text.includes('当前第7页，共1页'));
      assert.ok(view.commands.includes('/查看秘境'));
    }
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('秘境详情缺少名称的成功响应也提供列表选择入口', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'usage' }));
  const result = await app.runHandler(detailDungeon, app.events.privateMessage({ text: '/秘境详情', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('请指定秘境名称'));
  assert.ok(view.commands.includes('/查看秘境'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('秘境内部异常不被当作战斗力或材料不足', async t => {
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, undefined, [
      {
        title: '秘境挑战',
        heading: '',
        text: '服务暂时不可用，请稍后再试',
        buttons: [{ label: '秘境列表', command: '/查看秘境' }],
        advice: []
      }
    ])
  );
  const result = await app.runHandler(challengeDungeon, app.events.privateMessage({ text: '/秘境挑战 幽谷', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('服务暂时不可用'));
  assert.ok(!view.text.includes('建议：'));
  assert.ok(!view.commands.includes('/我的功法'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
