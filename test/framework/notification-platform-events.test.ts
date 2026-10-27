import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { after, test, type TestContext } from 'node:test';
import axios from 'axios';
import { ResultCode, Router, shutdownLogger, type Events } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { register } from '../../node_modules/@alemonjs/qq-bot/lib/register.js';
import router from '../../src/router';

after(() => shutdownLogger());

const cases = [
  ['GROUP_ADD_ROBOT', 'guild.join', '/availability/event', true],
  ['FRIEND_ADD', 'private.friend.add', '/availability/event', true],
  ['GROUP_MSG_RECEIVE', 'notice.create', '/permission/event', true],
  ['GROUP_MSG_REJECT', 'notice.create', '/permission/event', false],
  ['C2C_MSG_RECEIVE', 'private.notice.create', '/permission/event', true],
  ['C2C_MSG_REJECT', 'private.notice.create', '/permission/event', false],
  ['GROUP_MEMBER_ADD', 'member.add', '/availability/event', false],
  ['GROUP_MEMBER_REMOVE', 'member.remove', '/availability/event', false],
  ['GROUP_DEL_ROBOT', 'guild.exit', '/availability/event', false],
  ['FRIEND_DEL', 'private.friend.remove', '/availability/event', false],
  ['GROUP_JOIN_REQUEST', 'notice.create', '/community/requests/record', false]
] as const;

type PlatformEvent = Events['guild.join' | 'guild.exit' | 'private.friend.add' | 'private.friend.remove' | 'notice.create' | 'private.notice.create' | 'member.add' | 'member.remove'];

async function fixture(t: TestContext, repeatedUserTime = 1000, cacheFails = false, eventPolicy?: { allow?: string[]; deny?: string[] }, channelMode = false) {
  const requests: Array<{ path: string; body: Record<string, any> }> = [];
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: Record<string, any>) {
      if (cacheFails) throw new Error('offline cache unavailable');
      path = path.split('/cache')[1];
      requests.push({ path, body });
      let data: unknown = null;
      if (path === '/availability/read') data = { available: true, updatedAt: 1 };
      if (path === '/permission/read') data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      if (path === '/receipt/lease/acquire') data = { acquired: true };
      if (path === '/community/requests/record') data = { inserted: true };
      return { data: { data } };
    }
  }));
  const app = createTestApp({ failOnError: false, config: {
    processor: { repeated_user_time: repeatedUserTime },
    'qq-bot': { app_id: '123456' },
    'xiuxian-game': { events: eventPolicy, backend: { api_url: 'https://offline.invalid', worker_token: 'offline-fixture-token', channel_mode: channelMode, robot_auth_token: 'offline-token' } }
  } });
  t.after(() => app.dispose());
  await app.mount({ responseRouter: router });
  const forwarded: string[] = [];
  const downstream = Router.create();
  downstream.res({ events: [...new Set(cases.map(([, name]) => name))] }, async () => (event: PlatformEvent) => {
    forwarded.push(event.name);
  });
  await app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
  const client = new EventEmitter();
  const deliveries: Array<{ scope: string; target: string; body: Record<string, unknown> }> = [];
  Object.assign(client, {
    async groupOpenMessages(target: string, body: Record<string, unknown>) {
      deliveries.push({ scope: 'group', target, body });
      return { id: 'group-receipt' };
    },
    async usersOpenMessages(target: string, body: Record<string, unknown>) {
      deliveries.push({ scope: 'c2c', target, body });
      return { id: 'private-receipt' };
    }
  });
  const events: PlatformEvent[] = [];
  const registration = app.run(() => register(client as unknown as Parameters<typeof register>[0], {
    botId: channelMode ? '123456' : 'audit-bot', bindActions: false,
    cbp: { send: (event: PlatformEvent) => events.push(event) } as unknown as NonNullable<Parameters<typeof register>[1]>['cbp']
  }));
  app.actions.on('message.send', request => new Promise((resolve, reject) => {
    registration.onAction(request, resolve).catch(reject);
  }));
  const emit = (tag: string, timestamp: number | string = 1_792_483_200) => {
    const privateEvent = /^(FRIEND|C2C)/.test(tag);
    app.run(() => client.emit(tag, {
      id: `event-${tag}`, timestamp,
      ...(privateEvent ? { openid: 'friend-user' } : { group_openid: 'audit-group', op_member_openid: 'operator' }),
      ...(/GROUP_MEMBER|GROUP_JOIN_REQUEST/.test(tag) ? { member_openid: 'actual-member' } : {}),
      ...(tag === 'GROUP_JOIN_REQUEST' ? { join_request_id: 'request-1' } : {})
    }));
    const event = events.at(-1);
    assert.ok(event);
    return event;
  };
  return { app, requests, deliveries, emit, forwarded };
}

for (const [tag, name, endpoint, replies] of cases) {
  test(`QQ ${tag} 经真实适配器、框架路由和处理器可达 ${name}`, async t => {
    const { app, requests, deliveries, emit, forwarded } = await fixture(t);
    const event = emit(tag);
    assert.equal(event.name, name);
    assert.equal(event.OccurredAt, 1_792_483_200_000);
    assert.equal(event.BotId, 'audit-bot');
    const privateEvent = name.startsWith('private.');
    assert.equal(event.Target?.scope, privateEvent ? 'c2c' : 'group');
    const result = await app.dispatch(event);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(forwarded, [name], '平台事件必须继续传给其他包，且只传一次');
    const recorded = requests.find(request => request.path === endpoint);
    assert.ok(recorded, JSON.stringify(requests));
    if (endpoint === '/availability/event' || endpoint === '/permission/event') {
      assert.equal(recorded.body.occurredAt, event.OccurredAt);
      assert.equal(recorded.body.observedOnly, false);
      const enabled = !/REJECT|REMOVE|DEL/.test(tag);
      assert.equal(recorded.body[endpoint === '/availability/event' ? 'available' : 'enabled'], enabled);
    }
    if (tag.startsWith('GROUP_MEMBER')) {
      assert.equal(recorded.body.memberId, 'actual-member');
      assert.equal(event.MemberId, 'actual-member');
    }
    if (tag === 'GROUP_MEMBER_ADD') {
      const queued = requests.find(request => request.path === '/community/queue');
      assert.ok(queued);
      assert.equal(queued.body.itemId, 'actual-member');
      assert.equal(queued.body.occurredAt, event.OccurredAt);
    }
    if (tag === 'GROUP_JOIN_REQUEST') assert.ok(requests.some(request => request.path === '/community/queue'));
    assert.equal(result.messages.length, replies ? 1 : 0);
    assert.equal(deliveries.length, replies ? 1 : 0);
    if (replies) {
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      assert.equal(deliveries[0].body.event_id, `event-${tag}`);
      assert.equal(deliveries[0].body.msg_id, undefined);
      assert.equal(deliveries[0].scope, privateEvent ? 'c2c' : 'group');
      assert.equal(deliveries[0].target, privateEvent ? 'friend-user' : 'audit-group');
      assert.ok(requests.some(request => request.path === '/receipt/store'));
    }
  });
}

test('QQ ISO 时间戳转换为毫秒；同一操作人的连续平台事件不受一秒用户防刷影响', async t => {
  const { app, requests, emit } = await fixture(t, 1000);
  const joined = emit('GROUP_ADD_ROBOT', '2026-10-20T00:00:00Z');
  assert.equal(joined.OccurredAt, Date.parse('2026-10-20T00:00:00Z'));
  await app.dispatch(joined);
  const permission = emit('GROUP_MSG_REJECT');
  await app.clock.advance(999);
  await app.dispatch(permission);
  assert.equal(requests.filter(request => request.path === '/permission/event').length, 1);
  await app.dispatch(emit('GROUP_MSG_RECEIVE'));
  assert.equal(requests.filter(request => request.path === '/permission/event').length, 2);
  await app.dispatch(emit('GROUP_DEL_ROBOT'));
  assert.equal(requests.filter(request => request.path === '/availability/event').length, 2);
  const duplicate = await app.dispatch(permission);
  assert.deepEqual(duplicate.reasons, ['filtered']);
  assert.equal(requests.filter(request => request.path === '/permission/event').length, 2);
});


test('未知通知及不适用的平台生命周期仍继续后续插件', async t => {
  const { app, forwarded } = await fixture(t, 0);
  for (const name of [...new Set(cases.map(([, name]) => name))]) {
    const result = await app.dispatch(app.events.event(name, { Platform: 'other-platform' }));
    assert.deepEqual(result.errors, []);
    assert.equal(forwarded.at(-1), name);
  }
  assert.equal(forwarded.length, new Set(cases.map(([, name]) => name)).size);
});

for (const tag of ['GROUP_ADD_ROBOT', 'GROUP_MSG_RECEIVE', 'GROUP_MEMBER_ADD', 'GROUP_DEL_ROBOT'] as const) {
  test(`${tag} 本包处理异常也不阻断其他插件`, async t => {
    const { app, forwarded, emit } = await fixture(t, 0, true);
    const event = emit(tag);
    await app.dispatch(event);
    assert.deepEqual(forwarded, [event.name]);
  });
}


for (const channelMode of [false, true]) {
  for (const policy of [
    { deny: ['guild.join', 'private.friend.add'] },
    { allow: ['member.add'] },
    { allow: [] },
    { allow: ['notice.create'], deny: ['notice.create:join-request'] },
    { allow: ['notice.create:join-request'] },
    { allow: ['guild.join'], deny: ['guild.join'] }
  ]) {
    test(`事件策略只关闭本包，channel=${channelMode} ${JSON.stringify(policy)}`, async t => {
      const { app, requests, deliveries, forwarded, emit } = await fixture(t, 0, false, policy, channelMode);
      for (const [tag, name, endpoint, replies] of cases) {
        const event = emit(tag);
        const keys = [name, ...(event.Notice?.type ? [`${name}:${event.Notice.type}`] : [])];
        const enabled = !(policy.deny?.some(key => keys.includes(key))) &&
          (policy.allow === undefined || policy.allow.some(key => keys.includes(key)));
        const requestStart = requests.length;
        const deliveryStart = deliveries.length;
        const forwardStart = forwarded.length;
        const result = await app.dispatch(event);
        assert.deepEqual(result.errors, [], tag);
        assert.deepEqual(forwarded.slice(forwardStart), [name], tag);
        if (!enabled) {
          assert.equal(requests.length, requestStart, `${tag}: disabled event must not call backend`);
          assert.equal(deliveries.length, deliveryStart, `${tag}: disabled event must not send welcome`);
          assert.equal(result.messages.length, 0);
        } else {
          assert.ok(requests.slice(requestStart).some(request => request.path === endpoint), tag);
          assert.equal(result.messages.length, replies ? 1 : 0);
          for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
        }
      }
    });
  }
}
