import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('actual month-card handlers retain frozen bubbles and share identical render/upload jobs', () => {
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const output = execFileSync(process.execPath, [
    '--import', fileURLToPath(new URL('./fixtures/month-card-assets.mjs', import.meta.url)),
    '--import', 'tsx', '--test', '--test-force-exit',
    fileURLToPath(new URL('./fixtures/month-card-cache-harness.ts', import.meta.url))
  ], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', env: childEnv, maxBuffer: 1024 * 1024 });
  assert.match(output, /# tests 4/);
  assert.match(output, /# pass 4/);
  assert.match(output, /# fail 0/);
});
