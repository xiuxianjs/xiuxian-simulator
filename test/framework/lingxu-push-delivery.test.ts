import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { PushMessageTask } from '../../src/task/pushMessageTask';

after(() => shutdownLogger());

const group = { platform: 'qq-bot', scope: 'group', BotId: '100017', targetId: 'selected-group' };
const privateTarget = { platform: 'qq-bot', scope: 'c2c', BotId: '100017', targetId: 'selected-private' };
const queuedAt = '2026-11-11T12:30:00Z';

for (const scenario of ['群投递', '群不可用', '群设置已变更', '私聊设置已变更', '个人停用'] as const) {
  test(`洞天行记推送：${scenario}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = createTestApp({ config: {
      'xiuxian-game': { backend: { api_url: 'https://channel.invalid', channel_mode: true, robot_auth_token: 'offline-test-token' } },
      'qq-bot': { app_id: '100017' }
    }, timeoutMs: 60_000 });
    t.after(() => app.dispose());
    const oldLogin = process.env.login;
    process.env.login = 'qq-bot';
    t.after(() => { if (oldLogin === undefined) delete process.env.login; else process.env.login = oldLogin; });
    let pending = true;
    let preferenceReads = 0;
    let platformSends = 0;
    const acknowledgements: unknown[] = [];
    t.mock.method(axios, 'create', () => ({ async post(path: string, body: Record<string, unknown>) {
      let data: unknown = null;
      if (path.endsWith('/claim-next')) return { data: { claim: null, pending: false } };
      if (path.endsWith('/retry')) throw new Error(String(body.error));
      if (path.endsWith('/claim')) {
        const event = body.lane === 'standard' && pending ? {
          eventId: 'lingxu:fixture', recipientUserId: 7, recipientBid: 'recipient', occurredAt: queuedAt,
          payload: {
            version: 1, recipientUserId: 7, source: 'lingxu.summary',
            lingxuSummary: { time: '11-11 20:20–20:30', lines: ['经历：搜寻林间落种', '收获：修为 +7'] },
            data: [{ type: 'Text', value: 'legacy-private-text' }]
          }
        } : null;
        if (event) pending = false;
        data = { event };
      } else if (path.endsWith('/player/categories')) data = { enabled: scenario !== '个人停用' };
      else if (path.endsWith('/legacy-sent-ids')) data = { ids: [] };
      else if (path.endsWith('/lingxu-preference')) {
        assert.deepEqual(body, { playerId: 7, queuedAt });
        preferenceReads++;
        if (preferenceReads > 1 && (scenario === '群设置已变更' || scenario === '私聊设置已变更')) data = { mode: 'off' };
        else data = scenario === '私聊设置已变更' ? { mode: 'private' } : { mode: 'group', target: group };
      } else if (path.endsWith('/private-target/read')) {
        assert.equal(scenario, '私聊设置已变更');
        data = privateTarget;
      } else if (path.endsWith('/availability/read')) data = { available: scenario !== '群不可用', updatedAt: 1 };
      else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      else if (path.endsWith('/ack')) {
        if (scenario === '群投递') assert.equal(platformSends, 1);
        acknowledgements.push(body.delivery);
      } else if (!['/receipt/read', '/receipt/store', '/permission/cas'].some(suffix => path.endsWith(suffix))) {
        throw new Error(`Unexpected notification request: ${path}`);
      }
      return { data: { data } };
    } } as never));
    app.actions.on('message.send.target', () => {
      platformSends++;
      return [createResult(ResultCode.Ok, '送达', { id: 'lingxu-platform-receipt' })];
    });
    const result = await app.runHandler(() => PushMessageTask(), app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }));
    assert.deepEqual(result.errors, []);
    assert.equal(acknowledgements.length, 1);
    if (scenario !== '群投递') {
      assert.deepEqual(result.messages, []);
      assert.equal(platformSends, 0);
      assert.equal(preferenceReads, scenario === '个人停用' ? 0 : scenario === '群不可用' ? 1 : 2);
      assert.deepEqual(acknowledgements, [{ route: 'history', reason: scenario === '个人停用' ? 'proactive_disabled' : 'permission_blocked' }]);
      return;
    }
    assert.deepEqual(acknowledgements, [{ route: 'group', reason: 'sent' }]);
    assert.equal(preferenceReads, 2);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(message.target?.targetId, group.targetId);
    assert.equal(message.target?.BotId, group.BotId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /11-11 20:20–20:30/);
    assert.match(view.text, /收获：修为 \+7/);
    assert.doesNotMatch(view.text, /legacy-private-text/);
    assert.deepEqual(view.commands, ['/灵墟洞天 行记']);
    const buttons = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.button') : []);
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].options?.autoEnter, false);
  });
}
