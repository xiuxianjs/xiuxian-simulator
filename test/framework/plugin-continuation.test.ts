import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, Format, ResultCode, Router, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import router, { matchesGameCommand } from '../../src/router';
import { onboardingContent, showOnboarding } from '../../src/response/onboarding/context';
import { configureOnboardingCommandMatcher } from '../../src/response/onboarding/policy';
import type { GameEvent } from '../../src/types/event';

after(() => shutdownLogger());

for (const teaching of [false, true]) {
  test(`未命中明确指令的事件继续运行后续包，教学=${teaching}`, async t => {
    const app = createTestApp({ config: { processor: { repeated_user_time: 0 } } });
    t.after(() => app.dispose());
    configureOnboardingCommandMatcher(matchesGameCommand);
    t.after(() => configureOnboardingCommandMatcher());
    await app.mount({ responseRouter: router, responseContent: onboardingContent });
    const downstream = Router.create();
    downstream.res({ events: ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'] }, async () => async () => {
      const [message] = useMessage();
      await message.send({ format: Format.create().addText('其他插件已执行') });
    });
    await app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
    app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
    if (teaching) {
      const event = app.events.privateMessage({ text: '/继续引导', platform: 'qq-bot' });
      await app.invoke(event, () => showOnboarding(event as GameEvent, {
        status: 'active', phase: 'profile', version: 1, title: '教学', lines: [], feedback: [], actions: [{ label: '查看角色', command: '/我' }]
      }));
    }
    for (const name of ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'] as const) {
      for (const text of ['聊天内容', '/其他插件', '#其他插件', '!图鉴', '！其他插件', '/图鉴插件']) {
        const event = app.events.event(name, { Platform: 'qq-bot', MessageText: text, InteractionData: JSON.stringify({ button_id: 'other.1', button_data: text }) });
        const result = await app.dispatch(event);
        assert.deepEqual(result.errors, [], `${name}: ${text}`);
        assert.equal(result.messages.length, 1, `${name}: ${text}`);
        assert.equal(result.messages[0].text, '其他插件已执行', `${name}: ${text}`);
        assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      }
    }
    const matched = await app.dispatch(app.events.groupMessage({ text: '/图鉴', platform: 'qq-bot', userId: 'outside-teaching' }));
    assert.deepEqual(matched.errors, []);
    assert.equal(matched.messages.length, 1);
    assert.ok(!matched.messages[0].text.includes('其他插件已执行'));
    assert.ok(JSON.stringify(matched.messages[0].nodes).includes('/components/encyclopedia'));
    assert.equal(matched.actions[matched.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('禁用消息事件也跳过现有教学 Context 和明确指令，只启用私聊不会影响其他包', async t => {
  const app = createTestApp({ config: { processor: { repeated_user_time: 0 } } });
  t.after(() => app.dispose());
  await app.mount({ responseRouter: router, responseContent: onboardingContent });
  const downstream = Router.create();
  downstream.res({ events: ['message.create', 'private.message.create'] }, async () => async () => {
    const [message] = useMessage();
    await message.send({ format: Format.create().addText('其他插件已执行') });
  });
  await app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  await app.invoke(event, () => showOnboarding(event as GameEvent, {
    status: 'active', phase: 'profile', version: 1, title: '教学', lines: [], feedback: [], actions: [{ label: '查看角色', command: '/我' }]
  }));
  for (const policy of [{ allow: [] }, { deny: ['message.create'] }, { allow: ['private.message.create'] }, { allow: 'message.create' }]) {
    app.configure({ processor: { repeated_user_time: 0 }, 'xiuxian-game': { events: policy } });
    for (const text of ['/我', '/图鉴']) {
      const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0].text, '其他插件已执行');
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    }
  }
  app.configure({ processor: { repeated_user_time: 0 }, 'xiuxian-game': { events: { allow: ['private.message.create'] } } });
  const enabled = await app.dispatch(app.events.privateMessage({ text: '/图鉴', platform: 'qq-bot', userId: 'outside-teaching' }));
  assert.deepEqual(enabled.errors, []);
  assert.equal(enabled.messages.length, 1);
  assert.ok(JSON.stringify(enabled.messages[0].nodes).includes('/components/encyclopedia'));
  assert.equal(enabled.actions[enabled.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
