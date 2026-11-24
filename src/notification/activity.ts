import { logger, type Events } from 'alemonjs';
import { rememberPlatformGroupActivity, type NotificationGroupActivity } from '@src/api/bot/notification-cache';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { legacyNotificationTarget } from './delivery';

type Observation = { bid: string; activity: NotificationGroupActivity };
const pending = new Map<string, Observation>();
const inFlight = new Map<string, Observation>();
let resumeTimer: ReturnType<typeof setTimeout> | undefined;
let recovering = false;
let observing = false;
const MAX_PENDING = 2000;
const CONCURRENCY = 4;
const RETRY_INITIAL_MS = 5_000;
const RETRY_MAX_MS = 60_000;
let retryDelay = RETRY_INITIAL_MS;

export function startPlayerGroupActivityObserver(): void {
  observing = true;
}

export function stopPlayerGroupActivityObserver(): void {
  observing = false;
  clearTimeout(resumeTimer);
  resumeTimer = undefined;
  recovering = false;
  retryDelay = RETRY_INITIAL_MS;
  pending.clear();
  inFlight.clear();
}

function startDraining(): void {
  if (!observing || resumeTimer !== undefined) {
    return;
  }
  const capacity = recovering ? 1 : CONCURRENCY;

  for (const [key, observation] of pending) {
    if (inFlight.size >= capacity) {
      break;
    }
    if (inFlight.has(key)) {
      continue;
    }
    pending.delete(key);
    inFlight.set(key, observation);
    void report(key, observation, recovering);
  }
}

function pauseDraining(error: unknown): void {
  recovering = true;
  const jitter = Math.floor(retryDelay * 0.25);
  const wait = Math.min(retryDelay, RETRY_MAX_MS - jitter) + Math.floor(jitter * Math.random());

  retryDelay = Math.min(RETRY_MAX_MS, retryDelay * 2);
  resumeTimer = setTimeout(() => {
    resumeTimer = undefined;
    startDraining();
  }, wait);
  resumeTimer.unref?.();
  logger.warn('通知缓存暂时不可用，暂停玩家群活动上报', error);
}

/** Observe all incoming messages, including messages that match no game command. */
export function observePlayerGroupActivity(event: Events[keyof Events]): void {
  if (!observing || (event.name !== 'message.create' && event.name !== 'interaction.create')) {
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
  const sending = inFlight.get(key);

  if (Math.max(previous?.activity.occurredAt ?? 0, sending?.activity.occurredAt ?? 0) >= occurredAt) {
    return;
  }
  if (!previous && pending.size + inFlight.size >= MAX_PENDING) {
    logger.warn('玩家活动位置上报队列已满，等待后续群活动更新');

    return;
  }
  pending.set(key, { bid: event.UserId, activity: { target, occurredAt } });
  // The event hook never awaits HTTP. Bound concurrency and coalesce bursts
  // from the same account so a slow backend cannot accumulate requests.
  startDraining();
}

async function report(key: string, observation: Observation, recoveryProbe: boolean): Promise<void> {
  let retry = false;

  try {
    await rememberPlatformGroupActivity(observation.bid, observation.activity);
  } catch (error) {
    if (inFlight.get(key) !== observation) {
      return;
    }
    const status = (error as { status?: number } | undefined)?.status;

    retry = status === undefined || status === 429 || status >= 500;
    if (retry) {
      // A replacement observed during this request is already queued.
      if (!pending.has(key)) {
        pending.set(key, observation);
      }
      // Late completions from the old concurrent batch cannot restart backoff.
      if (!recovering || recoveryProbe) {
        pauseDraining(error);
      }
    } else {
      logger.error('玩家群活动位置上报失败', error);
    }
  } finally {
    if (inFlight.get(key) === observation) {
      if (recoveryProbe && !retry) {
        recovering = false;
        retryDelay = RETRY_INITIAL_MS;
      }
      inFlight.delete(key);
      startDraining();
    }
  }
}
