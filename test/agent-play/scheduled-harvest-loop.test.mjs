import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { resolveDSHConfig } from '../../../alemonjs-agent-link/lib/dsh/config.js';
import { runToolChat } from '../../../alemonjs-agent-link/lib/agent/tool-chat.js';
import { closeProductObservability } from '../../../alemonjs-agent-link/lib/observability/product.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import axios from 'axios';
import { Sequelize } from 'sequelize';
import * as Framework from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { scheduledHarvest } from '../../src/expose/scheduled-harvest.ts';
import { scheduledActionsModule } from '../../../alemonjs-agent-link/lib/modules/scheduled-actions.js';
import { ScheduledActionStore } from '../../../alemonjs-agent-link/lib/scheduled-actions/store.js';
import { getConversationId } from '../../../alemonjs-agent-link/lib/response/dsh/util.js';

for (const scenario of ['success', 'immature', 'uncertain', 'send-failure', 'cancelled', 'wrong-plot', ...(process.env.HARVEST_LIVE_MODEL === '1' ? ['live'] : [])]) test(`actual host-to-game scheduled conversation loop: ${scenario}`, { skip: !Framework.createBackgroundRunner && 'requires new framework', timeout: 90000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'harvest-loop-'));
  const db = new Sequelize({ dialect: 'sqlite', storage: join(root, 'jobs.sqlite'), logging: false });
  let now = scenario === 'live' ? Date.now() : 1800000000000;
  t.mock.method(Date, 'now', () => now);
  t.mock.timers.enable({ apis: ['setInterval'] });
  const store = new ScheduledActionStore(root, () => now, db);
  const app = createTestApp({ timeoutMs: scenario === 'live' ? 80000 : 5000, config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'fixture-loop-secret' } } } });
  const cleanups = [], tools = new Map(), writes = [], contextHooks = [];
  t.after(async () => { for (const cleanup of cleanups) await cleanup(); await app.dispose(); closeProductObservability(root); await db.close(); await rm(root, { recursive: true, force: true }); });
  app.actions.on('message.send', () => [{ code: scenario === 'send-failure' ? 4000 : 2000, data: { id: 'notification' } }]);
  t.mock.method(axios, 'create', () => ({ request: async request => {
    assert.equal(request.headers['x-bid'], 'player');
    const path = new URL(request.url).pathname;
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: 7 } } }) };
    assert.equal(Framework.getCurrentEvent(), undefined);
    assert.equal(path, '/api/v1/players/7/cave/plots/harvest');
    assert.deepEqual(typeof request.data === 'string' ? JSON.parse(request.data) : request.data, { plotIndex: 2 });
    writes.push(request.headers['idempotency-key']);
    if (scenario === 'uncertain') throw new Error('connection lost after possible settlement');
    if (scenario === 'immature') return { status: 409, headers: {}, data: JSON.stringify({ error: { code: 'CONFLICT', message: '当前没有可收割的成熟灵植' } }) };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { message: '灵田采收完成：原始服务端结果', harvestedCount: 1 } }) };
  } }));
  const owner = { platform: 'qq-bot', botId: '123', userId: 'player', channelId: '', private: true };
  const ctx = event => ({ ...owner, channelId: getConversationId(event), userText: event.MessageText, inputId: event.MessageId, signal: new AbortController().signal });
  const origin = app.events.privateMessage({ platform: 'qq-bot', botId: '123', userId: 'player', messageId: 'original', text: '十分钟后帮我采收灵田2' });
  let saved;
  const setup = await app.runHandler(async () => {
    Framework.registerExpose('xiuxian-game', [scheduledHarvest]);
    await scheduledActionsModule({ workspaceRoot: join(root, 'work') }, Framework, () => store).setup({ id: 'scheduled-actions', dataDirectory: root, settings: {}, tool: tool => tools.set(tool.name, tool), on: (name, handler) => { if (name === 'context') contextHooks.push(handler); }, onDispose: cleanup => cleanups.push(cleanup) });
    const args = { provider: 'xiuxian-game', argumentsJson: JSON.stringify({ plotIndex: scenario === 'wrong-plot' ? 3 : 2 }) };
    if (scenario === 'wrong-plot') {
      await assert.rejects(tools.get('schedule_action').execute(args, ctx(origin)), /预约未创建.*地块/u);
      return;
    }
    if (scenario === 'live') {
      const document = parse(await readFile(process.env.HARVEST_MODEL_CONFIG || '../alemonjs-agent-link/alemon.config.yaml', 'utf8'));
      const chosen = resolveDSHConfig(document['alemonjs-agent-link'] ?? {});
      const endpoint = chosen.modelPool?.enabled ? chosen.modelPool.endpoints.find(item => item.enabled && item.capabilities.includes('chat')) : chosen;
      assert.ok(endpoint?.apiKey, 'Live test requires an enabled chat endpoint');
      const config = resolveDSHConfig({ apiKey: endpoint.apiKey, model: endpoint.model, baseUrl: endpoint.baseUrl,
        runtimeMode: 'chat-only', budget: { enabled: false }, workspaceRoot: join(root, 'work'), dshHomeRoot: join(root, 'home') });
      const context = { ...ctx(origin), owner: false, capabilities: {} };
      const answer = await runToolChat({ config, credentials: endpoint, input: origin.MessageText, context,
        tools: [...tools.values()].map(tool => ({ ...tool, execute: async (args, context) => {
          try { return await tool.execute(args, context); }
          catch (error) { console.log('LIVE_HARVEST_TOOL_FAILURE=' + JSON.stringify({ tool: tool.name, args, message: error.message })); throw error; }
        } })), memoryContext: (await Promise.all(contextHooks.map(hook => hook(context)))).join('\n'), maxRounds: 5 });
      const items = await store.list(owner);
      assert.equal(items.length, 1, answer);
      saved = { ok: true, item: items[0] };
      assert.match(answer, /已.*(?:安排|预约|保存)|(?:安排|预约|保存)好了|到时|到点|十分钟后/u);
      assert.doesNotMatch(answer, /退出AI|已(?:经)?(?:采收|收割)完成|authorization/u);
      console.log('LIVE_HARVEST_SAVED=' + JSON.stringify({ answer, title: saved.item.title, delayMs: saved.item.dueAt - now, everyMs: saved.item.everyMs, writes: writes.length }));
    } else saved = await tools.get('schedule_action').execute(args, ctx(origin));
    assert.equal(saved.ok, true);
    assert.equal(saved.item.dueAt, now + 600000);
    assert.equal(saved.item.everyMs, 0);
    assert.ok(!JSON.stringify(saved).includes('authorization'));
    assert.equal((await tools.get('schedule_action').execute(args, ctx(origin))).item.id, saved.item.id);
    assert.equal(writes.length, 0);
  }, origin, 'host');
  assert.deepEqual(setup.errors, []);
  if (scenario === 'wrong-plot') { assert.deepEqual(await store.list(owner), []); return; }
  if (scenario === 'cancelled') {
    const cancel = app.events.privateMessage({ platform: 'qq-bot', botId: '123', userId: 'player', messageId: 'cancel', text: '取消这个预约' });
    await app.runHandler(async () => { assert.equal((await tools.get('cancel_scheduled_action').execute({ id: saved.item.id }, ctx(cancel))).ok, true); }, cancel, 'host');
  }
  now += 600000;
  t.mock.timers.tick(10000);
  let results = [];
  for (let index = 0; index < 100; index++) {
    results = await store.results(owner, saved.item.id);
    if (results.length || scenario === 'cancelled') break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  if (scenario === 'cancelled') { assert.equal(writes.length, 0); assert.deepEqual(results, []); return; }
  assert.equal(writes.length, 1);
  assert.match(writes[0], /^[a-f0-9]{64}$/);
  assert.equal(results[0]?.outcome, scenario === 'immature' ? 'skipped' : scenario === 'uncertain' ? 'unknown' : 'completed');
  t.mock.timers.tick(10000);
  for (let index = 0; index < 100; index++) {
    results = await store.results(owner, saved.item.id);
    if (['sent', 'unknown'].includes(results[0].notification)) break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(results[0].notification, scenario === 'send-failure' ? 'unknown' : 'sent');
  const sends = app.calls.filter(call => call.name === 'message.send');
  assert.equal(sends.length, 1);
  assert.equal(sends[0].request.payload.target.targetId, 'player');
  assert.ok(!JSON.stringify(sends).includes('fixture-loop-secret'));
  if (scenario === 'live') console.log('LIVE_HARVEST_RESULT=' + JSON.stringify({ outcome: results[0].outcome, notification: results[0].notification, writes: writes.length, target: sends[0].request.payload.target.targetId }));
  if (scenario === 'success' || scenario === 'live') assert.match(JSON.stringify(sends), /原始服务端结果/);
  t.mock.timers.tick(10000);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(writes.length, 1);
  assert.equal(app.calls.filter(call => call.name === 'message.send').length, 1);
});
