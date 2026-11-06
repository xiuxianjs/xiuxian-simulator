import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';
import { PublicCatalogCache } from '../src/api/bot/public-catalog-cache';

after(() => shutdownLogger());
const args = { page: 1, pageSize: 20 };
const version = `c1_${'a'.repeat(64)}`;
const newer = `c1_${'b'.repeat(64)}`;
const page = { items: [{ id: 1, name: '类型' }], total: 1, ...args };
const full = { ...page, catalogVersion: version };
const same = { catalogNotModified: true, catalogVersion: version };
const identity = (data: unknown) => data;
const prepare = (cache: PublicCatalogCache, scope = 'official', input = args) => cache.prepare(scope, 'base.skill-types', input)!;

test('only bounded public page requests participate; scope/page/type are isolated', () => {
  const cache = new PublicCatalogCache();
  for (const operation of ['forge.overview', 'account.register', 'alchemy.preview']) {
    assert.equal(cache.prepare('official', operation, args), undefined);
  }
  for (const input of [{ ...args, uid: 2 }, { ...args, page: 0 }, { ...args, pageSize: 101 }]) {
    assert.equal(cache.prepare('official', 'base.skill-types', input), undefined);
  }
  prepare(cache).decode(full, identity);
  assert.equal(prepare(cache).arguments.knownVersion, version);
  assert.equal(prepare(cache, 'channel').arguments.knownVersion, '');
  assert.equal(prepare(cache, 'official', { ...args, page: 2 }).arguments.knownVersion, '');
  assert.equal(cache.prepare('official', 'base.grades', args)!.arguments.knownVersion, '');
});

test('captured validator keeps its exact copy across concurrent replacement and caller mutation', () => {
  const cache = new PublicCatalogCache();
  prepare(cache).decode(full, data => { (data as typeof page).items[0].name = 'mutated'; });
  const inFlight = prepare(cache);
  prepare(cache).decode({ ...full, items: [{ id: 1, name: '新类型' }], catalogVersion: newer }, identity);
  assert.deepEqual(inFlight.decode(same, identity), page);
  assert.equal(prepare(cache).arguments.knownVersion, newer);
  (inFlight.decode(same, identity) as typeof page).items[0].name = 'mutated again';
  assert.deepEqual(inFlight.decode(same, identity), page);
});

test('invalid responses and failed domain decode never populate the cache', () => {
  const cache = new PublicCatalogCache();
  for (const data of [same, { ...full, catalogVersion: 'bad' }, { ...full, page: 2 }, { ...full, total: 0 },
    { ...full, items: [{ id: 1, name: '类型', playerId: 1 }] }, { ...full, items: [{ id: 0, name: '类型' }] }]) {
    assert.throws(() => prepare(cache).decode(data, identity));
    assert.equal(prepare(cache).arguments.knownVersion, '');
  }
  assert.throws(() => prepare(cache).decode(full, () => { throw new Error('decode failed'); }));
  assert.equal(prepare(cache).arguments.knownVersion, '');
  assert.deepEqual(prepare(cache).decode(page, identity), page);
  assert.equal(prepare(cache).arguments.knownVersion, '', 'legacy response has no validator');
  prepare(cache).decode(full, identity);
  for (const data of [{ ...same, catalogVersion: newer }, { ...same, items: [] }, { ...same, catalogNotModified: false }]) {
    assert.throws(() => prepare(cache).decode(data, identity));
  }
});

test('retention, LRU count and byte limits bound memory; in-flight copies survive eviction', () => {
  let now = 0;
  const cache = new PublicCatalogCache({ entries: 2, bytes: 1024, entryBytes: 512, retentionMs: 10 }, () => now);
  prepare(cache, 'a').decode(full, identity);
  prepare(cache, 'b').decode(full, identity);
  const saved = prepare(cache, 'a');
  prepare(cache, 'c').decode(full, identity);
  assert.equal(prepare(cache, 'b').arguments.knownVersion, '');
  assert.equal(prepare(cache, 'a').arguments.knownVersion, version);
  now = 11;
  assert.equal(prepare(cache, 'a').arguments.knownVersion, '');
  assert.deepEqual(saved.decode(same, identity), page);
  const size = Buffer.byteLength(JSON.stringify(page));
  const bytes = new PublicCatalogCache({ entries: 10, bytes: size, entryBytes: size, retentionMs: 10 }, () => now);
  prepare(bytes, 'a').decode(full, identity);
  prepare(bytes, 'b').decode(full, identity);
  assert.equal(prepare(bytes, 'a').arguments.knownVersion, '');
  assert.equal(prepare(bytes, 'b').arguments.knownVersion, version);
  prepare(bytes, 'b').decode({ ...full, items: [{ id: 1, name: '长'.repeat(100) }] }, identity);
  assert.equal(prepare(bytes, 'b').arguments.knownVersion, '');
});
