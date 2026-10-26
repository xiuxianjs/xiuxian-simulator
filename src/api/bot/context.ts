import { randomUUID } from 'node:crypto';
import { sha256Hex } from './hash';

export type BackendRequestContext = { requestId: string; idempotencyKey?: string };

type MessageEventIdentity = {
  Platform?: string;
  BotId?: string;
  UserId?: string;
  InteractionId?: string;
  MessageId?: string;
};

export function createBackendRequestContext(event: MessageEventIdentity, operation?: string): BackendRequestContext {
  const eventId = String(event.InteractionId ?? '').trim() || String(event.MessageId ?? '').trim();
  const requestId = sha256Hex(JSON.stringify([event.Platform ?? '', event.BotId ?? '', event.UserId ?? '', eventId]));

  // Multiple writes from one platform message share a server scope. An explicit
  // operation keeps their keys distinct while each write still replays stably.
  const idempotencyKey = operation ? sha256Hex(JSON.stringify([requestId, operation])) : requestId;

  return eventId ? { requestId, idempotencyKey } : { requestId };
}

// A scheduled read is a new observation, not a retry of its originating message.
// Use only for server-registered read operations; gameplay writes remain tied to
// the real platform message identity.
export function createBackendReadRequestContext(): BackendRequestContext {
  const requestId = randomUUID();

  return { requestId, idempotencyKey: requestId };
}

// Diagnostics never participate in HTTP identity, replay keys or game state.
type DiagnosticEventKind = 'message' | 'interaction' | 'unknown';

type EventDiagnosticContext = { eventTraceId: string; commandKey: string; eventKind: DiagnosticEventKind };

const diagnosticEvents = new WeakMap<object, EventDiagnosticContext>();

export function getEventTransportDiagnosticContext(event: object | undefined): EventDiagnosticContext | undefined {
  if (!event) {
    return undefined;
  }
  const cached = diagnosticEvents.get(event);

  if (cached) {
    return cached;
  }
  const text = 'MessageText' in event && typeof event.MessageText === 'string' ? event.MessageText.trim() : '';
  // Emit only these fixed categories, never raw text, arguments or identities.
  const commandKey = /^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+\d+)|(?:\s+p\d+))?$/.test(text)
    ? 'storyline.list'
    : /^(!|！|\/|#|＃)?商店(?:\s|$)/.test(text)
      ? 'shop.list'
      : /^(!|！|\/|#|＃)?(?:我|我的信息|我的资料|我的编号|我的控制台|个人信息|个人资料|个人编号|个人控制台)$/.test(text)
        ? 'home.overview'
        : /^(!|！|\/|#|＃)?我的功法(?:\s|$)/.test(text)
          ? 'skill-books.learned'
          : 'unknown';
  // Standard FormatEvent names distinguish inputs without logging raw IDs or data.
  const name = 'name' in event ? event.name : undefined;
  const eventKind: DiagnosticEventKind =
    name === 'message.create' || name === 'private.message.create'
      ? 'message'
      : name === 'interaction.create' || name === 'private.interaction.create'
        ? 'interaction'
        : 'unknown';
  const value = { eventTraceId: randomUUID(), commandKey, eventKind };

  diagnosticEvents.set(event, value);

  return value;
}
