import { takeRobotTaskInput } from './task-business-context';
import type { GameEvent } from '../../types/event';
import type { CaptchaMuteReplyClaimResult } from '../schemas/captcha-state';
import type { NewcomerGuideActionResult } from '../schemas/newcomer-guide';
import type { BackendPlayerEntryResult } from './player-entry';
import type { BackendRobotIdentity } from './identity';
import { seedEventBackendRobotIdentity } from './identity';
import { seedEventAccessFacts } from './access-facts';
import { BackendAPIError, requestBackend, writeContext } from './client';
import { createBackendRequestContext } from './context';

export type RobotMiddlewareInput = {
  messageText: string;
  platform: string;
  botId?: string;
  channelId?: string;
  privateTarget?: { platform: string; BotId?: string; scope: 'c2c' | 'direct'; targetId: string };
};
export type RobotMiddlewareNav = { current: number; total: number; count: number; command: string };
export type RobotMiddlewareReply = {
  nav?: RobotMiddlewareNav;
  rawLines?: string[];
  quote?: string;
  blocks?: Array<{ text: string; quoted: boolean; newline?: boolean; inlineButtons?: Array<{ label: string; command: string }> }>;
  title: string;
  heading: string;
  text: string;
  buttons: Array<{ label: string; command: string }>;
  advice: Array<{ command: string; description: string }>;
};
export type RobotTaskContinuation = {
  outcome: 'started' | 'expected' | 'next' | 'completed' | 'not_running' | 'invalid_runtime';
  command?: string;
  message?: string;
};
export type RobotMiddlewareResult = {
  outcome: 'allow' | 'reject' | 'handled';
  reason: 'ALLOWED' | 'UNREGISTERED' | 'MUTED' | 'MAINTENANCE' | 'GUIDE' | 'COMMAND_MAINTENANCE' | 'ENTRY_FAILED' | 'TASK' | 'TASK_ERROR' | 'TASK_UNMATCHED';
  identity: BackendRobotIdentity;
  replies: RobotMiddlewareReply[];
  contextWarnings: Array<'RECIPIENT_NOT_SAVED' | 'PRIVATE_TARGET_NOT_SAVED'>;
  mute?: CaptchaMuteReplyClaimResult;
  guide?: NewcomerGuideActionResult;
  entry?: BackendPlayerEntryResult;
  resourceSettlement?: string;
  taskContinuation?: RobotTaskContinuation;
};

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const textFields = (value: unknown, fields: string[]): boolean => record(value) && fields.every(field => typeof value[field] === 'string');

export const validMiddlewareNav = (value: unknown): value is RobotMiddlewareNav => record(value) &&
  Number.isSafeInteger(value.current) &&
  Number(value.current) >= 1 &&
  Number.isSafeInteger(value.total) &&
  Number(value.total) >= Number(value.current) &&
  Number.isSafeInteger(value.count) &&
  Number(value.count) >= 0 &&
  typeof value.command === 'string' &&
  value.command.includes('{page}');

const optionalTextFields = (value: unknown, fields: string[]): boolean => record(value) && fields.every(field => value[field] === undefined || typeof value[field] === 'string');

export function parseRobotMiddlewareResult(value: unknown, bid: string, requireReceipt = true, publicRead = false): RobotMiddlewareResult {
  const invalid = (): never => {
    throw new BackendAPIError('聚合中间件响应不完整', 'SDK_INVALID_RESPONSE');
  };

  if (!record(value) || !record(value.identity) || value.identity.bid !== bid || !record(value.identity.account)) {
    return invalid();
  }
  const account = value.identity.account;
  const registered = account.status === 'registered' && Number.isSafeInteger(account.playerId) && Number(account.playerId) > 0;
  const unregistered = account.status === 'unregistered' && account.playerId === null;

  if (!registered && !unregistered) {
    return invalid();
  }
  const allowedReasons: Record<string, string[]> = {
    allow: ['ALLOWED', 'UNREGISTERED'],
    reject: ['MUTED', 'MAINTENANCE', 'COMMAND_MAINTENANCE', 'ENTRY_FAILED', 'TASK_ERROR'],
    handled: ['GUIDE', 'TASK', 'TASK_UNMATCHED']
  };

  if (
    typeof value.outcome !== 'string' ||
    !['allow', 'reject', 'handled'].includes(value.outcome) ||
    typeof value.reason !== 'string' ||
    !allowedReasons[value.outcome]?.includes(value.reason)
  ) {
    return invalid();
  }
  if (value.outcome === 'allow' && (value.reason === 'UNREGISTERED') !== unregistered) {
    return invalid();
  }
  const task = value.taskContinuation;
  const taskReason = ['TASK', 'TASK_ERROR', 'TASK_UNMATCHED'].includes(String(value.reason));

  if ((task !== undefined || taskReason) && (requireReceipt || !registered)) {
    return invalid();
  }
  if (task !== undefined) {
    if (
      !record(task) ||
      Object.keys(task).some(key => !['outcome', 'command', 'message'].includes(key)) ||
      !['started', 'expected', 'next', 'completed', 'not_running', 'invalid_runtime'].includes(String(task.outcome)) ||
      !optionalTextFields(task, ['command', 'message']) ||
      (['started', 'expected', 'next'].includes(String(task.outcome)) && (typeof task.command !== 'string' || !task.command.trim()))
    ) {
      return invalid();
    }
    const advanced = ['next', 'completed'].includes(String(task.outcome));

    if (value.reason === 'TASK_ERROR' || (value.reason === 'TASK' ? advanced : !advanced)) {
      return invalid();
    }
  } else if (value.reason === 'TASK' || value.reason === 'TASK_UNMATCHED') {
    return invalid();
  }
  // The fallback renders these supplied facts instead of querying them again.
  if (
    value.mute !== undefined &&
    (!record(value.mute) || typeof value.mute.muted !== 'boolean' || typeof value.mute.claimed !== 'boolean' || typeof value.mute.muteUnlockTime !== 'string')
  ) {
    return invalid();
  }
  if (value.guide !== undefined) {
    const guide = value.guide;

    if (
      !record(guide) ||
      !['step-3', 'step-4', 'step-5', 'promotion-failed', 'completed', 'skipped', 'cleared'].includes(String(guide.action)) ||
      !textFields(guide.presentation, ['title', 'heading', 'text']) ||
      !record(guide.presentation) ||
      typeof guide.presentation.showActionBar !== 'boolean' ||
      !Array.isArray(guide.presentation.advice) ||
      !guide.presentation.advice.every(tip => textFields(tip, ['command', 'description']))
    ) {
      return invalid();
    }
  }
  if (value.entry !== undefined) {
    const entry = value.entry;

    if (
      !record(entry) ||
      !record(entry.maintenance) ||
      typeof entry.maintenance.disabled !== 'boolean' ||
      typeof entry.routeAllowed !== 'boolean' ||
      typeof entry.resourcesSettled !== 'boolean' ||
      typeof entry.nativeComebackProcessed !== 'boolean' ||
      (entry.processingError !== undefined && typeof entry.processingError !== 'string') ||
      !optionalTextFields(entry.maintenance, ['reason', 'endTime'])
    ) {
      return invalid();
    }
    if (
      entry.featureGuard !== undefined &&
      (!record(entry.featureGuard) ||
        typeof entry.featureGuard.blocked !== 'boolean' ||
        !optionalTextFields(entry.featureGuard, ['feature', 'reason', 'realmName']))
    ) {
      return invalid();
    }
  }
  if (
    !Array.isArray(value.replies) ||
    !value.replies.every(
      reply => record(reply) &&
        textFields(reply, ['title', 'heading', 'text']) &&
        (reply.nav === undefined || validMiddlewareNav(reply.nav)) &&
        (reply.rawLines === undefined ||
          (Array.isArray(reply.rawLines) &&
            reply.rawLines.length > 0 &&
            reply.rawLines.every(line => typeof line === 'string') &&
            reply.title === '' &&
            reply.heading === '' &&
            reply.text === '' &&
            reply.quote === undefined &&
            reply.blocks === undefined &&
            Array.isArray(reply.buttons) &&
            reply.buttons.length === 0 &&
            Array.isArray(reply.advice) &&
            reply.advice.length === 0)) &&
        optionalTextFields(reply, ['quote']) &&
        (reply.blocks === undefined ||
          (Array.isArray(reply.blocks) &&
            reply.blocks.every(
              block => record(block) &&
                typeof block.text === 'string' &&
                typeof block.quoted === 'boolean' &&
                (block.newline === undefined || typeof block.newline === 'boolean') &&
                (block.inlineButtons === undefined ||
                  (Array.isArray(block.inlineButtons) && block.inlineButtons.every(button => textFields(button, ['label', 'command']))))
            ))) &&
        Array.isArray(reply.buttons) &&
        reply.buttons.every(button => textFields(button, ['label', 'command'])) &&
        Array.isArray(reply.advice) &&
        reply.advice.every(tip => textFields(tip, ['command', 'description']))
    ) ||
    !Array.isArray(value.contextWarnings) ||
    !value.contextWarnings.every(warning => ['RECIPIENT_NOT_SAVED', 'PRIVATE_TARGET_NOT_SAVED'].includes(warning))
  ) {
    return invalid();
  }
  if (value.outcome === 'allow' && registered && !publicRead) {
    const entry = value.entry;

    if (
      !record(entry) ||
      entry.routeAllowed !== true ||
      !record(entry.maintenance) ||
      entry.maintenance.disabled !== false ||
      typeof entry.resourcesSettled !== 'boolean' ||
      typeof entry.nativeComebackProcessed !== 'boolean' ||
      entry.processingError !== undefined ||
      (requireReceipt && entry.resourcesSettled && value.resourceSettlement === undefined)
    ) {
      return invalid();
    }
  }
  if (
    value.resourceSettlement !== undefined &&
    (!registered || value.outcome !== 'allow' || typeof value.resourceSettlement !== 'string' || !/^[a-f0-9]{64}$/.test(value.resourceSettlement))
  ) {
    return invalid();
  }

  return value as unknown as RobotMiddlewareResult;
}

export function middlewareInputFromEvent(event: GameEvent): RobotMiddlewareInput {
  const platform = String(event.Platform ?? '');
  const botId = event.Target?.BotId ?? event.BotId;
  const input: RobotMiddlewareInput = {
    messageText: event.MessageText ?? '',
    platform,
    ...(botId ? { botId } : {}),
    ...(event.ChannelId ? { channelId: String(event.ChannelId) } : {})
  };
  const target = event.Target;

  if (target && (target.scope === 'c2c' || target.scope === 'direct')) {
    input.privateTarget = { platform, ...(botId ? { BotId: botId } : {}), scope: target.scope, targetId: target.targetId };
  } else if (event.DirectUserId) {
    input.privateTarget = { platform, ...(botId ? { BotId: botId } : {}), scope: 'c2c', targetId: String(event.DirectUserId) };
  } else if ((event.IsPrivate || event.name.startsWith('private.')) && platform === 'onebot') {
    input.privateTarget = { platform, ...(botId ? { BotId: botId } : {}), scope: 'c2c', targetId: event.UserId };
  }

  return input;
}

// Only combined endpoints accept task context. A later continuation/res cannot
// start a second task transition after the exact business has consumed it.
export function businessInputFromEvent(event: GameEvent): RobotMiddlewareInput & { taskInput?: string } {
  const input = middlewareInputFromEvent(event);
  const taskInput = takeRobotTaskInput(event);

  return taskInput === undefined ? input : { ...input, taskInput };
}

const entries = new WeakMap<object, { bid: string; pending: Promise<RobotMiddlewareResult> }>();

/** One raw-message request per event. Errors never probe, retry or fall back. */
export function getEventMiddlewareEntry(event: GameEvent): Promise<RobotMiddlewareResult> {
  const cached = entries.get(event);

  if (cached) {
    if (cached.bid !== event.UserId) {
      return Promise.reject(new BackendAPIError('中间件事件身份已变化', 'SDK_INVALID_RESPONSE'));
    }

    return cached.pending;
  }
  const pending = (async () => {
    const context = writeContext(createBackendRequestContext(event));
    const value = await requestBackend(event.UserId, 'post_robot_middleware_entry', { body: middlewareInputFromEvent(event), ...context });
    const result = parseRobotMiddlewareResult(value, event.UserId);

    seedEventBackendRobotIdentity(event, result.identity);
    const uid = result.identity.account.playerId;

    if (uid !== null) {
      event.uid = uid;
      seedEventAccessFacts(event, event.UserId, uid, result.resourceSettlement ? { resourceSettlement: result.resourceSettlement } : {});
    } else {
      delete (event as Partial<GameEvent>).uid;
    }

    return result;
  })();

  entries.set(event, { bid: event.UserId, pending });

  return pending;
}
