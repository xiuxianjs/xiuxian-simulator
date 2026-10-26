import assert from 'node:assert/strict';
import { test } from 'node:test';
import router from '../src/router';
import { queueCommunityWelcome } from '../src/notification/communityDelivery';
import { handleNotificationLifecycle } from '../src/notification/lifecycle';
import { handleCommunityJoinRequest } from '../src/notification/community';
import { handleNotificationPermissionEvent } from '../src/notification/channel';
import { sendNotificationWelcome } from '../src/notification/welcome';

test('main router selects platform events precisely without platform restriction', () => {
  const expected = [
    ['notice.create', 'private.notice.create'],
    ['private.friend.add', 'guild.join'],
    ['member.add'],
    ['private.friend.remove', 'guild.exit', 'member.remove'],
    ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create']
  ];
  for (const [index, events] of expected.entries()) {
    assert.deepEqual(router.current[index].selects, events);
    assert.equal(router.current[index].platform, undefined);
  }
  const commands = new Set(expected[4]);
  for (const entry of router.current.slice(4)) {
    const events = Array.isArray(entry.selects) ? entry.selects : [entry.selects];

    assert.ok(events.every(name => typeof name === 'string' && commands.has(name)), 'platform events must not reach game middleware or fallbacks');
  }
});

test('QQ-only notification actions safely ignore events from other platforms', async () => {
  const other = { Platform: 'other', name: 'member.add' } as Parameters<typeof queueCommunityWelcome>[0];
  await queueCommunityWelcome(other);
  await handleNotificationLifecycle(other);
  await handleCommunityJoinRequest({ Platform: 'other', name: 'notice.create' } as Parameters<typeof handleCommunityJoinRequest>[0]);
  await handleNotificationPermissionEvent({ Platform: 'other', name: 'notice.create' } as Parameters<typeof handleNotificationPermissionEvent>[0]);
  let sent = false;
  await sendNotificationWelcome(other, async () => { sent = true; });
  assert.equal(sent, false);
});
