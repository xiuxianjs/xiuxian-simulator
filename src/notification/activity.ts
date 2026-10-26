import { logger, type Events } from 'alemonjs';
import { rememberPlatformGroupActivity, type NotificationGroupActivity } from '@src/api/bot/notification-cache';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { legacyNotificationTarget } from './delivery';
import { notificationChannel, refreshNotificationPermission } from './channel';

type Observation = { bid: string; activity: NotificationGroupActivity };
const pending = new Map<string, Observation>();
let running = 0;
const MAX_PENDING = 2000;
const CONCURRENCY = 4;

/** Observe all incoming messages, including messages that match no game command. */
export function observePlayerGroupActivity(event: Events[keyof Events]): void {
  if (event.name !== 'message.create' && event.name !== 'interaction.create') {
    return;
  }
  if (isPrivateEvent(event) || event.IsBot || !event.UserId) {
    return;
  }
  const botId = event.Target?.BotId ?? event.BotId;
  // QQ channels and private IDs must never be guessed to be group IDs.
  const target = event.Target
    ? { ...event.Target, platform: event.Platform, BotId: botId }
    : event.SpaceId?.startsWith('GROUP:') || event.Platform === 'onebot'
      ? legacyNotificationTarget(event.ChannelId, 'group', event.Platform, botId)
      : null;

  if (!target?.targetId || target.scope !== 'group' || !botId) {
    return;
  }
  const key = JSON.stringify([event.Platform, botId, event.UserId, target.targetId]);
  const occurredAt = Number.isSafeInteger(event.OccurredAt) && event.OccurredAt! > 0 ? event.OccurredAt! : Date.now();
  const previous = pending.get(key);

  if (previous && previous.activity.occurredAt >= occurredAt) {
    return;
  }
  if (!previous && pending.size >= MAX_PENDING) {
    logger.warn('玩家活动位置上报队列已满，等待后续群活动更新');

    return;
  }
  pending.set(key, { bid: event.UserId, activity: { target, occurredAt } });
  // The event hook never awaits HTTP. Bound concurrency and coalesce bursts
  // from the same account so a slow backend cannot accumulate requests.
  while (running < CONCURRENCY && pending.size > 0) {
    running++;
    void drain();
  }
}

async function drain(): Promise<void> {
  try {
    while (pending.size > 0) {
      const [key, observation] = pending.entries().next().value!;

      pending.delete(key);
      await (async () => {
        // Probe new/unknown group permissions off the event path. Reporting
        // still records raw activity when the platform cannot confirm a state.
        try {
          const state = await notificationChannel.read(observation.activity.target);

          if (!state || state.state === 'unknown') {
            await refreshNotificationPermission(observation.activity.target);
          }
        } catch (error) {
          logger.warn('群活动权限探测失败，发送前继续复核', error);
        }
        await rememberPlatformGroupActivity(observation.bid, observation.activity);
      })().catch(error => logger.error('玩家群活动位置上报失败', error));
    }
  } finally {
    running--;
  }
}
