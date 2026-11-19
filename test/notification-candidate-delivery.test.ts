import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Ok, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { deliverNotification } from '../src/notification/delivery';
import { notificationChannel, assertNotificationReceipt } from '../src/notification/channel';
import { deliverFlyMailNotification, subscriberGroup } from '../src/notification/flymailDelivery';
import { NotificationDeliveryUncertainError, type NotificationChannel, type NotificationTarget } from '../src/types/notification';

after(() => shutdownLogger());

const target = (id: string): NotificationTarget => ({ platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: id });
const subscribed = target('subscribed');
const otherOne = target('other-one');
const otherTwo = target('other-two');

test('an ambiguous send must not switch groups even if a concurrent permission event says blocked', async () => {
  const sent: string[] = [];
  let refreshed = 0;
  const channel: NotificationChannel = {
    read: async () => null,
    send: async t => { sent.push(t.targetId); throw new NotificationDeliveryUncertainError('timeout'); },
    refreshAfterFailure: async () => { refreshed++; return { state: 'blocked', source: 'event', updatedAt: 100 }; },
    recordFailure: async () => {}
  };
  await assert.rejects(deliverNotification({ group: subscribed, data: [], enabled: true }, channel), NotificationDeliveryUncertainError);
  assert.deepEqual(sent, ['subscribed']);
  assert.equal(refreshed, 0);
});

test('cooldown preserves retry without switching groups', async () => {
  const sent: string[] = [];
  const channel: NotificationChannel = {
    read: async t => t.targetId === 'subscribed' ? { state: 'allowed', source: 'query', updatedAt: 1, retryAt: 200 } : null,
    send: async t => { sent.push(t.targetId); },
    refreshAfterFailure: async () => null,
    recordFailure: async () => {}
  };
  await assert.rejects(deliverNotification({ group: subscribed, data: [], enabled: true }, channel, () => 100), /冷却/);
  assert.deepEqual(sent, []);
});

test('a blocked subscription group falls back to private and never to another group', async () => {
  const privateTarget: NotificationTarget = { ...target('private'), scope: 'c2c' };
  const sent: string[] = [];
  const channel: NotificationChannel = {
    read: async t => t.scope === 'group' ? { state: 'blocked', source: 'event', updatedAt: 100 } : null,
    send: async t => { sent.push(t.targetId); },
    refreshAfterFailure: async () => null,
    recordFailure: async () => {}
  };
  const result = await deliverNotification({ group: subscribed, privateTarget, data: [], enabled: true }, channel);
  assert.equal(result.route, 'private');
  assert.deepEqual(sent, ['private']);
});

test('no subscription group means no group delivery at all', async () => {
  const privateTarget: NotificationTarget = { ...target('private'), scope: 'c2c' };
  const sent: string[] = [];
  const channel: NotificationChannel = {
    read: async () => null,
    send: async t => { sent.push(t.targetId); },
    refreshAfterFailure: async () => null,
    recordFailure: async () => {}
  };
  const result = await deliverNotification({ group: null, privateTarget, data: [], enabled: true }, channel);
  assert.equal(result.route, 'private');
  assert.deepEqual(sent, ['private']);
  // 没有私聊地址时只能留在站内记录，不能退回任何群。
  const history = await deliverNotification({ group: null, privateTarget: null, data: [], enabled: true }, channel);
  assert.deepEqual(history, { route: 'history', reason: 'no_private_target' });
  assert.ok(!sent.includes(otherOne.targetId) && !sent.includes(otherTwo.targetId));
});

test('the subscription row is the only source of a group delivery target', () => {
  // 活动位置只是路由线索，不能成为投递理由：关闭或缺失订阅时不产生任何群目标。
  assert.equal(subscriberGroup(null), null);
  assert.equal(subscriberGroup({
    isEnabled: false, platform: 'qq-bot', channelId: 'other-one', botId: 'bot', targetScope: 'group'
  }), null);
  assert.deepEqual(subscriberGroup({
    isEnabled: true, platform: 'qq-bot', channelId: 'subscribed', botId: 'bot', targetScope: 'group'
  }), subscribed);
  assert.deepEqual(subscriberGroup({
    isEnabled: true, platform: 'qq-bot', channelId: 'guild-channel', botId: 'bot', targetScope: 'channel'
  }), { platform: 'qq-bot', BotId: 'bot', scope: 'channel', targetId: 'guild-channel' });
});

test('a flymail whose owner never subscribed sends no group reminder anywhere', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'offline-token' } } } });

  t.after(() => app.dispose());
  const requested: string[] = [];
  let groupSends = 0;
  const restore = t.mock.method(axios, 'create', () => ({
    post: async (path: string) => {
      requested.push(path);
      // 私聊地址缺失且订阅查询返回 null：两条路径都不能产生群发送。
      return { data: { data: null } };
    }
  }));

  t.after(() => restore.mock.restore());
  const originalLogin = process.env.login;

  process.env.login = 'qq-bot';
  t.after(() => {
    if (originalLogin === undefined) { delete process.env.login; } else { process.env.login = originalLogin; }
  });
  const originalSend = notificationChannel.send;

  notificationChannel.send = async target => {
    if (target.scope === 'group' || target.scope === 'channel') {
      groupSends++;
    }
  };
  t.after(() => {
    notificationChannel.send = originalSend;
  });

  let result: Awaited<ReturnType<typeof deliverFlyMailNotification>> | undefined;

  await app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), async () => {
    result = await deliverFlyMailNotification('flymail.message:86:received:2833', 'player-bid', [], true);
  });

  assert.equal(result?.route, 'history');
  assert.equal(groupSends, 0, '没有订阅群时飞信提醒不能进任何群');
  assert.ok(requested.some(path => path.endsWith('/subscription')), '应当按事件所属玩家查询订阅');
  assert.ok(!requested.some(path => path.includes('/activity/')), '投递路径不再读取群活动候选');
});

test('missing, partial and malformed receipts are uncertain; explicit refusal is distinct', () => {
  assert.throws(() => assertNotificationReceipt(undefined), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([{}]), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([]), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([{ code: Ok }, { code: -1 }]), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([{ code: -1 }]), error => error instanceof Error && !(error instanceof NotificationDeliveryUncertainError));
  assert.doesNotThrow(() => assertNotificationReceipt([{ code: Ok }]));
});
