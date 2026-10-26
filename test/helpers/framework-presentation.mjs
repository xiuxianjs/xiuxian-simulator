import { after } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';

const sessions = new Set();
after(async () => {
  await Promise.all([...sessions].map(app => app.dispose()));
  sessions.clear();
  await shutdownLogger();
});

/**
 * Transitional adapter for existing backend/snapshot fixtures. New tests should
 * assert directly on TestRunResult. Each render uses real hooks and an isolated
 * app; the legacy sent array is populated only at the intercepted platform action.
 */
export function createPresentationHarness(state, options = {}) {
  let lastResult;
  let session;
  let lastEvent;
  const continuations = [];
  return {
    get result() {
      return lastResult;
    },
    async dispose() {
      continuations.length = 0;
      if (session) {
        await session.dispose();
        sessions.delete(session);
        session = undefined;
      }
    },
    async invokeLast(callback) {
      if (!lastEvent) throw new Error('No presentation event has run');
      return this.invoke(lastEvent, callback);
    },
    async invoke(event, callback, next) {
      return (await this.run(async () => callback(), event, next)).value;
    },
    async run(handler, event, next = () => {}) {
      const app = options.persistent ? (session ??= createTestApp()) : createTestApp();
      if (options.persistent) sessions.add(app);
      lastEvent = event;
      // Existing contract fixtures deliberately omit BotId/ChannelId/Target in
      // refusal cases. Preserve those facts; never synthesize business identity.
      if (options.mentions !== undefined) {
        app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'Test mentions', structuredClone(options.mentions))]);
      }
      app.actions.on('message.send', request => {
        const nodes = structuredClone(request.payload.params.format);
        const payload = { ...request.payload.params, format: { value: nodes } };
        state.sent.push(options.capture === 'payload' ? payload : options.capture === 'eventPayload' ? { event, value: payload } : nodes);
        return options.send?.(event, payload) ?? [createResult(ResultCode.Ok, 'Test delivery', { id: `receipt-${state.sent.length}` })];
      });
      try {
        lastResult = await app.runHandler(handler, event);
        continuations.push({ calls: lastResult.nextCalls, cursor: 0, next });
        for (const continuation of continuations) {
          while (continuation.cursor < continuation.calls.length) {
            await continuation.next(...continuation.calls[continuation.cursor++]);
          }
        }
        if (!options.persistent) continuations.length = 0;
        return lastResult;
      } finally {
        if (!options.persistent) await app.dispose();
      }
    }
  };
}
