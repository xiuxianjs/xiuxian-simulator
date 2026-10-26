import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Router, FormatEvent, logger, getCurrentEvent } from 'alemonjs';
import axios from 'axios';
import { requestBackend } from '../../src/api/bot/client.ts';
import { createBackendRequestContext } from '../../src/api/bot/context.ts';
import { withProcessorTrace } from '../../node_modules/alemonjs/lib/application/runtime/hook-event-context.js';
import { mockBackendConfig } from '../backend-config-helper.ts';
import { measureTransportStage, measureTransportStageSync, startTransportEvent } from '../../src/utils/transportTiming.ts';
import { getEventTransportDiagnosticContext } from '../../src/api/bot/context.ts';
import { analyzeBotTimings } from '../../tools/analyze-bot-timings.mjs';
import { normalizeBotTimingLogs } from '../../tools/normalize-bot-timing-logs.mjs';
const source = fs.readFileSync(new URL('../../src/router.ts', import.meta.url), 'utf8');
function routeWithModule(command, moduleURL, entryImporter) {
  const match = source.match(command === '商店' ? /xiuxian\.use\('商店', [\s\S]*?\);/ : /xiuxian\.use\(\['副本列表', '查看主线', '主线列表'\], [\s\S]*?\);/);
  assert.ok(match, 'actual production route registration');
  const modulePath = command === '商店' ? '@src/response/shop/hub/res' : '@src/response/storyline/list/res';
  assert.equal(match[0].split("measureTransportStage('route.import'").length, 2);
  assert.equal(match[0].split(`import('${modulePath}')`).length, 2);
  const app = Router.create({ events: ['message.create'] });
  const xiuxian = app.group(
    { events: ['message.create'], routeText: { prefixes: ['/', '#', '＃', '!', '！'], stripPrefix: true, allowBare: true } },
    ...(entryImporter ? [entryImporter] : [])
  );
  // Execute the actual production registration/loader expression; substitute only
  // its module specifier with a local fixture, never execute the QQ handler.
  Function('xiuxian', 'measureTransportStage', match[0].replace(modulePath, moduleURL))(xiuxian, measureTransportStage);
  return app;
}
function event(command) {
  return { ...FormatEvent.create('message.create').value, Platform: 'qq-bot', UserId: 'PRIVATE-UID', MessageId: 'PRIVATE-ID', MessageText: `/${command}` };
}
void test('real Router cold/hot imports retain the processor context, module cache and subsequent stage identity', async t => {
  mockBackendConfig(t, { api_url: 'https://route-import.test', robot_auth_token: 'PRIVATE-TOKEN', log_api_timings: true, log_transport_timings: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-import-native-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const logs = [];
  let successfulImports = 0;
  t.mock.method(logger, 'info', (_label, row) => {
    logs.push(row);
    if (row?.stage === 'route.import' && ++successfulImports === 4) throw new Error('logger failure');
  });
  let httpCalls = 0;
  t.mock.method(axios, 'create', () => ({
    request: async config => {
      httpCalls++;
      assert.equal(config.method, 'POST');
      return { status: 200, headers: {}, data: '{"data":{}}' };
    }
  }));
  const entryImporter = () => async (e, next) => {
    const request = createBackendRequestContext(e);
    assert.ok(request.idempotencyKey);
    await requestBackend(e.UserId, 'post_robot_command_entry', {
      body: { checkMute: true, playerEntry: true, trackOperation: false, messageText: e.MessageText },
      ...request
    });
    await next();
  };
  let loads = 0,
    calls = 0;
  const contexts = [];
  const key = `routeImportFixture${Date.now()}`;
  globalThis[key] = {
    loaded() {
      loads++;
      assert.ok(getCurrentEvent());
    },
    async execute(e) {
      calls++;
      contexts.push(getCurrentEvent());
      assert.equal(getCurrentEvent(), e);
      measureTransportStageSync('response.build', () => undefined);
      await measureTransportStage('platform.send', async () => ({ code: 4000 }));
    }
  };
  t.after(() => delete globalThis[key]);
  for (const command of ['商店', '查看主线']) {
    const moduleFile = path.join(dir, command === '商店' ? 'shop.mjs' : 'storyline.mjs');
    fs.writeFileSync(moduleFile, `globalThis[${JSON.stringify(key)}].loaded();\nexport default e=>globalThis[${JSON.stringify(key)}].execute(e);`);
    const app = routeWithModule(command, pathToFileURL(moduleFile).href, entryImporter);
    for (let i = 0; i < 2; i++) {
      const e = event(command);
      startTransportEvent(e);
      const result = await withProcessorTrace('message.create', e, async () => {
        if (i === 0) return app.dispatch(e);
        // Production registers router.current: cover its actual scope adapter too.
        const current = await app.define.current[0].handler();
        await current(e, () => assert.fail('matched route must not fall through'));
        return { reason: 'handler_completed' };
      });
      assert.equal(result.reason, 'handler_completed');
      const diagnostic = getEventTransportDiagnosticContext(e);
      const rows = logs.filter(x => x?.eventTraceId === diagnostic.eventTraceId);
      assert.deepEqual(
        rows.map(x => x.stage ?? x.operationId),
        ['post_robot_command_entry', 'route.import', 'response.build', 'platform.send']
      );
      assert.ok(rows.every(x => x.eventKind === 'message' && x.commandKey === diagnostic.commandKey));
      assert.equal(new Set(rows.map(x => x.requestId)).size, 1);
      assert.ok(rows[0].elapsedFromEventStartMs <= rows[1].startedFromEventStartMs);
      assert.ok(rows[1].elapsedFromEventStartMs <= rows[2].startedFromEventStartMs);
      const normalized = normalizeBotTimingLogs(rows.map(x => JSON.stringify(x)).join('\n'));
      const sample = analyzeBotTimings(normalized.jsonl).samples[0];
      assert.equal(sample.eventTraceId, diagnostic.eventTraceId);
      assert.equal(sample.phases['route-import'].observedSpanCount, 1);
      assert.equal(sample.phases.entry.observedSpanCount, 1);
      assert.equal(sample.phases['response-build'].observedSpanCount, 1);
      assert.equal(sample.phases['send-attempt'].observedSpanCount, 1);
    }
  }
  assert.equal(successfulImports, 4);
  assert.equal(httpCalls, 4);
  assert.equal(loads, 2);
  assert.equal(calls, 4);
  assert.equal(contexts.length, 4);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE|shop\.mjs|storyline\.mjs|code/);
});
void test('native import rejection stays identical, is timed, and cannot be replaced by logger failure', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-import-failure-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const key = `routeImportError${Date.now()}`,
    failure = new Error('PRIVATE-IMPORT-ERROR');
  globalThis[key] = failure;
  t.after(() => delete globalThis[key]);
  const file = path.join(dir, 'failure.mjs');
  fs.writeFileSync(file, `throw globalThis[${JSON.stringify(key)}];`);
  const app = routeWithModule('商店', pathToFileURL(file).href),
    logs = [];
  let attempts = 0;
  t.mock.method(logger, 'info', (_label, row) => {
    attempts++;
    logs.push(row);
    if (attempts === 2) throw new Error('logger failure');
  });
  for (let i = 0; i < 2; i++) {
    const e = event('商店');
    startTransportEvent(e);
    await assert.rejects(
      withProcessorTrace('message.create', e, () => app.dispatch(e)),
      err => err === failure
    );
  }
  assert.equal(attempts, 2);
  assert.deepEqual(
    logs.map(x => x.outcome),
    ['rejected', 'rejected']
  );
  assert.ok(logs.every(x => x.stage === 'route.import' && x.eventTraceId));
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE|logger failure|failure\.mjs/);
});
void test('native cold import retains disabled fast suppression and existing slow threshold logging', async t => {
  mockBackendConfig(t, { log_transport_timings: false });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-import-threshold-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let clock = 0,
    executions = 0,
    evaluations = 0;
  t.mock.method(performance, 'now', () => clock);
  const logs = [];
  t.mock.method(logger, 'info', (_label, row) => logs.push(row));
  const key = `routeImportThreshold${Date.now()}`;
  globalThis[key] = {
    loaded() {
      evaluations++;
      clock += 1500;
    },
    execute() {
      executions++;
    }
  };
  t.after(() => delete globalThis[key]);
  const file = path.join(dir, 'threshold.mjs');
  fs.writeFileSync(file, `globalThis[${JSON.stringify(key)}].loaded();\nexport default ()=>globalThis[${JSON.stringify(key)}].execute();`);
  const app = routeWithModule('商店', pathToFileURL(file).href);
  for (let i = 0; i < 2; i++) {
    const e = event('商店');
    startTransportEvent(e);
    await withProcessorTrace('message.create', e, () => app.dispatch(e));
  }
  assert.equal(evaluations, 1);
  assert.equal(executions, 2);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].stage, 'route.import');
  assert.equal(logs[0].durationMs, 1500);
});
