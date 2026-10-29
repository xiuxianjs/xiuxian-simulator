import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessEmailQueriesV1ParityReadLifecycleAndReplay|TestRobotBusinessEmailActionsSettlementConfirmationPartialAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const detail = [...output.matchAll(/ROBOT_EMAIL_QUERY_RESPONSE=emails\.detail\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
const deletes = [...output.matchAll(/ROBOT_EMAIL_ACTION_RESPONSE=emails\.delete-all\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
assert.ok(detail.some(row => row.data.success) && detail.some(row => !row.data.success));
assert.ok(deletes.some(row => row.data.success) && deletes.some(row => !row.data.success));
test('邮件详情和批量删除保留真实回执及重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = detail[0]; let op = 'emails.detail'; let args: any = {};
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of detail) {
    const id = current.data.success ? current.data.data.id : 999;
    args = { idText: String(id), idValue: String(id) };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_email_detail', { emailId: id }), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.data.success);
    if (result.success && result.branch === 'business') {
      assert.equal(result.result.emailId, id);
      assert.equal(result.result.state, current.data.data.state);
      assert.deepEqual(JSON.parse(result.result.goodsJson), current.data.data.goods);
      assert.equal(result.result.canClaim, current.data.data.canClaim);
    } else assert.equal(result.result, undefined);
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
  op = 'emails.delete-all'; args = {};
  for (current of deletes) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'delete_read_emails', {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.data.success);
    if (result.success && result.branch === 'business') assert.deepEqual(result.result, current.data.data);
    else assert.equal(result.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
