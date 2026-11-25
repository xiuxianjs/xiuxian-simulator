import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios from 'axios';
import { getConfig, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { businessEnvelope } from './fixture';

after(() => shutdownLogger());

test('中间件地址失败或响应未知时按原请求归属落盘，重放仅更新地址', async t => {
  const previousDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'middleware-private-target-'));
  process.chdir(directory);
  t.after(async () => {
    process.chdir(previousDirectory);
    await rm(directory, { recursive: true, force: true });
  });
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const artifact = process.env.XIUXIAN_MIDDLEWARE_PRIVATE_TARGET_ARTIFACT;
  const { requestRobotBusiness } = artifact
    ? await import(pathToFileURL(join(artifact, 'api/bot/robot-business.js')).href) as typeof import('../../src/api/bot/robot-business')
    : await import('../../src/api/bot/robot-business');
  const { getEventMiddlewareEntry } = artifact
    ? await import(pathToFileURL(join(artifact, 'api/bot/middleware-entry.js')).href) as typeof import('../../src/api/bot/middleware-entry')
    : await import('../../src/api/bot/middleware-entry');
  const { platformObservationOutbox } = artifact
    ? await import(pathToFileURL(join(artifact, 'notification/platformObservationOutbox.js')).href) as typeof import('../../src/notification/platformObservationOutbox')
    : await import('../../src/notification/platformObservationOutbox');
  t.after(() => platformObservationOutbox.stop());
  const origin = 'http://channel-a.invalid';
  const other = 'http://channel-b.invalid';
  let warning: 'PRIVATE_TARGET_NOT_SAVED' | 'RECIPIENT_NOT_SAVED' = 'PRIVATE_TARGET_NOT_SAVED';
  let failure: 'network' | 'timeout' | 'invalid' | 401 | 504 | undefined;
  let currentUrl = origin;
  let currentBot = '100017';
  const configuration = () => ({
    'qq-bot': { app_id: currentBot },
    'xiuxian-game': { backend: { api_url: currentUrl, channel_mode: true, robot_auth_token: 'fixture', api_timeout_ms: 50 } }
  });
  const app = createTestApp({ config: configuration() });
  t.after(() => app.dispose());
  app.run(() => t.mock.getter(getConfig(), 'value', configuration));
  const calls: Array<{ baseURL?: string; path: string; body?: unknown }> = [];
  const liveTimestamps: Array<string | null> = [];
  t.mock.method(axios, 'create', (config?: { baseURL?: string }) => ({
    async request(input: { url?: string; headers?: HeadersInit; signal: AbortSignal }) {
      const url = new URL(input.url ?? '');
      assert.equal(url.origin, origin);
      calls.push({ baseURL: url.origin, path: url.pathname });
      liveTimestamps.push(new Headers(input.headers).get('X-Private-Target-Observed-At'));
      const business = businessEnvelope('native-player', { value: 'committed' });
      const envelope = { ...business, middleware: { ...business.middleware, contextWarnings: [warning] } };
      currentUrl = other;
      currentBot = '100018';
      if (failure === 'network') {
        throw new axios.AxiosError('fixture connection reset', 'ECONNRESET');
      }
      if (failure === 'timeout') {
        await new Promise<never>((_, reject) => {
          input.signal.addEventListener('abort', () => reject(new axios.CanceledError()), { once: true });
        });
        assert.fail('fixture request completed without a response');
      }
      if (failure === 'invalid') {
        return { status: 200, headers: {}, data: '' };
      }
      if (failure) {
        return { status: failure, headers: {}, data: '' };
      }
      return {
        status: 200,
        headers: {},
        data: JSON.stringify({ data: url.pathname.endsWith('/middleware-entry') ? envelope.middleware : envelope })
      };
    },
    async post(path: string, body: unknown) {
      calls.push({ baseURL: config?.baseURL, path, body });
      return { data: { data: { ok: true } } };
    }
  }));

  const scenarios: Array<{
    name: string;
    middleware?: boolean;
    untimed?: boolean;
    recipientOnly?: boolean;
    failure?: typeof failure;
    error?: { code: string; status?: number };
    replay: boolean;
  }> = [
    { name: 'business', replay: true },
    { name: 'middleware', middleware: true, replay: true },
    { name: 'recipient-only', recipientOnly: true, replay: false },
    { name: 'untimed', middleware: true, untimed: true, replay: false },
    { name: 'business-network', failure: 'network', error: { code: 'SDK_NETWORK_ERROR' }, replay: true },
    { name: 'sdk-timeout', failure: 'timeout', error: { code: 'SDK_TIMEOUT' }, replay: true },
    { name: 'middleware-gateway-timeout', middleware: true, failure: 504, error: { code: 'SDK_HTTP_ERROR', status: 504 }, replay: true },
    { name: 'malformed-success-receipt', failure: 'invalid', error: { code: 'SDK_INVALID_RESPONSE', status: 200 }, replay: true },
    { name: 'middleware-unauthorized', middleware: true, failure: 401, error: { code: 'SDK_HTTP_ERROR', status: 401 }, replay: false },
    { name: 'untimed-network', untimed: true, failure: 'network', error: { code: 'SDK_NETWORK_ERROR' }, replay: false }
  ];
  for (const scenario of scenarios) {
    warning = scenario.recipientOnly ? 'RECIPIENT_NOT_SAVED' : 'PRIVATE_TARGET_NOT_SAVED';
    failure = scenario.failure;
    const event = {
      ...app.events.privateMessage({ platform: 'qq-bot', botId: '100017', userId: 'native-player' }),
      MessageId: `message-${scenario.name}`,
      OccurredAt: scenario.untimed ? undefined : now - 1000,
      Target: { platform: 'qq-bot', BotId: '100017', scope: 'c2c', targetId: `target-${scenario.name}` } as const
    };
    const before = calls.length;
    await app.invoke(event, async () => {
      if (scenario.error) {
        await assert.rejects(
          scenario.middleware ? getEventMiddlewareEntry(event) : requestRobotBusiness(event, 'checkin.view', {}, payload => payload),
          scenario.error
        );
      } else if (!scenario.middleware) {
        const result = await requestRobotBusiness(event, 'checkin.view', {}, payload => payload);
        assert.equal(result.success, true);
        assert.equal(result.branch, 'business');
      } else {
        const result = await getEventMiddlewareEntry(event);
        assert.equal(result.outcome, 'allow');
      }
      assert.equal(calls.length, before + 1, '原请求结束后尚未补写');
      assert.equal(liveTimestamps.at(-1), event.OccurredAt === undefined ? null : String(event.OccurredAt));
      now += 5000;
      await platformObservationOutbox.flush();
      assert.equal(calls.length, before + 1, '其它后端不得领取待补写记录');
      currentUrl = origin;
      await platformObservationOutbox.flush();
      assert.equal(calls.length, before + 1, '同一后端的其它机器人不得领取待补写记录');
      currentBot = '100017';
      await platformObservationOutbox.flush();
      const expected = scenario.replay ? [{
        baseURL: origin,
        path: '/api/v1/internal/notification-relay/cache/private-target/observe',
        body: { platform: 'qq-bot', bid: 'native-player', target: event.Target, observedAt: event.OccurredAt }
      }] : [];
      assert.deepEqual(calls.slice(before + 1), expected);
    });
  }
  const liveTarget = { platform: 'qq-bot', BotId: '100017', scope: 'c2c', targetId: 'live-target' } as const;
  await app.run(() => platformObservationOutbox.recordPrivateTarget('qq-bot', 'native-player', liveTarget, now));
  assert.deepEqual(calls.at(-1), {
    baseURL: origin,
    path: '/api/v1/internal/notification-relay/cache/private-target/remember',
    body: { platform: 'qq-bot', bid: 'native-player', target: liveTarget, observedAt: now }
  });
});
