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
