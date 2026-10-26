import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { getConfig } from 'alemonjs';
import { getMinioClient, uploadFile } from '../src/utils/minio';

function setup(t: TestContext, bucket: string) {
  t.mock.getter(getConfig(), 'value', () => ({ 'xiuxian-game': { minio: {
    endpoint: 'storage.test', port: 9000, secure: false,
    access_key: 'test-only-key', secret_key: 'test-only-secret', bucket_name: bucket
  } } }));
  const client = getMinioClient();
  assert.ok(client);
  return client;
}

test('concurrent uploads check and create the bucket once while uploading every distinct file', async t => {
  const client = setup(t, 'concurrent-images');
  let finish!: (exists: boolean) => void;
  let checks = 0;
  let creates = 0;
  const objects: string[] = [];
  t.mock.method(client, 'bucketExists', () => {
    checks++;
    return new Promise<boolean>(resolve => { finish = resolve; });
  });
  t.mock.method(client, 'makeBucket', async () => { creates++; });
  t.mock.method(client, 'putObject', async (_bucket: string, object: string) => {
    objects.push(object);
    return { etag: 'test', versionId: null };
  });
  const uploads = Array.from({ length: 5 }, (_, i) => uploadFile('xiuxian', `player-${i}`, Buffer.from('image'), 'image/png'));
  await Promise.resolve();
  assert.equal(checks, 1);
  assert.equal(objects.length, 0);
  finish(false);
  assert.ok((await Promise.all(uploads)).every(result => result.success));
  assert.equal(creates, 1);
  assert.equal(new Set(objects).size, 5);
  assert.equal((await uploadFile('xiuxian', 'another-player', Buffer.from('image'), 'image/png')).success, true);
  assert.equal(checks, 1);
});

test('a shared bucket failure reaches each caller and a later request can retry', async t => {
  const client = setup(t, 'failed-images');
  let checks = 0;
  let uploads = 0;
  t.mock.method(client, 'bucketExists', async () => {
    checks++;
    if (checks === 1) throw new Error('storage unavailable');
    return true;
  });
  t.mock.method(client, 'putObject', async () => {
    uploads++;
    return { etag: 'test', versionId: null };
  });
  const results = await Promise.all(Array.from({ length: 3 }, () => uploadFile('xiuxian', 'player', Buffer.from('image'), 'image/png')));
  assert.ok(results.every(result => !result.success && result.message === 'storage unavailable'));
  assert.equal(checks, 1);
  assert.equal(uploads, 0);
  assert.equal((await uploadFile('xiuxian', 'player', Buffer.from('image'), 'image/png')).success, true);
  assert.equal(checks, 2);
  assert.equal(uploads, 1);
});
