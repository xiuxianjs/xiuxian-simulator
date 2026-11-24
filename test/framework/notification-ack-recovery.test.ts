import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios, { AxiosError } from 'axios';
import { shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { acknowledgeNotificationRelay } from '../../src/api/bot/notification-relay';

after(() => shutdownLogger());

for (const cause of ['ECONNRESET', '503', '403']) {
  test(`通知确认失败后只重试可恢复的同一回执 ${cause}`, async t => {
    const app = createTestApp({
      config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } }
    });
    t.after(() => app.dispose());
    const requests: unknown[] = [];
    t.mock.method(axios, 'create', () => ({
      async post(path: string, body: unknown) {
        assert.match(path, /\/notification-relay\/ack$/);
        requests.push(body);
        if (requests.length === 1) {
          if (cause === 'ECONNRESET') {
            throw new AxiosError('reply lost', cause);
          }
          throw new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
            status: Number(cause), data: {}, headers: {}, config: { headers: {} }
          } as never);
        }
        return { data: { data: { ok: true } } };
      }
    } as never));

    const result = await app.runHandler(async () => {
      const delivery = { route: 'private', reason: 'sent' } as const;
      const ack = acknowledgeNotificationRelay('flymail.message:1', 'consumer', delivery);
      if (cause === '403') {
        await assert.rejects(ack, /status=403/);
      } else {
        await ack;
      }
      const expected = { eventId: 'flymail.message:1', consumer: 'consumer', delivery };
      assert.deepEqual(requests, cause === '403' ? [expected] : [expected, expected]);
    }, app.events.groupMessage({ platform: 'qq-bot', botId: '123' }));
    assert.deepEqual(result.errors, []);
  });
}
