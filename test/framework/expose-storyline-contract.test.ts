import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeStorylineGuardedChoiceAndReplay$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_STORYLINE_HTTP=([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], envelope: JSON.parse(match[2]) }));
assert.equal(fixtures.length, 9);
for (const action of ['challenge_storyline', 'choose_storyline_skill', 'get_storyline_battle']) test(`${action}: 真实 Go 连续回合、过期版本、自动完成与越权拒绝`, async t => {
  const query = action === 'get_storyline_battle';
  const rows = fixtures.filter(row => query ? row.envelope.data.success : row.operation === (action === 'challenge_storyline' ? 'storyline.challenge' : 'storyline.choice'));
  const sessionId = fixtures[0].envelope.data.data.sessionId;
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  let reads = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const isIdentity = request.url.endsWith('/robot/identity');
    if (query && !isIdentity) { reads++; assert.equal(new URL(request.url).pathname, `/api/v1/players/1/storyline/manual-battles/${sessionId}`); }
    const response = query ? { data: isIdentity ? current.envelope.data.middleware.identity : current.envelope.data.data } : current.envelope;
    return { status: 200, headers: {}, data: JSON.stringify(response) };
  } }));
  // Reuse one message to verify state queries stay fresh through multiple choices.
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const server = current.envelope.data;
    const state = server.data;
    const input = action === 'challenge_storyline' ? { chapterNumber: 1, stageNumber: 1 } : query ? { sessionId } : { sessionId, expectedRevision: Math.max(1, (state?.revision ?? 2) - 1), choice: state?.finished ? '自动' : 'normal' };
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const value = result.value.data as any;
    if (!query) {
      assert.equal(value.success, server.success);
      if (!server.success) { assert.equal(value.result, undefined); continue; }
    }
    const actual = query ? value : value.result;
    for (const key of ['sessionId', 'revision', 'finished', 'winner', 'logId', 'choiceAccepted']) assert.equal(actual[key], state[key]);
    assert.equal(actual.events.length, (state.events ?? []).length);
    assert.deepEqual(actual.choice, state.choice);
    assert.equal(actual.battle.sideA[0].hp, state.battle.SideA[0].HP);
    assert.equal(actual.battle.rounds, state.battle.Rounds);
    if (state.settlement) {
      assert.equal(actual.settlement.won, state.settlement.won);
      assert.equal(actual.settlement.experienceGained, state.settlement.experienceGained);
      assert.equal(actual.settlement.spiritCostPaid, state.settlement.spiritCostPaid);
      assert.deepEqual(actual.settlement.drops, state.settlement.drops);
      assert.equal('player' in actual.settlement, false);
      assert.equal('seed' in actual.settlement, false);
    }
  }
  if (query) assert.equal(reads, rows.length);
});
