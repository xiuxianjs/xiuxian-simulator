import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { getBackendThemes } from '../src/api/bot/theme-queries';
import { activateBackendTheme, deactivateBackendTheme } from '../src/api/bot/theme-state';
import { switchBackendInkMode } from '../src/api/bot/theme-ink-mode';
import { mockBackendConfig } from './backend-config-helper';

type Fixture = { operation: string; uid: number; themeId: number; mode: 'ink' | 'dark'; response: Record<string, unknown> };

test('actual theme query and committed state responses pass robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestThemeResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024
  });
  const match = output.match(/THEME_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go theme responses missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Fixture>;
  let payload: unknown;
  let calls = 0;
  const server = createServer((_request, response) => {
    calls++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-theme-contract' });
  const context = { idempotencyKey: 'theme-contract', requestId: 'theme-contract' };
  const run = (entry: Fixture) => {
    if (entry.operation === 'list') return getBackendThemes('bid', entry.uid);
    if (entry.operation === 'activate') return activateBackendTheme('bid', entry.uid, entry.themeId, context);
    if (entry.operation === 'deactivate') return deactivateBackendTheme('bid', entry.uid, context);
    return switchBackendInkMode('bid', entry.uid, entry.mode, context);
  };
  try {
    for (const [key, entry] of Object.entries(fixtures)) {
      payload = { ...entry.response, extra: 'discard' };
      assert.deepEqual(await run(entry), entry.response, key);
    }
    const raw = fixtures.listRaw.response;
    const themes = raw.themes as Record<string, unknown>[];
    const permission = raw.permission as Record<string, unknown>;
    for (const invalid of [undefined, null, '1', 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...raw, permission: { ...permission, maxCustomSlots: invalid } };
      await assert.rejects(() => run(fixtures.listRaw), /主题查询接口数据不完整/);
      for (const field of ['id', 'sortOrder']) {
        payload = { ...raw, themes: [{ ...themes[0], [field]: invalid }] };
        await assert.rejects(() => run(fixtures.listRaw), /主题查询接口数据不完整/);
      }
    }
    for (const invalid of [undefined, null, 0, {}, ['system']]) {
      payload = { ...raw, themes: [{ ...themes[0], source: invalid }] };
      await assert.rejects(() => run(fixtures.listRaw), /主题查询接口数据不完整/);
    }
    for (const key of ['activateNullName', 'inkObject']) {
      const entry = fixtures[key];
      const field = entry.operation === 'activate' ? 'outcome' : 'code';
      for (const invalid of [undefined, null, 0, {}, [entry.response[field]]]) {
        payload = { ...entry.response, [field]: invalid };
        await assert.rejects(() => run(entry), /响应不完整/);
      }
    }
    payload = { ...fixtures.activateNullName.response, id: 2 };
    await assert.rejects(() => run(fixtures.activateNullName), /切换主题响应不完整/);
    payload = { code: 'OK', mode: 'ink' };
    await assert.rejects(() => run(fixtures.inkObject), /墨色模式响应不完整/);
    for (const invalid of [undefined, null, 0, 'true', []]) {
      payload = { removed: invalid };
      await assert.rejects(() => run(fixtures.deactivate), /关闭主题响应不完整/);
    }
    // Preserve the existing command's out-of-int64 Number handling without a request.
    const before = calls;
    assert.deepEqual(await activateBackendTheme('bid', 1, 1e21, context), { outcome: 'not_found', id: null, name: null });
    assert.equal(calls, before);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
