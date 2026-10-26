import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import type { ProfessionDashboardQueryData } from '../../src/api/schemas/profession-dashboard-query';
import router from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

function professionData(state: 'joined' | 'guide' | 'unjoined'): ProfessionDashboardQueryData {
  return {
    access: { canUseProfessionAndCave: true, canJoinAlchemyGuide: true, features: Object.fromEntries(['cave', 'professions', 'alchemy', 'herbalist', 'forge', 'cave-formations', 'meridians'].map(id => [id, { realmReached: true, requiredRealm: '已达境界', lockedReason: '' }])) },
    alchemy: {
      unlocked: state === 'joined', title: '初阶', level: 2, exp: 37, nextExpRequired: 200,
      totalCrafts: 11, learnedRecipeCount: 3, canAdvance: state === 'joined', showSection: true,
      primaryAction: state === 'joined' ? 'recipes' : state === 'guide' ? 'continueGuide' : 'joinGuide',
      guide: { active: state === 'guide', step: state === 'guide' ? 2 : null, expiresAt: null, stepLabel: '准备丹炉' },
      equipments: [{ typeName: '丹炉', equipped: true, equipmentName: '测试丹炉', gradeName: '一阶' }]
    },
    lingzhi: {
      unlocked: state === 'joined', title: '初阶', level: 3, exp: 19, nextExpRequired: 300,
      dailyExpGained: 7, dailyExpCap: 50, maxPlots: 4, maxFieldGrade: 2, maxFieldGradeLabel: '二阶',
      yieldBonus: 1, primaryAction: state === 'joined' ? 'plots' : 'joinGuide', cultivatedCount: 2,
      cultivatableCount: 1, cultivationCostText: '每块开垦消耗：测试材料'
    }
  };
}

for (const isPrivate of [false, true]) {
  for (const command of ['/我的洞府', '#洞府', '＃我的洞府', '洞府']) {
    for (const state of ['joined', 'guide', 'unjoined'] as const) {
      test(`洞府融合职业并保留真实交互 ${command} ${state} private=${isPrivate}`, async t => {
        const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, professionData(state)));
        await app.mount({ responseRouter: router });
        const event = isPrivate
          ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
          : app.events.groupMessage({ text: command, platform: 'qq-bot' });
        const result = await app.dispatch(event);
        assert.equal(requests.length, 1);
        assert.equal(requests[0].path, '/api/v2/robot/business/profession.dashboard');
        assert.deepEqual(requests[0].body.arguments, {});
        assert.equal(result.messages.length, 1);
        const message = result.messages[0];
        const view = inspectMessage(message.nodes);
        for (const name of ['我的洞府', '修行静室', '炼丹室', '灵药园', '锻造坊', '护府阵法']) assert.ok(view.text.includes(name), name);
        for (const entry of ['/打坐', '/我的境界', '/经络', '/我的锻造', '/锻造图纸', '/锻造委托', '/洞府阵法']) assert.ok(view.commands.includes(entry), entry);
        const roomBlocks = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
        assert.equal(roomBlocks.length, 5, '每个房间只占一个引用块');
        for (const [index, name] of ['修行静室', '炼丹室', '灵药园', '锻造坊', '护府阵法'].entries()) {
          const block = roomBlocks[index];
          assert.ok(block.type === 'MD.blockquote' && Array.isArray(block.value));
          assert.ok(inspectMessage([{ type: 'Markdown', value: block.value }]).text.startsWith(`【${name}`));
          assert.ok(!block.value.some(child => child.type === 'MD.blockquote'), '房间内部不再嵌套引用块');
        }
        assert.doesNotMatch(view.text, /在此打理|查看锻造职业、图纸与委托|查看阵法与当前效果/);
        for (const entry of ['/我', '/属性面板', '/查看主线', '/我的活动', '/商店']) assert.ok(view.commands.includes(entry), entry);

        if (state === 'joined') {
          for (const text of ['37 / 200', '炼制次数：11', '测试丹炉', '已开垦：2块', '当前可开垦：1块', '每块开垦消耗：测试材料']) assert.ok(view.text.includes(text), text);
          for (const entry of ['/炼丹 丹方', '/炼丹 天工', '/物品详情 测试丹炉', '/灵田']) assert.ok(view.commands.includes(entry), entry);
          const markdown = message.nodes.find(node => node.type === 'Markdown');
          assert.ok(markdown && Array.isArray(markdown.value));
          const toolQuote = markdown.value.find(node => node.type === 'MD.blockquote' && JSON.stringify(node).includes('测试丹炉'));
          assert.ok(toolQuote?.type === 'MD.blockquote' && Array.isArray(toolQuote.value));
          assert.ok(inspectMessage([{ type: 'Markdown', value: [toolQuote] }]).commands.includes('/炼丹 天工'));
          assert.ok(inspectMessage([{ type: 'Markdown', value: [toolQuote] }]).commands.includes('/物品详情 测试丹炉'));
        } else {
          assert.ok(view.commands.includes('/炼丹 入门'));
          assert.ok(view.commands.includes('/加入灵药师'));
          assert.ok(!view.commands.includes('/炼丹师进阶 确认'));
          if (state === 'guide') assert.ok(!view.text.includes('准备丹炉'));
        }
        assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
        assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      });
    }
  }

  test(`零境界洞府隐藏尚未开放的房间 private=${isPrivate}`, async t => {
    const data = professionData('unjoined');
    data.access.canJoinAlchemyGuide = false;
    data.access.features = Object.fromEntries(['alchemy', 'herbalist', 'forge', 'cave-formations', 'meridians'].map(id =>
      [id, { realmReached: false, requiredRealm: '服务端境界', lockedReason: `服务端锁定：${id}` }]));
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    await app.mount({ responseRouter: router });
    const result = await app.dispatch(isPrivate
      ? app.events.privateMessage({ text: '/我的洞府', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/我的洞府', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes('我的洞府'));
    for (const text of ['炼丹师', '灵药师', '锻造坊', '护府阵法', '服务端锁定']) assert.ok(!view.text.includes(text), text);
    for (const command of ['/炼丹 入门', '/加入灵药师', '/我的锻造', '/洞府阵法', '/经络']) assert.ok(!view.commands.includes(command));
    for (const command of ['/打坐', '/我的境界', '/天书']) assert.ok(view.commands.includes(command));
  });

  test(`职业入口保留原面板、灵田入口独立经营 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => request.path.endsWith('/profession.dashboard')
      ? businessEnvelope(request.bid, professionData('joined'))
      : businessEnvelope(request.bid, undefined, [{ title: '我的灵田', heading: '', text: '灵田经营入口', buttons: [], advice: [] }]));
    await app.mount({ responseRouter: router });
    for (const command of ['/我的职业', '/我的灵田', '/灵田']) {
      const result = await app.dispatch(isPrivate
        ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(result.messages.length, 1);
      const view = inspectMessage(result.messages[0].nodes);
      assert.ok(!view.text.includes('修行静室'));
      assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/' + (command === '/我的职业' ? 'profession.dashboard' : 'cave.view'));
      assert.ok(view.text.includes(command === '/我的职业' ? '我的职业' : '灵田经营入口'));
    }
    assert.equal(requests.length, 3);
  });

  test(`洞府遵循服务拒绝且不伪造职业状态 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '我的职业', heading: '', text: '炼气九层及以上方可查看职业系统。', buttons: [{ label: '我的境界', command: '/我的境界' }], advice: []
    }]));
    await app.mount({ responseRouter: router });
    const result = await app.dispatch(isPrivate
      ? app.events.privateMessage({ text: '/我的洞府', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/我的洞府', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.ok(view.text.includes('炼气九层及以上'));
    assert.ok(view.commands.includes('/我的境界'));
    assert.ok(!view.text.includes('修行静室'));
    assert.ok(!view.commands.includes('/炼丹师进阶 确认'));
  });

  for (const command of ['/我的活动', '/个人活动', '/活动大厅', '/宗门活动']) {
    test(`活动成就入口按个人分页归属 ${command} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
        limitedEvent: { activeCount: 0 }, guildCompetition: { phase: 'INACTIVE' },
        guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
        access: { hasGuild: false, canAccessOverseasIsland: false }, newcomerVisible: false, giftCodesVisible: false
      }));
      await app.mount({ responseRouter: router });
      const result = await app.dispatch(isPrivate
        ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/v2/robot/business/activity.hub');
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      const view = inspectMessage(message.nodes);
      assert.equal(view.commands.includes('/成就'), command !== '/宗门活动');
      if (command !== '/宗门活动') {
        const markdown = message.nodes.find(node => node.type === 'Markdown');
        assert.ok(markdown && Array.isArray(markdown.value));
        const achievement = markdown.value.find(node => node.type === 'MD.blockquote' && JSON.stringify(node).includes('/成就'));
        assert.ok(achievement?.type === 'MD.blockquote' && Array.isArray(achievement.value));
        assert.ok(inspectMessage([{ type: 'Markdown', value: [achievement] }]).text.includes('查看成就目标与进度，领取已达成的奖励'));
      }
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}
