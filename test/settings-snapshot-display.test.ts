import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { describeNotificationGroup } from '../src/notification/channel';

test('settings renders supplied group facts and unknown fields without any cache or platform probe', async t => {
  t.mock.method(axios, 'create', () => { throw new Error('settings attempted a cache request'); });
  const target = { platform: 'qq-bot', BotId: 'snapshot-fixture', scope: 'group' as const, targetId: 'snapshot-group' };
  const lines = await describeNotificationGroup(target, 'player', {
    permission: { state: 'blocked', source: 'event', updatedAt: 1000 },
    availability: { available: false, updatedAt: 1000 },
    member: { available: false, updatedAt: 1000 },
    previous: '', acquired: false
  });
  assert.deepEqual(lines, [
    '群主动推送：已关闭',
    '消息接收模式：暂时无法确认',
    '机器人角色：暂时无法确认',
    '机器人已离开该群，群投递暂停。',
    '已记录你离开该群，原群投递暂停。'
  ]);
  assert.deepEqual(await describeNotificationGroup(target, 'player', null), [
    '群主动推送：暂时无法确认', '消息接收模式：暂时无法确认', '机器人角色：暂时无法确认'
  ]);
});
