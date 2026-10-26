import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Ok } from 'alemonjs';
import { deliverNotification } from '../src/notification/delivery';
import { assertNotificationReceipt } from '../src/notification/channel';
import { NotificationDeliveryUncertainError, type NotificationChannel, type NotificationTarget } from '../src/types/notification';

const target = (id: string): NotificationTarget => ({ platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: id });
const first = target('first');
const second = target('second');
const third = target('third');

test('an ambiguous send must not switch groups even if a concurrent permission event says blocked', async () => {
  const sent: string[] = [];
  let refreshed = 0;
  const channel: NotificationChannel = {
    read: async () => null,
    send: async t => { sent.push(t.targetId); throw new NotificationDeliveryUncertainError('timeout'); },
    refreshAfterFailure: async () => { refreshed++; return { state: 'blocked', source: 'event', updatedAt: 100 }; },
    recordFailure: async () => {}
  };
  await assert.rejects(deliverNotification({ group: first, fallbackGroups: async () => [second, third], data: [], enabled: true }, channel), NotificationDeliveryUncertainError);
  assert.deepEqual(sent, ['first']);
  assert.equal(refreshed, 0);
});

test('cooldown preserves retry without switching groups', async () => {
  const sent: string[] = [];
  const channel: NotificationChannel = {
    read: async t => t.targetId === 'first' ? { state: 'allowed', source: 'query', updatedAt: 1, retryAt: 200 } : null,
    send: async t => { sent.push(t.targetId); },
    refreshAfterFailure: async () => null,
    recordFailure: async () => {}
  };
  await assert.rejects(deliverNotification({ group: first, fallbackGroups: async () => [first, second, third], data: [], enabled: true }, channel, () => 100), /冷却/);
  assert.deepEqual(sent, []);
  await assert.rejects(deliverNotification({ group: first, data: [], enabled: true }, channel, () => 100), /冷却/);
});

test('all blocked groups use private fallback once', async () => {
  const privateTarget: NotificationTarget = { ...target('private'), scope: 'c2c' };
  const sent: string[] = [];
  const channel: NotificationChannel = {
    read: async t => t.scope === 'group' ? { state: 'blocked', source: 'event', updatedAt: 100 } : null,
    send: async t => { sent.push(t.targetId); },
    refreshAfterFailure: async () => null,
    recordFailure: async () => {}
  };
  const result = await deliverNotification({ group: first, fallbackGroups: async () => [second, third], privateTarget, data: [], enabled: true }, channel);
  assert.equal(result.route, 'private');
  assert.deepEqual(sent, ['private']);
});

test('missing, partial and malformed receipts are uncertain; explicit refusal is distinct', () => {
  assert.throws(() => assertNotificationReceipt(undefined), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([{}]), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([]), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([{ code: Ok }, { code: -1 }]), NotificationDeliveryUncertainError);
  assert.throws(() => assertNotificationReceipt([{ code: -1 }]), error => error instanceof Error && !(error instanceof NotificationDeliveryUncertainError));
  assert.doesNotThrow(() => assertNotificationReceipt([{ code: Ok }]));
});
