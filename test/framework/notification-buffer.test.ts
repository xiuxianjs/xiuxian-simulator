import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import axios from 'axios';
import { createResult, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { notificationChannel } from '../../src/notification/channel';
import { withNotificationBuffer } from '../../src/notification/flymailBuffer';
import { notificationNoticeData, notificationSettingsData } from '../../src/notification/presentation';

after(() => shutdownLogger());
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
const content = (value: string) => notificationNoticeData([{ type: 'Text', value }]);
const target = { platform: 'qq-bot', BotId: 'bot', scope: 'group' as const, targetId: 'group' };

function fixture(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const login = process.env.login; process.env.login = 'qq-bot';
  t.after(() => { if (login === undefined) delete process.env.login; else process.env.login = login; });
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
  t.after(() => app.dispose());
  return app;
}

// 缓冲属于原生业务定时器，与框架 app.clock 分开控制。
test('普通通知固定 30s 合并且不同玩家即使同群也隔离', async t => {
  const app = fixture(t);
  t.mock.method(axios, 'create', () => ({ async post(path: string) {
    const data = path.endsWith('/permission/read') ? { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' }
      : path.endsWith('/availability/read') ? { available: true, updatedAt: 1 } : null;
    return { data: { data } };
  } }));
  let sends = 0;
  app.actions.on('message.send.target', () => { sends++; return [createResult(ResultCode.Ok, '送达', { id: String(sends) })]; });
  const result = await app.runHandler(onResponse('message.create', async () => {
    const first = withNotificationBuffer('7', () => notificationChannel.send(target, notificationSettingsData(content('首条'), 'cave.plot.matured'), null));
    t.mock.timers.tick(1_000);
    const second = withNotificationBuffer('7', () => notificationChannel.send(target, notificationSettingsData(content('后来'), 'forge.order.expired'), null));
    const other = withNotificationBuffer('8', () => notificationChannel.send(target, content('另群'), null));
    const bot = withNotificationBuffer('7', () => notificationChannel.send({ ...target, BotId: 'other-bot' }, content('另一机器人'), null));
    t.mock.timers.tick(28_999);
    await turn();
    assert.equal(sends, 0);
    t.mock.timers.tick(1);
    await turn();
    assert.equal(sends, 1, '首条满 30s 发送，不因后来消息推迟');
    t.mock.timers.tick(1_000);
    await Promise.all([first, second, other, bot]);
  }), app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 3);
  const texts = result.messages.map(message => inspectMessage(message.nodes).text);
  assert.match(texts[0], /首条[\s\S]*后来/);
  assert.equal((texts[0].match(/修仙 · 通知/g) ?? []).length, 1);
  assert.ok(!texts[0].includes('通知管理'));
  assert.equal((texts[0].match(/关闭此类通知/g) ?? []).length, 2);
  assert.match(JSON.stringify(result.messages[0].nodes), /通知设置 cave 关闭/);
  assert.match(JSON.stringify(result.messages[0].nodes), /通知设置 forge 关闭/);
  assert.equal(inspectMessage(result.messages[0].nodes).commands.filter(command => command === '/通知设置').length, 1);
  assert.equal(inspectMessage(result.messages[0].nodes).commands.filter(command => command === '/我的通知').length, 1);

  assert.equal(texts.filter(text => text.includes('另群')).length, 1);
  assert.equal(texts.filter(text => text.includes('另一机器人')).length, 1);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

