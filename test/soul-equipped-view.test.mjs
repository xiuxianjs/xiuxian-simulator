import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('equipped projection preserves frozen full handler output and explicit error boundaries', () => {
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const output = execFileSync(process.execPath, [
    '--import', 'tsx', '--test', '--test-force-exit',
    fileURLToPath(new URL('./fixtures/soul-equipped-view-harness.ts', import.meta.url))
  ], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', env: childEnv, maxBuffer: 1024 * 1024 });
  assert.match(output, /# tests 1/);
  assert.match(output, /# pass 1/);
  assert.match(output, /# fail 0/);
});
