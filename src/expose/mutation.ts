import { Expose, ExposeError, type ExposeReadonly, type ExposeValueSchema } from 'alemonjs';
import { authorizedEvent } from './access';
import { boolean, integer, list, object, project, text } from './schema';
import { createBackendRequestContext } from '../api/bot/context';
import { requestBackend, writeContext } from '../api/bot/client';
import { middlewareInputFromEvent } from '../api/bot/middleware-entry';
import { parseRobotBusinessEnvelope, type RobotBusinessOperation } from '../api/bot/robot-business';
import type { GameEvent } from '../types/event';

const button = object({ label: text, command: text });

/** A new snapshot for each call; mutations continue to use stable retry keys. */
export function observation<I extends Record<string, unknown>>(
  description: string,
  operation: RobotBusinessOperation,
  inputSchema: ExposeValueSchema,
  resultSchema: ExposeValueSchema,
  command: (input: I) => string,
  decode: (data: unknown, input: I) => unknown,
  argumentsFor: (input: I) => Record<string, unknown> = input => input,
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
  decode: (data: unknown, input: I) => unknown,
  argumentsFor: (input: I) => Record<string, unknown> = input => input,
  validateInput?: (input: ExposeReadonly<I>) => void,
  options: { freshRead?: boolean } = {}
) {
  const outputSchema = object(
    {
      success: boolean,
      branch: { type: 'string', enum: ['business', 'middleware'] },
      reason: text,
      replies: list(replySchema),
      result: resultSchema
    },
    ['result']
  );

  return Expose.action<I, unknown>({
    description,
    effect: 'write',
    inputSchema,
    outputSchema,
    authorize: (input, context) => {
      validateInput?.(input);
      const event = authorizedEvent(context);

      if (!createBackendRequestContext(event).idempotencyKey) {
        throw new ExposeError('FORBIDDEN', '写操作需要原始平台消息编号');
      }

      return true;
    },
    handler: async (input, context) => {
      const event = authorizedEvent(context) as GameEvent;
      // Stable across retries and property ordering, scoped to the actual message.
      const prepared = argumentsFor(input);
      const args = Object.fromEntries(
        Object.keys(prepared)
          .sort()
          .map(key => [key, prepared[key]])
      );
      const messageText = command(input);
      // A fresh observation in one AI turn must not replay the snapshot read
      // before a preceding write. Write retries retain their original scope.
      const observation = options.freshRead ? `:read:${context.callId}` : '';
      const request = createBackendRequestContext(event, `expose:${operation}:${JSON.stringify([messageText, args])}${observation}`);

      context.signal.throwIfAborted();
      const raw = await requestBackend(event.UserId, 'post_v2_robot_business_operation', {
        path: { operation },
        body: { ...middlewareInputFromEvent(event), messageText, arguments: args },
        ...writeContext(request),
        signal: context.signal
      });
      const response = parseRobotBusinessEnvelope(raw, event.UserId, data => decode(data, input));

      context.signal.throwIfAborted();

      return project(outputSchema, {
        success: response.success,
        branch: response.branch,
        reason: response.middleware.reason,
        replies: response.middleware.replies,
        ...(response.success && response.branch === 'business' ? { result: response.data } : {})
      });
    }
  });
}
