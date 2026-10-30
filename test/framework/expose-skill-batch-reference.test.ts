import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('功法批量分解 Expose 使用服务端预览引用确认原批次', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSkillBatchReference/confirm$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const extract = (name: string) => { const match = output.match(new RegExp(`${name}=(.+)`)); assert.ok(match); return JSON.parse(match[1]); };
  const prepared = extract('EXPOSE_SKILL_BATCH_PREPARE');
  const confirmed = extract('EXPOSE_SKILL_BATCH_CONFIRM');
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let stage = 'prepare';
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/skill-books.batch-decompose-${stage}-reference`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    keys.push(request.headers['idempotency-key']);
    assert.deepEqual(body.arguments, stage === 'prepare' ? { gradeId: null } : { reference: prepared.data.data.reference });
    return { status: 200, headers: {}, data: JSON.stringify(stage === 'prepare' ? prepared : confirmed) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (name: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', name, input), 'ai-plugin');
  const preview = await call('prepare_skill_batch_decomposition', {});
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value));
  if (!preview.value.ok) return;
  const quote = (preview.value.data as any).result;
  assert.deepEqual(quote.instanceIds, prepared.data.data.instanceIds);
  assert.deepEqual(quote.instances, prepared.data.data.instances);
  assert.equal(quote.preview.processCount, quote.instanceIds.length);
  const refreshed = await call('prepare_skill_batch_decomposition', {});
  assert.equal(refreshed.value.ok, true, JSON.stringify(refreshed.value));
  assert.notEqual(keys[0], keys[1]);
  stage = 'confirm';
  const result = await call('confirm_skill_batch_decomposition', { reference: quote.reference });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.decomposedCount, quote.instanceIds.length);
});
