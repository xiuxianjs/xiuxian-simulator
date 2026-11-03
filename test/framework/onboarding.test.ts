import { configureOnboardingCommandMatcher } from '../../src/response/onboarding/policy';
import { handleOnboardingResponse } from '../../src/response/onboarding/res';
import { sendOnboardingFollowup } from '../../src/response/onboarding/followup';
import { parseOnboarding } from '../../src/api/bot/onboarding';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { Expose } from 'alemonjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, Format, ResultCode, Router, useMessage, shutdownLogger } from 'alemonjs';
import { onboardingContent, showOnboarding, showOnboardingRecovery } from '../../src/response/onboarding/context';
import type { OnboardingView } from '../../src/api/bot/onboarding';
import type { GameEvent } from '../../src/types/event';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());
const initial: OnboardingView = {
  status: 'active',
  phase: 'profile',
  version: 1,
  title: '宋玉 · 新手教学',
  lines: ['先查看角色'],
  feedback: [],
  actions: [{ label: '查看角色', command: '/我' }]
};
const nextView: OnboardingView = {
  ...initial,
  phase: 'panel',
  version: 2,
  lines: ['继续查看任务'],
  actions: [{ label: '任务面板', command: '/任务面板' }]
};

test('真实教学 Context 隔离其他用户，并携带当前版本提交一次操作', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, nextView));
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ userId: 'newcomer', text: '/继续引导', platform: 'qq-bot' });
  const opened = await app.invoke(event, () => showOnboarding(event as GameEvent, initial));
  assert.equal(opened.messages.length, 1);
  const other = await app.dispatch(app.events.groupMessage({ userId: 'other', text: '/我', platform: 'qq-bot' }));
  assert.equal(other.context.claimed, false);
  assert.equal(requests.length, 0);
  const continued = await app.dispatch(app.events.groupMessage({ userId: 'newcomer', text: '/我', platform: 'qq-bot' }));
  assert.equal(continued.context.claimed, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/onboarding.action');
  assert.deepEqual(requests[0].body.arguments, { version: 1, command: '/我' });
  // Inspect the actual sent keyboard without explicit permissions.
  const buttons = continued.messages[0].nodes.flatMap(node =>
    node.type === 'ButtonGroup' || node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []
  );
  const choice = buttons.find(button => button.options?.data === '/任务面板');
  assert.ok(choice);
  assert.equal(choice.options?.type, 'command');
  assert.equal(choice.options?.autoEnter, false);
  assert.equal(choice.options?.rawData?.id, undefined);
  assert.equal(Object.hasOwn(choice.options ?? {}, 'permission'), false);
});

test('虚拟时钟推进 30 分钟后，真实教学 Context 过期且不发送业务请求', async t => {
  const { app, requests } = await gameFixture(t, () => {
    throw new Error('Expired context must not call backend');
  });
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  await app.invoke(event, () => showOnboarding(event as GameEvent, initial));
  await app.clock.advance(30 * 60_000 + 1);
  const expired = await app.dispatch(app.events.groupMessage({ text: '/我', platform: 'qq-bot' }));
  assert.equal(expired.context.claimed, false);
  assert.equal(expired.messages.length, 0);
  assert.equal(requests.length, 0);
});

test('教学按钮发送失败时降级为文字，不重放业务且保留上下文', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, nextView));
  await app.mount({ responseContent: onboardingContent });
  let attempts = 0;
  app.actions.on('message.send', () => [
    ++attempts === 1 ? createResult(ResultCode.Fail, '按钮消息未送达', null) : createResult(ResultCode.Ok, '文字送达', { id: `receipt-${attempts}` })
  ]);
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  const opened = await app.invoke(event, () => showOnboarding(event as GameEvent, initial));
  assert.equal(opened.messages.length, 2);
  assert.equal(opened.actions[opened.messages[0].actionIndex].results?.[0].code, ResultCode.Fail);
  assert.equal(opened.actions[opened.messages[1].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.ok(opened.messages[1].text.includes('同一教学进度的文字版'));
  assert.ok(opened.messages[1].text.includes('/我'));
  assert.equal(requests.length, 0);
  const continued = await app.dispatch(app.events.groupMessage({ text: '/我', platform: 'qq-bot' }));
  assert.equal(continued.context.claimed, true);
  assert.equal(requests.length, 1);
});

 test('私聊教学按钮填入指令且不限制 QQ 客户端用户白名单，发送后沿用真实 Context', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, nextView));
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.privateMessage({ userId: 'private-openid', text: '/继续引导', platform: 'qq-bot' });
  const opened = await app.invoke(event, () => showOnboarding(event as GameEvent, initial));
  assert.equal(opened.actions[opened.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const buttons = opened.messages[0].nodes.flatMap(node =>
    node.type === 'ButtonGroup' || node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []
  );
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.equal(button.options?.type, 'command');
    assert.equal(button.options?.autoEnter, false);
    assert.equal(Object.hasOwn(button.options ?? {}, 'permission'), false);
    assert.equal(button.options?.rawData?.id, undefined);
  }
  assert.equal(requests.length, 0);
  const continued = await app.dispatch(app.events.privateMessage({ userId: 'private-openid', text: '/我', platform: 'qq-bot' }));
  assert.equal(continued.context.claimed, true);
  assert.deepEqual(requests[0].body.arguments, { version: 1, command: '/我' });
});


test('系统恢复气泡在无 AI 时提供可执行入口，不重复业务', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('Recovery must not call backend'); });
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  const result = await app.invoke(event, () => showOnboardingRecovery(event as GameEvent, new Error('进度读取暂时失败')));
  assert.equal(requests.length, 0);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.ok(result.messages[0].text.includes('系统 · 操作暂未确认'));
  assert.ok(result.messages[0].text.includes('先核对当前进度，避免重复操作。'));
  const commands = result.messages[0].nodes.flatMap(node =>
    node.type === 'Markdown' ? node.value.filter(part => part.type === 'MD.button').map(part => part.options?.data) : []
  );
  assert.deepEqual(commands, ['/继续引导', '/退出引导']);
});


test('新系统标题与历史宋玉标题均直接展示原进度和动作', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('Rendering must not call backend'); });
  await app.mount({ responseContent: onboardingContent });
  for (const title of ['系统 · 新手教学', '宋玉 · 新手教学']) {
    const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
    const result = await app.invoke(event, () => showOnboarding(event as GameEvent, { ...initial, title }));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(result.messages[0].text.includes(title));
    assert.ok(result.messages[0].text.includes('先查看角色'));
    const commands = result.messages[0].nodes.flatMap(node =>
      node.type === 'ButtonGroup' || node.type === 'BT.group' ? node.value.flatMap(row => row.value.map(button => button.options?.data)) : []
    );
    assert.deepEqual(commands, ['/我', '/退出引导']);
  }
  assert.equal(requests.length, 0);
});

test('十多个境界分支用 Markdown input 展示，选择后回到小组按钮且绑定原版本', async t => {
  const menu: OnboardingView = {
    ...initial, phase: 'milestone.meridians', version: 12, title: '系统 · 新境界功能',
    branchMenu: { lines: ['选择分支学习'], items: Array.from({ length: 12 }, (_, i) => ({ id: `feature-${i}`, name: `功能${i}`, description: `功能${i}说明`, command: `/继续引导 12 feature-${i}`, learned: i === 0 })) }
  };
  const detail: OnboardingView = { ...initial, phase: menu.phase, version: 13, title: '系统 · 功能3', actions: [{ label: '已读本分支', command: '/继续引导 13 done' }, { label: '返回功能目录', command: '/继续引导 13 menu' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, detail));
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  const opened = await app.invoke(event, () => showOnboarding(event as GameEvent, menu));
  assert.equal(opened.actions[opened.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.ok(!opened.messages[0].nodes.some(node => node.type === 'ButtonGroup' || node.type === 'BT.group'));
  const nodes = JSON.stringify(opened.messages[0].nodes);
  for (const item of menu.branchMenu!.items.slice(0, 6)) assert.ok(nodes.includes(item.command));
  for (const item of menu.branchMenu!.items.slice(6)) assert.ok(!nodes.includes(item.command));
  const pageCommand = nodes.match(/\/引导目录分页 [a-f0-9]{12} 2/u)?.[0];
  assert.ok(pageCommand);
  const pageEvent = app.events.groupMessage({ text: pageCommand, platform: 'qq-bot' });
  await app.dispatch(pageEvent);
  assert.equal(requests.length, 0, 'Context must pass pagination without a gameplay query');
  const pageTwo = await app.invoke(pageEvent, () => handleOnboardingResponse(pageEvent as GameEvent, () => assert.fail('pagination belongs to plugin')));
  for (const item of menu.branchMenu!.items.slice(6)) assert.ok(JSON.stringify(pageTwo.messages[0].nodes).includes(item.command));
  assert.equal(requests.length, 0);
  assert.ok(nodes.includes('MD.button'));
  assert.ok(nodes.includes('MD.blockquote'));
  const selected = await app.dispatch(app.events.groupMessage({ text: '/继续引导 12 feature-9', platform: 'qq-bot' }));
  assert.equal(selected.context.claimed, true);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.arguments, { version: 12, command: '/继续引导 12 feature-9' });
  assert.ok(selected.messages[0].nodes.some(node => node.type === 'ButtonGroup' || node.type === 'BT.group'));
});


test('突破回执后的分支目录不请求第二次业务，不生成大键盘', async t => {
  const menu: OnboardingView = { ...initial, phase: 'milestone.meridians', version: 8,
    branchMenu: { lines: ['选择分支'], items: Array.from({ length: 12 }, (_, i) => ({ id: `feature-${i}`, name: `新功能${i}`, description: '功能说明', command: `/继续引导 8 feature-${i}`, learned: false })) }
  };
  const { app, requests } = await gameFixture(t, () => { throw new Error('Followup must not request gameplay'); });
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ text: '/突破', platform: 'qq-bot' });
  const result = await app.invoke(event, () => sendOnboardingFollowup(event as GameEvent, { onboarding: menu }, '突破结果', Format.createMarkdown().addText('本次实际结算回执')));
  assert.equal(result.value, true);
  assert.equal(requests.length, 0);
  assert.ok(result.messages[0].text.includes('本次实际结算回执'));
  assert.ok(!result.messages[0].nodes.some(node => node.type === 'ButtonGroup' || node.type === 'BT.group'));
  for (const item of menu.branchMenu!.items.slice(0, 6)) assert.ok(JSON.stringify(result.messages[0].nodes).includes(item.command));
  for (const item of menu.branchMenu!.items.slice(6)) assert.ok(!JSON.stringify(result.messages[0].nodes).includes(item.command));
  assert.match(JSON.stringify(result.messages[0].nodes), /引导目录分页 [a-f0-9]{12} 2/u);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('AI Expose 保留结构化分支目录和原指令，旧版响应仍可解析', async t => {
  const menu: OnboardingView = { ...initial, phase: 'milestone.master', version: 8,
    branchMenu: { lines: ['选择分支'], items: [{ id: 'master', name: '师门', description: '先认识师门', command: '/继续引导 8 master', learned: false }] }
  };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, menu));
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.groupMessage({ text: '看看新境界功能', platform: 'qq-bot' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_onboarding', {}), 'ai-plugin');
  assert.equal(result.value.ok, true);
  if (result.value.ok) {
    const value = result.value.data as { result: OnboardingView; presentation: { text: string } };
    assert.deepEqual(value.result.branchMenu, menu.branchMenu);
    assert.ok(value.presentation.text.includes('/继续引导 8 master'));
  }
  assert.equal(parseOnboarding(initial).branchMenu, undefined);
  assert.deepEqual(result.messages, []);
});


test('Markdown 分支指令在教学 Context 不存在时仍走正式响应入口', async t => {
  const detail: OnboardingView = { ...initial, phase: 'milestone.master', version: 6,
    actions: [{ label: '已读本分支', command: '/继续引导 6 done' }, { label: '返回目录', command: '/继续引导 6 menu' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, detail));
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ text: '/继续引导 5 teams', platform: 'qq-bot' });
  const result = await app.invoke(event, () => handleOnboardingResponse(event as GameEvent, () => { throw new Error('Owned branch must not pass'); }));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/onboarding.action');
  assert.deepEqual(requests[0].body.arguments, { version: 5, command: '/继续引导 5 teams' });
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('分支玩法交接保存进度后关闭教学 Context，真实入口不再提交为教学动作', async t => {
  const detail: OnboardingView = { ...initial, phase: 'milestone.meridians', version: 9,
    title: '系统 · 经络', lines: ['先看真气、次数和进度'],
    entries: [{ label: '打开玩法入口', command: '/继续引导 9 play' }],
    actions: [{ label: '查看实际状态', command: '/经络' }, { label: '返回目录', command: '/继续引导 9 menu' }] };
  const handoff: OnboardingView = { ...initial, status: 'completed', phase: 'milestone-handoff', version: 10,
    lines: ['介绍进度已保存，这一步尚未执行玩法或发放奖励。'],
    actions: [{ label: '打开经络', command: '/经络' }, { label: '返回分支目录', command: '/继续引导' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, handoff));
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  const opened = await app.invoke(event, () => showOnboarding(event as GameEvent, detail));
  assert.ok(JSON.stringify(opened.messages[0].nodes).includes('/继续引导 9 play'));
  assert.equal(opened.actions[opened.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const saved = await app.dispatch(app.events.groupMessage({ text: '/继续引导 9 play', platform: 'qq-bot' }));
  assert.deepEqual(requests[0].body.arguments, { version: 9, command: '/继续引导 9 play' });
  assert.ok(saved.messages[0].text.includes('尚未执行玩法'));
  assert.ok(JSON.stringify(saved.messages[0].nodes).includes('/经络'));
  assert.equal(saved.actions[saved.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const entered = await app.dispatch(app.events.groupMessage({ text: '/经络', platform: 'qq-bot' }));
  assert.equal(entered.context.claimed, false);
  assert.equal(requests.length, 1);
  assert.equal(entered.messages.length, 0);
});

test('境界教学允许未列入教学动作的真实游戏指令继续事件链', async t => {
  configureOnboardingCommandMatcher(event => event.MessageText === '/冲脉');
  t.after(() => configureOnboardingCommandMatcher(undefined));
  const { app, requests } = await gameFixture(t, () => { throw new Error('Optional teaching must not intercept gameplay'); });
  await app.mount({ responseContent: onboardingContent });
  const downstream = Router.create();
  downstream.res({ events: ['message.create'] }, async () => async () => {
    const [message] = useMessage();
    await message.send({ format: Format.create().addText('原玩法事件链已执行') });
  });
  await app.mount({ responseRouter: downstream.define }, undefined, 'game-route');
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  await app.invoke(event, () => showOnboarding(event as GameEvent, { ...initial, phase: 'milestone.meridians' }));
  const result = await app.dispatch(app.events.groupMessage({ text: '/冲脉', platform: 'qq-bot' }));
  assert.equal(result.messages[0].text, '原玩法事件链已执行');
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.equal(requests.length, 0);
});

test('回顾入口随原结算一同展示并通过最新版本切换目录，AI 契约保留导航', async t => {
  const menu: OnboardingView = { ...initial, phase: 'milestone.market', version: 8,
    entries: [{ label: '回看已开放功能', command: '/继续引导 8 history' }],
    branchMenu: { lines: ['已读不代表完成玩法'], items: [{ id: 'market', name: '交易所', description: '先看商品再比价', command: '/继续引导 8 market', learned: false }] } };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, menu));
  await app.mount({ responseContent: onboardingContent, expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.groupMessage({ text: '/突破', platform: 'qq-bot' });
  const shown = await app.invoke(event, () => sendOnboardingFollowup(event as GameEvent, { onboarding: menu }, '突破结果', Format.createMarkdown().addText('原突破回执')), 'xiuxian-game');
  assert.equal(requests.length, 0);
  assert.ok(JSON.stringify(shown.messages[0].nodes).includes('/继续引导 8 history'));
  assert.ok(shown.messages[0].text.includes('原突破回执'));
  assert.equal(shown.actions[shown.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  await app.dispatch(app.events.groupMessage({ text: '/继续引导 8 history', platform: 'qq-bot' }));
  assert.deepEqual(requests[0].body.arguments, { version: 8, command: '/继续引导 8 history' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_onboarding', {}), 'ai-plugin');
  assert.equal(result.value.ok, true);
  if (result.value.ok) {
    const output = result.value.data as { result: OnboardingView; presentation: { text: string } };
    assert.deepEqual(output.result.entries, menu.entries);
    assert.ok(output.presentation.text.includes('/继续引导 8 history'));
  }
  assert.throws(() => parseOnboarding({ ...menu, entries: [{ label: '损坏入口', command: '长'.repeat(81) }] }));
});

test('AI 交接后手动进入玩法不被旧教学 Context 吞掉，同版查询仍可继续教学', async t => {
  for (const advanced of [false, true]) {
    const detail: OnboardingView = { ...initial, phase: 'milestone.master', version: 9,
      actions: [{ label: '查看实际状态', command: '/我的师门' }, { label: '返回目录', command: '/继续引导 9 menu' }] };
    const paused: OnboardingView = { ...detail, status: 'completed', phase: 'milestone-free', version: 10 };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
      request.path.endsWith('onboarding.view') ? (advanced ? paused : detail) : nextView));
    await app.mount({ responseContent: onboardingContent });
    const downstream = Router.create();
    downstream.res({ events: ['message.create'] }, async () => async () => {
      const [message] = useMessage();
      await message.send({ format: Format.create().addText('原师门入口已执行') });
    });
    await app.mount({ responseRouter: downstream.define }, undefined, 'game-route');
    const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
    await app.invoke(event, () => showOnboarding(event as GameEvent, detail));
    const result = await app.dispatch(app.events.groupMessage({ text: '/我的师门', platform: 'qq-bot' }));
    assert.equal(requests[0].path, '/api/v2/robot/business/onboarding.view');
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    if (advanced) {
      assert.equal(requests.length, 1);
      assert.equal(result.messages[0].text, '原师门入口已执行');
    } else {
      assert.equal(requests.length, 2);
      assert.deepEqual(requests[1].body.arguments, { version: 9, command: '/我的师门' });
      assert.ok(result.messages[0].text.includes('继续查看任务'));
    }
  }
});

test('AI 正式 Expose 逐步选择、交接、恢复并回看旧分支，保留原命令且不直接执行玩法', async t => {
  const menu = (version: number, history = false): OnboardingView => ({ ...initial, phase: 'milestone.market', version,
    title: history ? '系统 · 已开放功能回顾' : '系统 · 新境界功能',
    entries: [{ label: history ? '返回本境界目录' : '回看已开放功能', command: `/继续引导 ${version} ${history ? 'current' : 'history'}` }],
    branchMenu: { lines: ['已读只记录介绍进度'], items: [{ id: history ? 'master' : 'market', name: history ? '师门' : '交易所', description: '选择分支学习', command: `/继续引导 ${version} ${history ? 'master' : 'market'}`, learned: history }] } });
  const views: OnboardingView[] = [menu(20), menu(21, true),
    { ...initial, phase: 'milestone.market', version: 22, title: '系统 · 师门', entries: [{ label: '打开玩法入口', command: '/继续引导 22 play' }],
      actions: [{ label: '已读本分支', command: '/继续引导 22 done' }, { label: '返回目录', command: '/继续引导 22 menu' }] },
    { ...initial, status: 'completed', phase: 'milestone-handoff', version: 23, title: '系统 · 前往师门',
      actions: [{ label: '打开师门', command: '/我的师门' }, { label: '返回分支目录', command: '/继续引导' }] }, menu(24, true)];
  let index = 0;
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, views[index++]));
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const steps = [
    { action: 'get_onboarding', args: {} },
    { action: 'perform_onboarding_action', args: { version: 20, command: '/继续引导 20 history', intentId: 'history' } },
    { action: 'perform_onboarding_action', args: { version: 21, command: '/继续引导 21 master', intentId: 'master' } },
    { action: 'perform_onboarding_action', args: { version: 22, command: '/继续引导 22 play', intentId: 'play' } },
    { action: 'resume_onboarding', args: { intentId: 'return' } }
  ];
  for (const [i, step] of steps.entries()) {
    const event = app.events.groupMessage({ text: step.action, messageId: `ai-branch-${i}`, platform: 'qq-bot' });
    const output = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', step.action, step.args), 'ai-plugin');
    assert.equal(output.value.ok, true);
    if (output.value.ok) {
      const data = output.value.data as { result: OnboardingView; presentation: { text: string } };
      assert.deepEqual(data.result, views[i]);
      assert.ok(data.presentation.text.includes(views[i].title));
      for (const entry of views[i].entries ?? []) assert.ok(data.presentation.text.includes(entry.command));
      if (i === 3) assert.ok(data.presentation.text.includes('/我的师门'));
    }
    assert.deepEqual(output.messages, []);
  }
  assert.equal(requests.length, 5);
  assert.deepEqual(requests.slice(1, 4).map(request => request.body.arguments), steps.slice(1, 4).map(step => ({ version: step.args.version, command: step.args.command })));
  assert.ok(requests.every(request => /onboarding\.(view|action)$/.test(request.path)));
  assert.equal(requests[4].body.messageText, '/继续引导');
});
