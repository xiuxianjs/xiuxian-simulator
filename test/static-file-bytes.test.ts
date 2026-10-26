import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtemp, writeFile, rename, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StaticFileBytesCache } from '../src/utils/staticFileBytes';

class ObservedCache extends StaticFileBytesCache {
  reads = 0;
  fail = false;
  release?: () => void;
  hold = false;
  protected override async readBytes() {
    this.reads++;
    const bytes = await super.readBytes();
    if (this.hold) await new Promise<void>(resolve => { this.release = resolve; });
    if (this.fail) throw new Error('synthetic read failure');
    return bytes;
  }
}

async function fixture(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'bot-static-file-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'guild.png');
  await writeFile(path, 'old');
  return { dir, path };
}

test('same version concurrent reads join; warm call validates stat and reuses bytes', async t => {
  const { path } = await fixture(t);
  const cache = new ObservedCache(path);
  cache.hold = true;
  const jobs = [cache.load(), cache.load(), cache.load()];
  while (!cache.release) await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(cache.reads, 1);
  cache.release();
  const bytes = await Promise.all(jobs);
  assert.deepEqual(bytes.map(x => x.toString()), ['old', 'old', 'old']);
  assert.strictEqual(bytes[0], bytes[1]);
  assert.strictEqual(await cache.load(), bytes[0]);
  assert.equal(cache.reads, 1);
});

test('path and file stat changes invalidate; same-size atomic replacement cannot reuse old bytes', async t => {
  const { dir, path } = await fixture(t);
  const cache = new ObservedCache(path);
  assert.equal((await cache.load()).toString(), 'old');
  const replacement = join(dir, 'replacement.png');
  await writeFile(replacement, 'new');
  await rename(replacement, path);
  assert.equal((await cache.load()).toString(), 'new');
  await writeFile(path, 'longer');
  assert.equal((await cache.load()).toString(), 'longer');
  assert.equal(cache.reads, 3);
  const otherPath = join(dir, 'other.png');
  await writeFile(otherPath, 'other');
  assert.equal((await new ObservedCache(otherPath).load()).toString(), 'other');
});

test('failed reads and missing stat are not cached; retry recovers without old bytes', async t => {
  const { path } = await fixture(t);
  const cache = new ObservedCache(path);
  cache.fail = true;
  await assert.rejects(cache.load(), /synthetic read failure/);
  cache.fail = false;
  assert.equal((await cache.load()).toString(), 'old');
  await unlink(path);
  await assert.rejects(cache.load(), /ENOENT/);
  await writeFile(path, 'fresh');
  assert.equal((await cache.load()).toString(), 'fresh');
  assert.equal(cache.reads, 3);
});

test('older pending read completing after a replacement does not overwrite newer cache', async t => {
  const { dir, path } = await fixture(t);
  const cache = new ObservedCache(path);
  cache.hold = true;
  const older = cache.load();
  while (!cache.release) await new Promise<void>(resolve => setImmediate(resolve));
  const releaseOlder = cache.release;
  const replacement = join(dir, 'replacement.png');
  await writeFile(replacement, 'new');
  await rename(replacement, path);
  cache.hold = false;
  assert.equal((await cache.load()).toString(), 'new');
  releaseOlder();
  assert.equal((await older).toString(), 'old');
  assert.equal((await cache.load()).toString(), 'new');
  assert.equal(cache.reads, 2);
});

test('joined failed job rejects every waiter and releases the job for a later retry', async t => {
  const { path } = await fixture(t);
  const cache = new ObservedCache(path);
  cache.hold = true;
  cache.fail = true;
  const results = Promise.allSettled([cache.load(), cache.load()]);
  while (!cache.release) await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(cache.reads, 1);
  cache.release();
  assert.deepEqual((await results).map(x => x.status), ['rejected', 'rejected']);
  cache.hold = false;
  cache.fail = false;
  assert.equal((await cache.load()).toString(), 'old');
  assert.equal(cache.reads, 2);
});
