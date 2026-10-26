import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { onboardingContent, showOnboarding } from '../../src/response/onboarding/context';
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
  // Callback buttons are intentionally absent from .commands. Inspect their
  // original nodes to verify version binding and recipient permissions.
  const buttons = continued.messages[0].nodes.flatMap(node =>
    node.type === 'ButtonGroup' || node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []
  );
  const choice = buttons.find(button => button.options?.data === '/任务面板');
  assert.ok(choice);
  assert.equal(choice.options?.type, 'call');
  assert.equal(choice.options?.rawData.id, 'ob2.0');
  assert.deepEqual(choice.options?.permission?.userIds, ['newcomer']);
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
