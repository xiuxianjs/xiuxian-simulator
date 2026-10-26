import assert from 'node:assert/strict';
import { test } from 'node:test';
import { logger, MessageDirect, Ok } from 'alemonjs';
import { notificationChannel } from '../src/notification/channel';
import { mockBackendConfig } from './backend-config-helper';
import type { NotificationTarget } from '../src/types/notification';

for (const [platform, scope, method] of [['qq-bot', 'group', 'sendToTarget'], ['onebot', 'group', 'sendToChannel'], ['onebot', 'c2c', 'sendToUser']] as const) {
  test(`notification ${platform}/${scope} times the actual SDK promise and preserves receipt checks`, async t => {
    mockBackendConfig(t, { log_transport_timings: true, url: '', worker_token: '' });
    t.mock.method(notificationChannel, 'read', async () => null);
    t.mock.method(logger, 'error', () => undefined);
    const logs: unknown[][] = [];
    t.mock.method(logger, 'info', (...args: unknown[]) => { logs.push(args); });
    const previousLogin = process.env.login;
    delete process.env.login;
    t.after(() => { if (previousLogin === undefined) delete process.env.login; else process.env.login = previousLogin; });
    let calls = 0;
    let finish!: (result: unknown) => void;
    let rejectSend!: (error: Error) => void;
    const target = { platform, scope, targetId: 'private-target', BotId: 'private-bot' } as NotificationTarget;
    const data: [] = [];
    const sdk = { [method]: (params: { target?: NotificationTarget; format: unknown }) => {
      calls++;
      assert.equal(params.format, data);
      if (method === 'sendToTarget') assert.equal(params.target, target);
      return new Promise((resolve, reject) => { finish = resolve; rejectSend = reject; });
    } };
    t.mock.method(MessageDirect, 'create', () => sdk as unknown as ReturnType<typeof MessageDirect.create>);
    const pending = notificationChannel.send(target, data, null);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(logs.length, 0);
    finish([{ code: Ok }]);
    await pending;
    assert.equal(calls, 1);
    assert.equal((logs[0][1] as { stage: string }).stage, 'notification.platform.send');
    assert.doesNotMatch(JSON.stringify(logs), /private-target|private-bot/);
    const failed = notificationChannel.send(target, data, null);
    await new Promise<void>(resolve => setImmediate(resolve));
    finish([{ code: 4000 }]);
    await assert.rejects(failed, /通知投递失败/);
    assert.equal(calls, 2);
    const rejected = notificationChannel.send(target, data, null);
    await new Promise<void>(resolve => setImmediate(resolve));
    const failure = new Error('original SDK rejection');
    rejectSend(failure);
    await assert.rejects(rejected, error => error === failure);
    assert.equal((logs[2][1] as { outcome: string }).outcome, 'rejected');
    assert.equal(calls, 3);
  });
}

test('notification deadline logs rejection while the underlying SDK may still be pending', async t => {
  mockBackendConfig(t, { log_transport_timings: true, url: '', worker_token: '' });
  t.mock.method(notificationChannel, 'read', async () => null);
  t.mock.method(logger, 'error', () => undefined);
  const logs: { outcome: string; durationMs: number }[] = [];
  t.mock.method(logger, 'info', (_label: string, value: { outcome: string; durationMs: number }) => { logs.push(value); });
  const previousLogin = process.env.login;
  delete process.env.login;
  t.after(() => { if (previousLogin === undefined) delete process.env.login; else process.env.login = previousLogin; });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  let finish!: (result: unknown) => void;
  let settled = false;
  t.mock.method(MessageDirect, 'create', () => ({ sendToTarget: () => new Promise(resolve => { finish = result => { settled = true; resolve(result); }; }) }) as unknown as ReturnType<typeof MessageDirect.create>);
  const pending = notificationChannel.send({ platform: 'qq-bot', scope: 'group', targetId: 'synthetic', BotId: 'synthetic' } as NotificationTarget, [], null);
  // Wait only for the async channel check to begin the SDK call.
  await new Promise<void>(resolve => setImmediate(resolve));
  now = 30100;
  t.mock.timers.tick(30000);
  await assert.rejects(pending, /通知平台请求超时/);
  assert.equal(settled, false);
  assert.deepEqual(logs.map(value => [value.outcome, value.durationMs]), [['rejected', 30000]]);
  finish([{ code: Ok }]);
  await Promise.resolve();
  assert.equal(settled, true);
  assert.equal(logs.length, 1);
});
