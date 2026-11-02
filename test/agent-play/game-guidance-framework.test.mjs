import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp } from 'alemonjs/testing';
import { Expose, registerExpose, ResultCode, useEvent, Format, useMessage } from 'alemonjs';
import { runDSHChat } from '../../../alemonjs-agent-link/lib/response/dsh/chat.js';
import { getDSHConfig } from '../../../alemonjs-agent-link/lib/dsh/client.js';
import { getModuleRuntime } from '../../../alemonjs-agent-link/lib/agent/modules.js';
import { closeProductObservability } from '../../../alemonjs-agent-link/lib/observability/product.js';

const empty = { type: 'object', properties: {}, additionalProperties: false };
const string = { type: 'string' };
const panel = '系统 · 新手教学\n修为：25/200\n精力：90\n本次收益尚未结算。\n/继续引导';
const schema = {
  type: 'object', additionalProperties: false, required: ['success', 'branch', 'presentation'],
  properties: {
    success: { type: 'boolean' }, branch: string,
    presentation: { type: 'object', additionalProperties: false, required: ['protocol', 'delivery', 'text'], properties: { protocol: { type: 'string', enum: ['system-guide.v1', 'future.v9'] }, delivery: string, text: string } }
  }
};
for (const scenario of ['personality', 'model-failure', 'delivery-failure', 'unknown-version', 'already-sent', 'retry', 'sequence', 'changed-intent', 'legacy', 'middleware-model-failure', 'scene-order', 'scene-echo', 'fresh-progress']) {
  test(`game guidance real Expose and platform pipeline: ${scenario}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'game-guidance-'));
    const app = createTestApp({ config: { db: { dialect: 'sqlite', sqlite: { storage: join(root, 'managed.sqlite') } }, 'alemonjs-agent-link': {
      apiKey: `guidance-fixture-${scenario}`, model: 'fixture', runtimeMode: 'chat-only', stateBackend: 'local', privateChatAccess: 'all',
      budget: { enabled: false }, workspaceRoot: join(root, 'work'), dshHomeRoot: join(root, 'home'),
      modules: { disabled: ['opinions', 'stickers'], settings: { memory: { automatic: false }, mood: { modelJudge: false }, expression: { automatic: false, socialPolish: false }, proactive: { autoSubscribe: false } } }
    } } });
    app.actions.on('mention.get', () => [{ code: ResultCode.Ok, data: [] }]);
    app.actions.on('message.send', () => [{ code: scenario === 'delivery-failure' ? ResultCode.Fail : ResultCode.Ok, data: { id: 'guidance-reply' } }]);
    let config, calls = 0, requests = 0;
    const original = globalThis.fetch;
    const previousSql = globalThis.sequelize;
    delete globalThis.sequelize;
    globalThis.fetch = async (_url, init) => {
      requests++;
      if (requests === 1) return Response.json({ choices: [{ message: { content: null, tool_calls: [{
        id: 'guide-once', type: 'function', function: { name: 'expose_write', arguments: JSON.stringify({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: ['scene-order', 'scene-echo'].includes(scenario) ? 'continue_registration_guide' : scenario === 'fresh-progress' ? 'get_onboarding' : 'perform_onboarding_action', argumentsJson: ['sequence', 'changed-intent'].includes(scenario) ? JSON.stringify({ version: 1, command: '/签到', intentId: 'step-1' }) : '{}' }) }
      }] } }] });
      if (['sequence', 'changed-intent'].includes(scenario) && requests === 2) return Response.json({ choices: [{ message: { content: null, tool_calls: [{ id: 'guide-next', type: 'function', function: { name: 'expose_write', arguments: JSON.stringify({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'perform_onboarding_action', argumentsJson: JSON.stringify({ version: 2, command: '/查看主线 1', intentId: scenario === 'changed-intent' ? 'step-1' : 'step-2' }) }) } }] } }] });
      if (['retry', 'fresh-progress'].includes(scenario) && requests === 2) return Response.json({ choices: [{ message: { content: null, tool_calls: [{ id: 'guide-retry', type: 'function', function: { name: 'expose_write', arguments: JSON.stringify({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: scenario === 'fresh-progress' ? 'get_onboarding' : 'perform_onboarding_action', argumentsJson: '{}' }) } }] } }] });
      if (scenario === 'changed-intent' && requests === 3) {
        const returned = JSON.parse(init.body).messages.filter(message => message.role === 'tool').map(message => JSON.parse(message.content));
        assert.ok(returned.some(value => value.ok === false && value.error.code === 'DUPLICATE_WRITE'));
      }
      if (['model-failure', 'middleware-model-failure'].includes(scenario)) return Response.json({ error: { message: 'fixture-model-down' } }, { status: 401 });
      return Response.json({ choices: [{ message: { content: scenario === 'scene-echo' ? panel : '先稳住，按你的节奏来。' } }] });
    };
    try {
      const result = await app.runHandler(async () => {
        registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: '修仙', actions: {
          ...(['sequence', 'changed-intent', 'fresh-progress'].includes(scenario) ? {
            get_execution_policy: Expose.action({ description: 'provider execution semantics', effect: 'read', inputSchema: empty,
              outputSchema: { type: 'object', properties: { protocol: string, actions: { type: 'array', items: { type: 'object', properties: { action: string, mode: string, keyField: string }, required: ['action', 'mode'], additionalProperties: false } } }, required: ['protocol', 'actions'], additionalProperties: false },
              handler: async () => ({ protocol: 'plugin-execution-policy.v1', actions: [scenario === 'fresh-progress' ? { action: 'get_onboarding', mode: 'fresh' } : { action: 'perform_onboarding_action', mode: 'operation', keyField: 'intentId' }] }) })
          } : {}),

          [['scene-order', 'scene-echo'].includes(scenario) ? 'continue_registration_guide' : scenario === 'fresh-progress' ? 'get_onboarding' : 'perform_onboarding_action']: Expose.action({ description: '教学', effect: 'write', inputSchema: ['sequence', 'changed-intent'].includes(scenario) ? { type: 'object', required: ['version', 'command', 'intentId'], additionalProperties: false, properties: { version: { type: 'integer' }, command: string, intentId: string } } : empty, outputSchema: scenario === 'legacy' ? { type: 'object', properties: { success: { type: 'boolean' }, branch: string }, required: ['success', 'branch'], additionalProperties: false } : schema, handler: async () => {
            calls++;
            if (scenario === 'legacy') return { success: true, branch: 'business' };
            return { success: scenario !== 'middleware-model-failure', branch: scenario === 'middleware-model-failure' ? 'middleware' : 'business', presentation: { protocol: scenario === 'unknown-version' ? 'future.v9' : 'system-guide.v1', delivery: scenario === 'already-sent' ? 'sent' : 'pending', text: scenario === 'fresh-progress' ? panel + (calls === 1 ? '\n旧目录 /继续引导 1 master' : '\n新目录 /继续引导 2 market') : panel } };
          } })
        } }]);
        const [event] = useEvent({ selects: 'private.message.create' });
        config = getDSHConfig();
        await runDSHChat(event.current, '带我继续修行');
      }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `human-${scenario}`, messageId: `guide-${scenario}`, text: '带我继续修行' }), 'alemonjs-agent-link');
      assert.deepEqual(result.errors, []);
      assert.equal(calls, ['sequence', 'fresh-progress'].includes(scenario) ? 2 : 1);
      assert.equal(requests, ['retry', 'sequence', 'changed-intent', 'fresh-progress'].includes(scenario) ? 3 : 2);
      const sent = result.messages.map(message => message.text).join('\n');
      if (['unknown-version', 'already-sent', 'legacy'].includes(scenario)) assert.ok(!sent.includes('修为：25/200'));
      else assert.ok(sent.includes('修为：25/200'));
      if (!['model-failure', 'middleware-model-failure', 'scene-echo'].includes(scenario)) assert.equal(sent.split('按你的节奏来').length - 1, 1);
      if (scenario === 'model-failure') assert.ok(sent.includes('避免重复提交'));
      if (scenario === 'scene-echo') assert.equal(sent.split('修为：25/200').length - 1, 1);
      if (scenario === 'scene-order') assert.ok(sent.indexOf('修为：25/200') < sent.indexOf('先稳住'));
      if (scenario === 'retry') assert.equal(sent.split('修为：25/200').length - 1, 1);
      if (scenario === 'fresh-progress') { assert.ok(sent.includes('新目录 /继续引导 2 market')); assert.ok(!sent.includes('旧目录')); }
      const sends = result.actions.filter(action => action.name === 'message.send');
      assert.equal(sends.length, 1);
      assert.ok(sends[0].results.every(receipt => receipt.code === (scenario === 'delivery-failure' ? ResultCode.Fail : ResultCode.Ok)));
    } finally {
      globalThis.fetch = original;
      if (config) await (await getModuleRuntime(config)).close();
      if (globalThis.sequelize && globalThis.sequelize !== previousSql) await globalThis.sequelize.close();
      globalThis.sequelize = previousSql;
      await app.dispose();
      closeProductObservability(root);
      await rm(root, { recursive: true, force: true });
    }
  });
}

for (const scenario of ['utf8-limit', 'receipt-count', 'snapshot-replacement']) {
  test(`guidance receipt budget with real Expose/Format: ${scenario}`, async () => {
    const app = createTestApp();
    app.actions.on('message.send', () => [{ code: ResultCode.Ok, data: { id: 'budget-receipt' } }]);
    try {
      const result = await app.runHandler(async () => {
        let calls = 0;
        const action = scenario === 'snapshot-replacement' ? 'get_onboarding' : 'perform_onboarding_action';
        registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: '修仙', actions: {
          [action]: Expose.action({ description: '教学', effect: 'write', inputSchema: { type: 'object', properties: { index: { type: 'integer' } }, required: ['index'], additionalProperties: false }, outputSchema: schema,
            handler: async () => {
              calls++;
              const text = scenario === 'utf8-limit' ? (calls === 1 ? '界'.repeat(8000) : '尾') : `回执-${calls} /继续引导 ${calls} master`;
              return { success: true, branch: 'business', presentation: { protocol: 'system-guide.v1', delivery: 'pending', text } };
            } })
        } }]);
        const tools = [{ name: 'expose_write', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }];
        const guidance = gameGuidance(tools);
        const count = scenario === 'utf8-limit' ? 2 : scenario === 'receipt-count' ? 17 : 20;
        for (let index = 0; index < count; index++) await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action, argumentsJson: JSON.stringify({ index }) });
        const text = guidance.append('');
        const [message] = useMessage();
        await message.send({ format: Format.create().addText(text) });
        return { calls, text };
      }, app.events.privateMessage({ userId: 'budget-human', text: '核对引导' }), 'alemonjs-agent-link');
      assert.deepEqual(result.errors, []);
      const text = result.messages.map(message => message.text).join('\n');
      assert.equal(result.actions[result.messages[0].actionIndex].results[0].code, ResultCode.Ok);
      if (scenario === 'utf8-limit') {
        assert.equal(text.split('界').length - 1, 8000);
        assert.ok(!text.includes('尾'));
        assert.ok(text.includes('部分回执未展开'));
      } else if (scenario === 'receipt-count') {
        for (let i = 1; i <= 16; i++) assert.ok(text.includes(`回执-${i} /`));
        assert.ok(!text.includes('回执-17 /'));
        assert.ok(text.includes('不要重复提交原操作'));
      } else {
        assert.ok(text.includes('回执-20 /'));
        assert.ok(!text.includes('回执-1 /'));
        assert.ok(!text.includes('部分回执未展开'));
      }
    } finally {
      await app.dispose();
    }
  });
}
