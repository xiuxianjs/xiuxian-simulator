import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { gameFixture } from './fixture';
import { onboardingContent, showOnboarding } from '../../src/response/onboarding/context';
import type { GameEvent } from '../../src/types/event';

after(() => shutdownLogger());
for (const failed of [false, true]) {
  test(`游戏气泡自动调用AI呈现，失败保留原气泡：${failed}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('Narration must not execute gameplay'); });
    let calls = 0;
    const provider = Expose.create().provide({ name: 'agent-link.game-narration.v1', version: '1.0.0', description: 'test narration provider', actions: {
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
    }), 'xiuxian-game');
    assert.equal(calls, 1);
    assert.equal(requests.length, 0);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(result.messages[0].text.includes('尚未执行玩法'));
    assert.equal(result.messages[0].text.includes('别急'), !failed);
    assert.ok(JSON.stringify(result.messages[0].nodes).includes('/我'));
  });
}
