import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { shutdownLogger, type Events } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { observePlayerGroupActivity } from '../src/notification/activity';
after(() => shutdownLogger());

test('activity observes unmatched group messages asynchronously and ignores private/lifecycle/bot events', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://synthetic.test', worker_token: 'test' } } } });
  t.after(() => app.dispose());
  const paths: string[] = [];
  await app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), async () => {
    const bodies: any[] = [];
    let finish!: () => void;
    t.after(() => finish());
    const blocked = new Promise<void>(resolve => { finish = resolve; });
    t.mock.method(axios, 'create', () => ({ post: async (path: string, body: unknown) => {
      paths.push(path);
      assert.equal(path, '/api/v1/internal/notification-relay/cache/activity/remember');
      bodies.push(body);
      await blocked;
      return { data: { data: { ok: true } } };
    } }));
    const event = { name: 'message.create', Platform: 'qq-bot', BotId: 'bot', UserId: 'player', ChannelId: 'group-a', SpaceId: 'GROUP:group-a', MessageText: '普通聊天', OccurredAt: 100 };
    const observe = (fields: Record<string, unknown>) => observePlayerGroupActivity({ ...event, ...fields } as Events[keyof Events]);
    observe({});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(bodies.length, 1, 'starts without waiting for game commands');
    assert.equal(bodies[0].target.targetId, 'group-a');
    for (const fields of [
      { name: 'private.message.create' }, { IsPrivate: true }, { IsBot: true },
      { name: 'member.remove' }, { Target: { scope: 'c2c', targetId: 'private' } },
      { SpaceId: 'GUILD:channel' }, { BotId: '' }
    ]) { observe(fields); }
    assert.equal(bodies.length, 1);
    // Saturate the bounded worker pool, then change a queued account twice.
    for (let i = 0; i < 3; i++) { observe({ UserId: `busy-${i}` }); }
    observe({ UserId: 'queued', ChannelId: 'new', OccurredAt: 300 });
    observe({ UserId: 'queued', ChannelId: 'new', OccurredAt: 200 });
    observe({ UserId: 'queued', ChannelId: 'new', OccurredAt: 400 });
    observe({ UserId: 'queued', ChannelId: 'another', OccurredAt: 350 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(bodies.length, 4, 'at most four requests in flight');
    finish();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(bodies.length, 6);
    assert.equal(bodies[4].target.targetId, 'new');
    assert.equal(bodies[5].target.targetId, 'another');
    assert.equal(bodies[4].occurredAt, 400);
    observe({ BotId: 'other-bot', OccurredAt: 500 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(bodies.length, 7);
    assert.equal(bodies[6].target.BotId, 'other-bot');
    assert.equal(bodies[0].target.BotId, 'bot');
  });
  assert.equal(paths.length, 7);
  assert.ok(paths.every(path => path.endsWith('/activity/remember')), '普通消息只上报活动，不读取或探测权限');
  assert.equal(app.actions.calls.length, 0, '活动上报不调用 QQ 平台接口');
});

test('activity pauses on cache unavailability and resumes with the latest queued observations', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const app = createTestApp({ timeoutMs: 20_000, config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://synthetic.test', worker_token: 'test' } } } });
  t.after(() => app.dispose());
  const sent: { bid: string; occurredAt: number }[] = [];
  t.mock.method(axios, 'create', () => ({
    post: async (_path: string, body: { bid: string; occurredAt: number }) => {
      sent.push(body);
      if (sent.length === 1) {
        throw Object.assign(new axios.AxiosError('unavailable'), {
          response: { status: 503, data: { error: { code: 'SERVICE_UNAVAILABLE' } } }
        });
      }
      return { data: { data: { ok: true } } };
    }
  }));
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), async () => {
    const observe = (UserId: string, OccurredAt: number) => observePlayerGroupActivity({
      name: 'message.create', Platform: 'qq-bot', BotId: 'bot', UserId, ChannelId: 'group-a', SpaceId: 'GROUP:group-a', OccurredAt
    } as Events[keyof Events]);
    observe('failed', 100);
    await flush();
    assert.equal(sent.length, 1);
    observe('queued', 200);
    observe('queued', 300);
    observe('another', 250);
    t.mock.timers.tick(4999);
    await flush();
    assert.equal(sent.length, 1);
    t.mock.timers.tick(1);
    await flush();
    assert.deepEqual(sent.map(({ bid, occurredAt }) => [bid, occurredAt]), [['failed', 100], ['queued', 300], ['another', 250]]);
    observe('recovered', 400);
    await flush();
    assert.equal(sent.at(-1)?.bid, 'recovered');
  });
});
