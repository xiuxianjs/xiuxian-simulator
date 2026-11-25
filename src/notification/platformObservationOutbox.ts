import { logger } from 'alemonjs';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getNotificationBackendConfig } from '@src/api/bot/config';
import {
  finishCommunityNotification,
  observePlatformPrivateTarget,
  queueCommunityNotification,
  readPlatformAvailability,
  recordCommunityJoinRequest,
  recordPlatformAvailability,
  recordPlatformPermissionEvent,
  rememberPlatformPrivateTarget,
  type CommunityJoinRequest
} from '@src/api/bot/notification-cache';
import type { NotificationTarget } from '@src/types/notification';

type AvailabilityObservation = Parameters<typeof recordPlatformAvailability>;
type PermissionObservation = Parameters<typeof recordPlatformPermissionEvent>;
type PrivateTargetObservation = Parameters<typeof observePlatformPrivateTarget>;
type CommunityFinish = Parameters<typeof finishCommunityNotification>;
type MemberWelcome = { target: NotificationTarget; memberId: string; observedAt: number; observedOnly: boolean };
type JoinRequest = { target: NotificationTarget; request: CommunityJoinRequest };
type Observation =
  | AvailabilityObservation
  | { permission: PermissionObservation }
  | { privateTarget: PrivateTargetObservation }
  | { communityFinish: CommunityFinish }
  | { welcome: MemberWelcome }
  | { joinRequest: JoinRequest };
type PendingObservation = { id: number; body: string; attempts: number };

const retryIntervalMs = 5000;
const retryDelay = (attempts: number) => Math.min(60_000, retryIntervalMs * 2 ** Math.min(attempts, 4));

export class PlatformObservationOutbox {
  private readonly live = new Set<number | bigint>();
  private timer?: ReturnType<typeof setTimeout>;
  private replay?: Promise<void>;
  private started = false;
  private generation = 0;
  private flushFailures = 0;

  constructor(
    private readonly path: string,
    private readonly scope = () => getNotificationBackendConfig().notificationQueueScope,
    private readonly now = Date.now
  ) {}

  private open(): DatabaseSync {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    closeSync(openSync(this.path, 'a', 0o600));
    chmodSync(this.path, 0o600);
    const db = new DatabaseSync(this.path);

    try {
      db.exec(`
        PRAGMA busy_timeout = 250;
        PRAGMA synchronous = FULL;
        PRAGMA secure_delete = ON;
        CREATE TABLE IF NOT EXISTS observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scope TEXT NOT NULL,
          body TEXT NOT NULL,
          retry_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        ) STRICT;
        CREATE INDEX IF NOT EXISTS observations_due ON observations(scope, retry_at, id);
      `);
    } catch (error) {
      db.close();
      throw error;
    }

    return db;
  }

  private scopeKey(scope = this.scope()): string {
    return createHash('sha256').update(scope).digest('hex');
  }

  recordAvailability(...observation: AvailabilityObservation): Promise<void> {
    return this.record(observation);
  }

  recordPermission(...observation: PermissionObservation): Promise<void> {
    return this.record({ permission: observation });
  }

  recordPrivateTarget(...observation: PrivateTargetObservation): Promise<void> {
    return this.record({ privateTarget: observation }, () => rememberPlatformPrivateTarget(...observation));
  }

  deferPrivateTarget(scope: string, ...observation: PrivateTargetObservation): void {
    this.save(this.scopeKey(scope), { privateTarget: observation });
  }

  recordMemberWelcome(target: NotificationTarget, memberId: string, observedAt: number, observedOnly: boolean): Promise<void> {
    return this.record({ welcome: { target, memberId, observedAt, observedOnly } });
  }

  recordJoinRequest(target: NotificationTarget, request: CommunityJoinRequest): Promise<void> {
    return this.record({ joinRequest: { target, request } });
  }

  recordCommunityFinish(scope: string, eventId: string, consumer: string, retry: boolean, deferred: boolean): Promise<void> {
    return this.record({ communityFinish: [eventId, consumer, retry, deferred, randomUUID()] }, undefined, this.scopeKey(scope));
  }

  private async record(observation: Observation, deliver?: () => Promise<void>, scope = this.scopeKey()): Promise<void> {
    let id: number | bigint;

    try {
      id = this.save(scope, observation);
    } catch (error) {
      if (Array.isArray(observation) || !('communityFinish' in observation)) {
        throw error;
      }
      logger.error('群通知确认无法落盘，继续提交原租约的确认', error);
      await this.send(observation, scope);

      return;
    }

    this.live.add(id);
    try {
      await (deliver ? deliver() : this.send(observation, scope));
      const db = this.open();

      try {
        db.prepare('DELETE FROM observations WHERE id = ?').run(id);
      } finally {
        db.close();
      }
    } finally {
      this.live.delete(id);
    }
  }

  private checkCommunityScope(scope: string): void {
    if (this.scopeKey() !== scope) {
      throw new Error('通知后端归属已变化，保留原群待补写记录');
    }
  }

  private async sendMemberWelcome(welcome: MemberWelcome, scope: string): Promise<void> {
    const { target, memberId, observedAt, observedOnly } = welcome;

    await recordPlatformAvailability(target, true, observedAt, memberId, observedOnly);
    this.checkCommunityScope(scope);
    const state = await readPlatformAvailability(target, memberId);

    this.checkCommunityScope(scope);
    if (state?.available && state.updatedAt <= observedAt) {
      await queueCommunityNotification(target, 'welcome', memberId, state.updatedAt, state.updatedAt);
    }
  }

  private async sendJoinRequest({ target, request }: JoinRequest, scope: string): Promise<void> {
    await recordCommunityJoinRequest(target, request);
    if (!request.autoApproved) {
      this.checkCommunityScope(scope);
      await queueCommunityNotification(target, 'request', request.id, request.observedAt);
    }
  }

  private send(observation: Observation, scope: string): Promise<void> {
    // Rows written by the availability-only queue are stored as arrays.
    if (Array.isArray(observation)) {
      return recordPlatformAvailability(...observation);
    }
    if ('privateTarget' in observation) {
      return observePlatformPrivateTarget(...observation.privateTarget);
    }
    if ('communityFinish' in observation) {
      this.checkCommunityScope(scope);

      return finishCommunityNotification(...observation.communityFinish).catch(error => {
        // A superseded lease cannot be finished by this consumer.
        const response = error as Error & { status?: number; code?: string };

        if (!(error instanceof Error) || error.name !== 'NotificationRequestError' || response.status !== 409 || response.code !== 'CONFLICT') {
          throw error;
        }
      });
    }
    if ('welcome' in observation) {
      return this.sendMemberWelcome(observation.welcome, scope);
    }
    if ('joinRequest' in observation) {
      return this.sendJoinRequest(observation.joinRequest, scope);
    }

    return recordPlatformPermissionEvent(...observation.permission);
  }

  private save(scope: string, observation: Observation): number | bigint {
    const db = this.open();

    try {
      return db
        .prepare('INSERT INTO observations(scope, body, retry_at) VALUES (?, ?, ?)')
        .run(scope, JSON.stringify(observation), this.now() + retryIntervalMs).lastInsertRowid;
    } finally {
      db.close();
    }
  }

  async flush(): Promise<void> {
    if (this.replay) {
      return this.replay;
    }
    if (!existsSync(this.path)) {
      return;
    }
    this.replay = this.replayDue();
    try {
      await this.replay;
    } finally {
      this.replay = undefined;
    }
  }

  private async replayDue(): Promise<void> {
    const scope = this.scopeKey();
    const generation = this.generation;
    const db = this.open();

    try {
      const rows = db
        .prepare('SELECT id, body, attempts FROM observations WHERE scope = ? AND retry_at <= ? ORDER BY retry_at, id LIMIT 32')
        .all(scope, this.now()) as PendingObservation[];
      const remove = db.prepare('DELETE FROM observations WHERE id = ?');
      const reschedule = db.prepare('UPDATE observations SET attempts = attempts + 1, retry_at = ? WHERE id = ?');
      const failures: unknown[] = [];

      for (const row of rows) {
        if (generation !== this.generation || scope !== this.scopeKey()) {
          break;
        }
        if (this.live.has(row.id)) {
          continue;
        }
        try {
          await this.send(JSON.parse(row.body) as Observation, scope);
        } catch (error) {
          reschedule.run(this.now() + retryDelay(row.attempts + 1), row.id);
          failures.push(error);
          const status = error instanceof Error && error.name === 'NotificationRequestError' ? (error as Error & { status?: number }).status : undefined;

          // A missing route or rejected record can coexist with healthy routes.
          // Stop this batch on dependency failures to keep recovery traffic bounded.
          if (status === undefined || ![400, 404, 409, 422].includes(status)) {
            break;
          }
          continue;
        }
        remove.run(row.id);
      }
      if (failures.length === 1) {
        throw failures[0];
      }
      if (failures.length > 1) {
        throw new AggregateError(failures, '多条通知平台事件补写失败');
      }
    } finally {
      db.close();
    }
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.started) {
      const generation = this.generation;

      this.timer = setTimeout(() => {
        void this.flush()
          .then(() => {
            this.flushFailures = 0;
          })
          .catch(error => {
            this.flushFailures++;
            logger.error('通知平台事件补写失败，保留待补写记录', error);
          })
          .finally(() => {
            if (generation === this.generation) {
              this.schedule();
            }
          });
      }, retryDelay(this.flushFailures));
      this.timer.unref?.();
    }
  }

  async stop(): Promise<void> {
    this.started = false;
    this.generation++;
    clearTimeout(this.timer);
    await this.replay?.catch(() => {});
  }
}

export const platformObservationOutbox = new PlatformObservationOutbox(resolve('data/notification-availability/observations.sqlite'));
