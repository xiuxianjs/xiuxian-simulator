import { sha256Hex } from '../../src/api/bot/hash';

export type BackendRequestContext = { requestId: string; idempotencyKey?: string };

type MessageEventIdentity = {
  Platform?: string;
  BotId?: string;
  UserId?: string;
  InteractionId?: string;
  MessageId?: string;
};

export function createBackendRequestContext(event: MessageEventIdentity): BackendRequestContext {
  const eventId = String(event.InteractionId ?? '').trim() || String(event.MessageId ?? '').trim();
  const requestId = sha256Hex(JSON.stringify([event.Platform ?? '', event.BotId ?? '', event.UserId ?? '', eventId]));

  return eventId ? { requestId, idempotencyKey: requestId } : { requestId };
}
