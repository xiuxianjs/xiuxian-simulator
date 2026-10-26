import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { handleNotificationLifecycle, type LifecycleEvent } from '../src/notification/lifecycle';
import { mockBackendConfig } from './backend-config-helper';

const lifecycle = (fields: Record<string, unknown>) => ({ Platform: 'qq-bot', name: 'member.remove', ...fields }) as LifecycleEvent;

test('missing lifecycle identifiers are skipped and never use the operator as member', async t => {
  let requests = 0;
  t.mock.method(axios, 'create', () => ({ post: async () => { requests++; throw new Error('must not request'); } }));
  for (const fields of [
    {},
    { BotId: 'bot', ChannelId: 'group', UserId: 'operator', value: { op_member_openid: 'operator' } },
    { BotId: 'bot', MemberId: 'member', Target: { scope: 'group', targetId: '' } },
    { BotId: 'bot', MemberId: 'member', Target: { scope: 'c2c', targetId: 'private' } }
  ]) {
    assert.equal(await handleNotificationLifecycle(lifecycle(fields)), false);
  }
  assert.equal(requests, 0);
});

test('raw QQ member identifiers restore the real target and persist removal', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'test' });
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(axios, 'create', () => ({ post: async (_path: string, body: Record<string, unknown>) => {
    bodies.push(body);
    return { data: { data: {} } };
  } }));
  const event = lifecycle({ BotId: 'bot', UserId: 'operator', OccurredAt: 1000, value: { group_openid: 'group', member_openid: 'departed', op_member_openid: 'operator' } });
  assert.equal(await handleNotificationLifecycle(event), true);
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].memberId, 'departed');
  assert.equal(bodies[0].available, false);
  assert.equal(bodies[0].observedOnly, false);
  assert.deepEqual(event.Target, { platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: 'group' });
  assert.equal(event.MemberId, 'departed');
});

test('backend persistence failures remain failures', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'test' });
  t.mock.method(axios, 'create', () => ({ post: async () => { throw new Error('backend unavailable'); } }));
  await assert.rejects(handleNotificationLifecycle(lifecycle({ BotId: 'bot', ChannelId: 'group', MemberId: 'member' })));
});
