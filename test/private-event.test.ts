import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withEventContext } from 'alemonjs';
import { isPrivateEvent, normalizePrivateEvent } from '../src/utils/privateEvent';
import { FormatGui } from '../src/utils/messageHelper';

test('platform private flags override stale legacy display flags', () => {
  for (const event of [
    { IsPrivate: true, isPrivate: false, name: 'private.message.create' },
    { name: 'private.interaction.create', isPrivate: false },
    { IsPrivate: true },
    { isPrivate: true }
  ]) {
    assert.equal(isPrivateEvent(event), true);
    normalizePrivateEvent(event);
    assert.equal(event.isPrivate, true);
  }
  assert.equal(isPrivateEvent({ IsPrivate: false, isPrivate: true, name: 'message.create' }), false);
  assert.equal(isPrivateEvent(undefined), false);
});

test('C2C meditation bubble excludes mention despite stale renderer flag and retains actions', async () => {
  const event = { name: 'private.message.create', IsPrivate: true, isPrivate: false, UserId: 'c2c-player' } as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event, () => {}, () => {
    const result = FormatGui({ isPrivate: false, bid: 'c2c-player', title: '打坐', footer: [{ label: '结束', command: '/打坐结束' }] });
    const payload = JSON.stringify(result.format.value);
    assert.doesNotMatch(payload, /mention|c2c-player/i);
    assert.match(payload, /打坐结束/);
    assert.match(payload, /属性面板/);
  });
});

test('group bubbles retain user mention and explicit mention suppression', async () => {
  const event = { name: 'message.create', IsPrivate: false } as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event, () => {}, () => {
    assert.match(JSON.stringify(FormatGui({ bid: 'group-player', title: '打坐' }).format.value), /group-player/);
    assert.doesNotMatch(JSON.stringify(FormatGui({ bid: 'group-player', mention: false }).format.value), /group-player/);
  });
});
