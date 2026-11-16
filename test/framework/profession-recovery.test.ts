import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';





import forge from '../../src/response/profession/forge/res';
import lingzhi from '../../src/response/profession/joinLingzhi/res';
import dashboard from '../../src/response/profession/myProfession/res';
import replaceTool from '../../src/response/profession/replaceEquip/res';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/forge-contracts.json', import.meta.url), 'utf8'));

for (const isPrivate of [false, true]) {
  for (const itemState of ['empty', 'equipped', 'locked', 'realm'] as const) {
    test(`切换列表无可用工具：${itemState} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
        mode: 'list',
        bag: {
          types: ['丹炉'], activeType: '丹炉', page: 1, pageSize: 5, totalPages: 1,
          total: itemState === 'empty' ? 0 : 1, capabilities: [],
          items: itemState === 'empty' ? [] : [{
            id: 2, toolId: 1, displayName: '丹炉', typeName: '丹炉', displayGrade: '凡阶', gradeId: 1,
            isEquipped: itemState === 'equipped' ? 1 : 0, isLocked: itemState === 'locked' ? 1 : 0,
            canReplace: false, canToggleLock: true, capabilities: ['viewDetail']
          }]
        }
      }));
      const event = isPrivate
        ? app.events.privateMessage({ text: '/替换', platform: 'qq-bot' })
        : app.events.groupMessage({ text: '/切换', platform: 'qq-bot' });
      const result = await app.runHandler(replaceTool, event);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/v2/robot/business/profession.replace-tool');
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      const view = inspectMessage(message.nodes);
      assert.ok(view.text.includes('当前没有可切换的天工工具'));
      assert.ok(view.text.includes('工具分类和装备条件'));
      assert.ok(view.commands.includes('/储物袋 天工'));
      assert.ok(!view.commands.some(command => /^\/(替换|切换)\s+\d+$/.test(command)));
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
  test(`工具配置异常不误导成长 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '切换天工', heading: '', text: '锻造台品阶配置无效', buttons: [], advice: []
    }]));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/替换 2', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/替换 2', platform: 'qq-bot' });
    const result = await app.runHandler(replaceTool, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('锻造台品阶配置无效'));
    assert.ok(!view.text.includes('建议：'));
    assert.ok(!view.commands.includes('/我的锻造'));
    assert.ok(!view.commands.includes('/我的境界'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('切换天工可从默认分类切到锻造台并翻到持有工具的页面', async t => {
  const { app, requests } = await gameFixture(t, request => {
    const { typeName = '丹炉', page = 1 } = request.body.arguments as { typeName?: string; page?: number };
    const forgeType = typeName === '锻造台';
    return businessEnvelope(request.bid, {
      mode: 'list',
      bag: {
        types: ['丹炉', '锻造台'], activeType: typeName, page, pageSize: 5,
        totalPages: forgeType ? 2 : 1, total: forgeType ? 6 : 0, capabilities: [],
        items: forgeType && page === 2 ? [{
          id: 12, toolId: 4, displayName: '测试炼器台', typeName, displayGrade: '凡阶', gradeId: 1,
          isEquipped: 0, isLocked: 0, canReplace: true, canToggleLock: true, capabilities: ['replace', 'lock', 'viewDetail']
        }] : []
      }
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const open = async (text: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(JSON.stringify(message.nodes), /"autoEnter":false/);
    assert.doesNotMatch(JSON.stringify(message.nodes), /"show":/);
    return inspectMessage(message.nodes);
  };
  assert.ok((await open('/切换')).commands.includes('/替换 列表 1 锻造台'));
  const first = await open('/替换 列表 1 锻造台');
  assert.ok(first.commands.includes('/替换 列表 2 锻造台'));
  const second = await open('/替换 列表 2 锻造台');
  assert.match(second.text, /测试炼器台/);
  assert.ok(second.commands.includes('/替换 12'));
  assert.ok(second.commands.includes('/我的锻造'));
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { identifier: null },
    { identifier: null, page: 1, typeName: '锻造台' },
    { identifier: null, page: 2, typeName: '锻造台' }
  ]);
});

const cases = [
  { handler: replaceTool, command: '/替换 2', reason: '请先完成锻造入门，再装备锻造台', commands: ['/锻造指引'] },
  { handler: replaceTool, command: '/切换 2', reason: '锻造职业等级不足，需要2阶才能装备【锻造台】', commands: ['/我的锻造'] },
  { handler: replaceTool, command: '/替换 2', reason: '该锻造台对应的职业阶段尚未开放', commands: ['/我的锻造'] },
  { handler: replaceTool, command: '/替换 2', reason: '未找到该职业工具或其已在使用中', commands: ['/储物袋 天工', '/替换'] },
  { handler: replaceTool, command: '/替换 2', reason: '当前境界不足，无法启用该职业工具', commands: ['/查看主线', '/我的境界'] },
  { handler: forge, command: '/接取锻造委托 2', reason: '约定装备模板已不可用，可取消退回资源', commands: ['/锻造委托'] },
  { handler: forge, command: '/取消锻造委托 2', reason: '仅委托者可以取消', commands: ['/锻造委托'] },
  { handler: forge, command: '/接取锻造委托 2', reason: '仅指定匠师可以接单', commands: ['/锻造委托'] },
  { handler: lingzhi, command: '/继续灵药指引', reason: '灵药师引导进度已变化', commands: ['/加入灵药师'] },
  { handler: lingzhi, command: '/继续灵药指引', reason: '灵药师指引已过期，请重新使用 /加入灵药师 开始。', commands: ['/加入灵药师'] },
  { handler: forge, command: '/打造 1', reason: '请先完成锻造入门', commands: ['/锻造指引'] },
  { handler: forge, command: '/打造 1', reason: '尚未学习该图纸', commands: ['/我的锻造'] },
  { handler: forge, command: '/锻造进阶 0', reason: '职业经验不足', commands: ['/锻造图纸 可制作'] },
  { handler: forge, command: '/锻造进阶 0', reason: '阶段作品考核尚未完成', commands: ['/锻造图纸 考核'] },
  { handler: forge, command: '/锻造进阶 0', reason: '晋升需要达到筑基初期', commands: ['/查看主线', '/我的境界'] },
  { handler: forge, command: '/打造 1', reason: '铁砂不足或已锁定', commands: ['/锻造图纸', '/储物袋 材料'] },
  { handler: forge, command: '/打造 1', reason: '缺少符合品阶的炼器台', commands: ['/储物袋 天工'] },
  { handler: forge, command: '/确认打造 expired', reason: '制作预览已过期，请重新预览', commands: ['/锻造记录', '/锻造图纸'] },
  { handler: forge, command: '/确认锻造委托 expired', reason: '委托条件已变化，请重新预览', commands: ['/锻造委托'] },
  { handler: forge, command: '/委托锻造 2 1 3', reason: '指定玩家尚未成为锻造师', commands: ['/锻造委托'] },
  { handler: forge, command: '/委托锻造 2 1 3', reason: '制作成本与工费所需灵石不足', commands: ['/我的信息'] },
  { handler: dashboard, command: '/灵药师', reason: '炼气九层及以上方可查看职业系统。', commands: ['/查看主线', '/我的境界'] }
];
for (const entry of cases)
  for (const privateChat of [false, true])
    for (const mode of ['http', 'feedback'] as const) {
      test(`${entry.command} ${privateChat} ${mode}：${entry.reason}`, async t => {
        const { app, requests } = await gameFixture(
          t,
          request =>
            mode === 'http'
              ? { code: 'CONFLICT', message: entry.reason }
              : businessEnvelope(request.bid, undefined, [{ title: '职业提示', heading: '', text: entry.reason, buttons: [], advice: [] }]),
          mode === 'http' ? 409 : 200
        );
        const event = privateChat
          ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
          : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
        const result = await app.runHandler(entry.handler, event);
        assert.equal(requests.length, 1);
        assert.ok(requests[0].idempotencyKey);
        assert.equal(result.messages.length, 1);
        const message = result.messages[0];
        const view = inspectMessage(message.nodes);
        assert.ok(view.text.includes(entry.reason));
        for (const command of entry.commands) assert.ok(view.commands.includes(command), JSON.stringify(view));
        assert.ok(!view.commands.some(command => /^\/(确认打造|确认锻造委托|一键炼丹|炼制)(\s|$)/.test(command)));
        if (entry.reason.includes('考核')) assert.ok(view.text.includes('同一图纸重复制作不能替代'));
        if (entry.reason.includes('指定玩家')) assert.ok(!view.commands.includes('/加入锻造师'));
        assert.equal(message.target?.targetId, privateChat ? event.UserId : event.ChannelId);
        assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      });
    }





for (const reason of ['职业经验不足', '阶段作品考核尚未完成']) {
  test(`锻造总览简化 ${reason} 提示，指引保留解除方式`, async t => {
    const data = { ...structuredClone(fixtures.overview), advanceReason: reason, canAdvance: false, unlockedSets: [] };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(forge, app.events.privateMessage({ text: '/我的锻造', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(!view.text.includes(reason));
    assert.match(view.text, /考核：0\/1 ‹待考核 1›/);
    assert.match(view.text, /当前等级效果\s+> 暂无已解锁套装/);
    assert.ok(!view.commands.some(command => command.startsWith('/锻造进阶 ')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);

    const guide = await app.runHandler(forge, app.events.privateMessage({ text: '/锻造指引', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(guide.messages.length, 1);
    const guideMessage = guide.messages[0];
    const guideView = inspectMessage(guideMessage.nodes);
    assert.ok(guideView.text.includes(reason.includes('考核') ? '同一图纸重复制作不能替代' : '能获得经验的本阶练习图纸'));
    assert.ok(guideView.commands.includes(reason.includes('考核') ? '/锻造图纸 考核' : '/锻造图纸 练习'));
    assert.equal(guide.actions[guideMessage.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

  

test('锻造总览不可用的原因不被推断为境界不足', async t => {
  const { app } = await gameFixture(t, request =>
    businessEnvelope(request.bid, {
      ...structuredClone(fixtures.overview),
      available: false,
      joined: false,
      canJoin: false,
      reason: '锻造职业配置缺失'
    })
  );
  const result = await app.runHandler(forge, app.events.privateMessage({ text: '/我的锻造', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('锻造职业配置缺失'));
  assert.ok(!view.text.includes('境界不足'));
  assert.ok(!view.commands.includes('/闭关'));
  assert.ok(view.commands.includes('/我的洞府'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('炼器师职业页显示天工，图谱、记录和指引保留各自入口', async t => {
  const data = {
    ...structuredClone(fixtures.overview), exp: 20, assessmentDone: 1, canAdvance: true,
    equippedTools: [{ typeName: '炼器台', name: '测试炼器台', grade: '一阶' }],
    unlockedSets: ['匠铁', '追风套装']
  };
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/forge.history')) {
      assert.deepEqual(request.body.arguments, { page: 1 });

      return businessEnvelope(request.bid, fixtures.history);
    }
    if (request.path.endsWith('/shops.list')) {
      assert.deepEqual(request.body.arguments, { page: 1, shopCode: 'WANBAOLOU', filters: { category: 'profession_tool' } });
      return businessEnvelope(request.bid, {
        access: { hasCompanion: false, isFoundationRealm: true, canUseReputationShop: true, visibleShopCodes: ['WANBAOLOU'], deniedReason: null },
        currencies: { spiritStone: 10000, spiritsCrystal: 0, spiritsMilk: 0, signInCoin: 0, towerScore: 0, reputation: 0, tongxin: 0, greenBottle: 0 },
        products: [], page: 1, totalPages: 1, total: 0
      });
    }
    return businessEnvelope(request.bid, data);
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const open = (text: string) => app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
  const result = await open('/我的锻造');
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /^我的洞府 · 锻造坊\s+‹▸职业› ?‹图谱› ?‹记录› ?‹指引›\s+我的职业\s+> 测试学徒\n> 等级：0 ‹进阶›\n> 经验：20 \/ 20\n> 考核：1\/1 ‹待考核 1›/);
  assert.match(view.text, /\n当前等级效果\s+> 已解锁匠铁套装\n> 已解锁追风套装\s+我的天工/);
  assert.match(view.text, /\n我的天工 ‹获取天工›\s+> 炼器台：测试炼器台 ‹切换›/);
  assert.match(view.text, /\n‹装备› ?‹委托›\s+‹返回洞府›\n/);
  assert.doesNotMatch(view.text, /阶段：|委托：装备归委托者|‹作品›/);
  assert.ok(view.text.indexOf('等级：0') < view.text.indexOf('‹获取天工›'));
  const baseCommands = [
    '/锻造进阶 0',
    '/锻造图纸 考核',
    '/我的洞府',
    '/商店 万宝楼 筛选 天工',
    '/储物袋 装备',
    '/锻造图纸',
    '/锻造委托',
    '/锻造指引'
  ];
  for (const command of baseCommands) {
    assert.equal(view.commands.filter(value => value === command).length, 1, command);
  }
  assert.equal(view.commands.filter(value => value === '/锻造记录').length, 1);
  assert.ok(!view.commands.includes('/锻造图纸 可制作'));
  assert.ok(!view.commands.includes('/我的锻造 详情'));
  assert.equal(view.commands.filter(value => value === '/替换 列表 1 炼器台').length, 1);
  assert.ok(!view.commands.includes('/灵药师'));
  const bodyNodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  assert.equal(bodyNodes.filter(node => node.type === 'MD.blockquote').length, 3);
  const buttons = bodyNodes.flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [node])
    .filter(node => node.type === 'MD.button');
  assert.equal(buttons.length, baseCommands.length + 2);
  assert.ok(buttons.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));

  const shop = await open(view.commands.find(command => command === '/商店 万宝楼 筛选 天工')!);
  assert.deepEqual(shop.errors, []);
  assert.equal(shop.messages.length, 1);
  assert.equal(shop.actions[shop.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(inspectMessage(shop.messages[0].nodes).text, /万宝楼/);

  const guide = await open(view.commands.find(command => command === '/锻造指引')!);
  assert.deepEqual(guide.errors, []);
  assert.equal(guide.messages.length, 1);
  const guideMessage = guide.messages[0];
  assert.equal(guide.actions[guideMessage.actionIndex].results?.[0].code, ResultCode.Ok);
  const guideView = inspectMessage(guideMessage.nodes);
  assert.match(guideView.text, /‹职业› ?‹图谱› ?‹记录› ?‹▸指引›/);
  assert.match(guideView.text, /入门与图谱[\s\S]*免费教学[\s\S]*达到对应锻造等级后自动解锁图纸/);
  assert.match(guideView.text, /当前阶段、经验和考核进度[\s\S]*装备归委托者 · 工费与成长归匠师/);
  assert.ok(guideView.commands.includes('/储物袋 天工'));
  assert.ok(guideView.commands.includes('/我的境界'));
  assert.ok(!guideView.commands.includes('/我的锻造 详情'));
  const guideButtons = guideMessage.nodes.flatMap(node => node.type === 'Markdown' ? node.value : [])
    .flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [node])
    .filter(node => node.type === 'MD.button');
  assert.ok(guideButtons.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));

  const detail = await open('/我的锻造 详情');
  assert.deepEqual(detail.errors, []);
  assert.equal(detail.messages.length, 1);
  const detailMessage = detail.messages[0];
  assert.equal(detail.actions[detailMessage.actionIndex].results?.[0].code, ResultCode.Ok);
  const detailView = inspectMessage(detailMessage.nodes);
  assert.equal(detailView.text, view.text);
  assert.deepEqual(detailView.commands, view.commands);
  for (const command of ['/锻造图纸', '/锻造图纸 考核', '/锻造图纸 可制作', '/锻造图纸 练习']) {
    const catalogue = await open(command);
    assert.deepEqual(catalogue.errors, []);
    assert.equal(catalogue.messages.length, 1);
    const catalogueMessage = catalogue.messages[0];
    assert.equal(catalogue.actions[catalogueMessage.actionIndex].results?.[0].code, ResultCode.Ok);
    const catalogueView = inspectMessage(catalogueMessage.nodes);
    assert.match(catalogueView.text, /‹职业› ?‹▸图谱› ?‹记录› ?‹指引›\s+‹(?:▸)?全部› ?‹(?:▸)?待考核› ?‹(?:▸)?可制作›/);
    assert.ok(catalogueView.commands.includes('/锻造指引'));
    assert.ok(catalogueView.commands.includes('/锻造记录'));
    assert.doesNotMatch(catalogueView.text, /‹图纸›|‹锻造›/);
    assert.ok(catalogueView.commands.includes('/我的锻造'));
    assert.ok(catalogueView.commands.includes('/锻造图纸 考核'));
    assert.ok(catalogueView.commands.includes('/锻造图纸 可制作'));
  }
  const history = await open(view.commands.find(command => command === '/锻造记录')!);
  assert.deepEqual(history.errors, []);
  assert.equal(history.messages.length, 1);
  const historyMessage = history.messages[0];
  assert.equal(history.actions[historyMessage.actionIndex].results?.[0].code, ResultCode.Ok);
  const historyView = inspectMessage(historyMessage.nodes);
  assert.match(historyView.text, /^锻造记录\s+‹职业› ?‹图谱› ?‹▸记录› ?‹指引›/);
  assert.ok(historyView.commands.includes('/锻造记录详情 2 1'));
  const record = await open('/锻造记录详情 2 1');
  assert.equal(record.messages.length, 1);
  const recordView = inspectMessage(record.messages[0].nodes);

  assert.match(recordView.text, /^锻造记录详情/);
  assert.ok(recordView.commands.includes('/锻造记录 1'));
  assert.deepEqual(requests.map(request => request.path.split('/').pop()), ['forge.overview', 'shops.list', ...Array.from({ length: 5 }, () => 'forge.overview'), 'forge.history', 'forge.history']);
});

test('炼器师尚未入门时仍可免费入门', async t => {
  const data = { ...structuredClone(fixtures.overview), joined: false, canJoin: true, canAdvance: false };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(forge, app.events.privateMessage({ text: '/我的锻造', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.includes('/加入锻造师'));
  assert.ok(!view.commands.some(command => command.startsWith('/锻造进阶 ')));
});

test('锻造图纸因材料锁定而不可制作时，不把补工具当成解法', async t => {
  const data = structuredClone(fixtures.overview);
  const recipe = data.recipes[0];
  recipe.reason = '铁砂不足或已锁定';
  recipe.canCraft = false;
  recipe.toolType = '炼器台';
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(forge, app.events.privateMessage({ text: `/锻造图纸详情 ${recipe.id} 全部 1`, platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('锁定或上架材料不等于可用材料'));
  assert.ok(view.commands.includes('/储物袋 材料'));
  assert.ok(!view.commands.includes('/珍宝楼 筛选 天工 价格升序 1'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});



for (const commissioned of [false, true]) {
 test(`超长锻造凭据不生成无效按钮 commissioned=${commissioned}`, async t => {
  const data = structuredClone(commissioned ? fixtures.orderPreview : fixtures.preview);
  data.token = 'a'.repeat(200);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(forge, app.events.privateMessage({ text: commissioned ? '/委托锻造 2 1 7' : '/打造 1', platform: 'qq-bot' }));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /确认服务暂不可用/);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  assert.ok(!view.commands.some(command => command.startsWith('/确认')));
 });
}
