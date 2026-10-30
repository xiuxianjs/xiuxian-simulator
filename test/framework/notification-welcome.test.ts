import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import welcome from '../../src/response/notification/welcome/res';

after(() => shutdownLogger());

test('入群欢迎实际发送自我介绍、权限说明与夺宝修为引导，说明和按钮保留在同一个引用块', async t => {
  const requests: Array<{ path: string; body: unknown }> = [];
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: unknown) {
      requests.push({ path, body });
      if (path.endsWith('/availability/read')) return { data: { data: { available: true, updatedAt: 1 } } };
      if (path.endsWith('/receipt/lease/acquire')) return { data: { data: { acquired: true } } };
      if (path.endsWith('/availability/event') || path.endsWith('/receipt/store')) return { data: { data: null } };
      throw new Error(`Unexpected backend request: ${path}`);
    }
  }));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'offline-fixture-token' } } } });
  t.after(() => app.dispose());
  const event = app.events.event('guild.join', {
    Platform: 'qq-bot', BotId: 'welcome-bot', MessageId: 'welcome-event', UserId: 'group-owner',
    ChannelId: 'welcome-group', Target: { scope: 'group', targetId: 'welcome-group', BotId: 'welcome-bot' }
  });
  const result = await app.runHandler(welcome, event);
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(message.target?.targetId, 'welcome-group');
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
  assert.equal(quotes.length, 1);
  const quote = quotes[0];
  if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected structured quote');
  const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
  for (const text of [
    '我是修仙机器人', '请群主或管理员在 QQ 的机器人设置中开启', '① 接收全部消息',
    '帮助游戏通知找到合适的投递群', '请先 @ 我再发送指令', '普通聊天也无法用于更新活动位置',
    '② 主动消息', '虾仁夺宝受袭、反击机会和物品归属', '这些提醒无法主动送达本群',
    '个人通知仍按各自订阅设置投递', '虾仁夺宝（打劫）是游戏主要的修为获取方式之一',
    '秘境与夺宝分别使用精力、元力'
  ]) assert.ok(view.text.includes(text), text);
  assert.deepEqual(view.commands, ['/修仙帮助', '/踏入仙途', '/我的设置', '/登录']);
  assert.doesNotMatch(view.text, /固定翻倍|已开启|已允许/);
  assert.deepEqual(requests.map(request => request.path.split('/cache')[1]), [
    '/availability/event', '/availability/read', '/receipt/lease/acquire', '/receipt/store'
  ]);
  const receipt = requests[3].body as { receipt: { route: string; reason: string } };
  assert.deepEqual(receipt.receipt, { route: 'group', reason: 'sent' });
});
