import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('task panel selected projection preserves complete public Format and strict boundaries', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  execFileSync(process.execPath, ['--import', 'tsx', '--test', '--test-force-exit', fileURLToPath(new URL('./fixtures/task-panel-selected-harness.ts', import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), env, stdio: 'pipe'
  });
});
