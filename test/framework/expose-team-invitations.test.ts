import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotTeamInvitationExposeFixture|TestRobotBusinessTeamCoreWritesLifecycleAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const inbox = JSON.parse(output.match(/ROBOT_TEAM_INVITATION_EXPOSE=(.+)/)![1]);
const invite = [...output.matchAll(/ROBOT_TEAM_CORE_RESPONSE=teams\.invite\|player\|(.+)/g)].map(row => JSON.parse(row[1])).find(row => row.data.data?.status === 0 && row.data.data?.id);
assert.ok(invite);
const invitationId = invite.data.data.id;
const acceptRows = [...output.matchAll(/ROBOT_TEAM_CORE_RESPONSE=teams\.invitation-accept\|(third|fourth)\|(.+)/g)].map(row => ({ actor: row[1], envelope: JSON.parse(row[2]) }));
assert.ok(acceptRows.some(row => row.envelope.data.success) && acceptRows.some(row => !row.envelope.data.success));

test('读取邀请并按调用者接受或拒绝越权', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = inbox;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const op = new URL(request.url).pathname.split('/').at(-1);
    assert.deepEqual(body.arguments, op === 'teams.invitations' ? {} : { invitationId: String(invitationId) });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const inboxEvent = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const read = () => app.invoke(inboxEvent, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_team_invitations', {}), 'ai-plugin');
  const first = await read(); assert.equal(first.value.ok, true);
  if (first.value.ok) {
    const result = first.value.data as any;
    assert.equal(result.success, true);
    assert.deepEqual(result.result.invitations, inbox.data.data.invitations);
    assert.equal(result.result.access.ok, inbox.data.data.access.ok);
  }
  const second = await read(); assert.equal(second.value.ok, true); assert.notEqual(keys.at(-1), keys.at(-2));
  for (const row of acceptRows) {
    current = row.envelope;
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: row.actor });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'accept_team_invitation', { invitationId }), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.data.success);
    if (result.success) assert.deepEqual(result.result, current.data.data);
    else assert.equal(result.result, undefined);
    const retry = await call(); assert.equal(retry.value.ok, true); assert.equal(keys.at(-1), keys.at(-2));
  }
});
