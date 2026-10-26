import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrated = JSON.parse(readFileSync(new URL('../test/framework/migrated-files.json', import.meta.url), 'utf8'));
const usesGo = source => /goTestFixture\s*\(|execFileSync\s*\(\s*['"]go['"]/.test(source);
let files = [
  ...readdirSync(new URL('../test/framework/', import.meta.url))
    .filter(file => file.endsWith('.test.ts'))
    .map(file => `test/framework/${file}`),
  ...migrated.map(({ file }) => `test/${file}`)
];
const offline = process.argv.includes('--offline');
const filterArg = process.argv.find(value => value.startsWith('--filter='));

if (offline) { files = files.filter(file => !usesGo(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))); }
if (filterArg) { files = files.filter(file => file.includes(filterArg.slice('--filter='.length))); }
if (!files.length) { throw new Error('No matching framework tests'); }
console.log(`Running ${files.length} framework test files${offline ? ' (without Go fixtures)' : ''}`);
let scratch;

try {
  const env = { ...process.env, LOG_LEVEL: process.env.LOG_LEVEL ?? 'off', LOG_FILE: process.env.LOG_FILE ?? 'false' };
  const goFiles = files.map(file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).filter(usesGo);

  if (goFiles.length) {
    scratch = mkdtempSync(join(tmpdir(), 'xiuxian-test-fixtures-'));
    const backend = fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url));

    for (const [pkg, key] of [
      ['httpapi', 'XIUXIAN_HTTPAPI_TEST_BINARY'],
      ['service', 'XIUXIAN_SERVICE_TEST_BINARY']
    ]) {
      if (!goFiles.some(source => source.includes(`./internal/${pkg}`))) { continue; }
      const binary = join(scratch, `${pkg}.test`);

      console.log(`Preparing Go fixture binary: internal/${pkg}`);
      execFileSync('go', ['test', '-c', '-o', binary, `./internal/${pkg}`], { cwd: backend, stdio: 'inherit' });
      env[key] = binary;
    }
  }
  const child = spawn(process.execPath, ['--import', 'tsx', '--import', './test/helpers/register-image-assets.ts', '--test', '--test-concurrency=2', '--test-timeout=120000', ...files], {
    cwd: root,
    env,
    stdio: 'inherit'
  });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });

  process.exitCode = code;
} finally {
  if (scratch) { rmSync(scratch, { recursive: true, force: true }); }
}
