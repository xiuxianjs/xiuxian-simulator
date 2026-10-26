import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import axios from 'axios';
import { createResult, Format, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { notificationChannel } from '../../src/notification/channel';
import { bufferFlyMailSend, withFlyMailBuffer } from '../../src/notification/flymailBuffer';
import { PushFlyMailTask } from '../../src/task/pushMessageTask';

after(() => shutdownLogger());
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
const content = (value: string) => Format.create().addMarkdown(Format.createMarkdown().addText(value)).value;
const target = { platform: 'qq-bot', BotId: 'bot', scope: 'group' as const, targetId: 'group' };

function fixture(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const login = process.env.login; process.env.login = 'qq-bot';
  t.after(() => { if (login === undefined) delete process.env.login; else process.env.login = login; });
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
  t.after(() => app.dispose());
  return app;
}

// 缓冲属于原生业务定时器，与框架 app.clock 分开控制。
test('同对象固定 2s 窗口不被新消息续期，不同机器人和群不会混合', async t => {
  const app = fixture(t);
  t.mock.method(axios, 'create', () => ({ async post(path: string) {
    const data = path.endsWith('/permission/read') ? { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' }
      : path.endsWith('/availability/read') ? { available: true, updatedAt: 1 } : null;
    return { data: { data } };
  } }));
  let sends = 0;
  app.actions.on('message.send.target', () => { sends++; return [createResult(ResultCode.Ok, '送达', { id: String(sends) })]; });
  const result = await app.runHandler(onResponse('message.create', async () => {
    const first = withFlyMailBuffer(() => notificationChannel.send(target, content('首条'), null));
    t.mock.timers.tick(1_000);
    const second = withFlyMailBuffer(() => notificationChannel.send(target, content('后来'), null));
    const other = withFlyMailBuffer(() => notificationChannel.send({ ...target, targetId: 'other' }, content('另群'), null));
    const bot = withFlyMailBuffer(() => notificationChannel.send({ ...target, BotId: 'other-bot' }, content('另一机器人'), null));
    t.mock.timers.tick(999);
    await turn();
    assert.equal(sends, 0);
    t.mock.timers.tick(1);
    await turn();
    assert.equal(sends, 1, '首条满 2s 发送，不因后来消息推迟');
    t.mock.timers.tick(1_000);
    await Promise.all([first, second, other, bot]);
  }), app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 3);
  const texts = result.messages.map(message => inspectMessage(message.nodes).text);
  assert.match(texts[0], /首条[\s\S]*后来/);
  assert.equal(texts.filter(text => text.includes('另群')).length, 1);
  assert.equal(texts.filter(text => text.includes('另一机器人')).length, 1);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('飞信每批最多 5 条，处理中最多 32 条，剩余留在服务端且全部独立 ack', async t => {
  const app = fixture(t);
  const queue = Array.from({ length: 35 }, (_, i) => ({ eventId: `flymail.message:${i + 1}:received:7`, recipientUserId: 7, recipientBid: 'recipient', payload: {
    version: 1, recipientUserId: 7, source: 'flymail.message.received', data: [{ type: 'Text', value: `正文${i + 1}结束` }]
  } }));
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const receipts: unknown[] = [];
  let claimed = 0, sends = 0;
  t.mock.method(axios, 'create', () => ({ async post(path: string, body: Record<string, unknown>) {
    let data: unknown = null;
    if (path.endsWith('/claim')) { const event = queue.shift() ?? null; if (event) claimed++; data = { event }; }
    else if (path.endsWith('/ack')) { await blocked; receipts.push(body); }
    else if (path.endsWith('/retry')) throw new Error(String(body.error));
    else if (path.endsWith('/subscription')) data = { platform: 'qq-bot', channelId: 'group', botId: 'bot', targetScope: 'group', isEnabled: true, failureCount: 0, lastDeliveryAt: null, lastError: null };
    else if (path.endsWith('/private-target/read')) data = { platform: 'qq-bot', scope: 'c2c', targetId: 'private-recipient', BotId: 'bot' };
    else if (path.endsWith('/availability/read')) data = { available: true, updatedAt: 1 };
    else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
    else if (!['/receipt/read', '/receipt/store', '/private-target/read', '/permission/cas', '/subscription/receipt'].some(suffix => path.endsWith(suffix))) throw new Error(`Unexpected ${path}`);
    return { data: { data } };
  } }));
  app.actions.on('message.send.target', () => { sends++; return [createResult(ResultCode.Ok, '送达', { id: String(sends) })]; });
  t.after(() => release());
  const result = await app.runHandler(onResponse('message.create', async () => {
    const running = PushFlyMailTask();
    await turn();
    assert.equal(claimed, 32);
    assert.equal(queue.length, 3);
    assert.equal(sends, 6, '每 5 条提前发送，不等 2s');
    assert.equal(receipts.length, 0);
    t.mock.timers.tick(2_000);
    await turn();
    assert.equal(sends, 7, '不足 5 条也在 2s 到期发出');
    release();
    await turn();
    assert.equal(claimed, 35);
    t.mock.timers.tick(2_000);
    await running;
  }), app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(receipts.length, 35);
  assert.equal(new Set(receipts.map(row => (row as {eventId:string}).eventId)).size, 35);
  assert.equal(result.messages.length, 8);
  const texts = result.messages.map(message => inspectMessage(message.nodes).text);
  for (const text of texts) assert.ok((text.match(/正文\d+结束/g) ?? []).length <= 5);
  for (let i = 1; i <= 35; i++) assert.equal(texts.filter(text => text.includes(`正文${i}结束`)).length, 1);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('失败不会吞掉批内消息或阻塞下一批，普通通知不缓冲', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const send = async () => { calls++; if (calls === 1) throw new Error('failed'); };
  const first = Array.from({ length: 5 }, () => withFlyMailBuffer(() => bufferFlyMailSend(target, content('失败批'), send)));
  const settled = Promise.allSettled(first);
  assert.ok((await settled).every(item => item.status === 'rejected'));
  const next = withFlyMailBuffer(() => bufferFlyMailSend(target, content('下一批'), send));
  t.mock.timers.tick(2_000);
  await next;
  assert.equal(calls, 2);
  await bufferFlyMailSend(target, content('普通通知'), send);
  assert.equal(calls, 3);
});
