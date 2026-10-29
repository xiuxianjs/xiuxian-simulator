import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const entries = JSON.parse(readFileSync(new URL('test/framework/migrated-files.json', root), 'utf8'));

assert.equal(new Set(entries.map(entry => entry.file)).size, entries.length, 'Duplicate migration entry');
const leftovers = [];
let goFixtures = 0;
const sharedFixture = readFileSync(new URL('test/framework/fixture.ts', root), 'utf8');

assert.ok(/createTestApp\s*\(/.test(sharedFixture) && /app\.dispose\s*\(/.test(sharedFixture), 'shared game fixture must create and dispose its test app');

for (const { file } of entries) {
  const source = readFileSync(new URL(`test/${file}`, root), 'utf8');

  const usesSharedFixture = /import\s*\{[^}]*\bgameFixture\b[^}]*\}\s*from\s*['"]\.\/framework\/fixture(?:\.ts)?['"]/.test(source) && /\bgameFixture\s*\(/.test(source);

  assert.ok(/createPresentationHarness|createTestApp/.test(source) || usesSharedFixture, `${file}: missing framework harness`);
  assert.ok(!/withEventContext/.test(source), `${file}: direct legacy context binding`);
  assert.ok(!/export const useMessage\s*=/.test(source), `${file}: mocked message hook`);
  if (/goTestFixture\s*\(|execFileSync\s*\(\s*['"]go['"]/.test(source)) { goFixtures++; }
}
for (const file of readdirSync(new URL('test/', root)).filter(file => !file.startsWith('.') && /\.test\.mjs$/.test(file))) {
  const source = readFileSync(new URL(`test/${file}`, root), 'utf8');

  if (/withEventContext/.test(source)) { leftovers.push(file); }
}
assert.deepEqual(leftovers, [], 'Runtime tests still using direct context binding');
console.log(
  JSON.stringify(
    {
      migratedFiles: entries.length,
  legacyAdapterFiles: entries.filter(entry => entry.mode === 'adapter').length,
  directMigratedFiles: entries.filter(entry => entry.mode === 'direct').length,
      goFixtureFiles: goFixtures,
      noGoFixtureFiles: entries.length - goFixtures,
      directFrameworkFiles: readdirSync(new URL('test/framework/', root)).filter(file => file.endsWith('.test.ts')).length,
      remainingDirectContextTests: leftovers,
      root: fileURLToPath(root)
    },
    null,
    2
  )
);
