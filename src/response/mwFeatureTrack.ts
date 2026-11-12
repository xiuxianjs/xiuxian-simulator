import { canTrackFeature, setTrackContext, trackFeatureEvent } from '@src/analytics';
import { fetchBackendRobotIdentity } from '@src/api/bot/identity';
import { getCurrentEvent } from 'alemonjs';
import { transportEventOffset } from '@src/utils/transportTiming';
import type { GameEvent } from '@src/types/event';

const featureContext = (event: GameEvent) => ({
  appid: event.Platform === 'qq-bot' ? String(event.BotId ?? '') : '',
  scene: (event.isPrivate ?? false) ? 'private' : 'public',
  channelId: String(event.ChannelId ?? ''),
  platform: String(event.Platform ?? 'unknown')
});

function featureElapsed(event: GameEvent, startedAt?: number): number {
  const elapsed = transportEventOffset(event) ?? transportEventOffset(getCurrentEvent()) ?? (startedAt === undefined ? 0 : performance.now() - startedAt);

  return Math.max(0, Math.round(elapsed));
}

/** Consume the aggregate identity; game addresses are saved by middleware-entry. */
export default function trackFeature(event: GameEvent, success = true, startedAt?: number, uid = event.uid) {
  const trackCtx = featureContext(event);

  setTrackContext(trackCtx);
  const commandText = event.MessageText ?? '';

  if (commandText.trim() && Number.isSafeInteger(uid) && uid > 0) {
    trackFeatureEvent(event.UserId, uid, commandText, featureElapsed(event, startedAt), success, trackCtx);
  }

  return true;
}

/** Local commands and completed registration do not return an aggregate player ID. */
export function trackFeatureWithIdentity(event: GameEvent, success: boolean, startedAt?: number): void {
  const context = featureContext(event);
  const command = event.MessageText ?? '';

  if (!canTrackFeature(command, context)) {
    return;
  }
  const elapsed = featureElapsed(event, startedAt);

  void fetchBackendRobotIdentity(event.UserId)
    .then(({ account }) => {
      if (account.playerId !== null) {
        trackFeatureEvent(event.UserId, account.playerId, command, elapsed, success, context);
      }
    })
    .catch(() => {
      // Identity resolution for analytics must not affect command handling.
    });
}

/** Reuse an authenticated UID, or resolve it independently of the business response. */
export function trackFeatureOutcome(event: GameEvent, success: boolean, startedAt?: number): void {
  if (Number.isSafeInteger(event.uid) && event.uid > 0) {
    trackFeature(event, success, startedAt);
  } else {
    trackFeatureWithIdentity(event, success, startedAt);
  }
}
