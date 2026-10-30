import { Expose, ExposeError, type ExposeReadonly, type ExposeValueSchema } from 'alemonjs';
import { authorizedEvent } from './access';
import { boolean, integer, list, object, project, text } from './schema';
import { guideSchema, projectGuideReceipt } from './guide-receipt';
import { onboardingSchema } from './onboarding-schema';
import { createBackendRequestContext } from '../api/bot/context';
import { requestBackend, writeContext } from '../api/bot/client';
import { middlewareInputFromEvent } from '../api/bot/middleware-entry';
import { isRobotPublicEntry, parseRobotBusinessEnvelope, type RobotBusinessOperation } from '../api/bot/robot-business';
import { invalidateEventBackendRobotIdentity } from '../api/bot/identity';
import { invalidateEventCommandEntry } from '../api/bot/command-entry';
import type { GameEvent } from '../types/event';

const button = object({ label: text, command: text });

export const intentIdSchema = {
  type: 'string' as const,
  minLength: 1,
  maxLength: 64,
  description: '同一原始消息内新操作使用不同编号；重试同一次操作沿用原编号。只能包含英文字母、数字、下划线或连字符。跨消息或结果不明时先核对服务端状态。'
};
export const taskInputSchema = {
  type: 'string' as const,
  minLength: 1,
  maxLength: 200,
  description:
    '连锁任务当前步骤的完整指令，须与本操作和参数一致。服务端先推进任务再执行业务；分别检查 taskContinuation、success、branch 和 result。结果不明时先核对任务及业务状态。'
};

export function validateIntentId(intentId: string | undefined) {
  if (intentId !== undefined && !/^[A-Za-z0-9_-]{1,64}$/.test(intentId)) {
    throw new ExposeError('INVALID_INPUT', 'intentId 只能包含英文字母、数字、下划线或连字符');
  }
}

export function taskAliasCommand(taskInput: string | undefined, commands: readonly string[]) {
  if (taskInput === undefined) {
    return `/${commands[0]}`;
  }
  const command = taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!commands.includes(command)) {
    throw new ExposeError('INVALID_INPUT', '任务指令与所选操作不匹配');
  }

  return `/${command}`;
}

/** A new snapshot for each call; mutations continue to use stable retry keys. */
export function observation<I extends Record<string, unknown>>(
  description: string,
  operation: RobotBusinessOperation,
  inputSchema: ExposeValueSchema,
  resultSchema: ExposeValueSchema,
  command: (input: I) => string,
  decode: (data: unknown, input: I, uid: number) => unknown,
  argumentsFor: (input: I, event: GameEvent) => Record<string, unknown> = input => input,
  validateInput?: (input: ExposeReadonly<I>) => void
) {
  return mutation(description, operation, inputSchema, resultSchema, command, decode, argumentsFor, validateInput, { freshRead: true });
}

export const replySchema = object(
  {
    title: text,
    heading: text,
    text,
    buttons: list(button),
    advice: list(object({ command: text, description: text })),
    quote: text,
    rawLines: list(text),
    nav: object({ current: integer, total: integer, count: integer, command: text }),
    blocks: list(object({ text, quoted: boolean, newline: boolean, inlineButtons: list(button) }, ['newline', 'inlineButtons']))
  },
  ['quote', 'rawLines', 'nav', 'blocks']
);

/** Dedicated actions only. The server owns identity, entry checks and settlement. */
export function mutation<I extends Record<string, unknown>>(
  description: string,
  operation: RobotBusinessOperation,
  inputSchema: ExposeValueSchema,
  resultSchema: ExposeValueSchema,
  command: (input: I) => string,
  decode: (data: unknown, input: I, uid: number) => unknown,
  argumentsFor: (input: I, event: GameEvent) => Record<string, unknown> = input => input,
  validateInput?: (input: ExposeReadonly<I>) => void,
  options: {
    freshRead?: boolean;
    intentId?: (input: I) => string | undefined;
    taskInput?: (input: I) => string | undefined;
    taskCommand?: (input: I) => string;
  } = {}
) {
  const outputSchema = object(
    {
      success: boolean,
      branch: { type: 'string', enum: ['business', 'middleware'] },
      reason: text,
      replies: list(replySchema),
      guide: guideSchema,
      onboarding: onboardingSchema,
      onboardingPending: boolean,
      taskContinuation: {
        ...object({ outcome: text, command: text, message: text }, ['command', 'message']),
        description: '连锁任务推进回执，不代表业务结算成功；检查 success、branch 和 result。'
      },
      result: resultSchema
    },
    ['result', 'guide', 'onboarding', 'onboardingPending', 'taskContinuation']
  );

  return Expose.action<I, unknown>({
    description,
    effect: 'write',
    inputSchema,
    outputSchema,
    authorize: (input, context) => {
      validateInput?.(input);
      const taskInput = options.taskInput?.(input as I);

      if (taskInput !== undefined) {
        const normalize = (value: string) => value
            .trim()
            .replace(/^[!！/#＃]\s*/, '')
            .trim()
            .replace(/\s+/g, ' ');

        if (!taskInput.trim() || [...taskInput].length > 200 || normalize(taskInput) !== normalize(options.taskCommand?.(input as I) ?? command(input as I))) {
          throw new ExposeError('INVALID_INPUT', '任务步骤必须与本次操作的完整指令一致');
        }
      }
      const event = authorizedEvent(context);

      if (!createBackendRequestContext(event).idempotencyKey) {
        throw new ExposeError('FORBIDDEN', '写操作需要原始平台消息编号');
      }

      return true;
    },
    handler: async (input, context) => {
      const event = authorizedEvent(context) as GameEvent;
      // Stable across retries and property ordering, scoped to the actual message.
      const prepared = argumentsFor(input, event);
      const args = Object.fromEntries(
        Object.keys(prepared)
          .sort()
          .map(key => [key, prepared[key]])
      );
      const messageText = command(input);
      const taskInput = options.taskInput?.(input);
      // A fresh observation in one AI turn must not replay the snapshot read
      // before a preceding write. Write retries retain their original scope.
      const observation = options.freshRead ? `:read:${context.callId}` : '';
      const intent = options.intentId?.(input);
      // Reusing an intent for different arguments must reach the server with
      // the same key so its request fingerprint rejects the changed payload.
      const scope =
        intent === undefined
          ? `expose:${operation}:${JSON.stringify(taskInput === undefined ? [messageText, args] : [messageText, args, taskInput])}${observation}`
          : `expose:${operation}:intent:${JSON.stringify(intent)}`;
      const request = createBackendRequestContext(event, scope);

      context.signal.throwIfAborted();
      const middleware = middlewareInputFromEvent(event);

      if (operation === 'daily-fortune.claim' && event.Target?.scope === 'group') {
        middleware.channelId = event.Target.targetId;
      }
      const raw = await requestBackend(event.UserId, 'post_v2_robot_business_operation', {
        path: { operation },
        body: { ...middleware, messageText, arguments: args, ...(taskInput === undefined ? {} : { taskInput }) },
        ...writeContext(request),
        signal: context.signal
      });
      const response = parseRobotBusinessEnvelope(raw, event.UserId, (data, uid) => decode(data, input, uid), isRobotPublicEntry(operation));

      if (operation === 'account.register' && response.success && response.branch === 'business' && (response.data as { code?: string }).code === 'OK') {
        invalidateEventBackendRobotIdentity(event);
        invalidateEventCommandEntry(event);
      }

      context.signal.throwIfAborted();

      return project(outputSchema, {
        success: response.success,
        branch: response.branch,
        reason: response.middleware.reason,
        replies: response.middleware.replies,
        ...(response.middleware.taskContinuation ? { taskContinuation: response.middleware.taskContinuation } : {}),
        ...(response.middleware.guide ? { guide: projectGuideReceipt(response.middleware.guide) } : {}),
        ...(response.success && response.branch === 'business' && response.onboarding ? { onboarding: response.onboarding } : {}),
        ...(response.success && response.branch === 'business' && response.onboardingPending ? { onboardingPending: true } : {}),
        ...(response.success && response.branch === 'business' ? { result: response.data } : {})
      });
    }
  });
}
