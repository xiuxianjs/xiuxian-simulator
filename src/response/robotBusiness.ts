import { withBountyContinuation } from './bountyRecovery';
import { withTribulationRecovery } from '@src/response-apps/tribulation/recovery';
import { getCommandBusinessErrorMessage } from '@src/utils/commandError';
import { measureTransportStage, measureTransportStageSync, transportCheckpoint } from '@src/utils/transportTiming';
import { platform, useMode } from '@alemonjs/qq-bot';
import { hasPendingRobotTaskInput, markRobotTaskCompatibilityBlocked } from '@src/api/bot/task-business-context';
import { logger, type Next } from 'alemonjs';
import { requestRobotBusiness, isRobotPublicEntry, type RobotBusinessOperation, type RobotBusinessResult } from '@src/api/bot/robot-business';
import type { RobotBusinessFollowup } from '@src/api/bot/robot-business';
import { seedEventBackendRobotIdentity } from '@src/api/bot/identity';
import type { GameEvent } from '@src/types/event';
import type { BackendRequestContext } from '@src/api/bot/context';
import { presentMiddlewareReply, sendMiddlewareReply } from './middlewareReply';
import trackFeature from './mwFeatureTrack';
import compatibility from './mwBan';
import { sendShortcut } from './task/views';
import { withBusinessRecovery } from './businessRecovery';
import type { BusinessFeedbackRenderer } from './feedbackRenderer';

export async function runRobotBusiness<T>(
  event: GameEvent,
  operation: RobotBusinessOperation,
  args: Record<string, unknown>,
  decode: (data: unknown, uid: number) => T,
  parentNext: Next,
  renderFeedback?: BusinessFeedbackRenderer,
  request?: BackendRequestContext
): Promise<{ handled: true } | ({ handled: false; data: T } & RobotBusinessFollowup)> {
  const publicEntry = isRobotPublicEntry(operation) || operation === 'tasks.continue';

  if (!publicEntry && (await interceptTaskCompatibility(event, parentNext))) {
    return { handled: true };
  }

  if (!publicEntry && compatibility(event) !== true) {
    return { handled: true };
  }

  let result: RobotBusinessResult<T>;

  try {
    result = await requestRobotBusiness(event, operation, args, decode, request);
  } catch (error) {
    const text = getCommandBusinessErrorMessage(error);

    if (text === undefined) {
      throw error;
    }
    // HTTP business rejections have no envelope/identity to finish. Present the
    // authoritative reason once before entry-local generic fallbacks can hide it.
    const reply = withTribulationRecovery(
      operation,
      args,
      withBountyContinuation(operation, args, withBusinessRecovery(operation, { title: '操作未完成', heading: '', text, buttons: [], advice: [] }))
    );

    if (
      renderFeedback &&
      (['tribulation.command', 'tribulation.public'].includes(operation) ||
        (['skill-books.wudao', 'soul-artifacts.grade-upgrade'].includes(operation) && renderFeedback.preservesAdvice))
    ) {
      await renderFeedback(reply);
    } else {
      await sendMiddlewareReply(event, reply, 'footer');
    }

    return { handled: true };
  }

  if (!result.success && result.branch === 'business' && result.middleware.replies.length) {
    const index = result.middleware.replies.length - 1;

    result.middleware.replies[index] = withTribulationRecovery(
      operation,
      args,
      withBountyContinuation(operation, args, withBusinessRecovery(operation, result.middleware.replies[index]))
    );
  }

  return finishRobotBusiness(event, result, parentNext, renderFeedback, !publicEntry, operation);
}

export async function finishRobotBusiness<T>(
  event: GameEvent,
  result: RobotBusinessResult<T>,
  parentNext: Next,
  renderFeedback?: BusinessFeedbackRenderer,
  trackCommand = true,
  operation: RobotBusinessOperation | '' = ''
): Promise<{ handled: true } | ({ handled: false; data: T } & RobotBusinessFollowup)> {
  transportCheckpoint(`middleware.result.${result.success ? 'success' : 'failure'}.${result.branch}.${result.middleware.reason}`, event);
  const uid = result.middleware.identity.account.playerId;

  if (uid !== null) {
    event.uid = uid;
  } else {
    delete (event as Partial<GameEvent>).uid;
  }
  measureTransportStageSync('middleware.identity.seed', () => seedEventBackendRobotIdentity(event, result.middleware.identity), event);
  if (trackCommand) {
    measureTransportStageSync('middleware.feature.track', () => trackFeature(event), event);
  }
  if (result.middleware.contextWarnings.length) {
    logger.warn('业务请求平台地址未保存', result.middleware.contextWarnings);
  }
  const task = result.middleware.taskContinuation;

  if (task?.outcome === 'next' && task.command) {
    sendShortcut(event, task.command);
  }
  if (result.success && result.branch === 'middleware') {
    // This is the original callback event, not useEvent().current's shallow copy.
    // Only this branch stores a result, immediately before the parent res next.
    event.__res = result;
    transportCheckpoint('middleware.parent.next', event);
    parentNext();

    return { handled: true };
  }
  const guard = result.middleware.entry?.featureGuard;

  if (!result.success && result.branch === 'middleware' && result.middleware.reason === 'ENTRY_FAILED' && guard?.blocked) {
    const refusal = withBusinessRecovery('realm.overview', {
      title: '功能未解锁',
      heading: '',
      text: `境界条件未满足：${guard.reason ?? '当前境界尚未达到该功能要求'}；当前境界：${guard.realmName ?? '未知境界'}。`,
      buttons: [{ label: '我的境界', command: '/我的境界' }],
      advice: []
    });

    if (result.middleware.replies.length) {
      result.middleware.replies[result.middleware.replies.length - 1] = refusal;
    } else {
      result.middleware.replies.push(refusal);
    }
  }
  for (const [index, reply] of result.middleware.replies.entries()) {
    // A completed business refusal appends its own feedback after pre-notices.
    // Keep the original business bubble's default navigation on that reply.
    const businessFeedback = !result.success && result.branch === 'business' && index === result.middleware.replies.length - 1;

    // Structured advice must use a renderer that preserves descriptions and actions.
    const immediateAlchemy = operation.startsWith('alchemy.') && reply.title === '炼丹' && reply.buttons.some(button => button.command.startsWith('/炼丹'));

    if (businessFeedback && renderFeedback && !immediateAlchemy && !reply.rawLines && (!reply.advice.length || renderFeedback.preservesAdvice)) {
      await measureTransportStage('middleware.feedback.render', () => renderFeedback(presentMiddlewareReply(reply)), event);
    } else {
      await measureTransportStage(
        'middleware.reply.render',
        () => sendMiddlewareReply(event, reply, immediateAlchemy || businessFeedback ? 'footer' : false),
        event
      );
    }
  }
  if (!result.success) {
    return { handled: true };
  }

  return {
    handled: false,
    data: result.data,
    ...(result.onboarding ? { onboarding: result.onboarding } : {}),
    ...(result.onboardingPending ? { onboardingPending: true } : {})
  };
}

// Original task transition preceded QQ-guild compatibility. Complete that
// transition in one terminal request, then let the original local fallback reply.
export async function interceptTaskCompatibility(event: GameEvent, parentNext: Next): Promise<boolean> {
  if (!hasPendingRobotTaskInput(event) || event.Platform !== platform || !useMode(event)('guild')) {
    return false;
  }
  markRobotTaskCompatibilityBlocked(event);
  const result = await requestRobotBusiness(event, 'tasks.continue', {}, () => {
    throw new Error('任务终端动作不能返回业务分支');
  });

  await finishRobotBusiness(event, result, parentNext, undefined, false);

  return true;
}
