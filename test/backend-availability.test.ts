import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { shutdownLogger } from 'alemonjs';
import { claimChatNotice } from '../src/api/bot/chat';
import { requestBackend } from '../src/api/bot/client';
import { getBackendConfig } from '../src/api/bot/config';
import { mockBackendConfig } from './backend-config-helper';

after(() => shutdownLogger());

test('robot and chat requests share a rolling failure window and switch origin and path together', async t => {
  const backend = {
    api_base_url: 'https://gateway.test',
    api_base_path: '/channel-api',
    api_url: 'https://fallback.test',
    robot_auth_token: 'robot-token',
    worker_token: 'worker-token'
  };
  mockBackendConfig(t, backend);
  let now = 0;
  t.mock.method(performance, 'now', () => now);

  let status = 502;
  let data = '';
  const requests: string[] = [];
  t.mock.method(axios, 'create', config => ({
    request: async ({ url }: { url: string }) => {
      requests.push(url);
      return { status, data, headers: {} };
    },
    post: async (path: string) => {
      requests.push(config?.baseURL + path);
      throw new axios.AxiosError('timed out', 'ECONNABORTED');
    }
  }) as never);
  const request = () => requestBackend('bid', 'post_v2_robot_business_operation', {
    idempotencyKey: 'test-request',
    path: { operation: 'settings.overview' },
    body: { platform: 'onebot', messageText: '/我的设置', arguments: {} }
  });

  await assert.rejects(request(), { status: 502 });
  now = 50_000;
  await assert.rejects(claimChatNotice('100017'), { code: 'ECONNABORTED' });

  now = 60_000;
  status = 200;
  data = '{"data":{}}';
  await request();
  status = 404;
  data = '{"error":{"code":"PLAYER_NOT_FOUND","message":"Player not found"}}';
  await assert.rejects(request(), { code: 'PLAYER_NOT_FOUND' });

  status = 404;
  data = 'Gateway route not found';
  await assert.rejects(request(), { status: 404 });
  assert.equal(getBackendConfig().url, backend.api_base_url);

  now = 65_000;
  status = 503;
  data = '';
  await assert.rejects(request(), { status: 503 });
  assert.equal(requests.length, 6);
  assert.ok(requests.every(url => url.startsWith('https://gateway.test/channel-api/')));

  now = 200_000;
  status = 200;
  data = '{"data":{}}';
  await request();
  assert.match(requests.at(-1)!, /^https:\/\/fallback\.test\/api\//);

  backend.api_base_path = '/new-api';
  await request();
  assert.match(requests.at(-1)!, /^https:\/\/gateway\.test\/new-api\//);
});

test('channel requests accept non-loopback HTTP origins for both primary and fallback', async t => {
  mockBackendConfig(t, {
    api_base_url: 'http://gateway.test',
    api_base_path: '/channel-api',
    api_url: 'http://fallback.test',
    robot_auth_token: 'merchant-token',
    channel_mode: true
  });
  const requests: string[] = [];
  t.mock.method(axios, 'create', config => ({
    post: async (path: string) => {
      requests.push(config?.baseURL + path);
      if (config?.baseURL === 'http://gateway.test') {
        throw new axios.AxiosError('timed out', 'ECONNABORTED');
      }

      return { data: null };
    }
  }) as never);

  for (let i = 0; i < 3; i++) {
    await assert.rejects(claimChatNotice('100017'), { code: 'ECONNABORTED' });
  }
  assert.equal(await claimChatNotice('100017'), null);
  assert.deepEqual(requests, [
    'http://gateway.test/channel-api/v1/internal/chat/claim',
    'http://gateway.test/channel-api/v1/internal/chat/claim',
    'http://gateway.test/channel-api/v1/internal/chat/claim',
    'http://fallback.test/api/v1/internal/chat/claim'
  ]);
});
