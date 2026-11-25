import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios, { AxiosError } from 'axios';
import { mockBackendConfig } from '../backend-config-helper';

for (const scenario of ['availability outage', 'queue reply lost', 'member already rejoined']) {
  test(`member welcome recovery after ${scenario}`, async t => {
    const artifact = process.env.XIUXIAN_MEMBER_WELCOME_OUTBOX_ARTIFACT;
    const { PlatformObservationOutbox } = artifact
      ? await import(pathToFileURL(artifact).href) as typeof import('../../src/notification/platformObservationOutbox')
      : await import('../../src/notification/platformObservationOutbox');
    mockBackendConfig(t, { api_url: 'https://synthetic.test', worker_token: 'fixture' });
    const directory = await mkdtemp(join(tmpdir(), 'member-welcome-outbox-'));
    const file = join(directory, 'observations.sqlite');
    let now = 1000;
    let outbox = new PlatformObservationOutbox(file, () => 'fixture-route', () => now);
    t.after(async () => {
      await outbox.stop();
      await rm(directory, { recursive: true, force: true });
    });
    const target = { platform: 'qq-bot', BotId: '100017', scope: 'group', targetId: 'group' } as const;
    let state: { updatedAt: number; available: boolean } | null = null;
    let unavailable = true;
    const attempts: string[] = [];
    const accepted = new Set<string>();
    let checkedPersistence = false;
    const outage = () => new AxiosError('缓存暂时不可用', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 503, data: {}, headers: {}, config: {}
    } as never);
    t.mock.method(axios, 'create', () => ({
      async post(path: string, body: { occurredAt?: number; memberObservedAt?: number; memberId?: string; itemId?: string }) {
        let data: unknown = { ok: true };
        if (path.endsWith('/availability/event')) {
          if (!checkedPersistence) {
            checkedPersistence = true;
            const db = new DatabaseSync(file, { readOnly: true });
            try {
              assert.equal(db.prepare('SELECT COUNT(*) AS pending FROM observations').get()?.pending, 1);
            } finally {
              db.close();
            }
          }
          if (unavailable && scenario !== 'queue reply lost') throw outage();
          assert.equal(body.memberId, 'member');
          assert.equal(body.occurredAt, 900);
          if (!state || state.updatedAt < body.occurredAt!) state = { available: true, updatedAt: body.occurredAt! };
        } else if (path.endsWith('/availability/read')) {
          data = state;
        } else if (path.endsWith('/community/queue')) {
          assert.equal(body.memberObservedAt, 900);
          const key = JSON.stringify([body.itemId, body.occurredAt]);
          attempts.push(key);
          accepted.add(key);
          if (unavailable) throw outage();
        } else {
          assert.fail(`Unexpected request ${path}`);
        }
        return { data: { data } };
      }
    }));

    await assert.rejects(outbox.recordMemberWelcome(target, 'member', 900, false), /status=503/);
    await outbox.stop();
    unavailable = false;
    if (scenario === 'member already rejoined') state = { available: true, updatedAt: 950 };
    outbox = new PlatformObservationOutbox(file, () => 'fixture-route', () => now);
    now += 5000;
    await outbox.flush();
    await outbox.flush();
    assert.equal(state?.updatedAt, scenario === 'member already rejoined' ? 950 : 900);
    assert.equal(accepted.size, scenario === 'member already rejoined' ? 0 : 1);
    assert.equal(attempts.length, scenario === 'queue reply lost' ? 2 : accepted.size);
  });
}
