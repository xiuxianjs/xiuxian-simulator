import type { GameEvent } from '@src/types/event';
import { setTrackContext, trackFeatureEvent } from '@src/analytics';

/** Consume the aggregate identity; game addresses are saved by middleware-entry. */
export default (event: GameEvent) => {
  const trackCtx = {
    scene: (event.isPrivate ?? false) ? 'private' : 'public',
    channelId: String(event.ChannelId ?? ''),
    platform: String(event.Platform ?? 'unknown')
  };

  setTrackContext(trackCtx);
  const commandText = event.MessageText ?? '';

  if (commandText.trim() && Number.isSafeInteger(event.uid) && event.uid > 0) {
    void trackFeatureEvent(event.UserId, event.uid, commandText, Date.now(), true, trackCtx);
  }

  return true;
};
