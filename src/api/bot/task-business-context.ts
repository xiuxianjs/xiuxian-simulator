import type { GameEvent } from '../../types/event';

// Request metadata belongs to this original event. Replies remain in __res only
// immediately before the hook's parent next; no task reply is cached here.
const contexts = new WeakMap<GameEvent, { input: string; consumed: boolean; compatibilityBlocked?: boolean; isPrivate: boolean | undefined }>();

export function setRobotTaskInput(event: GameEvent, input: string): void {
  contexts.set(event, { input, consumed: false, isPrivate: event.isPrivate });
}

export function hasPendingRobotTaskInput(event: GameEvent): boolean {
  const context = contexts.get(event);

  return context !== undefined && !context.consumed;
}

export function takeRobotTaskInput(event: GameEvent): string | undefined {
  const context = contexts.get(event);

  if (!context || context.consumed) {
    return undefined;
  }
  context.consumed = true;

  return context.input;
}

export function markRobotTaskCompatibilityBlocked(event: GameEvent): void {
  const context = contexts.get(event);

  if (context) {
    context.compatibilityBlocked = true;
  }
}

export function isRobotTaskCompatibilityBlocked(event: GameEvent): boolean {
  return contexts.get(event)?.compatibilityBlocked === true;
}

// Task-only bubbles originally appeared before mwBan set display flags. Keep
// that presentation snapshot without replacing the original event used by next.
export function robotTaskPresentationEvent(event: GameEvent): GameEvent {
  const context = contexts.get(event);

  return context && context.isPrivate !== event.isPrivate ? { ...event, isPrivate: context.isPrivate } : event;
}
