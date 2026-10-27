import { createHash } from 'node:crypto';
import { getBackendConfig } from '../api/bot/config';
import { logger, type Events } from 'alemonjs';
import { resolve } from 'node:path';
import { observeChatContacts, type ChatContact, type ChatContactObservation, type ChatGroup } from '@src/api/bot/chat';
import { ChatContactOutbox } from './chatContactOutbox';

const CACHE_TTL = 10 * 60_000;
const CACHE_LIMIT = 5000;
const keyOf = (item: { botId: string; openId: string }) => JSON.stringify([item.botId, item.openId]);

type CachedContact = ChatContact & { cachedAt: number };

/** Memory caches acknowledgements; every newer event is durably staged before
 * returning from the hook. HTTP is asynchronous and batched. */
export class ChatContactObserver {
  private groups = new Map<string, ChatGroup & { cachedAt: number }>();
  private contacts = new Map<string, CachedContact>();
  private timer?: ReturnType<typeof setTimeout>;
  private scheduledAt = 0;
  private running = false;
  private disposed = false;
  private retryDelay = 1000;
  private readonly outbox: ChatContactOutbox;

  constructor(
    private readonly send = observeChatContacts,
    private readonly now = Date.now,
    directory = resolve('data/robot-chat-outbox')
  ) {
    this.outbox = new ChatContactOutbox(directory);
  }

  start(): void {
    this.schedule(250);
  }

  snapshot(): ReadonlyArray<Readonly<CachedContact>> {
    return [...this.contacts.values()].filter(item => this.now() - item.cachedAt < CACHE_TTL).map(item => ({ ...item }));
  }

  snapshotGroups(): ReadonlyArray<Readonly<ChatGroup>> {
    return [...this.groups.values()].filter(item => this.now() - item.cachedAt < CACHE_TTL).map(item => ({ ...item }));
  }

  async observe(event: Events[keyof Events]): Promise<void> {
    if (
      event.name !== 'message.create' &&
      event.name !== 'private.message.create' &&
      event.name !== 'private.interaction.create' &&
      event.name !== 'interaction.create' &&
      event.name !== 'private.friend.add' &&
      event.name !== 'private.friend.remove' &&
      event.name !== 'member.add' &&
      event.name !== 'member.remove' &&
      event.name !== 'guild.join' &&
      event.name !== 'guild.exit' &&
      event.name !== 'private.notice.create' &&
      event.name !== 'notice.create'
    ) {
      return;
    }
    if (this.disposed || event.Platform !== 'qq-bot' || event.IsBot) {
      return;
    }
    const botId = event.Target?.BotId ?? event.BotId;
    const raw = event.value && typeof event.value === 'object' ? (event.value as Record<string, unknown>) : {};
    const permission =
      (event.name === 'private.notice.create' || event.name === 'notice.create') && event.Notice?.type === 'message-permission'
        ? event.Notice.enabled
        : undefined;
    const friend = event.name === 'private.friend.add' || event.name === 'private.friend.remove' || typeof permission === 'boolean';
    const message =
      event.name === 'message.create' ||
      event.name === 'private.message.create' ||
      event.name === 'private.interaction.create' ||
      event.name === 'interaction.create';
    const groupMember = event.name === 'member.add' || event.name === 'member.remove';
    const groupLifecycle = event.name === 'guild.join' || event.name === 'guild.exit';

    if (!friend && !message && !groupMember && !groupLifecycle) {
      return;
    }
    const scope = event.Target?.scope;
    const groupPermission = scope === 'group' && typeof permission === 'boolean';
    let kind: ChatContactObservation['kind'];
    let openId: string | undefined;

    if (groupPermission) {
      kind = permission ? 'group_allow' : 'group_block';
      openId = '';
    } else if (groupLifecycle && scope === 'group') {
      kind = event.name === 'guild.exit' ? 'group_exit' : 'group_join';
      openId = '';
    } else if (friend || (message && scope === 'c2c')) {
      kind = event.name === 'private.friend.remove' || permission === false ? 'removed' : 'private';
      openId = scope === 'c2c' ? event.Target?.targetId : (event.DirectUserId ?? (typeof raw.openid === 'string' ? raw.openid : event.UserId));
    } else if (scope === 'group' && (message || groupMember)) {
      kind = event.name === 'member.remove' ? 'group_leave' : 'group';
      // A group lifecycle operator is not the arriving member.
      openId = groupMember ? event.MemberId : (event.DirectUserId ?? event.UserId);
    } else {
      return;
    }
    if (!botId || (!openId && !groupLifecycle && !groupPermission)) {
      return;
    }
    const knownTime = Number.isSafeInteger(event.OccurredAt) && (event.OccurredAt ?? 0) > 0;

    const item: ChatContactObservation = {
      botId,
      openId: openId ?? '',
      bid: kind === 'group' && !groupMember ? (event.UserId ?? openId ?? '') : (openId ?? ''),
      kind,
      occurredAt: knownTime ? event.OccurredAt! : this.now(),
      groupSeen: kind === 'group',
      timeUnknown: !knownTime,
      ...(scope === 'group'
        ? { groupId: event.Target?.targetId, memberId: groupLifecycle || groupPermission ? '' : groupMember ? event.MemberId : event.UserId }
        : {}),
      ...(kind === 'group' && !groupMember && event.DirectUserId && event.UserId && event.DirectUserId !== event.UserId ? { aliasId: event.UserId } : {})
    };
    const cached = this.contacts.get(keyOf(item));

    if (
      cached &&
      (kind === 'private' || kind === 'removed') &&
      (item.occurredAt < cached.relationAt || (item.occurredAt === cached.relationAt && (kind !== 'removed' || cached.relationState !== 2)))
    ) {
      return;
    }
    // Cache hits still persist their newer timestamp. Batch them instead of
    // discarding evidence that a second instance or restart needs to see.
    await this.outbox.put(item);
    const cachedGroup = item.groupId && this.groups.has(JSON.stringify([item.botId, item.groupId]));

    this.schedule((cached || cachedGroup) && !friend && !groupMember && !groupLifecycle ? 5000 : 250);
  }

  private schedule(delay: number): void {
    if (this.running || this.disposed) {
      return;
    }
    const due = Date.now() + delay;

    if (this.timer && this.scheduledAt <= due) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.scheduledAt = due;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, delay);
    this.timer.unref?.();
  }

  async flush(): Promise<void> {
    if (this.running || this.disposed) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.running = true;
    let delay = 5000;

    try {
      const batch = await this.outbox.batch();

      if (!batch.length || this.disposed) {
        return;
      }
      const result = await this.send(batch.map(entry => entry.item));

      if (!Array.isArray(result?.items) || result.items.length !== batch.length) {
        throw new Error('好友感知回执不完整');
      }
      await this.outbox.acknowledge(batch);
      for (const { item } of batch) {
        if (item.kind === 'group_exit' || item.kind === 'group_join') {
          this.contacts.clear();
        }
        if (item.aliasId) {
          this.contacts.delete(keyOf({ botId: item.botId, openId: item.aliasId }));
        }
      }
      for (const item of result.items) {
        if (!item.openId) {
          continue;
        }
        const key = keyOf(item);

        this.contacts.delete(key);
        this.contacts.set(key, { ...item, cachedAt: this.now() });
      }
      while (this.contacts.size > CACHE_LIMIT) {
        this.contacts.delete(this.contacts.keys().next().value!);
      }
      for (const group of result.groups ?? []) {
        const key = JSON.stringify([group.botId, group.groupId]);

        this.groups.delete(key);
        this.groups.set(key, { ...group, cachedAt: this.now() });
      }
      while (this.groups.size > CACHE_LIMIT) {
        this.groups.delete(this.groups.keys().next().value!);
      }
      this.retryDelay = 1000;
      delay = 250;
    } catch (error) {
      logger.warn('好友状态异步上报失败，磁盘待同步记录保留并退避重试', error);
      delay = this.retryDelay;
      this.retryDelay = Math.min(60_000, this.retryDelay * 2);
    } finally {
      this.running = false;
      // Also discover pending records left by another process or a restart.
      this.schedule(delay);
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.outbox.idle();
    this.contacts.clear();
    this.groups.clear();
  }
}

let observer = new ChatContactObserver();

export const observeChatContact = (event: Events[keyof Events]) => observer.observe(event);
export const cachedChatContacts = () => observer.snapshot();
export const resetChatContactObserver = async () => {
  await observer.dispose();
  const config = getBackendConfig();
  const directory = config.channelMode
    ? resolve(
        'data/robot-chat-outbox',
        `channel-${createHash('sha256')
          .update(JSON.stringify([config.url, config.channelBotId]))
          .digest('hex')
          .slice(0, 24)}`
      )
    : resolve('data/robot-chat-outbox');

  observer = new ChatContactObserver(undefined, Date.now, directory);
  observer.start();
};
export const stopChatContactObserver = () => observer.dispose();

export const cachedChatGroups = () => observer.snapshotGroups();
