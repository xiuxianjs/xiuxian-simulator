import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/tribulation/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('失败后的准备气泡分别展示六小时冷却与真实恢复限制', async t => {
  const preparation = {
    eventId: 7, targetRealm: '合体', status: 'failed', requiredAttempts: 3, canStart: false,
    opensAt: '2026-10-21T00:00:00Z', deadline: '2026-10-21T06:00:00Z',
    retryAt: '2026-10-21T06:30:00Z', recoveryEndsAt: '2026-10-22T00:30:00Z', earliestRetryAt: '2026-10-22T00:30:00Z'
  };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { tribulationPreparation: preparation }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/我的渡劫', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /重试冷却结束：2026-10-21 14:30:00/);
  assert.match(view.text, /失败恢复结束：2026-10-22 08:30:00/);
  assert.match(view.text, /最早开启：2026-10-22 08:30:00/);
  assert.match(view.text, /届时仍需满足修为、恢复与境界资格/);
  assert.ok(view.commands.includes('/渡劫结算 7'));
});
