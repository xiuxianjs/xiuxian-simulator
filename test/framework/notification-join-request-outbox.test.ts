import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios, { AxiosError } from 'axios';
import { mockBackendConfig } from '../backend-config-helper';

test('join request outbox preserves the summary and reminder across recovery', async parent => {
  const previousDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'join-request-outbox-'));
  process.chdir(directory);
  parent.after(async () => {
    process.chdir(previousDirectory);
    await rm(directory, { recursive: true, force: true });
  });
  let now = 1000;
  parent.mock.method(Date, 'now', () => now);
  mockBackendConfig(parent, { api_url: 'https://synthetic.test', worker_token: 'fixture' });
  const artifact = process.env.XIUXIAN_JOIN_REQUEST_ARTIFACT;
  const { handleCommunityJoinRequest } = artifact
    ? await import(pathToFileURL(join(artifact, 'notification/community.js')).href) as typeof import('../../src/notification/community')
    : await import('../../src/notification/community');
  const { PlatformObservationOutbox } = artifact
    ? await import(pathToFileURL(join(artifact, 'notification/platformObservationOutbox.js')).href) as typeof import('../../src/notification/platformObservationOutbox')
    : await import('../../src/notification/platformObservationOutbox');
  const pendingPath = join(directory, 'data/notification-availability/observations.sqlite');
  for (const scenario of ['summary outage', 'queue reply lost', 'approved before replay', 'already approved']) {
    await parent.test(scenario, async t => {
      const replay = new PlatformObservationOutbox(pendingPath, undefined, () => now);
      t.after(() => replay.stop());
      const target = { platform: 'qq-bot', BotId: '100017', scope: 'group', targetId: 'group' } as const;
      const alreadyApproved = scenario === 'already approved';
      const request = { id: 'request', userId: 'applicant', userName: '名字', appliedAt: '', guildId: target.targetId };
      const event = {
        name: 'notice.create', Platform: 'qq-bot', BotId: '100017', OccurredAt: 900, Target: target,
        Notice: { type: 'join-request', request: { ...request, approvedByStrategyId: alreadyApproved ? 'strategy' : undefined, answer: '不得落盘的原文' } }
      } as unknown as Parameters<typeof handleCommunityJoinRequest>[0];
      let failure = !alreadyApproved;
      let approved: boolean | undefined;
      const queued = new Set<string>();
      let queueAttempts = 0;
      const outage = () => new AxiosError('通知缓存暂时不可用', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 503, data: {}, headers: {}, config: {}
      } as never);
      t.mock.method(axios, 'create', () => ({
        async post(path: string, body: { request?: unknown; itemId?: string; occurredAt?: number }) {
          if (path.endsWith('/community/requests/record')) {
            assert.deepEqual(body.request, { id: request.id, userId: request.userId, userName: request.userName,
              appliedAt: request.appliedAt, autoApproved: alreadyApproved, observedAt: 900 });
            if (failure && scenario === 'summary outage') throw outage();
            const inserted = approved === undefined;

            approved = approved === true || alreadyApproved;
            return { data: { data: { inserted } } };
          }
          assert.ok(path.endsWith('/community/queue'));
          assert.equal(body.itemId, request.id);
          assert.equal(body.occurredAt, 900);
          queueAttempts++;
          if (failure && scenario === 'approved before replay') throw outage();
          if (!approved) queued.add(body.itemId);
          if (failure) throw outage();
          return { data: { data: { ok: true } } };
        }
      }));

      if (alreadyApproved) {
        await handleCommunityJoinRequest(event);
      } else {
        await assert.rejects(handleCommunityJoinRequest(event), /status=503/);
      }
      if (scenario === 'approved before replay') approved = true;
      failure = false;
      now += 5000;
      await replay.flush();
      await replay.flush();
      assert.equal(queued.size, approved ? 0 : 1);
      assert.equal(queueAttempts, alreadyApproved ? 0 : scenario === 'summary outage' ? 1 : 2);
    });
  }
});
