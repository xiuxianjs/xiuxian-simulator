import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import axios, { AxiosError } from 'axios';
import type { CommunityBatch } from '../../src/api/bot/notification-cache';

after(() => shutdownLogger());

test('构建产物用渠道服真实响应恢复原群通知租约', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const scratchRoot = join(root, '.tmp');
  mkdirSync(scratchRoot, { recursive: true });
  const scratch = mkdtempSync(join(scratchRoot, 'community-claim-artifact-'));
  const cwd = process.cwd();
  let stopFixture: (() => Promise<void>) | undefined;
  t.after(async () => {
    try {
      await stopFixture?.();
    } finally {
      process.chdir(cwd);
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  const binary = process.env.XIUXIAN_HTTPAPI_TEST_BINARY ?? join(scratch, 'httpapi.test');
  if (!process.env.XIUXIAN_HTTPAPI_TEST_BINARY) {
    execFileSync('go', ['test', '-c', '-ldflags=-s -w', '-o', binary, './internal/httpapi'], {
      cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)),
      stdio: 'inherit'
    });
  }
  const output = join(scratch, 'lib');
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { initConfig, getOptions, buildAndRun } from 'lvyjs';
    await initConfig();
    getOptions().build.dir = process.argv[1];
    await buildAndRun();
  `, output], { cwd: root, maxBuffer: 8 * 1024 * 1024 });

  const child = spawn(binary, ['-test.run', '^TestChannelCommunityClaimWireFixture$', '-test.timeout=30s'], {
    env: { ...process.env, XIUXIAN_CHANNEL_COMMUNITY_WIRE_FIXTURE: '1' },
    stdio: ['pipe', 'pipe', 'inherit']
  });
  const exited = once(child, 'exit');
  stopFixture = async () => {
    child.stdin.end();
    const [status] = await exited;
    assert.equal(status, 0);
  };

  let origin = '';
  let token = '';
  const lines = createInterface({ input: child.stdout });
  for await (const line of lines) {
    const ready = /^CHANNEL_COMMUNITY_FIXTURE (\S+) (\S+)$/.exec(line);
    if (!ready) continue;
    [, origin, token] = ready;
    break;
  }
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.ok(token);
  child.stdout.resume();

  process.chdir(scratch);
  const built = await import(pathToFileURL(join(output, 'api/bot/notification-cache.js')).href) as
    typeof import('../../src/api/bot/notification-cache');
  const app = createTestApp({ config: {
    'xiuxian-game': { backend: { api_url: origin, channel_mode: true, robot_auth_token: token } },
    'qq-bot': { app_id: '100017' }
  } });
  t.after(() => app.dispose());
  const postRequests: Array<{ path: string; body: object; batch: CommunityBatch | null }> = [];
  const realCreate = axios.create.bind(axios);
  let dropReplies = 2;
  t.mock.method(axios, 'create', options => {
    const client = realCreate({ ...options, proxy: false });
    return { async post(path: string, body: object, config: object) {
      const response = await client.post(path, body, config);
      if (/\/community\/claim(?:\/recover)?$/.test(path)) {
        postRequests.push({ path, body, batch: response.data.data });
        if (dropReplies > 0) {
          dropReplies--;
          throw new AxiosError('fixture lost the real HTTP reply', 'ECONNRESET');
        }
      }
      return response;
    } } as never;
  });

  const claim = async () => (await app.invoke(
    app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }),
    () => built.claimCommunityNotification('100017')
  )).value;
  await assert.rejects(claim(), /community\/claim/);
  assert.equal(postRequests.length, 2);
  assert.deepEqual(postRequests[1].body, postRequests[0].body);
  assert.ok(postRequests[0].batch?.eventId);
  assert.deepEqual(postRequests[1].batch, postRequests[0].batch);

  const restored = await claim();
  assert.ok(restored);
  assert.equal(restored.consumer, (postRequests[0].body as { consumer: string }).consumer);
  assert.equal(restored.batch.target.BotId, '100017');
  assert.deepEqual(restored.batch, postRequests[0].batch);
  assert.match(postRequests[2].path, /\/claim\/recover$/);
  assert.deepEqual(postRequests[2].body, postRequests[0].body);

  await app.invoke(app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }), () =>
    built.finishCommunityNotification(restored.batch.eventId, restored.consumer, false, false, randomUUID())
  );
  assert.ok(restored.clearRecovery);
  restored.clearRecovery();
  const remaining = await claim();
  assert.ok(remaining);
  assert.notEqual(remaining.batch.eventId, restored.batch.eventId);
  assert.notEqual(remaining.consumer, restored.consumer);
  assert.match(postRequests[3].path, /\/claim$/);
});
