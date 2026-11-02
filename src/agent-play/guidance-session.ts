import { type MessageReceipt, getCurrentEvent } from 'alemonjs';
type Scope = { Platform?: string; BotId?: string; ChannelId?: string; UserId?: string };
export type GameOffer = {
  optionalBind?: string[];
  retryPolicy?: 'original' | 'lookup';
  decisionNotice?: string;
  businessCancellation?: boolean;
  notice?: string;
  arguments?: Record<string, string | number>;
  action: string;
  reference: string;
  label: string;
  messageId: string;
  shown: boolean;
  submitted: boolean;
};
type Session = {
  lastGameMessageId?: string;
  replyReferences?: string[];
  offers?: GameOffer[];
  receipts?: string[];
  mode?: 'guidance' | 'gameplay';
  registrationName?: string;
  narrator: string;
  state: unknown;
  updated: number;
  exchanges: string[];
};
const sessions = new Map<string, Session>();
const key = (event: Scope) => JSON.stringify([event.Platform, event.BotId, event.ChannelId, event.UserId]);

export function guidanceSession(event: Scope = getCurrentEvent() ?? {}): Session | undefined {
  const id = key(event);
  const session = sessions.get(id);

  if (session && Date.now() - session.updated > 30 * 60_000) {
    sessions.delete(id);

    return undefined;
  }

  return session;
}
export function rememberGuidance(state: unknown, narrator = '系统'): void {
  const event = getCurrentEvent();

  if (!event?.UserId) {
    return;
  }
  const id = key(event);
  const previous = guidanceSession(event);

  sessions.delete(id);
  sessions.set(id, {
    lastGameMessageId: event.MessageId,
    replyReferences: previous?.replyReferences,
    offers: previous?.offers,
    receipts: previous?.receipts,
    mode: previous?.mode ?? 'guidance',
    registrationName: (state as { accountExists?: boolean })?.accountExists ? undefined : previous?.registrationName,
    narrator,
    state,
    updated: Date.now(),
    exchanges: previous?.exchanges ?? []
  });
  if (sessions.size > 1000) {
    sessions.delete(sessions.keys().next().value!);
  }
}
export function noteGuidance(text: string, event: Scope = getCurrentEvent() ?? {}): void {
  const session = guidanceSession(event);

  if (!session) {
    return;
  }
  session.updated = Date.now();
  session.exchanges.push(text.slice(0, 2000));
  session.exchanges = session.exchanges.slice(-8);
}
export function endGuidance(event: Scope): void {
  sessions.delete(key(event));
}

export function rememberRegistrationName(name: string): void {
  const session = guidanceSession();

  if (session) {
    session.registrationName = name;
    noteGuidance('服务端已核对道号：' + name + '；尚未创建角色，等待玩家选择性别。');
  }
}

export function isGuidanceRequest(text: string): boolean {
  return !/^\s*[/#!！＃]/u.test(text) && (Boolean(guidanceSession()) || /修仙|道号|序章|新手引导|登记角色|注册角色|带我修行/u.test(text));
}

// Conversation context only. Original provider receipts remain authoritative;
// large results must be queried again instead of storing a truncated payload.
export function rememberGameplay(action: string, result: unknown, narrator = '系统'): void {
  const previous = guidanceSession();

  if (!previous) {
    rememberGuidance({ protocol: 'plugin-play.v1', action }, narrator);
  }
  const session = guidanceSession();

  if (!session) {
    return;
  }
  session.mode = 'gameplay';
  session.lastGameMessageId = getCurrentEvent()?.MessageId;
  const serialized = JSON.stringify(result) ?? 'null';

  const receipt = JSON.stringify({
    action,
    receipt: serialized.length <= 12000 ? result : { omitted: true, reason: '结果较大，后续操作前重新查询对应玩法。' }
  });

  session.receipts = [...(session.receipts ?? []), receipt];
  while (session.receipts.length > 8 || session.receipts.join('').length > 16000) {
    session.receipts.shift();
  }
  noteGuidance(`玩法回执：${action}，具体结果见工具回执数据。`);
}

/** Delivered game reply identities only; never a business authorization. */
export function rememberGameReply(receipt: MessageReceipt, event: Scope = getCurrentEvent() ?? {}): void {
  const session = guidanceSession(event);

  if (!session || !receipt?.id) {
    return;
  }
  session.replyReferences = [
    ...new Set([...(session.replyReferences ?? []), receipt.id, receipt.referenceId].filter((id): id is string => typeof id === 'string' && Boolean(id)))
  ].slice(-32);
}

export function gameConversationContinuation() {
  const session = guidanceSession();
  const state = session?.state as { flow?: string; dialogue?: { choices?: unknown[] } } | undefined;

  return {
    active: Boolean(session),
    ...(typeof state?.flow === 'string' ? { flow: state.flow } : {}),
    hasNameDraft: Boolean(session?.registrationName),
    choices: (state?.dialogue?.choices ?? []).filter((choice): choice is string => typeof choice === 'string').slice(0, 32)
  };
}
