import { parseRobotFlyMailHome } from './fly-mail-queries';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { FlyMailScope } from '../schemas/fly-mail-query';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('飞信发送接口响应不完整');
  }

  return value as RecordValue;
}

export async function sendBackendFlyMail(params: {
  bid: string | undefined;
  uid: number;
  scope: FlyMailScope | 'world';
  content: string;
  targetUid?: number;
  request?: BackendRequestContext;
}): Promise<{ message: string }> {
  if (!params.bid?.trim() || !Number.isSafeInteger(params.uid) || params.uid <= 0) {
    throw new Error('飞信发送缺少平台身份');
  }
  if (!['friend', 'master', 'guild', 'companion', 'team', 'world'].includes(params.scope) || typeof params.content !== 'string') {
    throw new Error('飞信发送参数无效');
  }
  if (params.targetUid !== undefined && (!Number.isSafeInteger(params.targetUid) || params.targetUid < 0)) {
    throw new Error('飞信发送目标参数无效');
  }
  const data = record(
    await requestBackend(params.bid, 'post_players_id_flymail', {
      path: { id: params.uid },
      body: {
        scope: params.scope,
        content: params.content,
        ...(params.targetUid ? { targetUid: params.targetUid } : {})
      },
      ...writeContext(params.request)
    })
  );

  return parseBackendFlyMailSend(data);
}

export function parseBackendFlyMailSend(value: unknown) {
  const data = record(value);

  if (data.success !== true || typeof data.message !== 'string' || !data.message) {
    throw new Error('飞信发送接口响应不完整');
  }

  return { message: data.message };
}

// History is optional: a committed send remains successful even if the optional
// view is unavailable or an older service only returns the confirmation.
export function parseRobotFlyMailSend(value: unknown) {
  const result = parseBackendFlyMailSend(value);
  let chat: { targetUid: number; history: ReturnType<typeof parseRobotFlyMailHome> } | undefined;

  try {
    const data = record(value);

    if (data.chat !== undefined && data.chat !== null) {
      const view = record(data.chat);
      const conversationId = view.conversationId;
      const targetUid = view.targetUid;

      if (
        typeof conversationId !== 'number' ||
        !Number.isSafeInteger(conversationId) ||
        conversationId <= 0 ||
        typeof targetUid !== 'number' ||
        !Number.isSafeInteger(targetUid) ||
        targetUid <= 0
      ) {
        throw new Error('飞信会话数据不完整');
      }
      const history = parseRobotFlyMailHome(view.history, 'friend');

      if (!history.list.length || history.list.some(item => item.conversationId !== conversationId)) {
        throw new Error('飞信会话数据不完整');
      }
      chat = { targetUid, history };
    }
  } catch {
    // Do not expose records from an invalid conversation or invite a duplicate send.
  }

  const data = record(value);
  const positive = (value: unknown) => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined);

  return { ...result, chat, targetUid: positive(data.targetUid), conversationId: positive(data.conversationId) };
}
