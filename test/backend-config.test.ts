import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendConfig } from '../src/api/bot/config';

test('AlemonJS backend config handles YAML booleans, domain lists and worker identity', t => {
  const backend = {
    api_url: ' https://backend.test/ ', robot_auth_token: ' robot ', worker_token: ' worker ',
    api_timeout_ms: 30000, worker_enabled: true, worker_handoff_confirmed: true,
    tower_ranking_worker_enabled: false, guild_competition_worker_enabled: false,
    domains: ['cultivation', ' inventory '], canary_percent: 100, meditation_enabled: true
  };
  mockBackendConfig(t, backend);
  assert.deepEqual(getBackendConfig(), {
    channelMode: false, channelBotId: '100017', url: 'https://backend.test', apiBase: '/api', scope: 'https://backend.test', logApiTimings: false, logTransportTimings: false, robotAuthToken: 'robot', workerToken: 'worker', timeoutMs: 30000
  });
  backend.worker_token = 'new-worker';
  backend.domains = ['inventory'];
  assert.equal(getBackendConfig().workerToken, 'new-worker');
});

test('missing configuration uses safe defaults and ignores legacy backend ENV', t => {
  mockBackendConfig(t, { api_timeout_ms: -1, canary_percent: 999, domains: 'inventory, cultivation' });
  const old = process.env.XIUXIAN_BACKEND_ROBOT_AUTH_TOKEN;
  process.env.XIUXIAN_BACKEND_ROBOT_AUTH_TOKEN = 'ignored-legacy-token';
  t.after(() => { if (old === undefined) delete process.env.XIUXIAN_BACKEND_ROBOT_AUTH_TOKEN; else process.env.XIUXIAN_BACKEND_ROBOT_AUTH_TOKEN = old; });
  const config = getBackendConfig();
  assert.equal(config.robotAuthToken, '');
  assert.equal(config.timeoutMs, 10000);
});

test('documented YAML example is accepted by the actual config reader', t => {
  const example = parse(readFileSync(new URL('../alemon.config.example.yaml', import.meta.url), 'utf8'));
  mockBackendConfig(t, example['xiuxian-game'].backend);
  assert.equal(getBackendConfig().url, example['xiuxian-game'].backend.api_url.trim().replace(/\/+$/, ''));
  assert.equal(getBackendConfig().timeoutMs, example['xiuxian-game'].backend.api_timeout_ms);
});

test('API base URL and path can be configured independently', t => {
  const backend: { api_url: string; api_base_url?: string; api_base_path?: string } = { api_url: 'https://legacy.test', api_base_url: 'http://gateway.test/' };
  mockBackendConfig(t, backend);
  assert.equal(getBackendConfig().url, 'http://gateway.test');
  assert.equal(getBackendConfig().apiBase, '/api');

  backend.api_base_path = '/channel-api';
  assert.equal(getBackendConfig().scope, 'http://gateway.test/channel-api');

  backend.api_base_url = 'https://gateway.test/api';
  assert.throws(() => getBackendConfig(), /backend.api_base_url/);

  delete backend.api_base_url;
  assert.equal(getBackendConfig().scope, 'https://legacy.test/channel-api');

  backend.api_base_path = '//other.test';
  assert.throws(() => getBackendConfig(), /backend.api_base_path/);
});
