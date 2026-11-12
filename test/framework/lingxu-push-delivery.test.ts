import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import axios from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { PushMessageTask } from '../../src/task/pushMessageTask';

after(() => shutdownLogger());

const group = { platform: 'qq-bot', scope: 'group', BotId: '100017', targetId: 'selected-group' };
const privateTarget = { platform: 'qq-bot', scope: 'c2c', BotId: '100017', targetId: 'selected-private' };
const queuedAt = '2026-11-12T16:20:00Z';
const choiceTick = '2026-11-12T16:30:00Z';
const beforeChoiceTick = Date.parse('2026-11-12T16:25:00Z');

for (const scenario of ['私聊投递', '旧群设置转私聊', '私聊不可用', '发送前关闭', '个人停用', '队员私聊', '同一私聊的临场选择', '机缘临场选择', '临场选择到期', '投递时到期', '无效临场选项'] as const) {
  test(`洞天行记推送：${scenario}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: scenario === '临场选择到期' ? Date.parse(choiceTick) : beforeChoiceTick });
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
    const legacyRound = scenario === '队员私聊';
    const summaryTime = legacyRound ? '12-31 20:40' : '2026.11.13-00:20';
    const lingxuTick = Date.parse(legacyRound ? '2025-12-31T12:40:00Z' : queuedAt) / 1000;
    const isTreasureChoice = scenario === '机缘临场选择';
    const withChoice = isTreasureChoice || ['同一私聊的临场选择', '临场选择到期', '投递时到期', '无效临场选项'].includes(scenario);
    const choice = isTreasureChoice
      ? { nextTick: choiceTick, cue: 'TREASURE_OPEN', region: '浮空遗宫', options: ['TOWARD_OPPORTUNITY', 'SEARCH_PERIMETER'] }
      : { nextTick: choiceTick, cue: 'AT_EXIT', region: scenario === '无效临场选项' ? '回显占位词' : '青岚林', options: ['EXIT', 'REST'] };
    const acknowledgements: unknown[] = [];
    const retries: unknown[] = [];
    t.mock.method(axios, 'create', () => ({ async post(path: string, body: Record<string, unknown>) {
      let data: unknown = null;
      if (path.endsWith('/claim-next')) return { data: { claim: null, pending: false } };
      if (path.endsWith('/retry')) {
        retries.push(body.error);
        return { data: { data: null } };
      }
      if (path.endsWith('/claim')) {
        const event = body.lane === 'standard' && pending ? {
          eventId: 'lingxu:fixture', recipientUserId: 7, recipientBid: 'recipient', occurredAt: queuedAt,
          payload: {
            version: 1, recipientUserId: 7, source: 'lingxu.summary',
            lingxuTick,
            lingxuSummary: { time: summaryTime, lines: ['经历：搜寻林间落种', '收获：修为 +7'], ...(withChoice ? { choice } : {}) },
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
        if (preferenceReads > 1 && scenario === '投递时到期') t.mock.timers.setTime(Date.parse(choiceTick));
        if (preferenceReads > 1 && scenario === '发送前关闭') data = { mode: 'off' };
        else data = scenario === '旧群设置转私聊' ? { mode: 'group', target: group } : { mode: 'private' };
      } else if (path.endsWith('/private-target/read')) {
        data = privateTarget;
      } else if (path.endsWith('/availability/read')) {
        assert.deepEqual(body.target, privateTarget);
        data = null;
      } else if (path.endsWith('/permission/read')) {
        data = { state: { state: scenario === '私聊不可用' ? 'blocked' : 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      } else if (path.endsWith('/ack')) {
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
    assert.deepEqual(retries, []);
    assert.equal(acknowledgements.length, 1);
    if (!withChoice && scenario !== '私聊投递' && scenario !== '旧群设置转私聊' && scenario !== '队员私聊') {
      assert.deepEqual(result.messages, []);
      assert.equal(platformSends, 0);
      assert.equal(preferenceReads, scenario === '个人停用' ? 0 : scenario === '私聊不可用' ? 1 : 2);
      assert.deepEqual(acknowledgements, [{ route: 'history', reason: scenario === '个人停用' ? 'proactive_disabled' : 'permission_blocked' }]);
      return;
    }
    assert.equal(platformSends, 1);
    assert.deepEqual(acknowledgements, [{ route: 'private', reason: 'sent' }]);
    assert.equal(preferenceReads, 2);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(message.target?.scope, 'c2c');
    assert.equal(message.target?.targetId, privateTarget.targetId);
    assert.equal(message.target?.BotId, privateTarget.BotId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /收获：修为 \+7/);
    assert.doesNotMatch(view.text, /legacy-private-text/);
    const hasChoice = scenario === '同一私聊的临场选择' || isTreasureChoice;
    const verbs = isTreasureChoice ? ['赴机缘', '搜外围'] : ['撤离', '休息'];
    assert.deepEqual(view.commands, [...(hasChoice ? verbs.map(verb => `/灵墟洞天 临场 2026-11-13 00:30 ${verb}`) : []), '/灵墟洞天 行记']);
    const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
    assert.ok(Array.isArray(quotes[0].value));
    assert.equal(quotes[0].value.find(child => child.type === 'MD.bold')?.value, legacyRound ? '2025.12.31-20:40' : '2026.11.13-00:20');
    if (hasChoice) {
      assert.equal(quotes.length, 2);
      assert.ok(Array.isArray(quotes[1].value));
      const context = quotes[1].value;
      assert.deepEqual(context.filter(child => child.type === 'MD.text').map(child => child.value).filter(line => line.trim()), [
        isTreasureChoice ? '动静：浮空遗宫的机缘正在争夺。' : '动静：你已抵达青岚林，震门可以撤离。',
        '轮次：00:30 · 临场选择仅此一轮生效'
      ]);
      const choices = context.filter(child => child.type === 'MD.button');
      assert.deepEqual(choices.map(button => button.value), isTreasureChoice ? ['‹向机缘前进›', '‹去外围搜寻›'] : ['‹下轮撤离›', '‹休息一轮›']);
      assert.ok(choices.every(button => button.options?.autoEnter === false && !('show' in button.options)));
    } else {
      assert.equal(quotes.length, 1);
      assert.doesNotMatch(view.text, /动静|轮次|回显占位词/);
    }
    const buttons = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.button') : []);
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].options?.autoEnter, false);
    const fixtureDir = process.env.XIUXIAN_LINGXU_NOTIFICATION_FIXTURE_DIR;
    if (fixtureDir && (scenario === '私聊投递' || scenario === '同一私聊的临场选择')) {
      writeFileSync(join(fixtureDir, hasChoice ? 'with-choice.json' : 'before-choice.json'), JSON.stringify(message.nodes), 'utf8');
    }
  });
}
