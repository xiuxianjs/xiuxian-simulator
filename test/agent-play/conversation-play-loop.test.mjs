import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp } from 'alemonjs/testing';
import { Expose, registerExpose } from 'alemonjs';
import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { guidanceFlowActions } from '../../src/expose/guidance-flow.ts';
import { conversationRoutingActions } from '../../src/expose/conversation-routing.ts';
import { guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import handler from '../../../alemonjs-agent-link/lib/response/dsh/plugin-conversation.js';
import { getDSHConfig } from '../../../alemonjs-agent-link/lib/dsh/client.js';
import { getModuleRuntime } from '../../../alemonjs-agent-link/lib/agent/modules.js';
import { closeProductObservability } from '../../../alemonjs-agent-link/lib/observability/product.js';
const str = { type: 'string' }, integer = { type: 'integer' }, bool = { type: 'boolean' };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

test('multi-turn play remembers delivered choices and real arguments, stays in gameplay, and returns to directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'conversation-play-'));
  const previousSql = globalThis.sequelize;
  delete globalThis.sequelize;
  const app = createTestApp({ config: { db: { dialect: 'sqlite', sqlite: { storage: join(root, 'db.sqlite') } }, 'alemonjs-agent-link': {
    apiKey: 'fixture-play', model: 'fixture', runtimeMode: 'chat-only', stateBackend: 'local', privateChatAccess: 'all', budget: { enabled: false }, workspaceRoot: join(root, 'work'), dshHomeRoot: join(root, 'home'),
    modules: { disabled: ['opinions', 'stickers'], settings: { memory: { automatic: false }, mood: { modelJudge: false }, expression: { automatic: false, socialPolish: false }, proactive: { autoSubscribe: false } } }
  } } });
  app.actions.on('mention.get', () => [{ code: 2000, data: [] }]);
  let sends = 0;
  app.actions.on('message.send', () => [{ code: 2000, data: { id: `play-reply-${++sends}` } }]);
  const originalFetch = globalThis.fetch;
  let round = 0, calls = 0, reads = [], stateReads = 0, config;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    if (calls % 2 === 1) {
      assert.ok(body.messages.some(message => typeof message.content === 'string' && message.content.includes('修仙玩法接续资料')));
      if (round === 1) assert.ok(body.messages.some(message => typeof message.content === 'string' && message.content.includes('再看一些')));
      return Response.json({ choices: [{ message: { content: null, tool_calls: [{ id: `inventory-${round}`, type: 'function', function: { name: 'expose_read', arguments: JSON.stringify({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_inventory', argumentsJson: JSON.stringify({ category: 'material', page: round + 1 }) }) } }] } }] });
    }
    return Response.json({ choices: [{ message: { content: `这一页是材料 ${round + 1}。[[再看一些]]` } }] });
  };
  try {
    for (round = 0; round < 2; round++) {
      const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'play-human', messageId: `play-${round}`, text: round ? '再看一些' : '看看背包材料' });
      const run = await app.runHandler(async () => {
        if (!round) registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
          ...conversationRoutingActions,
          get_play_context: guidanceFlowActions.get_play_context,
          get_guidance_state: Expose.action({ description: 'state', effect: 'read', inputSchema: { type: 'object', properties: { requestText: str, nameDraft: str, conversationMode: str }, additionalProperties: false }, outputSchema: object({ protocol: str, flow: str, accountExists: bool }), handler: async input => { stateReads++; assert.equal(input.conversationMode, 'gameplay'); return { protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true }; } }),
          get_inventory: Expose.action({ description: '材料背包分页', effect: 'read', inputSchema: object({ category: str, page: integer }), outputSchema: object({ page: integer, name: str }), handler: async input => { reads.push(input.page); return { page: input.page, name: `材料 ${input.page}` }; } })
        } }]);
        config = getDSHConfig();
        await handler();
        assert.equal(guidanceSession().mode, 'gameplay');
        assert.ok(guidanceSession().dialogueChoices.includes('再看一些'), JSON.stringify({ round, calls, reads, session: guidanceSession() }));
        assert.ok(guidanceSession().dialogueChoices.includes('返回玩法目录'));
        assert.equal(JSON.parse(guidanceSession().play.argumentsJson).page, round + 1);
      }, event, 'alemonjs-agent-link');
      assert.deepEqual(run.errors, []);
      assert.equal(run.nextCalls.length, 0);
      assert.match(JSON.stringify(run.messages.map(message => message.nodes)), /返回玩法目录/);
      assert.ok(!run.messages.some(message => /\/(?:我|继续引导|背包)/u.test(message.text)));
      assert.ok(run.messages.every(message => run.actions[message.actionIndex].results.every(receipt => receipt.code === 2000)));
    }
    const count = calls;
    const menu = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'play-human', messageId: 'menu', text: '返回玩法目录' }), 'alemonjs-agent-link');
    assert.deepEqual(menu.errors, []);
    assert.equal(calls, count, 'directory navigation cannot submit or replay a business operation');
    assert.match(JSON.stringify(menu.messages[0].nodes), /背包与装备/);
    assert.deepEqual(reads, [1, 2]);
    assert.equal(stateReads, 2);
    const exitEvent = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'play-human', messageId: 'manual', text: '/我' });
    const manual = await app.runHandler(handler, exitEvent, 'alemonjs-agent-link');
    assert.equal(manual.nextCalls.length, 1);
    assert.equal(calls, count);
  } finally {
    globalThis.fetch = originalFetch;
    if (config) await (await getModuleRuntime(config)).close();
    if (globalThis.sequelize && globalThis.sequelize !== previousSql) await globalThis.sequelize.close();
    globalThis.sequelize = previousSql;
    await app.dispose(); closeProductObservability(root); await rm(root, { recursive: true, force: true });
  }
});
