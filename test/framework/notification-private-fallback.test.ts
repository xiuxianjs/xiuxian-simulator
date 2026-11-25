import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios, { AxiosError } from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import * as source from '../../src/notification/service';

after(() => shutdownLogger());

const artifact = process.env.XIUXIAN_PRIVATE_FALLBACK_ARTIFACT;
const { deliverPlayerNotification, deliverLegacyNotification } = artifact
  ? await import(pathToFileURL(artifact).href) as typeof source
  : source;

test('订阅群发送成功时不查询私聊地址，真正需要私聊时读取失败仍可重试', async t => {
  const previousLogin = process.env.login;
  process.env.login = 'qq-bot';
  t.after(() => {
    if (previousLogin === undefined) delete process.env.login;
    else process.env.login = previousLogin;
  });
  const app = createTestApp({
    config: { 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test' } } }
  });
  t.after(() => app.dispose());
  let groupAvailable = true;
  let privateAvailable = false;
  let privateReads = 0;
  let subscriptionReads = 0;
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: { target?: { scope: string } }) {
      let data: unknown = null;
      if (path.endsWith('/subscription')) {
        subscriptionReads++;
        data = { platform: 'qq-bot', channelId: 'subscribed', botId: '100017', targetScope: 'group',
          isEnabled: true, failureCount: 0, lastDeliveryAt: null, lastError: null };
      } else if (path.endsWith('/private-target/read')) {
        privateReads++;
        if (!privateAvailable) {
          throw new AxiosError('私聊地址缓存不可用', 'ERR_BAD_RESPONSE', undefined, undefined, {
            status: 503, data: {}, headers: {}, config: {}
          } as never);
        }
        data = { platform: 'qq-bot', scope: 'c2c', BotId: '100017', targetId: 'private' };
      } else if (path.endsWith('/availability/read')) {
        data = { available: body.target?.scope !== 'group' || groupAvailable, updatedAt: 1 };
      } else if (path.endsWith('/permission/read')) {
        data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      } else if (!path.endsWith('/permission/cas') && !path.endsWith('/subscription/receipt')) {
        throw new Error(`Unexpected API: ${path}`);
      }
      return { data: { data } };
    }
  }));
  app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'receipt' })]);
  const event = app.events.groupMessage({ platform: 'qq-bot', botId: '100017' });
  const run = () => app.runHandler(async () => {
    const delivery = await deliverPlayerNotification(7, 'player', [{ type: 'Text', value: '通知' }], true);
    assert.equal(delivery.route, groupAvailable ? 'group' : 'private');
  }, event);
  const group = await run();
  assert.equal(group.messages[0].target?.targetId, 'subscribed');
  assert.equal(privateReads, 0);

  const legacy = await app.runHandler(async () => {
    const delivery = await deliverLegacyNotification({ cid: 'GROUP:subscribed', uid: 'player', data: [{ type: 'Text', value: '旧通知' }] }, true);
    assert.equal(delivery.route, 'group');
  }, event);
  assert.equal(legacy.messages[0].target?.targetId, 'subscribed');
  assert.equal(privateReads, 0);

  groupAvailable = false;
  await assert.rejects(run(), /private-target\/read.*503/);
  assert.equal(privateReads, 1);

  privateAvailable = true;
  const fallback = await run();
  assert.equal(fallback.messages[0].target?.targetId, 'private');

  groupAvailable = true;
  const subscriptionsBeforePrivateOnly = subscriptionReads;
  const direct = await app.runHandler(async () => {
    const delivery = await deliverPlayerNotification(7, 'player', [{ type: 'Text', value: '通知' }], true, { privateOnly: true });
    assert.equal(delivery.route, 'private');
  }, event);
  assert.equal(direct.messages[0].target?.targetId, 'private');
  assert.equal(privateReads, 3);
  assert.equal(subscriptionReads, subscriptionsBeforePrivateOnly);
});

test('关闭主动通知时旧消息无需读取私聊地址', async t => {
  t.mock.method(axios, 'create', () => {
    assert.fail('主动通知关闭时不应发起后台请求');
  });
  assert.deepEqual(await deliverLegacyNotification({ uid: 'player', data: [] }, false), {
    route: 'history', reason: 'proactive_disabled'
  });
});
