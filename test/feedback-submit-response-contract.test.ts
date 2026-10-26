import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getBackendFeedbackCategories, submitBackendFeedback } from '../src/api/bot/feedback-submit';
import { mockBackendConfig } from './backend-config-helper';

test('real feedback submission outcomes and persisted identifiers pass the robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestFeedbackSubmit(ResponseContract|LocalDayAndAtomicInsert|FailureOrdering|NodeReference)$', '-count=1', '-v'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/FEEDBACK_SUBMIT_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match);
  const fixtures = JSON.parse(match[1]) as Record<string, unknown>;
  let payload: unknown;
  let calls = 0;
  const requests: Array<{ url: string; body: unknown; key?: string }> = [];
  const server = createServer(async (req, res) => {
    calls++;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString();
    requests.push({url: req.url ?? '', body: text ? JSON.parse(text) : null, key: req.headers['idempotency-key'] as string | undefined});
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({data: payload}));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {server.closeAllConnections(); server.close();});
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, {api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token'});
  const context = {requestId: 'contract-feedback', idempotencyKey: 'feedback-message'};
  for (const [name, fixture] of Object.entries(fixtures)) {
    payload = fixture;
    if (name.startsWith('categories')) {
      const result = await getBackendFeedbackCategories('one');
      assert.deepEqual(result, (fixture as Array<{id:number;name:string}>).map(row => ({id: row.id, name: row.name})));
      assert.equal(requests.at(-1)?.url, '/api/v1/feedback/categories');
    } else {
      assert.deepEqual(await submitBackendFeedback('one', 1, '这是测试反馈有效内容', context), fixture, name);
      assert.deepEqual(requests.at(-1), {url:'/api/v1/feedback',body:{categoryId:1,content:'这是测试反馈有效内容'},key:'feedback-message'});
    }
  }
  for (const [source, field] of [['submitted','feedbackId'], ['limit','pendingCount']] as const) {
    for (const invalid of [null, '1', 1.25, -1, Number.MAX_SAFE_INTEGER + 1]) {
      payload = {...fixtures[source] as object, [field]: invalid};
      await assert.rejects(submitBackendFeedback('one', 1, '这是测试反馈有效内容', context), /反馈提交响应不完整/);
    }
  }
  for (const invalid of [0, -1, 1.25, '1', Number.MAX_SAFE_INTEGER+1]) {
    payload = [{id: invalid, name: '建议'}];
    await assert.rejects(getBackendFeedbackCategories('one'), /反馈分类响应不完整/);
  }
  const before = calls;
  for (const bid of [undefined, '', '  ']) {
    await assert.rejects(getBackendFeedbackCategories(bid), /缺少平台身份/);
    await assert.rejects(submitBackendFeedback(bid, 1, '这是测试反馈有效内容', context), /缺少平台身份/);
  }
  assert.equal(calls, before);
});
