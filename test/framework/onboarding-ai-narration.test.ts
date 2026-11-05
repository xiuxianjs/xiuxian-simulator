import { handleOnboardingResponse } from '../../src/response/onboarding/res';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { businessEnvelope, gameFixture } from './fixture';
import { onboardingContent, showOnboarding } from '../../src/response/onboarding/context';
import type { GameEvent } from '../../src/types/event';

after(() => shutdownLogger());
for (const failed of [false, true]) {
  test(`关键引导不等待附加旁白，提供者是否失败：${failed}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('Narration must not execute gameplay'); });
    let calls = 0;
    const provider = Expose.create().provide({ name: 'agent.presentation.v1', version: '1.0.0', description: 'test narration provider', actions: {
      narrate: Expose.action<{ text: string }, { text: string }>({ description: 'test narration', effect: 'read',
        inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
        outputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
        handler: async (input, context) => { calls++; assert.equal(context.callerApp, 'xiuxian-game'); assert.ok(input.text.includes('尚未执行玩法')); if (failed) throw new Error('model unavailable'); return { text: '别急，先挑一个你想了解的方向。' }; }
      })
    } });
    await app.mount({ expose: provider }, undefined, 'alemonjs-agent-link');
    await app.mount({ responseContent: onboardingContent }, undefined, 'xiuxian-game');
    const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
    const result = await app.invoke(event, () => showOnboarding(event as GameEvent, {
      status: 'active', phase: 'profile', version: 1, title: '系统', lines: ['尚未执行玩法'], feedback: [], actions: [{ label: '查看', command: '/我' }]
    }, '进入新阶段'), 'xiuxian-game');
    assert.equal(calls, 0);
    assert.equal(requests.length, 0);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(result.messages[0].text.includes('尚未执行玩法'));
    assert.equal(result.messages[0].text.includes('别急'), false);
    assert.ok(JSON.stringify(result.messages[0].nodes).includes('/我'));
  });
}

test('手动教学操作在请求服务端前通知AI旧引导失效', async t => {
  let invalidated = 0;
  const current = { status: 'active', phase: 'profile', version: 1, title: '系统', lines: ['当前进度'], feedback: [], actions: [{ label: '查看', command: '/我' }] };
  const { app } = await gameFixture(t, request => {
    assert.equal(invalidated, 1);
    return businessEnvelope(request.bid, current);
  });
  const provider = Expose.create().provide({ name: 'agent.presentation.v1', version: '1.0.0', description: 'invalidate', actions: {
    begin_input: Expose.action({ description: 'invalidate', effect: 'write', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'object', properties: { accepted: { type: 'boolean' } }, required: ['accepted'], additionalProperties: false }, handler: async (_input, context) => { assert.equal(context.callerApp, 'xiuxian-game'); invalidated++; return { accepted: true }; } })
  } });
  await app.mount({ expose: provider }, undefined, 'alemonjs-agent-link');
  await app.mount({ responseContent: onboardingContent }, undefined, 'xiuxian-game');
  const event = app.events.groupMessage({ text: '/继续引导', platform: 'qq-bot' });
  const result = await app.invoke(event, () => handleOnboardingResponse(event as GameEvent, () => { throw new Error('must handle'); }), 'xiuxian-game');
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.equal(invalidated, 1);
});
