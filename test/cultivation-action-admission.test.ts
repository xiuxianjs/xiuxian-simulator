import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCommandTransportProfile } from '../src/router';
import type { GameEvent } from '../src/types/event';

test('registered gameplay routes omit cultivation guards while keeping entry checks', () => {
  for (const MessageText of ['/主线挑战 1-1', '/秘境挑战 1', '/主线扫荡 1-1 2', '/购买 1', '/领取邮件 1', '/打劫 2', '/接赏 2', '/打坐', '/闭关', '/出关']) {
    const event = { name: 'message.create', UserId: 'player', MessageText, MessageId: 'cultivation-test', Platform: 'qq-bot', Target: { scope: 'group', targetId: 'group' } } as GameEvent;
    const profile = resolveCommandTransportProfile(event);
    assert.equal(profile.playerEntry, true, MessageText);
    assert.equal(profile.checkMute, true, MessageText);
    assert.ok(!profile.guards?.includes('seclusion'), MessageText);
    assert.ok(!profile.guards?.includes('meditation'), MessageText);
  }
});
