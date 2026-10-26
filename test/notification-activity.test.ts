import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import type { Events } from 'alemonjs';
import { notificationChannel } from '../src/notification/channel';
import { observePlayerGroupActivity } from '../src/notification/activity';
import { mockBackendConfig } from './backend-config-helper';

test('activity observes unmatched group messages asynchronously and ignores private/lifecycle/bot events', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'test' });
  t.mock.method(notificationChannel, 'read', async () => ({ state: 'allowed', source: 'query', updatedAt: 1 }));
  const bodies: any[] = [];
  let finish!: () => void;
  const blocked = new Promise<void>(resolve => { finish = resolve; });
  t.mock.method(axios, 'create', () => ({ post: async (path: string, body: unknown) => {
    assert.equal(path, '/api/v1/internal/notification-relay/cache/activity/remember');
    bodies.push(body);
    await blocked;
    return { data: { data: { ok: true } } };
  } }));
  const event = { name: 'message.create', Platform: 'qq-bot', BotId: 'bot', UserId: 'player', ChannelId: 'group-a', SpaceId: 'GROUP:group-a', MessageText: '普通聊天', OccurredAt: 100 };
  const observe = (fields: Record<string, unknown>) => observePlayerGroupActivity({ ...event, ...fields } as Events[keyof Events]);
  observe({});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bodies.length, 1, 'starts without waiting for game commands');
  assert.equal(bodies[0].target.targetId, 'group-a');
  for (const fields of [
    { name: 'private.message.create' }, { IsPrivate: true }, { IsBot: true },
    { name: 'member.remove' }, { Target: { scope: 'c2c', targetId: 'private' } },
    { SpaceId: 'GUILD:channel' }, { BotId: '' }
  ]) { observe(fields); }
  assert.equal(bodies.length, 1);
  // Saturate the bounded worker pool, then change a queued account twice.
  for (let i = 0; i < 3; i++) { observe({ UserId: `busy-${i}` }); }
  observe({ UserId: 'queued', ChannelId: 'new', OccurredAt: 300 });
  observe({ UserId: 'queued', ChannelId: 'new', OccurredAt: 200 });
  observe({ UserId: 'queued', ChannelId: 'new', OccurredAt: 400 });
  observe({ UserId: 'queued', ChannelId: 'another', OccurredAt: 350 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bodies.length, 4, 'at most four requests in flight');
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bodies.length, 6);
  assert.equal(bodies[4].target.targetId, 'new');
  assert.equal(bodies[5].target.targetId, 'another');
  assert.equal(bodies[4].occurredAt, 400);
});
