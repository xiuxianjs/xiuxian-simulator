import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { Sequelize } from 'sequelize';
import { createTestApp } from 'alemonjs/testing';
import * as Framework from 'alemonjs';
import { gameExpose } from '../../src/expose/index.ts';
import { runDSHChat } from '../../../alemonjs-agent-link/lib/response/dsh/chat.js';
import { getDSHConfig } from '../../../alemonjs-agent-link/lib/dsh/client.js';
import { resolveDSHConfig } from '../../../alemonjs-agent-link/lib/dsh/config.js';
import { getModuleRuntime } from '../../../alemonjs-agent-link/lib/agent/modules.js';
import { ScheduledActionStore } from '../../../alemonjs-agent-link/lib/scheduled-actions/store.js';
import { closeProductObservability } from '../../../alemonjs-agent-link/lib/observability/product.js';

// Explicit opt-in: launches only an isolated SQLite/miniredis Go service.
test('full chat schedules game harvest and settles through real Go service', { skip: process.env.HARVEST_CHAT_TEST !== '1' || !Framework.createBackgroundRunner, timeout: 180000 }, async t => {
 const live = process.env.HARVEST_LIVE_MODEL === '1';
 const failAfterSave = process.env.HARVEST_CHAT_FAILURE === '1';
 const rejectReply = process.env.HARVEST_CHAT_REJECT === '1';
 const failRender = process.env.HARVEST_CHAT_RENDER_FAILURE === '1';
 let renderAttempts = 0;
 const root = await mkdtemp(join(process.cwd(), '.harvest-chat-'));
 const serverRoot = join(process.cwd(), '../xiuxian-game-server');
 const binary = join(root, 'httpapi.test');
 execFileSync('go', ['test', '-c', '-o', binary, './internal/httpapi'], { cwd: serverRoot });
 const child = spawn(binary, ['-test.run=^TestRobotScheduledHarvestAgentFixture$', '-test.v'], { cwd: join(serverRoot, 'internal/httpapi'), env: { ...process.env, HARVEST_AGENT_FIXTURE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
 let output = '';
 const backend = await new Promise((resolve, reject) => {
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-16000); const match = output.match(/HARVEST_AGENT_FIXTURE=(http:\/\/127\.0\.0\.1:\d+)/); if (match) resolve(match[1]); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-16000); });
  child.on('error', reject); child.on('exit', code => reject(new Error(`Go fixture exited ${code}: ${output.slice(-1500)}`)));
 });
 const originalFetch = globalThis.fetch;
 const previousSql = globalThis.sequelize;
 const database = new Sequelize({ dialect: 'sqlite', storage: join(root, 'host.sqlite'), logging: false });
 globalThis.sequelize = database;
 let app, config;
 let now = Date.now();
 t.mock.method(Date, 'now', () => now);
 t.mock.timers.enable({ apis: ['setInterval'] });
 t.after(async () => {
  globalThis.fetch = originalFetch;
  if (config) await (await getModuleRuntime(config)).close();
  if (app) await app.dispose();
  closeProductObservability(root);
  await database.close();
  globalThis.sequelize = previousSql;
  await originalFetch(`${backend}/fixture/stop`, { method: 'POST' }).catch(() => {});
  child.kill();
  await rm(root, { recursive: true, force: true });
 });
 let credentials = { apiKey: 'fixture', model: 'fixture' };
 if (live) {
  const doc = parse(await readFile(join(process.cwd(), 'alemon.config.yaml'), 'utf8'));
  const chosen = resolveDSHConfig(doc['alemonjs-agent-link'] ?? {});
  const endpoint = chosen.modelPool?.enabled ? chosen.modelPool.endpoints.find(item => item.enabled && item.capabilities.includes('chat')) : chosen;
  assert.ok(endpoint?.apiKey);
  credentials = { apiKey: endpoint.apiKey, model: endpoint.model, baseUrl: endpoint.baseUrl };
 }
 app = createTestApp({ timeoutMs: 90000, config: {
  db: { dialect: 'sqlite', sqlite: { storage: join(root, 'host.sqlite') } }, 'qq-bot': { app_id: '123' },
  'xiuxian-game': { backend: { api_url: backend, robot_auth_token: 'secret' } },
  'alemonjs-agent-link': { ...credentials, runtimeMode: 'chat-only', stateBackend: 'local', privateChatAccess: 'all', budget: { enabled: false }, workspaceRoot: join(root, 'work'), dshHomeRoot: join(root, 'home'), modules: { disabled: ['opinions', 'stickers'], settings: { memory: { automatic: false }, mood: { modelJudge: false }, expression: { automatic: false, socialPolish: false }, proactive: { autoSubscribe: false } } } }
 } });
 app.actions.on('mention.get', () => [{ code: Framework.ResultCode.Ok, data: [] }]);
 let receipts = 0;
 app.actions.on('message.send', () => {
  receipts++;
  return [{ code: rejectReply && receipts === 1 ? Framework.ResultCode.Fail : Framework.ResultCode.Ok, data: rejectReply && receipts === 1 ? null : { id: `harvest-receipt-${receipts}` } }];
 });
 const expose = failRender ? Framework.Expose.create() : gameExpose;
 if (failRender) for (const entry of gameExpose.getConfigs()) expose.provide(entry.name === 'agent.conversation.v1'
  ? { ...entry, actions: { ...entry.actions, present: { ...entry.actions.present, handler: () => { renderAttempts++; throw new Error('fixture-private-render-failure'); } } } }
  : entry);
 await app.mount({ expose }, undefined, 'xiuxian-game');
 let modelCalls = 0;
 const modelTrace = [];
 globalThis.fetch = async (url, init) => {
  if (String(url).startsWith(backend)) return originalFetch(url, init);
  if (live) {
   modelCalls++;
   const response = await originalFetch(url, init);
   const payload = await response.clone().json();
   modelTrace.push({ calls: payload.choices?.[0]?.message?.tool_calls?.map(call => ({ name: call.function.name, arguments: call.function.arguments })) });
   return response;
  }
  modelCalls++;
  if (failAfterSave && modelCalls > 1) return Response.json({ error: { code: 'invalid_api_key', message: 'fixture-model-failure' } }, { status: 401 });
  return Response.json({ choices: [{ message: modelCalls === 1 ? { content: null, tool_calls: [{ id: 'schedule-once', type: 'function', function: { name: 'schedule_action', arguments: JSON.stringify({ provider: 'xiuxian-game', argumentsJson: '{"plotIndex":2}' }) } }] } : { content: '安排好了，十分钟后尝试采收灵田2，结果到时通知你。' } }] });
 };
 const owner = { platform: 'qq-bot', botId: '123', userId: 'player', channelId: '', private: true };
 const before = await (await originalFetch(`${backend}/fixture/state`)).json();
 const text = '十分钟后帮我尝试采收修仙灵田2，只采收一次，不要加速或播种。';
 const run = await app.runHandler(async () => {
  config = getDSHConfig();
  await runDSHChat(Framework.getCurrentEvent(), text);
 }, app.events.privateMessage({ ...owner, messageId: 'harvest-chat-origin', text }), 'alemonjs-agent-link');
 assert.deepEqual(run.errors, []);
 const store = new ScheduledActionStore(root);
 const jobs = await store.list(owner);
 const reply = run.messages.map(message => message.text).join('\n');
 console.log('HARVEST_CHAT_PREPARE=' + JSON.stringify({ modelCalls, toolNames: modelTrace.flatMap(round => round.calls ?? []).map(call => call.name), jobs: jobs.length, reply }));
 assert.equal(jobs.length, 1, reply);
 assert.match(reply, /预约|安排|约好|十分钟后|10分钟后/u);
 if (failAfterSave || failRender) {
  assert.match(reply, /预约已保存：/u);
  assert.match(reply, /这是预约保存回执，不代表操作已经执行/u);
  assert.doesNotMatch(reply, /步骤可能已经执行|fixture-model-failure/u);
  const nodes = run.messages.flatMap(message => message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []));
  if (failRender) {
   assert.equal(renderAttempts, 1);
   assert.doesNotMatch(reply, /后续说明暂时未完成|部分操作可能已执行|后续模型请求/u);
   assert.doesNotMatch(reply, /fixture-private-render-failure/u);
   assert.equal(nodes.filter(node => node.type === 'MD.button').length, 0, 'Do not fabricate choices after rendering fails');
  } else assert.equal(nodes.filter(node => node.type === 'MD.button').length, 0, 'a saved task does not need a gameplay footer');
  assert.ok(reply.includes(jobs[0].id));
  assert.equal(receipts, 1, 'Failure must not resend or replay the turn');
  assert.equal(modelCalls, 2);
  const recovery = run.actions.filter(action => action.name === 'message.send');
  assert.equal(recovery.length, 1);
  assert.ok(recovery[0].results.every(result => result.code === (rejectReply ? Framework.ResultCode.Fail : Framework.ResultCode.Ok)));
 } else assert.doesNotMatch(reply, /这次没能|没能接|未安排|未创建|部分操作可能已执行|后续模型请求/u);
 assert.equal(jobs[0].dueAt, now + 600000);
 assert.equal(jobs[0].everyMs, 0);
 if (live) {
  for (const call of modelTrace.flatMap(round => round.calls ?? [])) {
   if (['expose_write', 'expose_read', 'expose_call'].includes(call.name)) assert.notEqual(JSON.parse(call.arguments).protocol, 'agent.scheduled-action.v1');
  }
 }
 const prepared = await (await originalFetch(`${backend}/fixture/state`)).json();
 assert.equal(prepared.harvests, 0);
 assert.deepEqual(prepared.items, before.items);
 const sentBefore = app.calls.filter(call => call.name === 'message.send').length;
 now += 600000;
 let results = [];
 for (let tick = 0; tick < 3; tick++) {
  t.mock.timers.tick(10000);
  for (let wait = 0; wait < 100; wait++) {
   results = await store.results(owner, jobs[0].id);
   if (results[0]?.notification === 'sent') break;
   await new Promise(resolve => setTimeout(resolve, 10));
  }
  if (results[0]?.notification === 'sent') break;
 }
 const after = await (await originalFetch(`${backend}/fixture/state`)).json();
 console.log('HARVEST_CHAT=' + JSON.stringify({ live, reply, before: { harvests: before.harvests, items: before.items }, after: { harvests: after.harvests, items: after.items }, results }));
 assert.equal(after.harvests, 1);
 assert.equal(results[0]?.outcome, 'completed');
 assert.equal(results[0]?.notification, 'sent');
 assert.deepEqual(after.plots.filter(plot => plot.plotIndex !== 2), prepared.plots.filter(plot => plot.plotIndex !== 2));
 assert.equal(after.plots.find(plot => plot.plotIndex === 2).cropName, '');
 assert.equal(after.items.reduce((sum, item) => sum + item.quantity, 0) - before.items.reduce((sum, item) => sum + item.quantity, 0), 1);
 assert.match(results[0].text, /聚灵草 x1/u);
 t.mock.timers.tick(10000);
 await new Promise(resolve => setTimeout(resolve, 30));
 assert.equal((await (await originalFetch(`${backend}/fixture/state`)).json()).harvests, 1);
 const notifications = app.calls.filter(call => call.name === 'message.send').slice(sentBefore);
 assert.equal(notifications.length, 1);
 assert.equal(notifications[0].request.payload.target.targetId, 'player');
 assert.doesNotMatch(reply, /退出AI|\[\[/u);
});
