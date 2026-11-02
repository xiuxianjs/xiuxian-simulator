import { getCurrentEvent } from 'alemonjs';

// Ephemeral presentation invalidation only; never gameplay state or authorization.
const progress = new Map<string, object>();

function key(): string | undefined {
  const event = getCurrentEvent();

  return event?.Platform && event.UserId ? JSON.stringify([event.Platform, event.BotId ?? '', event.UserId]) : undefined;
}
export function advanceGamePresentation(): void {
  const id = key();

  if (!id) {
    return;
  }
  progress.delete(id);
  progress.set(id, {});
  if (progress.size > 10000) {
    progress.delete(progress.keys().next().value!);
  }
}
export function captureGamePresentation(): () => boolean {
  const id = key();
  const initial = id ? progress.get(id) : undefined;

  return () => Boolean(id && progress.get(id) !== initial);
}
