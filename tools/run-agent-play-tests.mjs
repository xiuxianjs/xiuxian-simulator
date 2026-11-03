import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../', import.meta.url));
const host = process.env.AGENT_LINK_ROOT || join(root, '../alemonjs-agent-link');
const framework = process.env.AGENT_PLAY_FRAMEWORK_ROOT || join(host, 'node_modules/alemonjs');
const scratch = mkdtempSync(join(host, '.plugin-lifecycle-test-'));
const filter = process.argv.find(arg => arg.startsWith('--filter='))?.slice(9);
try {
  const outputs = [];
  for (const name of readdirSync(join(root, 'test/agent-play')).filter(name => name.endsWith('.test.mjs') && (!filter || name.includes(filter)))) {
    const outfile = join(scratch, name);
    await build({ entryPoints: [join(root, 'test/agent-play', name)], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'shared-framework', setup(builder) {
      builder.onResolve({ filter: /alemonjs-agent-link\/lib\// }, args => ({ path: join(host, 'lib', args.path.split('alemonjs-agent-link/lib/')[1]) }));
      builder.onResolve({ filter: /^alemonjs(?:\/testing)?$/ }, args => ({ path: join(framework, 'lib', args.path.endsWith('/testing') ? 'testing/index.js' : 'index.js'), external: true }));
    } }] });
    outputs.push(outfile);
  }
  if (!outputs.length) throw new Error('No agent play tests selected');
  const child = spawn(process.execPath, ['--test', '--test-force-exit', ...outputs], { cwd: host, env: { ...process.env, LOG_FILE: 'false', LOG_LEVEL: process.env.AGENT_PLAY_LOG_LEVEL || 'off' }, stdio: 'inherit' });
  process.exitCode = await new Promise(resolve => child.on('exit', code => resolve(code ?? 1)));
} finally { rmSync(scratch, { recursive: true, force: true }); }
