import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSkillResetReference$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/SKILL_RESET_REFERENCE=([^|]+)\|(.+)/g)].map(row => ({ key: row[1], envelope: JSON.parse(row[2]) }));
test('功法重制以原预览引用确认并返回实际返还', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const preview = fixtures.find(row => row.key === 'preview'); const confirm = fixtures.find(row => row.key === 'confirm'); assert.ok(preview && confirm);
  let operation = 'skill-books.reset-preview-reference'; let envelope = structuredClone(preview.envelope); let args: any = { bookId: 2 };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data; assert.deepEqual(body.arguments, args);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const prepared = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'prepare_skill_reset', args), 'ai-plugin');
  assert.equal(prepared.value.ok, true, JSON.stringify(prepared.value)); if (!prepared.value.ok) return;
  const refreshed = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'prepare_skill_reset', args), 'ai-plugin');
  assert.equal(refreshed.value.ok, true, JSON.stringify(refreshed.value));
  assert.notEqual(keys[0], keys[1]);
  const quote = (prepared.value.data as any).result; assert.equal(quote.skillBook.id, 2); assert.equal(quote.refundInfo.exp, 3200);
  operation = 'skill-books.reset-confirm-reference'; args = { reference: quote.reference }; envelope = structuredClone(confirm.envelope);
  const response = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'confirm_skill_reset', args), 'ai-plugin');
  assert.equal(response.value.ok, true, JSON.stringify(response.value)); if (response.value.ok) assert.equal((response.value.data as any).result.refundInfo.exp, 3200);
});
