import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { shutdownLogger } from 'alemonjs';
import { assertChannelRobotEvent, getBackendConfig, getNotificationBackendConfig } from '../src/api/bot/config';
import { claimNotificationRelay, getLegacySentNotificationIDs, registerNotificationRecipient, scanLegacyNotificationPool } from '../src/api/bot/notification-relay';
import { readPlatformDeliveryReceipt } from '../src/api/bot/notification-cache';
import { claimChatNotice } from '../src/api/bot/chat';
import { mockBackendConfig } from './backend-config-helper';

after(() => shutdownLogger());

test('ordinary notification transport retains Worker credentials', t => {
  mockBackendConfig(t, { api_url: 'https://offline.invalid', robot_auth_token: 'robot-only', worker_token: 'worker-only' });
  assert.deepEqual(getNotificationBackendConfig().headers, { 'X-Worker-Token': 'worker-only' });
  assert.equal(getBackendConfig().channelMode, false);
});

test('channel relay and cache use BOT_TOKEN and the configured AppID without Worker fallback', async t => {
  mockBackendConfig(t, { api_url: 'https://channel.invalid', channel_mode: true, robot_auth_token: 'merchant-token', worker_token: 'must-not-send' });
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  t.mock.method(axios, 'create', config => {
    assert.deepEqual(config?.headers, { Authorization: 'Bearer merchant-token' });
    assert.equal(config?.maxRedirects, 0);
    return { post: async (path: string, body: Record<string, unknown>) => {
      requests.push({ path, body });
      return { data: path.startsWith('/chat/') ? null : { data: path.endsWith('/claim') ? { event: null } : path.endsWith('/legacy-sent-ids') ? { ids: [] } : null } };
    } } as never;
  });
  assert.equal(await claimNotificationRelay('player.notification.dispatch', 'consumer'), null);
  assert.equal(await readPlatformDeliveryReceipt('event'), null);
  await getLegacySentNotificationIDs();
  await registerNotificationRecipient('native', undefined, 7);
  assert.equal(requests.find(row => row.path.endsWith('/legacy-sent-ids'))?.body.botId, '100017');
  assert.equal(requests.find(row => row.path.endsWith('/recipient'))?.body.botId, '100017');
  const count = requests.length;
  await assert.rejects(scanLegacyNotificationPool(), /尚未支持渠道/);
  assert.equal(requests.length, count);
  assert.equal(await claimChatNotice('100017'), null);
  assert.equal(requests.at(-1)?.path, '/chat/internal/claim');
});

test('channel origin and platform event must belong to the configured robot', t => {
  mockBackendConfig(t, { api_url: 'https://channel.invalid', channel_mode: true, robot_auth_token: 'merchant-token' });
  assert.doesNotThrow(() => assertChannelRobotEvent({ Platform: 'qq-bot', BotId: '100017', Target: { BotId: '100017' } }));
  for (const event of [
    { Platform: 'qq-bot' },
    { Platform: 'qq-bot', BotId: '100018' },
    { Platform: 'qq-bot', BotId: '100017', Target: { BotId: '100018' } },
    { Platform: 'onebot', BotId: '100017' }
  ]) assert.throws(() => assertChannelRobotEvent(event), /不匹配/);
});

for (const url of ['http://channel.invalid', 'https://user:secret@channel.invalid', 'https://channel.invalid/api/v1', 'https://channel.invalid/?secret=value', 'https://channel.invalid/#fragment']) {
  test('channel transport rejects insecure or non-origin endpoint: ' + new URL(url).hostname, t => {
    mockBackendConfig(t, { api_url: url, channel_mode: true, robot_auth_token: 'merchant-token' });
    assert.throws(() => getBackendConfig(), /HTTPS origin/);
  });
}

for (const fields of [
  { channel_mode: 'true' },
  { channel_mode: true },
  { channel_mode: true, robot_auth_token: '' }
]) test('invalid channel credentials fail before requesting even when Worker token exists: ' + JSON.stringify(Object.keys(fields)), async t => {
  mockBackendConfig(t, { api_url: 'https://channel.invalid', worker_token: 'must-not-fallback', ...fields });
  t.mock.method(axios, 'create', () => { throw new Error('must not request'); });
  await assert.rejects(claimNotificationRelay('player.notification.dispatch', 'consumer'), /channel_mode|BOT_TOKEN/);
});


test('未获得框架 AppID 时忽略旧手填 ID，通知请求不会创建客户端', async t => {
  mockBackendConfig(t, { api_url: 'https://channel.invalid', channel_mode: true, robot_auth_token: 'merchant-token', channel_bot_id: '100017' }, { app_id: '' });
  t.mock.method(axios, 'create', () => { throw new Error('must not request'); });
  assert.equal(getBackendConfig().channelBotId, '');
  await assert.rejects(claimNotificationRelay('player.notification.dispatch', 'consumer'), /AppID 尚未就绪/);
});
