import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeDecomposition$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_DECOMPOSITION_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('装备与功法分解使用真实实例回执，预览与重试保持各自语义', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected, read] of [
    ['equipment.batch-decompose-query', 'preview_equipment_batch_decomposition', {}, { gradeName: '' }, true],
    ['skill-books.batch-decompose-query', 'preview_skill_batch_decomposition', {}, { gradeName: '' }, true],
    ['equipment.decompose', 'decompose_equipment', { instanceId: 2 }, { instanceId: '2' }, false],
    ['skill-books.decompose', 'decompose_skill_book', { instanceId: 2 }, { bookId: '2' }, false]
  ] as const) {
    op = operation; args = expected; envelope = structuredClone(fixtures.find(row => row.op === op)?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok && !read) assert.equal((response.value.data as any).result.instanceId, 2);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (!read) { envelope.data.data.instanceId = 3; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
});
