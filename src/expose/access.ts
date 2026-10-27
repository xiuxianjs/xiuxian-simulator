import { ExposeError, getCurrentEvent, type ExposeCallContext } from 'alemonjs';
import { assertChannelRobotEvent } from '../api/bot/config';
import { fetchBackendRobotIdentity } from '../api/bot/identity';
import { createBackendRequestContext } from '../api/bot/context';
import { normalizeRobotBid } from '../api/bot/robot-bid';
import { getAppConfig } from '../utils/appConfig';
import { isGameEventEnabled } from '../utils/eventPolicy';

/** 可选白名单限制框架识别的调用插件；不是模型参数或玩家 UID 授权。 */
export function authorizedEvent(context: ExposeCallContext) {
  const config = getAppConfig().expose;
  const event = getCurrentEvent();
  const allowed = config?.allowed_callers;

  if (
    (config !== undefined && (!config || typeof config !== 'object' || Array.isArray(config))) ||
    (config?.enabled !== undefined && config.enabled !== true) ||
    (allowed !== undefined && (!Array.isArray(allowed) || !allowed.every(item => typeof item === 'string' && item.length > 0 && item.trim() === item))) ||
    !context.callerApp ||
    (allowed !== undefined && !allowed.includes(context.callerApp)) ||
    !event ||
    !['message.create', 'private.message.create'].includes(event.name) ||
    event.Platform !== 'qq-bot' ||
    !isGameEventEnabled(event)
  ) {
    throw new ExposeError('FORBIDDEN', '当前调用方或消息事件未获修仙查询授权');
  }
  try {
    assertChannelRobotEvent(event);
    normalizeRobotBid(event.UserId);
  } catch {
    throw new ExposeError('FORBIDDEN', '当前平台身份不可用于修仙查询');
  }

  return event;
}

export async function currentPlayer(context: ExposeCallContext) {
  const event = authorizedEvent(context);
  const bid = normalizeRobotBid(event.UserId);

  context.signal.throwIfAborted();
  const request = { ...createBackendRequestContext(event), signal: context.signal };
  const identity = await fetchBackendRobotIdentity(bid, request);

  context.signal.throwIfAborted();
  if (identity.account.status !== 'registered' || !identity.account.playerId) {
    throw new ExposeError('FORBIDDEN', '当前平台账号尚未绑定游戏角色');
  }

  return { bid, uid: identity.account.playerId, request };
}

export function authorize(_input: unknown, context: ExposeCallContext) {
  authorizedEvent(context);

  return true;
}
