import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { logger, withEventContext } from 'alemonjs';
import { requestBackend } from '../src/api/bot/client';
import { measureTransportStage, startTransportEvent } from '../src/utils/transportTiming';
import type { GameEvent } from '../src/types/event';
import { mockBackendConfig } from './backend-config-helper';

for (const enabled of [undefined, false, true]) {
  test(`production API timing logs require explicit opt-in: ${enabled}`, async t => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    t.after(() => {
      if (originalEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalEnv;
    });
    mockBackendConfig(t, { api_url: 'https://synthetic.test', robot_auth_token: 'synthetic-token', log_api_timings: enabled, log_transport_timings: true });
    const logs: unknown[][] = [];
    t.mock.method(logger, 'info', (...args: unknown[]) => { logs.push(args); });
    let now = 100;
    t.mock.method(performance, 'now', () => now);
    let calls = 0;
    t.mock.method(axios, 'create', () => ({ request: async () => {
      calls++;
      now += 3000;
      return { status: 200, headers: {}, data: '{"data":{"observed":true}}' };
    } }));
    for (const MessageText of ['/我的资料', '/商店']) {
      const event = { name: 'message.create', MessageText, Platform: 'qq-bot', UserId: 'synthetic-user', MessageId: MessageText } as GameEvent;
      startTransportEvent(event);
      await withEventContext(event, () => {}, async () => {
        assert.deepEqual(await requestBackend(event.UserId, 'getRobotIdentity'), { observed: true });
        assert.equal(await measureTransportStage('platform.send', async () => { now += 3000; return 'sent'; }, event), 'sent');
        const failure = new Error('original send error');
        await assert.rejects(measureTransportStage('platform.send', async () => { now += 3000; throw failure; }, event), error => error === failure);
      });
    }
    assert.equal(calls, 2);
    assert.equal(logs.length, enabled ? 2 : 0);
    assert.ok(logs.every(args => args[0] === '[后端请求耗时]'));
  });

}
