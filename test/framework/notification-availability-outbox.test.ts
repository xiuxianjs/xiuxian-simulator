import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from '../backend-config-helper';

for (const kind of ['availability', 'permission', 'private-target'] as const) {
  test(`failed ${kind} survives reopen and is only replayed to its original notification scope`, async t => {
    const artifact = process.env.XIUXIAN_NOTIFICATION_AVAILABILITY_ARTIFACT;
    const { PlatformObservationOutbox } = artifact
      ? await import(pathToFileURL(artifact).href) as typeof import('../../src/notification/platformObservationOutbox')
      : await import('../../src/notification/platformObservationOutbox');
    const directory = await mkdtemp(join(tmpdir(), 'availability-outbox-'));
    const path = join(directory, 'observations.sqlite');
    mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'test' });
    let now = 1000;
    let scope = 'original-route';
    let status = 503;
    let accepted = false;
    const releaseFirst = Promise.withResolvers<void>();
    const sent: unknown[] = [];
    t.mock.method(axios, 'create', () => ({
      post: async (path: string, body: unknown) => {
        sent.push({ path, body });
        if (sent.length === 1) await releaseFirst.promise;
        if (status !== 200) {
          throw new axios.AxiosError('fixture failure', undefined, undefined, undefined, {
            status,
            statusText: '',
            data: {},
            headers: {},
            config: { headers: new axios.AxiosHeaders() }
          });
        }
        return { data: { data: { ok: accepted } } };
      }
    }));
    let outbox = new PlatformObservationOutbox(path, () => scope, () => now);
    t.after(async () => {
      await outbox.stop();
      await rm(directory, { recursive: true, force: true });
    });
    const target = { platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: 'group' } as const;
    const privateTarget = { ...target, scope: 'c2c', targetId: 'private' } as const;
    const privateBody = { platform: target.platform, bid: 'member', target: privateTarget };
    const body = kind === 'availability'
      ? { target, available: false, occurredAt: 919, memberId: 'departed', observedOnly: true }
      : kind === 'permission'
        ? { target, enabled: false, occurredAt: 919, observedOnly: true }
        : { ...privateBody, observedAt: 919 };
    const base = `/api/v1/internal/notification-relay/cache/${kind}`;
    const observation = { path: `${base}/${kind === 'private-target' ? 'observe' : 'event'}`, body };
    const first = kind === 'private-target' ? { path: `${base}/remember`, body } : observation;

    const record = kind === 'availability'
      ? outbox.recordAvailability(target, false, 919, 'departed', true)
      : kind === 'permission'
        ? outbox.recordPermission(target, false, 919, true)
        : outbox.recordPrivateTarget(target.platform, 'member', privateTarget, 919);
    const rejection = assert.rejects(record, { name: 'NotificationRequestError' });
    const inflight = new DatabaseSync(path);
    try {
      const rows = inflight.prepare('SELECT body FROM observations').all();
      assert.equal(rows.length, 1);
      const queued = JSON.parse(String(rows[0].body));

      assert.equal(kind === 'availability' ? queued[2] : kind === 'permission' ? queued.permission[2] : queued.privateTarget[3], 919);
      now += 5000;
      await outbox.flush();
      assert.deepEqual(sent, [first]);
      now -= 5000;
    } finally {
      inflight.close();
      releaseFirst.resolve();
    }
    await rejection;
    await outbox.stop();
    outbox = new PlatformObservationOutbox(path, () => scope, () => now);

    scope = 'different-route';
    now += 5000;
    await outbox.flush();
    assert.deepEqual(sent, [first]);

    scope = 'original-route';
    if (kind === 'private-target') status = 404;
    await assert.rejects(outbox.flush(), { name: 'NotificationRequestError' });
    status = 200;
    await outbox.flush();
    assert.deepEqual(sent, [first, observation]);

    now += 10_000;
    await assert.rejects(outbox.flush(), { name: 'NotificationRequestError' });
    accepted = true;
    now += 20_000;
    t.mock.timers.enable({ apis: ['setTimeout'] });
    outbox.start();
    t.mock.timers.tick(5000);
    assert.equal(sent.length, 4);
    await outbox.flush();
    await outbox.flush();
    assert.deepEqual(sent, [first, observation, observation, observation]);
  });
}

test('community finish survives restart and replays the exact claim receipt', async t => {
  const artifact = process.env.XIUXIAN_NOTIFICATION_AVAILABILITY_ARTIFACT;
  const { PlatformObservationOutbox } = artifact
    ? await import(pathToFileURL(artifact).href) as typeof import('../../src/notification/platformObservationOutbox')
    : await import('../../src/notification/platformObservationOutbox');
  const directory = await mkdtemp(join(tmpdir(), 'community-finish-outbox-'));
  const path = join(directory, 'observations.sqlite');
  mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'test' });
  let now = 1000;
  let scope = 'original-route';
  let status = 503;
  const sent: Array<{ path: string; body: Record<string, unknown> }> = [];
  t.mock.method(axios, 'create', () => ({
    post: async (endpoint: string, body: Record<string, unknown>) => {
      sent.push({ path: endpoint, body });
      if (status !== 200) {
        throw new axios.AxiosError('fixture failure', undefined, undefined, undefined, {
          status,
          statusText: '',
          data: { error: { code: status === 409 ? 'CONFLICT' : 'SERVICE_UNAVAILABLE' } },
          headers: {},
          config: { headers: new axios.AxiosHeaders() }
        });
      }
      return { data: { data: { ok: true } } };
    }
  }));
  let outbox = new PlatformObservationOutbox(path, () => scope, () => now);
  t.after(async () => {
    await outbox.stop();
    await rm(directory, { recursive: true, force: true });
  });
  await assert.rejects(outbox.recordCommunityFinish(scope, 'batch', 'consumer', false, false), { status: 503 });
  const request = sent[0];
  assert.equal(request.path, '/api/v1/internal/notification-relay/cache/community/finish');
  assert.equal(request.body.eventId, 'batch');
  assert.equal(request.body.consumer, 'consumer');
  assert.equal(request.body.retry, false);
  assert.match(String(request.body.requestId), /^[a-f0-9-]{36}$/);
  await outbox.stop();
  outbox = new PlatformObservationOutbox(path, () => scope, () => now);
  now += 5000;
  scope = 'other-route';
  status = 200;
  await outbox.flush();
  assert.equal(sent.length, 1);
  scope = 'original-route';
  await outbox.flush();
  assert.deepEqual(sent, [request, request]);
  await outbox.flush();
  assert.equal(sent.length, 2);
  status = 409;
  await outbox.recordCommunityFinish(scope, 'batch', 'expired-consumer', true, true);
  now += 5000;
  await outbox.flush();
  assert.equal(sent.length, 3, '已失效的租约已确认，无需再次请求');
});

for (const unavailableStatus of [404, 409, 503] as const) {
  const expectation = unavailableStatus === 503 ? 'pauses the replay batch' : 'allows independent observations to replay';
  test(`private target status ${unavailableStatus} ${expectation}`, async t => {
    const artifact = process.env.XIUXIAN_NOTIFICATION_AVAILABILITY_ARTIFACT;
    const { PlatformObservationOutbox } = artifact
      ? await import(pathToFileURL(artifact).href) as typeof import('../../src/notification/platformObservationOutbox')
      : await import('../../src/notification/platformObservationOutbox');
    const directory = await mkdtemp(join(tmpdir(), 'mixed-observation-outbox-'));
    const path = join(directory, 'observations.sqlite');
    mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'test' });
    let now = 1000;
    let permitPermission = false;
    const sent: string[] = [];
    const scope = 'original-route';
    const outbox = new PlatformObservationOutbox(path, () => scope, () => now);
    t.after(async () => {
      await outbox.stop();
      await rm(directory, { recursive: true, force: true });
    });
    t.mock.method(axios, 'create', () => ({
      post: async (path: string) => {
        const isPrivateTarget = path.endsWith('/private-target/observe');
        const status = isPrivateTarget ? unavailableStatus : permitPermission ? 200 : 503;
        sent.push(path);
        if (status !== 200) {
          throw new axios.AxiosError('fixture failure', undefined, undefined, undefined, {
            status,
            statusText: '',
            data: {},
            headers: {},
            config: { headers: new axios.AxiosHeaders() }
          });
        }
        return { data: { data: { ok: true } } };
      }
    }));
    const target = { platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: 'group' } as const;
    outbox.deferPrivateTarget(scope, target.platform, 'member', { ...target, scope: 'c2c', targetId: 'private' }, 919);
    await assert.rejects(outbox.recordPermission(target, true, 920), { name: 'NotificationRequestError' });
    sent.length = 0;
    permitPermission = true;
    now += 5000;

    await assert.rejects(outbox.flush(), { name: 'NotificationRequestError', status: unavailableStatus });
    const db = new DatabaseSync(path);
    try {
      const rows = db.prepare('SELECT body, attempts FROM observations ORDER BY id').all();
      assert.deepEqual(rows.map(row => row.attempts), unavailableStatus === 503 ? [1, 0] : [1]);
      assert.equal('privateTarget' in JSON.parse(String(rows[0].body)), true);
    } finally {
      db.close();
    }
    assert.deepEqual(sent.map(path => path.split('/').slice(-2).join('/')),
      unavailableStatus === 503 ? ['private-target/observe'] : ['private-target/observe', 'permission/event']);
  });
}
