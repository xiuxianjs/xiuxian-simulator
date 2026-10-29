import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildTransferOriginalReference$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUILD_TRANSFER_REF=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], bid: row[2], envelope: JSON.parse(row[3]) }));
const find = (op: string) => rows.find(row => row.op === op && row.bid === 'player' && row.envelope.data.success);
const targets = find('guild.transfer-candidates-reference'); const preview = find('guild.transfer-prepare-reference'); const confirmed = find('guild.transfer-confirm-reference');
assert.ok(targets && preview && confirmed);
test('宗主转让绑定原成员、预览引用和服务端结算回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = targets; let args: any = {}; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data; assert.deepEqual(body.arguments, args);
    keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  let run = await call('get_guild_transfer_targets', {}); assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.ok((run.value.data as any).result.candidates.some((r: any) => r.userId === 2));
  current = preview; args = { targetId: 2 }; run = await call('prepare_guild_leadership_transfer', { targetUid: 2 });
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  const ref = preview.envelope.data.data.reference; if (run.value.ok) assert.equal((run.value.data as any).result.reference, ref);
  current = confirmed; args = { reference: ref };
  for (let i = 0; i < 2; i++) { run = await call('confirm_guild_leadership_transfer', args); assert.equal(run.value.ok, true, JSON.stringify(run.value)); if (run.value.ok) assert.equal((run.value.data as any).result.targetUserId, 2); }
  assert.equal(keys.at(-1), keys.at(-2)); assert.deepEqual(run.messages, []);
  assert.equal((await call('confirm_guild_leadership_transfer', { reference: 'invalid' })).value.ok, false);
});
