import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios, { AxiosError } from 'axios';
import { logger, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import * as activitySource from '../../src/notification/activity';
import type { NotificationGroupActivity } from '../../src/api/bot/notification-cache';

const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise<void>(resolve => setImmediate(resolve));
  }
};

after(() => shutdownLogger());

test('群活动失败保留最新位置并在退避后单路探测恢复', async t => {
  const artifact = process.env.XIUXIAN_ACTIVITY_ARTIFACT;
  const { observePlayerGroupActivity, startPlayerGroupActivityObserver, stopPlayerGroupActivityObserver } =
    artifact ? await import(pathToFileURL(artifact).href) as typeof activitySource : activitySource;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(Math, 'random', () => 0);
  t.mock.method(logger, 'warn', () => {});
  t.mock.method(logger, 'error', () => {});
  const app = createTestApp({
    config: { 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { backend: { channel_mode: true, api_url: 'https://channel.invalid', robot_auth_token: 'test-token' } } },
    timeoutMs: 180_000
  });
  t.after(() => app.dispose());
  const previousLogin = process.env.login;
  process.env.login = 'qq-bot';
  t.after(() => {
    if (previousLogin === undefined) delete process.env.login;
    else process.env.login = previousLogin;
  });
  const requests: { group: string; at: number; succeed: () => void; fail: (status: number) => void }[] = [];
  t.mock.method(axios, 'create', () => ({
    post: (path: string, body: NotificationGroupActivity & { bid: string }) => {
      assert.ok(path.endsWith('/activity/remember'), path);
      assert.equal(body.bid, 'player');
      return new Promise((resolve, reject) => requests.push({
        group: body.target.targetId,
        at: body.occurredAt,
        succeed: () => resolve({ data: { data: { ok: true } } }),
        fail: status => reject(new AxiosError('fixture', 'ERR_BAD_RESPONSE', undefined, undefined, {
          status, data: { error: { code: 'FIXTURE' } }, headers: {}, config: {}
        } as never))
      }));
    }
  } as never));
  const event = app.events.groupMessage({ platform: 'qq-bot', botId: '100017', userId: 'player' });
  const observe = (group: string, at: number) => {
    observePlayerGroupActivity({
      ...event, OccurredAt: at, Target: { BotId: '100017', scope: 'group', targetId: group }
    });
  };
  const sent = () => requests.map(({ group, at }) => [group, at]);
  t.after(stopPlayerGroupActivityObserver);
  const result = await app.runHandler(async () => {
    startPlayerGroupActivityObserver();
    observe('a', 100);
    observe('a', 101);
    observe('a', 103);
    observe('a', 102);
    observe('b', 110);
    assert.deepEqual(sent(), [['a', 100], ['b', 110]]);

    requests[0].fail(503);
    await settle();
    observe('c', 111);
    t.mock.timers.tick(5_000);
    // The initial batch still has one request in flight.
    assert.equal(requests.length, 2);
    requests[1].succeed();
    await settle();
    assert.deepEqual(sent().slice(2), [['a', 103]]);

    observe('a', 120);
    observe('d', 121);
    requests[2].fail(429);
    await settle();
    t.mock.timers.tick(9_999);
    assert.equal(requests.length, 3);
    t.mock.timers.tick(1);
    assert.deepEqual(sent().slice(3), [['c', 111]]);
    requests[3].succeed();
    await settle();
    assert.deepEqual(sent().slice(4), [['a', 120], ['d', 121]]);

    observe('a', 119);
    requests[4].succeed();
    requests[5].fail(400);
    await settle();
    observe('e', 130);
    assert.deepEqual(sent().slice(6), [['e', 130]]);
    requests[6].fail(503);
    await settle();
    t.mock.timers.tick(5_000);
    assert.deepEqual(sent().slice(7), [['e', 130]]);
    requests[7].succeed();
    await settle();
    t.mock.timers.tick(60_000);
    assert.equal(requests.length, 8);

    observe('f', 140);
    stopPlayerGroupActivityObserver();
    observe('ignored', 141);
    startPlayerGroupActivityObserver();
    observe('f', 150);
    requests[8].fail(503);
    await settle();
    observe('g', 151);
    assert.deepEqual(sent().slice(8), [['f', 140], ['f', 150], ['g', 151]]);
    requests[9].succeed();
    requests[10].fail(503);
    await settle();
    stopPlayerGroupActivityObserver();
    t.mock.timers.tick(60_000);
    assert.equal(requests.length, 11);

    startPlayerGroupActivityObserver();
    for (let i = 0; i < 5; i++) {
      observe(`capacity-${i}`, 160 + i);
    }
    assert.equal(requests.length, 15);
    requests[11].succeed();
    await settle();
    assert.deepEqual(sent().slice(15), [['capacity-4', 164]]);
    for (const request of requests.slice(12)) {
      request.succeed();
    }
    await settle();
  }, event);
  assert.deepEqual(result.errors, []);
});
