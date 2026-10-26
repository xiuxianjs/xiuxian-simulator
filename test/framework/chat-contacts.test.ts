import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import axios from 'axios';
import { onResponse, shutdownLogger, type Events } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { ChatContactObserver } from '../../src/notification/chatContacts';
import type { ChatContactObservation } from '../../src/api/bot/chat';

after(() => shutdownLogger());
async function fixture(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const directory = await mkdtemp(join(tmpdir(), 'chat-observer-'));
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test' } } } });
  const observer = new ChatContactObserver(undefined, () => app.clock.now(), directory);
  t.after(async () => { await observer.dispose(); app.dispose(); await rm(directory, { recursive: true, force: true }); });
  const batches: ChatContactObservation[][] = [];
  t.mock.method(axios, 'create', () => ({ async post(path: string, body: { items: ChatContactObservation[] }) {
    assert.equal(path, '/chat/internal/contacts/observe');
    batches.push(body.items);
    return { data: { items: body.items.map(item => ({ botId: item.botId, openId: item.openId, relationState: item.kind === 'private' ? 2 : item.kind === 'removed' ? 0 : 1, relationAt: item.occurredAt, groupSeen: item.groupSeen, enabled: false })) } };
  } }));
  const group = (userId = 'person', at = 1000) => app.events.groupMessage({ platform: 'qq-bot', botId: 'bot', userId }, { Target: { scope: 'group', targetId: 'group' }, OccurredAt: at });
  const privateMessage = (at = 2000) => app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'person' }, { Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: at });
  const run = async (event: Events[keyof Events]) => {
    const result = await app.runHandler(onResponse(event.name, async () => { await observer.observe(event); }), event);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
  };
  return { app, observer, batches, group, privateMessage, run, directory };
}

test('群事件不阻塞处理；突发合并并命中内存列表，私聊立即越过缓存升级', async t => {
  const { app, observer, batches, group, privateMessage, run } = await fixture(t);
  for (let i = 0; i < 100; i++) await run(group('person', 1000 + i));
  assert.equal(batches.length, 0);
  await app.run(() => observer.flush());
  assert.equal(batches.length, 1); assert.equal(batches[0].length, 1);
  assert.equal(observer.snapshot()[0].relationState, 1);
  assert.equal(observer.snapshot()[0].enabled, false);
  for (let i = 0; i < 100; i++) await run(group('person', 1200 + i));
  await app.run(() => observer.flush());
  assert.equal(batches.length, 2, 'newer evidence is batched instead of lost in cache');
  await run(privateMessage()); await app.run(() => observer.flush());
  assert.equal(batches.length, 3); assert.equal(batches[2][0].kind, 'private');
  assert.equal(observer.snapshot()[0].relationState, 2);
  await run(group('person', 3000)); await app.run(() => observer.flush());
  assert.equal(batches.length, 4, 'new group membership evidence reaches the server');
});

test('好友删除和重新添加不等待 TTL；待发送删除不吞掉更新的私聊证据', async t => {
  const { app, observer, batches, privateMessage, run } = await fixture(t);
  await run(privateMessage(1000)); await app.run(() => observer.flush());
  await run(app.events.event('private.friend.remove', { Platform: 'qq-bot', BotId: 'bot', UserId: 'person', Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: 2000 }));
  await run(privateMessage(3000)); await app.run(() => observer.flush());
  assert.equal(batches.at(-1)![0].kind, 'private');
  assert.equal(batches.at(-1)![0].occurredAt, 3000);
  await run(app.events.event('private.friend.remove', { Platform: 'qq-bot', BotId: 'bot', Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: 4000 }));
  await app.run(() => observer.flush());
  assert.equal(observer.snapshot()[0].relationState, 0);
  await run(app.events.event('private.friend.add', { Platform: 'qq-bot', BotId: 'bot', Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: 5000 }));
  await app.run(() => observer.flush());
  assert.equal(observer.snapshot()[0].relationState, 2);
});

test('缓存过期重新同步；同 ID 不同机器人隔离，成员事件不记录操作人', async t => {
  const { app, observer, batches, group, run } = await fixture(t);
  await run(group()); await app.run(() => observer.flush());
  await app.clock.advance(600001);
  await run(group('person', 700000)); await app.run(() => observer.flush());
  assert.equal(batches.length, 2);
  const other = group(); other.BotId = 'other';
  await run(other);
  await run(app.events.event('member.add', { Platform: 'qq-bot', BotId: 'bot', UserId: 'operator', MemberId: 'new-member', Target: { scope: 'group', targetId: 'group' }, OccurredAt: 700001 }));
  await app.run(() => observer.flush());
  assert.ok(observer.snapshot().some(item => item.botId === 'other'));
  assert.ok(observer.snapshot().some(item => item.openId === 'new-member'));
  assert.ok(!observer.snapshot().some(item => item.openId === 'operator'));
});

test('缓存记住较新的私聊证据，乱序删除不能绕过缓存', async t => {
  const { app, observer, batches, privateMessage, run } = await fixture(t);
  await run(privateMessage(1000)); await app.run(() => observer.flush());
  await run(privateMessage(5000)); await app.run(() => observer.flush());
  assert.equal(batches.length, 2);
  await run(app.events.event('private.friend.remove', { Platform: 'qq-bot', BotId: 'bot', Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: 4000 }));
  await app.run(() => observer.flush());
  assert.equal(batches.length, 2);
  assert.equal(observer.snapshot()[0].relationState, 2);
});

test('失败保留待同步，重试不覆盖新私聊状态；每批最多 100 条', async t => {
  const { app, observer, group, privateMessage, run } = await fixture(t);
  let calls = 0;
  const sent: ChatContactObservation[][] = [];
  let reject!: (error: Error) => void;
  let started!: () => void;
  const startedSending = new Promise<void>(resolve => { started = resolve; });
  t.mock.method(axios, 'create', () => ({ async post(_path: string, body: { items: ChatContactObservation[] }) {
    calls++; sent.push(body.items);
    assert.ok(body.items.length <= 100);
    if (calls === 1) await new Promise((_resolve, rejectPromise) => { reject = rejectPromise; started(); });
    return { data: { items: body.items.map(item => ({ ...item, relationState: item.kind === 'private' ? 2 : 1, relationAt: item.occurredAt, enabled: true })) } };
  } }));
  await run(group());
  const flushing = app.run(() => observer.flush());
  await run(privateMessage());
  await startedSending; reject(new Error('offline')); await flushing;
  assert.equal(observer.snapshot().length, 0, 'failure must not populate acknowledged cache');
  await app.run(() => observer.flush());
  assert.ok(sent[1].some(item => item.kind === 'private' && item.occurredAt === 2000));
  for (let i = 0; i < 120; i++) await run(group(`person-${i}`));
  await app.run(() => observer.flush()); await app.run(() => observer.flush());
  assert.equal(calls, 4);
  await observer.dispose(); await run(group('after-dispose')); await observer.flush();
  assert.equal(calls, 4);
});

test('重启补报缓存期的新证据；无时间删除保留待核对事件；群退出不记录操作人', async t => {
  const { app, observer, batches, privateMessage, run, directory } = await fixture(t);
  await run(privateMessage(1000)); await app.run(() => observer.flush());
  await run(privateMessage(5000));
  await observer.dispose();
  const restarted = new ChatContactObserver(undefined, () => app.clock.now(), directory);
  t.after(() => restarted.dispose());
  await app.run(() => restarted.flush());
  assert.equal(batches.at(-1)![0].occurredAt, 5000);
  await app.runHandler(onResponse('private.friend.remove', async event => { await restarted.observe(event); }), app.events.event('private.friend.remove', {
    Platform: 'qq-bot', BotId: 'bot', Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: 4000
  }));
  await app.run(() => restarted.flush());
  assert.equal(batches.length, 2, 'stale removal is already covered by acknowledged evidence');
  await app.clock.advance(10000);
  const removal = app.events.event('private.friend.remove', { Platform: 'qq-bot', BotId: 'bot', Target: { scope: 'c2c', targetId: 'person' } });
  delete removal.OccurredAt;
  await restarted.observe(removal); await app.run(() => restarted.flush());
  assert.equal(batches.at(-1)![0].timeUnknown, true);
  const exit = app.events.event('guild.exit', { Platform: 'qq-bot', BotId: 'bot', UserId: 'operator', Target: { scope: 'group', targetId: 'group' }, OccurredAt: 9000 });
  await restarted.observe(exit); await app.run(() => restarted.flush());
  assert.equal(batches.at(-1)![0].kind, 'group_exit');
  assert.equal(batches.at(-1)![0].openId, '');
});

test('多实例共享待同步目录，确认旧批次不删除正在写入的新证据', async t => {
  const { app, observer, privateMessage, run, directory } = await fixture(t);
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  const second = new ChatContactObserver(async items => {
    started(); await wait;
    return { items: items.map(item => ({ ...item, relationState: 2, relationAt: item.occurredAt, enabled: true })) };
  }, () => app.clock.now(), directory);
  t.after(() => second.dispose());
  await run(privateMessage(1000));
  const flushing = second.flush(); await ready;
  await run(privateMessage(5000)); release(); await flushing;
  await app.run(() => observer.flush());
  assert.equal(observer.snapshot()[0].relationAt, 5000);
});

test('群成员离开采用成员身份；明确的私聊 ID 对才提交别名关联', async t => {
  const { app, batches, observer, group, run } = await fixture(t);
  const event = group('member'); event.DirectUserId = 'direct';
  await run(event); await app.run(() => observer.flush());
  assert.equal(batches[0][0].openId, 'direct'); assert.equal(batches[0][0].aliasId, 'member');
  await run(app.events.event('member.remove', { Platform: 'qq-bot', BotId: 'bot', UserId: 'operator', MemberId: 'member', Target: { scope: 'group', targetId: 'group' }, OccurredAt: 2000 }));
  await app.run(() => observer.flush());
  assert.equal(batches[1][0].openId, 'member'); assert.equal(batches[1][0].kind, 'group_leave');
});

test('超过原 2000 人上限的待同步队列落盘保留，分批完整补报', async t => {
  const { app, observer, batches, group, run, directory } = await fixture(t);
  for (let i = 0; i < 2001; i++) await run(group(`pending-${i}`));
  await observer.dispose();
  const restarted = new ChatContactObserver(undefined, () => app.clock.now(), directory);
  t.after(() => restarted.dispose());
  for (let i = 0; i < 21; i++) await app.run(() => restarted.flush());
  const ids = new Set(batches.flat().map(item => item.openId));
  assert.equal(ids.size, 2001);
  assert.ok(batches.every(batch => batch.length <= 100));
});

test('突发成员消息和离群不能覆盖尚未同步的明确身份关联', async t => {
  const { app, observer, batches, group, run } = await fixture(t);
  const linked = group('member', 1000); linked.DirectUserId = 'direct';
  await run(linked);
  await run(group('member', 2000));
  await run(app.events.event('member.remove', { Platform: 'qq-bot', BotId: 'bot', UserId: 'operator', MemberId: 'member', Target: { scope: 'group', targetId: 'group' }, OccurredAt: 3000 }));
  await app.run(() => observer.flush());
  assert.equal(batches[0].length, 2);
  assert.ok(batches[0].some(item => item.aliasId === 'member' && item.openId === 'direct'));
  assert.ok(batches[0].some(item => item.kind === 'group_leave' && item.occurredAt === 3000));
});

test('私聊主动接收开关事件同步断连和恢复证据', async t => {
  const { app, observer, batches, run } = await fixture(t);
  for (const [enabled, at] of [[false, 1000], [true, 2000]] as const) {
    await run(app.events.event('private.notice.create', { Platform: 'qq-bot', BotId: 'bot', Target: { scope: 'c2c', targetId: 'person' }, OccurredAt: at, Notice: { type: 'message-permission', enabled } }));
    await app.run(() => observer.flush());
  }
  assert.equal(batches[0][0].kind, 'removed');
  assert.equal(batches[1][0].kind, 'private');
});

test('群接收开关与入退群独立合并，群缓存来自服务端回执', async t => {
  const { app, observer, batches, run } = await fixture(t);
  t.mock.method(axios, 'create', () => ({ async post(_path: string, body: { items: ChatContactObservation[] }) {
    batches.push(body.items);
    return { data: { items: body.items.map(item => ({ botId: item.botId, openId: item.openId, relationState: 0, relationAt: 0, groupSeen: false, enabled: true })), groups: [{ id: 1, botId: 'bot', groupId: 'g', name: '群备注', state: 3, enabled: false, permission: 'blocked', presenceAt: 1000, lastSeenAt: 2000, relationUnknown: false }] } };
  } }));
  await run(app.events.event('guild.join', { Platform: 'qq-bot', BotId: 'bot', UserId: 'operator', Target: { scope: 'group', targetId: 'g' }, OccurredAt: 1000 }));
  await run(app.events.event('notice.create', { Platform: 'qq-bot', BotId: 'bot', UserId: 'operator', Target: { scope: 'group', targetId: 'g' }, OccurredAt: 2000, Notice: { type: 'message-permission', enabled: false } }));
  await app.run(() => observer.flush());
  assert.equal(batches[0].length, 2);
  assert.ok(batches[0].some(item => item.kind === 'group_join'));
  assert.ok(batches[0].some(item => item.kind === 'group_block'));
  assert.ok(batches[0].every(item => item.openId === '' && item.groupId === 'g'));
  assert.equal(observer.snapshotGroups()[0].state, 3);
  assert.equal(observer.snapshotGroups()[0].enabled, false);
});
