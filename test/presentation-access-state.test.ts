import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invalidatePresentationAccess, presentationAccessFor } from '../src/api/bot/presentation-access-state';

test('failed access can recover while successful concurrent reads stay shared', async () => {
  const event = { UserId: 'player' };
  let calls = 0;
  const read = async () => { calls++; throw new Error('timeout'); };
  const first = presentationAccessFor(event, read);
  assert.equal(presentationAccessFor(event, read), first);
  await assert.rejects(first, /timeout/);
  const recovered = presentationAccessFor(event, async () => { calls++; return { guilds: true }; });
  assert.deepEqual(await recovered, { guilds: true });
  assert.equal(presentationAccessFor(event, read), recovered);
  assert.equal(calls, 2);
});

test('old failure cannot clear a replacement access snapshot', async () => {
  const event = { UserId: 'player' };
  let reject!: (error: Error) => void;
  const old = presentationAccessFor(event, () => new Promise((_, fail) => { reject = fail; }));
  invalidatePresentationAccess(event);
  const replacement = presentationAccessFor(event, async () => ({ guilds: false }));
  reject(new Error('old timeout'));
  await assert.rejects(old);
  assert.equal(presentationAccessFor(event, async () => ({ guilds: true })), replacement);
  assert.deepEqual(await replacement, { guilds: false });
});
