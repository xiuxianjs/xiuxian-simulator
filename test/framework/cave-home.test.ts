import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import type { ProfessionDashboardQueryData } from '../../src/api/schemas/profession-dashboard-query';
import router, { createGameRouter } from '../../src/router';
import { getAppConfig } from '../../src/utils/appConfig';
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
  for (const command of ['/我的洞府', '/洞府']) {
    for (const state of ['joined', 'guide', 'unjoined'] as const) {
      test(`洞府按房间逐行展示加粗名称和手动蓝链 ${command} ${state} private=${isPrivate}`, async t => {
        const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...professionData(state), meditationAutoBoost: state === 'joined' }));
        await app.mount({ responseRouter: router });
        const event = isPrivate
          ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
          : app.events.groupMessage({ text: command, platform: 'qq-bot' });
        const result = await app.dispatch(event);
        assert.equal(requests.length, 1);
        assert.equal(requests[0].path, '/api/v2/robot/business/profession.dashboard');
        assert.deepEqual(requests[0].body.arguments, { includeMeditationPreference: true });
        assert.equal(result.messages.length, 1);
        const message = result.messages[0];
        const view = inspectMessage(message.nodes);
        assert.ok(view.text.includes('我的洞府'));
        const roomBlocks = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
        assert.equal(roomBlocks.length, 1);
        const rooms = roomBlocks[0];
        assert.ok(Array.isArray(rooms.value));
        const roomView = inspectMessage([{ type: 'Markdown', value: rooms.value }]);
        const boost = state === 'joined' ? '开启' : '关闭';
        const toggle = state === 'joined' ? '关闭' : '开启';
        assert.deepEqual(roomView.text.split('\n'), [
          '修行静室', `闭关自动加速：${boost}   ‹${toggle}›`, '‹前往闭关›',
          '炼丹房', '‹前往炼丹›',
          '灵药园', '‹前往种田›',
          '锻造坊', '‹前往炼器›',
          '灵塘', '‹前往垂钓›',
          '护府阵法', '‹查看阵法›'
        ]);
        assert.deepEqual(rooms.value.filter(child => child.type === 'MD.bold').map(child => child.value), [
          '修行静室', '炼丹房', '灵药园', '锻造坊', '灵塘', '护府阵法'
        ]);
        assert.deepEqual(roomView.commands, [
          `/配置闭关自动加速 ${toggle}`, '/打坐', '/炼丹', '/灵田', '/我的锻造', '/垂钓', '/洞府阵法'
        ]);
        const buttons = rooms.value.filter(child => child.type === 'MD.button');
        assert.equal(buttons.length, 7);
        assert.ok(buttons.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));
        for (const entry of ['/我', '/属性面板', '/查看主线', '/我的活动', '/商店']) assert.ok(view.commands.includes(entry), entry);
        for (const entry of ['/我的境界', '/经络', '/天书']) assert.ok(!view.commands.includes(entry), entry);
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
    for (const text of ['炼丹房', '灵药园', '锻造坊', '护府阵法', '服务端锁定']) assert.ok(!view.text.includes(text), text);
    for (const command of ['/炼丹', '/灵田', '/我的锻造', '/洞府阵法', '/经络']) assert.ok(!view.commands.includes(command));
    assert.ok(view.commands.includes('/打坐'));
    assert.match(view.text, /闭关自动加速：暂不可读取/);
    assert.ok(!view.commands.some(command => command.startsWith('/配置闭关自动加速')));
    for (const command of ['/我的境界', '/天书']) assert.ok(!view.commands.includes(command));
  });

  test(`灵药师与灵田分别进入职业面板和经营入口 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => request.path.endsWith('/profession.dashboard')
      ? businessEnvelope(request.bid, professionData('joined'))
      : businessEnvelope(request.bid, undefined, [{ title: '我的灵田', heading: '', text: '灵田经营入口', buttons: [], advice: [] }]));
    await app.mount({ responseRouter: router });
    for (const command of ['/灵药师', '/我的灵田', '/灵田']) {
      const result = await app.dispatch(isPrivate
        ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(result.messages.length, 1);
      const view = inspectMessage(result.messages[0].nodes);
      assert.ok(!view.text.includes('修行静室'));
      assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/' + (command === '/灵药师' ? 'profession.dashboard' : 'cave.view'));
      assert.ok(view.text.includes(command === '/灵药师' ? '我的洞府 · 灵药园' : '灵田经营入口'));
    }
    assert.equal(requests.length, 3);
    for (const command of ['/我的职业', '/我的职业 灵药师']) {
      await app.dispatch(isPrivate
        ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: command, platform: 'qq-bot' }));
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

test('活动大厅的锻造委托入口打开委托列表', async t => {
  const { overview, orderPreview, orderCreated } = JSON.parse(readFileSync(new URL('../fixtures/forge-contracts.json', import.meta.url), 'utf8'));
  const token = 'r1_1_f_abc_0123456789abcdef01234567';
  const responses: Record<string, unknown> = {
    'forge.orders': { page: 1, hasMore: false, items: [] },
    'forge.overview': {
      ...overview,
      recipes: Array.from({ length: 6 }, (_, index) => ({ ...overview.recipes[0], id: index + 1, canCraft: false, learned: false }))
    },
    'forge.order-preview': { ...orderPreview, crafterId: 2, fee: 0, recipe: { ...orderPreview.recipe, id: 6 }, token },
    'forge.order-create': { ...orderCreated, crafterId: 2, fee: 0 },
    'activity.hub': {
        limitedEvent: { activeCount: 0 }, guildCompetition: { phase: 'INACTIVE' },
        guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
        access: { hasGuild: false, canAccessOverseasIsland: false }, newcomerVisible: false, giftCodesVisible: false
    }
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, responses[request.path.split('/').at(-1) ?? '']));
  await app.mount({ responseRouter: router });
  const dispatch = (text: string) => app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
  const personal = await dispatch('/我的活动');
  const entry = inspectMessage(personal.messages[0].nodes).commands.find(command => command === '/锻造委托');
  assert.ok(entry);
  assert.equal(personal.actions[personal.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);

  const orders = await dispatch(entry);
  assert.ok(requests.some(request => request.path.endsWith('/forge.orders')));
  const orderView = inspectMessage(orders.messages[0].nodes);
  assert.match(orderView.text, /暂无委托/);
  const start = orderView.commands.find(command => command === '/委托锻造');
  assert.ok(start);
  assert.equal(orders.actions[orders.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);

  const catalog = await dispatch(start);
  const catalogView = inspectMessage(catalog.messages[0].nodes);
  assert.match(catalogView.text, /选择委托图纸/);
  const nextPage = catalogView.commands.find(command => command === '/委托锻造 列表 2');
  assert.ok(nextPage);
  const secondPage = await dispatch(nextPage);
  const selected = inspectMessage(secondPage.messages[0].nodes).commands.find(command => command === '/委托锻造 图纸 6 2');
  assert.ok(selected);

  const guide = await dispatch(selected);
  const guideView = inspectMessage(guide.messages[0].nodes);
  assert.match(guideView.text, /匠师 UID 和灵石工费/);
  assert.ok(guideView.commands.includes(nextPage));
  const fill = guideView.commands.find(command => command === '/委托锻造 填写 6 ');
  assert.ok(fill);
  assert.match(JSON.stringify(guide.messages[0].nodes), /"data":"\/委托锻造 填写 6 ","autoEnter":false/);
  assert.equal(guide.actions[guide.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const invalid = await dispatch(fill + '无效输入 0');
  assert.match(inspectMessage(invalid.messages[0].nodes).text, /请填写有效的匠师 UID/);
  assert.ok(!JSON.stringify(invalid.messages[0].nodes).includes('无效输入'));
  assert.ok(!requests.some(request => request.path.endsWith('/forge.order-preview')));

  const preview = await dispatch(fill + '2 0');
  assert.deepEqual(requests.find(request => request.path.endsWith('/forge.order-preview'))?.body.arguments, {
    crafterId: 2, recipeId: 6, fee: 0
  });
  assert.ok(!requests.some(request => request.path.endsWith('/forge.order-create')));
  const previewView = inspectMessage(preview.messages[0].nodes);
  assert.match(previewView.text, /工费 0/);
  assert.match(previewView.text, /前确认/);
  const confirm = previewView.commands.find(command => command === `/确认锻造委托 ${token}`);
  assert.ok(confirm);
  assert.equal(preview.actions[preview.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const published = await dispatch(confirm);
  assert.deepEqual(requests.find(request => request.path.endsWith('/forge.order-create'))?.body.arguments, { token });
  assert.equal(published.actions[published.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);

  const guild = await dispatch('/宗门活动');
  assert.ok(!inspectMessage(guild.messages[0].nodes).commands.includes(entry));
});

test('洞府垂钓入口沿用已配置前缀且不增加RPC查询', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, professionData('joined')));
  const config = app.run(getAppConfig);
  app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { ...config, commandPrefix: '**' } });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const result = await app.dispatch(app.events.privateMessage({ text: '**洞府', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/profession.dashboard');
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.includes('**垂钓'));
  const buttons = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.flatMap(child => child.type === 'MD.blockquote' && Array.isArray(child.value) ? child.value : []).filter(child => child.type === 'MD.button' && child.options?.data === '**垂钓') : []);
  assert.equal(buttons.length, 1);
  assert.ok(buttons.every(button => button.type === 'MD.button' && button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));
});

test('灵药师在职业页和指引页展示信息并保留手动入口', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/cave.logs')
    ? { realmName: '元婴', canUseCave: true, lockedMessage: '', hasCavePlot: true, logs: ['测试灵田记录'], page: 1, totalPages: 1, total: 1 }
    : professionData('joined')));
  await app.mount({ responseRouter: router });

  const dispatch = async (text: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];

    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const markdown = message.nodes.flatMap(node => (node.type === 'Markdown' ? node.value : []));
    if (text === '/灵药师') {
      const profession = markdown.find(node => node.type === 'MD.blockquote');
      assert.ok(Array.isArray(profession?.value));
      assert.deepEqual(profession.value[0], { type: 'MD.bold', value: '初阶灵药师' });
    }
    const buttons = markdown
      .flatMap(node => (node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [node]))
      .filter(node => node.type === 'MD.button');

    assert.ok(buttons.length > 0);
    assert.ok(buttons.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));
    return inspectMessage(message.nodes);
  };

  const home = await dispatch('/灵药师');
  assert.match(home.text, /我的洞府 · 灵药园/);
  assert.match(home.text, /‹▸职业›\s*‹灵田›\s*‹记录›\s*‹指引›/);
  assert.match(home.text, /\n我的职业\n+> 初阶灵药师\n> 等级：3/);
  assert.match(home.text, /经验：19 \/ 300/);
  assert.match(home.text, /\n当前等级效果\n+> 最多开垦：4块\n> 品阶上限：二阶\n> 产量加成：\+1株\n> 照料与互动经验每日上限：7\/50/);
  assert.match(home.text, /‹返回洞府›/);
  assert.doesNotMatch(home.text, /状态：已加入|照料与互动经验：7\/50|当前可开垦：|测试材料|‹经营灵田›|‹详情›|‹返回灵田›/);
  assert.ok(!home.commands.includes('/灵药师 详情'));
  assert.ok(!home.commands.includes('/我的灵田'));
  assert.ok(home.commands.includes('/灵田'));
  assert.ok(home.commands.includes('/我的洞府'));

  const guide = await dispatch('/灵药师 指引');
  assert.match(guide.text, /‹职业›\s*‹灵田›\s*‹记录›\s*‹▸指引›/);
  assert.match(guide.text, /成熟后收割/);
  for (const text of ['照料与互动经验有每日上限，收获经验另计。', '可开垦总上限：4块', '已开垦：2块', '当前可开垦：1块', '测试材料']) {
    assert.ok(guide.text.includes(text), text);
  }
  assert.ok(guide.commands.includes('/灵药师'));
  assert.ok(guide.commands.includes('/灵田'));
  assert.ok(guide.commands.includes('/我的洞府'));
  assert.ok(!guide.commands.includes('/加入灵药师'));

  const records = await dispatch('/灵田记录');
  assert.match(records.text, /‹职业›\s*‹灵田›\s*‹▸记录›\s*‹指引›/);
  assert.match(records.text, /测试灵田记录/);
  const retired = await app.dispatch(app.events.privateMessage({ text: '/灵药师 详情', platform: 'qq-bot' }));
  assert.deepEqual(retired.errors, []);
  assert.equal(retired.messages.length, 0);
  assert.deepEqual(requests.map(request => request.path.split('/').at(-1)), ['profession.dashboard', 'profession.dashboard', 'cave.logs']);
});

test('满级灵药师加粗称谓并以 -- 代替经验数值', async t => {
  const data = professionData('joined');
  data.lingzhi = { ...data.lingzhi, title: '天蕴', level: 9, exp: 12345, nextExpRequired: null };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  await app.mount({ responseRouter: router });

  const result = await app.dispatch(app.events.privateMessage({ text: '/灵药师', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const nodes = result.messages[0].nodes;
  const profession = nodes.flatMap(node => node.type === 'Markdown' ? node.value : []).find(node => node.type === 'MD.blockquote');
  assert.ok(Array.isArray(profession?.value));
  assert.deepEqual(profession.value[0], { type: 'MD.bold', value: '天蕴灵药师' });
  assert.match(inspectMessage(nodes).text, /> 等级：9\n> 经验：--/);
});

test('未入门灵药师保留开始指引', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, professionData('unjoined')));
  await app.mount({ responseRouter: router });
  const result = await app.dispatch(app.events.groupMessage({ text: '/灵药师', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const { text, commands } = inspectMessage(result.messages[0].nodes);

  assert.match(text, /状态：尚未加入/);
  assert.ok(commands.includes('/加入灵药师'));
  assert.ok(commands.includes('/我的洞府'));
  assert.ok(!commands.includes('/灵药师 详情'));
});

test('灵田翻页仍显示职业和当前灵田标签', async t => {
  const plots = Array.from({ length: 6 }, (_, index) => ({
    plotIndex: index + 1,
    plotState: 'cultivated',
    fieldGrade: 1,
    seedName: '',
    seedMatureHours: null,
    seedStageSplit: null,
    cropName: '',
    baseYield: 0,
    expReward: 0,
    abnormalFlags: 0,
    abnormalStateCount: 0,
    isMature: false,
    plantedAt: null,
    matureAt: null,
    remainingSeconds: 0,
    title: '测试灵田',
    detail: '可播种',
    capabilities: [{ kind: 'plant' }]
  }));
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    access: { canUseCave: true, hasCavePlot: true, lockedMessage: '', realmName: '元婴' },
    overview: { plots, maxPlots: 6, cultivatedCount: 6, plantedCount: 0, matureCount: 0, abnormalCount: 0, auraScore: 0, auraLevel: '平常', auraLabel: '平常', activeFormations: [] }
  }));
  await app.mount({ responseRouter: router });
  for (const [command, page] of [['/灵田', 1], ['/我的灵田 页 2', 2]] as const) {
    const result = await app.dispatch(app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    const markdown = message.nodes.find(node => node.type === 'Markdown');

    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(markdown);
    assert.match(view.text, /‹职业›\s*‹▸灵田›\s*‹记录›\s*‹指引›/);
    assert.ok(view.text.includes(`第${page}/2页`));
    assert.ok(view.commands.includes('/我的洞府'));
    assert.ok(view.commands.includes('/我的阵法'));
    for (const entry of ['/灵药师', '/灵田', '/灵田记录', '/灵药师 指引']) {
      const action = markdown.value.find(node => node.type === 'MD.button' && node.options?.data === entry);
      assert.ok(action);
      assert.equal(action.options?.autoEnter, false);
      assert.ok(!Object.hasOwn(action.options ?? {}, 'show'));
    }
  }
});
