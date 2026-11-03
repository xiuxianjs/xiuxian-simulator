// Exercise the actual npm artifact without replacing application dependencies.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const game = fileURLToPath(new URL('../', import.meta.url));
const framework = process.env.AGENT_PLAY_FRAMEWORK_SOURCE || join(game, '../alemonjs/packages/alemonjs');
const scratch = await mkdtemp(join(tmpdir(), 'packaged-agent-play-'));
const run = (command, args, cwd, env = {}) => execFileSync(command, args, {
  cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, LOG_FILE: 'false', ...env }
});
try {
  const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], framework))[0];
  console.log(`Local artifact ${packed.name}@${packed.version}: ${packed.integrity}`);
  assert.ok(packed.files.some(file => file.path === 'lib/application/background.js'), 'Build the new framework before packaging');
  await writeFile(join(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--omit=dev', join(scratch, packed.filename)], scratch);
  run(process.execPath, ['--input-type=module', '-e', 'import { createBackgroundRunner } from "alemonjs"; if (typeof createBackgroundRunner !== "function") throw new Error("Missing packaged background API")'], scratch);
  const cases = [
    { name: 'scheduled-harvest', filter: 'scheduled-harvest', env: {} },
    { name: 'full-chat', filter: 'scheduled-chat', env: { HARVEST_CHAT_TEST: '1', HARVEST_CHAT_FAILURE: '0', HARVEST_CHAT_RENDER_FAILURE: '0', HARVEST_CHAT_REJECT: '0' } },
    { name: 'full-chat-recovery', filter: 'scheduled-chat', env: { HARVEST_CHAT_TEST: '1', HARVEST_LIVE_MODEL: '0', HARVEST_CHAT_FAILURE: '1', HARVEST_CHAT_RENDER_FAILURE: '1', HARVEST_CHAT_REJECT: '1' } }
  ];
  for (const scenario of cases) {
    console.log(`Artifact verification: ${scenario.name}`);
    const output = run(process.execPath, ['tools/run-agent-play-tests.mjs', `--filter=${scenario.filter}`], game, {
      ...scenario.env, AGENT_PLAY_FRAMEWORK_ROOT: join(scratch, 'node_modules/alemonjs')
    });
    process.stdout.write(output);
    assert.match(output, /# skipped 0\b/u, 'Packaged framework tests must execute rather than skip for an unavailable API');
    assert.match(output, /# fail 0\b/u, 'Packaged framework tests must complete without failures');
  }
  console.log(`Verified scheduled gameplay against the locally built ${packed.name}@${packed.version} tarball, not the registry release. No application dependency or registry was modified.`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
