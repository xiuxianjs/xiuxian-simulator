import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';
import { ChatNoticeDispatcher as MultiScopeDispatcher } from '../../src/notification/chat';
import type { ChatClaim, ChatReceipt } from '../../src/api/bot/chat';

// Existing cases exercise a single private lane; mixed-scope cases below use production defaults.
class ChatNoticeDispatcher extends MultiScopeDispatcher {
  constructor(...args: ConstructorParameters<typeof MultiScopeDispatcher>) {
    super(args[0], args[1], args[2], args[3], ['c2c']);
  }
}

after(() => shutdownLogger());
const claim = (id: number): ChatClaim => ({ noticeId: 'n', contactId: id, botId: 'bot', openId: String(id), token: 't', content: 'test', mode: 'wakeup' });
const receipt = (item: ChatClaim): ChatReceipt => ({ ...item, status: 'sent', messageId: String(item.contactId), error: '' });
// Drain promise continuations without advancing business time.
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

test('超过 20 人继续领取；限流/跳过返回空 claim 不丢失续跑；结束不重复发送', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let calls = 0;
  const sent: number[] = [];
  const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => {
    calls++;
    if (calls <= 2) return { claim: null, pending: true };
    const id = calls - 2;
    return { claim: id <= 45 ? claim(id) : null, pending: id < 45 };
  }, async item => { sent.push(item.contactId); return receipt(item); }, async () => ({}));
  t.after(() => dispatcher.stop());
  await dispatcher.dispatch();
  for (let i = 0; i < 46; i++) { t.mock.timers.tick(2200); await settle(); }
  assert.deepEqual(sent, Array.from({ length: 45 }, (_, i) => i + 1));
  t.mock.timers.tick(30000); await settle();
  assert.equal(sent.length, 45);
  dispatcher.stop(); const before = calls;
  t.mock.timers.tick(60000); await settle(); assert.equal(calls, before);
});

test('领取失败自动恢复；回执失败只重试回执；停止时不发送刚领取到的消息', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let calls = 0, sends = 0, receipts = 0;
  const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => {
    if (++calls === 1) throw new Error('offline');
    return { claim: calls === 2 ? claim(1) : null, pending: false };
  }, async item => { sends++; return receipt(item); }, async () => {
    if (++receipts === 1) throw new Error('receipt offline');
    return {};
  });
  t.after(() => dispatcher.stop());
  await dispatcher.dispatch(); t.mock.timers.tick(5000); await settle();
  assert.equal(sends, 1); assert.equal(receipts, 2);
  t.mock.timers.tick(30000); await settle(); assert.equal(sends, 1);
  let release!: (result: { claim: ChatClaim; pending: boolean }) => void;
  const stopping = new ChatNoticeDispatcher(() => ['bot'], () => new Promise(resolve => { release = resolve; }), async item => { sends++; return receipt(item); }, async result => {
    assert.equal(result.status, 'not_sent');
    assert.equal(result.contactId, 2);
    return {};
  });
  const pending = stopping.dispatch(); stopping.stop(); release({ claim: claim(2), pending: true }); await pending;
  assert.equal(sends, 1);
});

for (const status of ['not_sent', 'sent', 'unknown'] as const) {
  test(`回执持续503后恢复只提交同一${status}回执，不重复发送`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    let claims = 0, sends = 0;
    const results: ChatReceipt[] = [];
    const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => ({ claim: ++claims === 1 ? claim(1) : null, pending: false }), async item => {
      sends++;
      return { ...receipt(item), status, messageId: status === 'sent' ? '1' : '' };
    }, async result => {
      results.push(result);
      if (results.length <= 3) throw Object.assign(new Error('unavailable'), { status: 503 });
      return {};
    });
    t.after(() => dispatcher.stop());
    await dispatcher.dispatch(); await settle();
    assert.equal(results.length, 2);
    t.mock.timers.tick(4999); await settle(); assert.equal(results.length, 2);
    t.mock.timers.tick(1); await settle(); assert.equal(results.length, 3);
    t.mock.timers.tick(10_000); await settle(); assert.equal(results.length, 4);
    assert.ok(results.every(result => result === results[0]));
    assert.equal(sends, 1);
    dispatcher.stop(); t.mock.timers.tick(60_000); await settle();
    assert.equal(results.length, 4);
  });
}

test('停止会取消回执退避，失效领取凭据不无限重试', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  for (const status of [503, 404]) {
    let calls = 0, claims = 0;
    const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => ({ claim: ++claims === 1 ? claim(1) : null, pending: false }), async item => receipt(item), async () => {
      calls++;
      throw Object.assign(new Error('receipt rejected'), { status });
    });
    t.after(() => dispatcher.stop());
    await dispatcher.dispatch(); await settle();
    assert.equal(calls, status === 503 ? 2 : 1);
    dispatcher.stop();
    await settle(); t.mock.timers.tick(60_000); await settle();
    assert.equal(calls, status === 503 ? 2 : 1);
  }
});

test('忙时唤醒被保留，空队列也有恢复检查以应对丢失 SSE', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let release!: (result: { claim: null; pending: boolean }) => void;
  let calls = 0;
  const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => {
    if (++calls === 1) return new Promise(resolve => { release = resolve; });
    return { claim: null, pending: false };
  });
  t.after(() => dispatcher.stop());
  const pending = dispatcher.dispatch(); await dispatcher.dispatch();
  release({ claim: null, pending: false }); await pending;
  t.mock.timers.tick(2200); await settle(); assert.equal(calls, 2);
  t.mock.timers.tick(30000); await settle(); assert.equal(calls, 3);
});

test('10秒领取超时后完整等待5秒，忙时及冷却中的唤醒不能跳过退避', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  let calls = 0, sends = 0;
  let rejectClaim!: (error: Error) => void;
  const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => {
    if (++calls === 1) return new Promise((_resolve, reject) => { rejectClaim = reject; });
    return { claim: null, pending: false };
  }, async item => { sends++; return receipt(item); });
  t.after(() => dispatcher.stop());
  const pending = dispatcher.dispatch();
  await dispatcher.dispatch();
  t.mock.timers.tick(10_000);
  rejectClaim(new Error('claim timed out'));
  await pending;
  await dispatcher.dispatch();
  t.mock.timers.tick(4999); await settle();
  assert.equal(calls, 1);
  await dispatcher.dispatch();
  assert.equal(calls, 1);
  t.mock.timers.tick(1); await settle();
  assert.equal(calls, 2);
  assert.equal(sends, 0);
  dispatcher.stop();
  t.mock.timers.tick(30_000); await settle();
  assert.equal(calls, 2);
});

test('慢发送和慢回执不阻塞下一次领取，并发达到上限后停止领取', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let calls = 0;
  let finishes = 0;
  const releases: Array<() => void> = [];
  const dispatcher = new ChatNoticeDispatcher(() => ['bot'], async () => ({ claim: claim(++calls), pending: true }),
    item => new Promise(resolve => { releases.push(() => resolve(receipt(item))); }), async () => { finishes++; return {}; });
  t.after(() => dispatcher.stop());
  await dispatcher.dispatch();
  assert.equal(calls, 1);
  t.mock.timers.tick(125); await settle();
  assert.equal(calls, 2);
  assert.equal(finishes, 0);
  for (let i = 0; i < 40; i++) { t.mock.timers.tick(125); await settle(); }
  assert.equal(calls, 32);
  releases[0](); await settle();
  t.mock.timers.tick(125); await settle();
  assert.equal(calls, 33);
  dispatcher.stop();
  for (const release of releases) release();
  await settle();
  assert.equal(finishes, 33);
});


test('私聊持续积压且并发满载时群聊仍独立发送，停止后两类均停止领取', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const calls = { c2c: 0, group: 0 };
  const sent = { c2c: 0, group: 0 };
  const releases: Array<() => void> = [];
  const dispatcher = new MultiScopeDispatcher(() => ['bot'], async (_bot, scope = 'c2c') => {
    calls[scope]++;
    return { claim: { ...claim(calls[scope]), scope, mode: 'proactive' as const }, pending: true };
  }, item => {
    const scope = item.scope ?? 'c2c'; sent[scope]++;
    return scope === 'c2c' ? new Promise(resolve => { releases.push(() => resolve(receipt(item))); }) : Promise.resolve(receipt(item));
  }, async () => ({}));
  t.after(() => dispatcher.stop());
  await dispatcher.dispatch();
  assert.deepEqual(sent, { c2c: 1, group: 1 });
  for (let i = 0; i < 40; i++) { t.mock.timers.tick(125); await settle(); }
  assert.equal(sent.c2c, 32);
  assert.equal(sent.group, 41);
  dispatcher.stop(); const before = { ...calls };
  for (const release of releases) release();
  await settle(); t.mock.timers.tick(30000); await settle();
  assert.deepEqual(calls, before);
});

test('一个场景领取挂起或失败不阻塞另一场景的轮询', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let release!: () => void;
  let groups = 0;
  let privateCalls = 0;
  const dispatcher = new MultiScopeDispatcher(() => ['bot'], async (_bot, scope = 'c2c') => {
    if (scope === 'c2c') {
      privateCalls++;
      if (privateCalls === 1) return new Promise(resolve => { release = () => resolve({ claim: null, pending: true }); });
      throw new Error('private claim unavailable');
    }
    return { claim: { ...claim(++groups), scope, mode: 'proactive' as const }, pending: true };
  }, async item => receipt(item), async () => ({}));
  t.after(() => dispatcher.stop());
  const initial = dispatcher.dispatch(); await settle();
  assert.equal(groups, 1);
  t.mock.timers.tick(125); await settle(); assert.equal(groups, 2);
  release(); await initial;
  t.mock.timers.tick(125); await settle(); assert.equal(privateCalls, 2); assert.equal(groups, 3);
  t.mock.timers.tick(125); await settle(); assert.equal(privateCalls, 2); assert.equal(groups, 4);
});

test('服务端限流提示仅延后对应 bot 和场景，SSE 不提前重试', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const calls: string[] = [];
  const dispatcher = new MultiScopeDispatcher(() => ['slow', 'ready'], async (bot, scope = 'c2c') => {
    calls.push(`${bot}:${scope}`);
    if (bot === 'slow' && scope === 'c2c') return { claim: null, pending: true, retryAfterMs: 700 };
    return { claim: null, pending: false };
  });
  t.after(() => dispatcher.stop());

  await dispatcher.dispatch();
  t.mock.timers.tick(125);
  await dispatcher.dispatch();
  assert.equal(calls.filter(key => key === 'slow:c2c').length, 1);
  assert.equal(calls.filter(key => key === 'ready:c2c').length, 2);
  assert.equal(calls.filter(key => key === 'slow:group').length, 2);

  t.mock.timers.tick(574);
  await settle();
  assert.equal(calls.filter(key => key === 'slow:c2c').length, 1);
  t.mock.timers.tick(1);
  await settle();
  assert.equal(calls.filter(key => key === 'slow:c2c').length, 2);
});
