import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessPersonalHistoryNarrativeOwnerAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_PERSONAL_HISTORY_RESPONSE=([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
assert.equal(fixtures.length, 8);
for (const fixture of fixtures) test(`${fixture.operation}: ${fixture.envelope.data.branch}/${fixture.envelope.data.success}`, async t => {
  const story = fixture.operation.endsWith('.story');
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${fixture.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, story ? '/我的故事' : '/我的回忆');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', story ? 'get_personal_story' : 'get_personal_memories', {}), 'ai-plugin');
  const response = await call();
  assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) {
    const result = response.value.data as any;
    assert.equal(result.success, fixture.envelope.data.success);
    assert.equal(result.branch, fixture.envelope.data.branch);
    if (result.success && result.branch === 'business') assert.deepEqual(result.result, fixture.envelope.data.data);
    else assert.equal(result.result, undefined);
  }
  await call();
  assert.notEqual(keys[0], keys[1]);
});
