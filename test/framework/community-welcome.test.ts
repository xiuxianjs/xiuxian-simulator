import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import axios from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import community from '../../src/response/notification/community/res';
import { dispatchCommunityNotifications } from '../../src/notification/communityDelivery';
import type { CommunityBatch } from '../../src/api/bot/notification-cache';

after(() => shutdownLogger());

function fixture(t: TestContext) {
  const batches: CommunityBatch[] = [];
  const absent = new Set<string>();
  const receipts = new Map<string, unknown>();
  const leases = new Set<string>();
  const missingReceipts = new Set<string>();
  const writes: Record<string, any>[] = [];
  const finished: Array<{ eventId: string; retry: boolean }> = [];
  let enabled = true;
  let shopRaidEnabled = false;
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: Record<string, any>) {
      let data: unknown = null;
      if (path.endsWith('/community/claim')) data = batches.shift() ?? null;
      else if (path.endsWith('/community/settings/read')) data = { welcomeEnabled: enabled, requestReminders: false, shopRaidEnabled };
      else if (path.endsWith('/community/settings/write')) { writes.push(body); enabled = body.settings.welcomeEnabled; }
      else if (path.endsWith('/availability/read')) data = { available: !absent.has(body.memberId), updatedAt: 1 };
      else if (path.endsWith('/permission/probe')) data = { previous: '', acquired: false };
      else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      else if (path.endsWith('/permission/cas')) data = null;
      else if (path.endsWith('/receipt/read')) data = receipts.get(body.eventId) ?? null;
      else if (path.endsWith('/receipt/lease/acquire')) {
        data = { acquired: !leases.has(body.eventId) };
        leases.add(body.eventId);
      }
      else if (path.endsWith('/receipt/store')) {
        if (missingReceipts.has(body.eventId)) throw new Error('模拟回执存储失败');
        receipts.set(body.eventId, body.receipt);
      }
      else if (path.endsWith('/community/finish')) finished.push({ eventId: body.eventId, retry: body.retry });
      else throw new Error(`Unexpected request: ${path}`);
      return { data: { data } };
    }
  }));
  const app = createTestApp({ config: {
    'qq-bot': { app_id: '123' },
    'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'fixture' } }
  } });
  t.after(() => app.dispose());
  app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'welcome-receipt' })]);
  const batch = (eventId: string, items: string[]): CommunityBatch => ({
    eventId, kind: 'welcome', items,
    target: { platform: 'qq-bot', BotId: 'community-bot', scope: 'group', targetId: 'welcome-group' }
  });
  const run = (value: CommunityBatch) => {
    batches.push(value);
    return app.runHandler(dispatchCommunityNotifications, app.events.groupMessage({ platform: 'qq-bot', botId: 'community-bot' }));
  };
  return { app, batch, run, absent, finished, receipts, writes, missingReceipts,
    disable: () => { enabled = false; }, enableShopRaid: () => { shopRaidEnabled = true; } };
}

test('商运招募公示仅投给启用群，重复认领和过期消息都不发送', async t => {
  const { run, batch, enableShopRaid, receipts } = fixture(t);
  const value: CommunityBatch = {
    ...batch('convoy-12', ['12']),
    kind: 'shop-raid',
    convoy: { id: 12, departureAt: new Date(Date.now() + 60_000).toISOString(), nextGuardSeat: 1,
      manifest: [{ currency: 'SPIRIT_STONE', quantity: 1000 }] }
  };
  assert.equal((await run(value)).messages.length, 0);
  enableShopRaid();
  const delivered = await run(value);
  assert.deepEqual(delivered.errors, []);
  assert.equal(delivered.messages.length, 1);
  const view = inspectMessage(delivered.messages[0].nodes);
  assert.match(view.text, /万宝楼商队.*护卫招募中/);
  assert.match(view.text, /灵石 ×1000/);
  assert.deepEqual(view.commands, ['/加入商运护卫 12 1', '/打劫队 创建', '/商运 12']);
  assert.deepEqual(receipts.get(value.eventId), { route: 'group', reason: 'sent' });
  assert.equal((await run(value)).messages.length, 0);
  const expired = { ...value, eventId: 'expired', convoy: { ...value.convoy, departureAt: new Date(0).toISOString() } };
  assert.equal((await run(expired)).messages.length, 0);
});

test('商运 QQ 已送达但回执暂时写不进时，同车重试不再发卡', async t => {
  const { run, batch, enableShopRaid, missingReceipts, finished, receipts } = fixture(t);
  enableShopRaid();
  const value: CommunityBatch = {
    ...batch('convoy-13', ['13']),
    kind: 'shop-raid',
    convoy: { id: 13, departureAt: new Date(Date.now() + 60_000).toISOString(),
      manifest: [{ currency: 'SPIRIT_STONE', quantity: 1000 }] }
  };
  missingReceipts.add(value.eventId);
  assert.equal((await run(value)).messages.length, 1);
  assert.equal(receipts.has(value.eventId), false);
  assert.equal((await run(value)).messages.length, 0);
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: true }, { eventId: value.eventId, retry: false }]);
});

function quoteOf(message: { nodes: NonNullable<Parameters<typeof inspectMessage>[0]> }) {
  const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
  assert.equal(quotes.length, 1);
  const quote = quotes[0];
  if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected structured quote');
  return quote.value;
}

test('单人欢迎提及真实成员，新老玩家与玩法入口在同一引用块，成功后不重复投递', async t => {
  const { run, batch, finished, receipts } = fixture(t);
  const value = batch('welcome-once', ['new-member']);
  const result = await run(value);
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(message.target?.targetId, 'welcome-group');
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(inspectMessage(message.nodes).text, /仙途来客/);
  const quote = quoteOf(message);
  const view = inspectMessage([{ type: 'Markdown', value: quote }]);
  assert.match(view.text, /愿你在此结识同道，共赴仙途/);
  assert.doesNotMatch(view.text, /欢迎 1 位|新玩家|帮助查看|礼包|UID|登录/);
  assert.deepEqual(quote.filter(node => node.type === 'MD.mention').map(node => node.value), ['new-member']);
  assert.deepEqual(view.commands, ['/踏入仙途', '/我的活动', '/配置群欢迎 关闭']);
  assert.ok(quote.filter(node => node.type === 'MD.button').every(node => !node.options?.autoEnter));
  assert.deepEqual(receipts.get(value.eventId), { route: 'group', reason: 'sent' });
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }]);
  const repeat = await run(value);
  assert.equal(repeat.messages.length, 0);
});

test('多人欢迎只提及仍在群内的成员，人数一致且不修改原批次', async t => {
  const { run, batch, absent } = fixture(t);
  absent.add('left');
  const value = batch('welcome-many', ['first', 'left', 'second', 'first']);
  const result = await run(value);
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /同道相逢/);
  assert.match(view.text, /迎来 2 位道友/);
  assert.match(view.text, /仙途漫漫，往后便有同道同行/);
  assert.deepEqual(quoteOf(message).filter(node => node.type === 'MD.mention').map(node => node.value), ['first', 'second']);
  assert.deepEqual(value.items, ['first', 'left', 'second', 'first']);
});

test('重新投递同一事件保持欢迎文案，多人批次剩一人使用单人排版', async t => {
  const { run, batch, absent, receipts, app } = fixture(t);
  absent.add('left');
  const value = batch('stable-scene', ['left', 'remaining']);
  const first = await run(value);
  assert.equal(first.messages.length, 1);
  assert.equal(first.actions[first.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(inspectMessage(first.messages[0].nodes).text, /仙途来客/);
  assert.doesNotMatch(inspectMessage(first.messages[0].nodes).text, /迎来 2 位/);
  receipts.clear(); // Simulate a later rendering of the same durable event.
  await app.clock.advance(60_000);
  const retry = await run(value);
  assert.equal(retry.messages.length, 1);
  assert.equal(retry.actions[retry.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(retry.messages[0].nodes, first.messages[0].nodes);
});

test('欢迎关闭或成员全部离群时结束批次，不发送空欢迎', async t => {
  const { run, batch, absent, disable, finished } = fixture(t);
  absent.add('left');
  assert.equal((await run(batch('all-left', ['left']))).messages.length, 0);
  disable();
  assert.equal((await run(batch('disabled', ['member']))).messages.length, 0);
  assert.deepEqual(finished, [{ eventId: 'all-left', retry: false }, { eventId: 'disabled', retry: false }]);
});

test('欢迎按钮往返：普通成员拒绝，群管理关闭指定群，重复关闭不反转，管理页仅显示开启', async t => {
  const { app, run, batch, writes } = fixture(t);
  const value = batch('welcome-toggle', ['new-member']);
  const welcome = await run(value);
  const command = inspectMessage(welcome.messages[0].nodes).commands.find(command => command === '/配置群欢迎 关闭');
  assert.ok(command);
  for (const role of ['member', 'admin', 'admin'] as const) {
    const result = await app.runHandler(community, {
      ...app.events.groupMessage({ platform: 'qq-bot', botId: 'community-bot', text: command }),
      Role: role, Target: value.target
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    if (role === 'member') {
      assert.equal(writes.length, 0);
      assert.match(view.text, /仅本群管理员或群主可操作/);
    } else {
      assert.match(view.text, /结果：本群成员欢迎已关闭/);
      assert.ok(view.commands.includes('/配置群欢迎 开启'));
      assert.ok(!view.commands.includes('/配置群欢迎 关闭'));
    }
  }
  assert.equal(writes.length, 2);
  for (const write of writes) {
    assert.deepEqual(write.target, value.target);
    assert.equal(write.settings.welcomeEnabled, false);
  }
  const stopped = await run(batch('after-disable', ['another-member']));
  assert.equal(stopped.messages.length, 0);
});
