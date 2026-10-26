import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('actual diagnostic log producers preserve authority and reconstruct separate safe event timelines', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  execFileSync(process.execPath, ['--import', 'tsx', '--test', '--test-force-exit', fileURLToPath(new URL('./fixtures/bot-diagnostic-trace-harness.ts', import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), env, stdio: 'pipe'
  });
});
