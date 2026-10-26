import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';





import forge from '../../src/response/profession/forge/res';
import lingzhi from '../../src/response/profession/joinLingzhi/res';
import dashboard from '../../src/response/profession/myProfession/res';
import replaceTool from '../../src/response/profession/replaceEquip/res';
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
      assert.ok(!view.commands.some(command => /^\/(替换|切换)\s/.test(command)));
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
  { handler: forge, command: '/确认打造 expired', reason: '制作预览已过期，请重新预览', commands: ['/锻造作品', '/锻造图纸'] },
  { handler: forge, command: '/确认锻造委托 expired', reason: '委托条件已变化，请重新预览', commands: ['/锻造委托'] },
  { handler: forge, command: '/委托锻造 2 1 3', reason: '指定玩家尚未成为锻造师', commands: ['/锻造委托'] },
  { handler: forge, command: '/委托锻造 2 1 3', reason: '制作成本与工费所需灵石不足', commands: ['/我的信息'] },
  { handler: dashboard, command: '/我的职业', reason: '炼气九层及以上方可查看职业系统。', commands: ['/查看主线', '/我的境界'] }
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
  test(`锻造总览 ${reason} 显示具体解除方式，不只显示数值`, async t => {
    const data = { ...structuredClone(fixtures.overview), advanceReason: reason, canAdvance: false };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(forge, app.events.privateMessage({ text: '/我的锻造', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.ok(view.text.includes(reason.includes('考核') ? '同一图纸重复制作不能替代' : '能制作的图纸'));
    assert.ok(!view.commands.some(command => command.startsWith('/锻造进阶 ')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
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
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
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
