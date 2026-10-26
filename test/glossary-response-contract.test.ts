import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { getBackendGlossary, getBackendGlossaryEntry } from '../src/api/bot/glossary-queries';
import { getBackendGlossaryEditQuota, getBackendGlossaryPolicy, upsertBackendGlossary } from '../src/api/bot/glossary-upsert';
import { deleteBackendGlossary, getBackendGlossaryEditPermission } from '../src/api/bot/glossary-delete';
import { mockBackendConfig } from './backend-config-helper';

type Fixture = { operation: string; uid: number; keyword: string; content: string; data: Record<string, unknown> | null };
const entryView = (row: Record<string, unknown>) => ({ id: row.id, keyword: row.keyword, content: row.content, category: row.category, authorName: row.authorName, editCount: row.editCount, lastEditorName: row.lastEditorName });

test('actual glossary CRUD, quotas and partial commits pass robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestGlossaryResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024
  });
  const match = output.match(/GLOSSARY_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go glossary responses missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Fixture>;
  let payload: unknown;
  let body: Record<string, unknown> = {};
  const server = createServer(async (request, response) => {
    let text = '';
    for await (const chunk of request) text += chunk;
    body = text ? JSON.parse(text) as Record<string, unknown> : {};
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-glossary-contract' });
  const context = { requestId: 'glossary-contract', idempotencyKey: 'glossary-contract' };
  const run = (entry: Fixture) => {
    const bid = entry.uid === 1 ? 'one' : 'two';
    if (entry.operation === 'policy') return getBackendGlossaryPolicy(bid, entry.keyword);
    if (entry.operation === 'quota') return getBackendGlossaryEditQuota(bid);
    if (entry.operation === 'permission') return getBackendGlossaryEditPermission(bid);
    if (entry.operation === 'upsert') return upsertBackendGlossary(bid, entry.keyword, entry.content, context);
    if (entry.operation === 'delete') return deleteBackendGlossary(bid, entry.keyword, context);
    if (entry.operation === 'page') return getBackendGlossary(bid, 1, { category: '道具' });
    return getBackendGlossaryEntry(bid, entry.keyword);
  };
  try {
    for (const [key, entry] of Object.entries(fixtures)) {
      payload = entry.data;
      if (key === 'writePartial') {
        await assert.rejects(() => run(entry), /词典录入阶段失败：log；已完成：entry/);
        continue;
      }
      if (key === 'deletePartial') {
        await assert.rejects(() => run(entry), /词条状态已删除，日志写入结果未确认/);
        continue;
      }
      let expected: unknown = entry.data;
      if (entry.operation === 'permission') expected = entry.data?.allowed;
      if (entry.operation === 'entry' && entry.data) expected = entryView(entry.data);
      if (entry.operation === 'page' && entry.data) expected = { entries: (entry.data.items as Record<string, unknown>[]).map(entryView), total: entry.data.total, totalPages: 1, currentPage: 1 };
      assert.deepEqual(await run(entry), expected, key);
      if (entry.operation === 'upsert') assert.deepEqual(body, { content: entry.content, commandContent: true });
    }
    for (const key of ['policy通用', 'quotaBefore', 'created', 'deleted']) {
      const entry = fixtures[key];
      const fields = entry.operation === 'policy' ? ['keywordMaxLength', 'contentMaxLength'] : entry.operation === 'quota' ? ['dailyLimit', 'used'] : entry.operation === 'upsert' ? ['entryId', 'dailyLimit', 'used'] : ['entryId'];
      for (const field of fields) {
        for (const invalid of ['1', 0.5, Number.MAX_SAFE_INTEGER + 1, []]) {
          payload = { ...entry.data, [field]: invalid };
          await assert.rejects(() => run(entry), /响应不完整/);
        }
      }
    }
    for (const key of ['created', 'deleted']) {
      for (const invalid of [undefined, null, 0, {}, [fixtures[key].data?.outcome]]) {
        payload = { ...fixtures[key].data, outcome: invalid };
        await assert.rejects(() => run(fixtures[key]), /响应不完整/);
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
