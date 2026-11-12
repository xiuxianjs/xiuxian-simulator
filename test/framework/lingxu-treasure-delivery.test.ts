import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import axios from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import { dispatchLingxuTreasureAnnouncements } from '../../src/notification/lingxuTreasure';

after(() => shutdownLogger());

const target = { platform: 'qq-bot', BotId: '100017', scope: 'group', targetId: 'announcement-group' };
const type = 'lingxu.treasure.announcement';
const openAt = '2026-11-12T11:20:00Z';
const beforeOpen = Date.parse('2026-11-12T11:10:00Z');
const preview = {
  version: 1, phase: 'PREVIEW', quality: 'MYTHIC', region: 'qian_inner', neighbors: ['qian', 'dui_inner'], openAt, target,
  mentionMembers: ['subscriber-a', 'subscriber-b', 'subscriber-a', 'everyone', '@all', '无效标识']
};

for (const scenario of ['预告', '结果', '重复回执', '已过期', '不同机器人', '群停用', '不合规宝物'] as const) {
  test(`洞天机缘公告：${scenario}`, async t => {
    t.mock.timers.enable({ apis: ['Date'], now: scenario === '已过期' ? Date.parse(openAt) : beforeOpen });
    const app = createTestApp({ config: {
      'xiuxian-game': { backend: { api_url: 'https://channel.invalid', channel_mode: true, robot_auth_token: 'offline-test-token' } },
      'qq-bot': { app_id: '100017' }
    } });
    t.after(() => app.dispose());
    const oldLogin = process.env.login;
    process.env.login = 'qq-bot';
    t.after(() => { if (oldLogin === undefined) delete process.env.login; else process.env.login = oldLogin; });
    let pending = true;
    const acks: unknown[] = [];
    const retries: unknown[] = [];
    const result = { treasureId: scenario === '不合规宝物' ? 501 : 607, winnerUid: 23 };
    const payload = scenario === '结果' || scenario === '不合规宝物'
      ? { ...preview, phase: 'RESULT', result }
      : scenario === '不同机器人' ? { ...preview, target: { ...target, BotId: '100027' } } : preview;
    t.mock.method(axios, 'create', () => ({ async post(path: string, body: Record<string, unknown>) {
      let data: unknown = null;
      if (path.endsWith('/claim')) {
        assert.deepEqual(body, { eventType: type, consumer: 'qq-lingxu-treasure:100017' });
        data = { event: pending ? { eventId: 'treasure-fixture', eventType: type, payload } : null };
        pending = false;
      } else if (path.endsWith('/receipt/read')) {
        if (scenario === '重复回执') data = { route: 'group', reason: 'sent' };
      } else if (path.endsWith('/availability/read')) {
        assert.deepEqual(body.target, target);
        data = scenario === '群停用' ? { available: false, updatedAt: 1 } : null;
      } else if (path.endsWith('/permission/read')) {
        assert.deepEqual(body.target, target);
        data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      } else if (path.endsWith('/ack')) {
        assert.equal(body.consumer, 'qq-lingxu-treasure:100017');
        acks.push(body.delivery);
      } else if (path.endsWith('/retry')) {
        retries.push(body.error);
      } else if (!['/receipt/store', '/permission/cas'].some(suffix => path.endsWith(suffix))) {
        throw new Error(`Unexpected notification request: ${path}`);
      }
      return { data: { data } };
    } } as never));
    app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'treasure-platform-receipt' })]);
    const delivery = await app.runHandler(() => dispatchLingxuTreasureAnnouncements(), app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }));
    assert.deepEqual(delivery.errors, []);
    assert.deepEqual(retries, []);
    const expectedSent = scenario === '预告' || scenario === '结果';
    const received = expectedSent || scenario === '重复回执';
    assert.deepEqual(acks, [{ route: received ? 'group' : 'history', reason: received ? 'sent' : scenario === '群停用' ? 'permission_blocked' : 'no_target' }]);
    assert.equal(delivery.messages.length, expectedSent ? 1 : 0);
    if (!expectedSent) {
      return;
    }
    const message = delivery.messages[0];
    assert.deepEqual(message.target, target);
    assert.equal(delivery.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    if (scenario === '预告') {
      assert.match(view.text, /群公告 · 浮空遗宫惊现通天红光/);
      assert.match(view.text, /通天古宝将于19:20在浮空遗宫现世/);
      assert.match(view.text, /观星台、葬剑原/);
      assert.doesNotMatch(view.text, /玄黄承运玺/);
    } else {
      assert.match(view.text, /玄黄承运玺已收入修士 #23 的墟行囊/);
    }
    assert.deepEqual(view.commands, ['/灵墟洞天 机缘']);
    const quoteNodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.flatMap(child => child.type === 'MD.blockquote' && Array.isArray(child.value) ? child.value : []) : []);
    assert.deepEqual(quoteNodes.filter(item => item.type === 'MD.mention').map(item => item.value), ['subscriber-a', 'subscriber-b']);
    assert.doesNotMatch(view.text, /everyone|全体成员|无效标识|@all/);
    const qqMarkdown = message.nodes.filter(node => node.type === 'Markdown').map(node => createMarkdownText(node.value, 'group')).join('\n');
    assert.deepEqual([...qqMarkdown.matchAll(/<qqbot-at-user id="([^"]+)" \/>/g)].map(match => match[1]), ['subscriber-a', 'subscriber-b']);
    assert.doesNotMatch(qqMarkdown, /qqbot-at-everyone|qqbot-cmd-enter/);
    const buttons = quoteNodes.filter(item => item.type === 'MD.button');
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].options?.autoEnter, false);
    assert.ok(buttons[0].options && !('show' in buttons[0].options));
    const fixtureDir = process.env.XIUXIAN_LINGXU_NOTIFICATION_FIXTURE_DIR;
    if (fixtureDir) {
      writeFileSync(join(fixtureDir, scenario === '预告' ? 'treasure-preview.json' : 'treasure-result.json'), JSON.stringify(message.nodes), 'utf8');
    }
  });
}
