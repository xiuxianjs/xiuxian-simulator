import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import type { NotificationTarget } from '../../src/types/notification';
import { goTestFixture } from '../helpers/go-fixture.mjs';

after(() => shutdownLogger());

test('私聊地址补写按 Go 服务回执保留和清理构建产物的待办', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const scratchRoot = join(root, '.tmp');
  mkdirSync(scratchRoot, { recursive: true });
  const scratch = mkdtempSync(join(scratchRoot, 'private-target-wire-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const wirePath = join(scratch, 'wire.json');
  goTestFixture(['test', './internal/httpapi', '-run', '^TestNotificationPrivateTargetRecoveryWire$', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)),
    env: { ...process.env, XIUXIAN_PRIVATE_TARGET_RECOVERY_WIRE_OUTPUT: wirePath }
  });
  type Reply = { status: number; body: unknown };
  const wire = JSON.parse(readFileSync(wirePath, 'utf8')) as {
    path: string;
    request: { platform: string; bid: string; target: NotificationTarget; observedAt: number };
    failed: Reply;
    recovered: Reply;
  };

  const output = join(scratch, 'lib');
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { initConfig, getOptions, buildAndRun } from 'lvyjs';
    await initConfig();
    getOptions().build.dir = process.argv[1];
    await buildAndRun();
  `, output], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  const artifact = pathToFileURL(join(output, 'notification/platformObservationOutbox.js')).href;
  const { PlatformObservationOutbox } = await import(artifact) as typeof import('../../src/notification/platformObservationOutbox');

  const calls: Array<{ path?: string; body: unknown }> = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      calls.push({ path: req.url, body: JSON.parse(raw) });
      const reply = calls.length === 1 ? wire.failed : wire.recovered;
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const app = createTestApp({ config: { 'xiuxian-game': { backend: {
    api_url: `http://127.0.0.1:${address.port}`, worker_token: 'fixture'
  } } } });
  t.after(() => app.dispose());

  let now = 1000;
  const path = join(scratch, 'observations.sqlite');
  const scope = () => 'fixture-route';
  let outbox = new PlatformObservationOutbox(path, scope, () => now);
  t.after(() => outbox.stop());
  const { platform, bid, target, observedAt } = wire.request;
  outbox.deferPrivateTarget(scope(), platform, bid, target, observedAt);
  const pending = () => {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      return db.prepare('SELECT attempts, retry_at FROM observations').all();
    } finally {
      db.close();
    }
  };
  now += 5000;
  await assert.rejects(app.run(() => outbox.flush()), { name: 'NotificationRequestError', status: 503, code: 'SERVICE_UNAVAILABLE' });
  const rows = pending();
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.ok(row);
  assert.equal(row.attempts, 1);
  assert.equal(typeof row.retry_at, 'number');
  await outbox.stop();

  outbox = new PlatformObservationOutbox(path, scope, () => now);
  now = Number(row.retry_at);
  await app.run(() => outbox.flush());
  assert.deepEqual(pending(), []);
  now += 60_000;
  await app.run(() => outbox.flush());
  assert.deepEqual(calls, Array.from({ length: 2 }, () => ({ path: wire.path, body: wire.request })));
});
