import { Expose, ExposeError } from 'alemonjs';
import { authorizedEvent } from './access';
import { profile } from './common-queries';
import { intentIdSchema, replySchema, taskInputSchema, validateIntentId } from './mutation';
import { boolean, list, object, project, text } from './schema';
import { createBackendRequestContext } from '../api/bot/context';
import { requestBackend, writeContext } from '../api/bot/client';
import { middlewareInputFromEvent } from '../api/bot/middleware-entry';
import { parseRobotBusinessResult } from '../api/bot/robot-business';
import type { GameEvent } from '../types/event';

const output = object(
  {
    success: boolean,
    branch: { type: 'string', enum: ['business', 'middleware'] },
    reason: text,
    replies: list(replySchema),
    taskContinuation: object({ outcome: text, command: text, message: text }, ['command', 'message']),
    profile
  },
  ['taskContinuation', 'profile']
);

const homeCommands = new Set(['我', '我的信息', '我的资料', '我的编号', '我的控制台', '个人信息', '个人资料', '个人编号', '个人控制台']);
const normalize = (value: string) => value
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();

export const taskHomeActions = {
  execute_task_home: Expose.action<{ taskInput: string; intentId?: string }, unknown>({
    description:
      '执行连锁任务中“我/我的资料”等主页步骤，返回任务推进和服务端主页资料；服务端先推进任务再读取主页，分别检查两者结果；请求失败或结果未知时先核对任务状态，不能直接重试。相同消息中新操作使用新 intentId，重试沿用原编号。',
    effect: 'write',
    inputSchema: object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    outputSchema: output,
    authorize: (input, context) => {
      validateIntentId(input.intentId);
      if (!homeCommands.has(normalize(input.taskInput))) {
        throw new ExposeError('INVALID_INPUT', '任务步骤不是明确的主页指令');
      }
      if (!createBackendRequestContext(authorizedEvent(context)).idempotencyKey) {
        throw new ExposeError('FORBIDDEN', '写操作需要原始平台消息编号');
      }

      return true;
    },
    handler: async (input, context) => {
      const event = authorizedEvent(context) as GameEvent;
      const messageText = `/${normalize(input.taskInput)}`;
      const scope =
        input.intentId === undefined ? `expose:home.task:${JSON.stringify(input.taskInput)}` : `expose:home.task:intent:${JSON.stringify(input.intentId)}`;
      const request = createBackendRequestContext(event, scope);

      context.signal.throwIfAborted();
      const body = { ...middlewareInputFromEvent(event), messageText, taskInput: input.taskInput };
      const raw = await requestBackend(event.UserId, 'post_v2_robot_home_overview', {
        body,
        ...writeContext(request),
        signal: context.signal
      });
      const result = parseRobotBusinessResult(raw, event.UserId);

      context.signal.throwIfAborted();

      return project(output, {
        success: result.success,
        branch: result.branch,
        reason: result.middleware.reason,
        replies: result.middleware.replies,
        ...(result.middleware.taskContinuation ? { taskContinuation: result.middleware.taskContinuation } : {}),
        ...(result.success && result.branch === 'business' ? { profile: result.data.profile } : {})
      });
    }
  })
};
