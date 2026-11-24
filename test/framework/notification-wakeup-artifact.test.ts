import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { goTestFixture } from '../helpers/go-fixture.mjs';

test('服务端 SSE 帧与机器人构建产物按队列配对', t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const scratchRoot = join(root, '.tmp');
  mkdirSync(scratchRoot, { recursive: true });
  const scratch = mkdtempSync(join(scratchRoot, 'notification-wakeup-artifact-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));

  const wire = join(scratch, 'sse.json');
  goTestFixture(['test', './internal/httpapi', '-run', '^TestNotificationRelayStreamRequiresWorkerTokenAndWakesOnSignal$', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)),
    env: { ...process.env, NOTIFICATION_WAKEUP_WIRE_OUTPUT: wire }
  });

  const output = join(scratch, 'lib');
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { initConfig, getOptions, buildAndRun } from 'lvyjs';
    await initConfig();
    getOptions().build.dir = process.argv[1];
    await buildAndRun();
  `, output], { cwd: root, maxBuffer: 8 * 1024 * 1024 });

  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  env.XIUXIAN_NOTIFICATION_STREAM_ARTIFACT = join(output, 'notification', 'stream.js');
  env.XIUXIAN_NOTIFICATION_WAKEUP_WIRE = wire;
  const result = execFileSync(process.execPath, [
    '--import', 'tsx', '--import', './test/helpers/register-image-assets.ts',
    '--test', '--test-name-pattern=SSE 按范围|投递完成不会逐条', 'test/framework/notification-failure-isolation.test.ts'
  ], {
    cwd: root,
    env,
    encoding: 'utf8'
  });
  assert.match(result, /^# pass 6$/m, result);
});
