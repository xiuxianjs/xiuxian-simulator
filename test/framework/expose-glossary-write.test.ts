import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGlossaryActionsReplayAndPartialCommits$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).toString();
const rows = [...output.matchAll(/ROBOT_GLOSSARY_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(match => ({ operation: match[1], args: JSON.parse(match[2]), envelope: JSON.parse(match[3]) }));
for (const [action, operation] of [['apply_glossary_editor', 'glossary.apply'], ['upsert_glossary_entry', 'glossary.upsert'], ['delete_glossary_entry', 'glossary.delete']] as const) test(`${action} 保留服务端成功及拒绝回执`, async t => {
  const candidates = rows.filter(row => row.operation === operation && (operation !== 'glossary.upsert' || row.args.mode === 'write') && (operation !== 'glossary.delete' || row.args.keyword) && (operation !== 'glossary.upsert' || (row.args.keyword === '灵石' && row.args.content)));
  assert.ok(candidates.some(row => row.envelope.data.success));
  assert.ok(candidates.some(row => !row.envelope.data.success));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = candidates[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of candidates) {
    const input = operation === 'glossary.apply' ? { reason: current.args.reason } : operation === 'glossary.upsert' ? { keyword: current.args.keyword, content: current.args.content } : { keyword: current.args.keyword };
    const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const actual = run.value.data as any;
    assert.equal(actual.success, current.envelope.data.success);
    if (actual.success && operation === 'glossary.upsert') {
      assert.equal(actual.result.entryId, current.envelope.data.data.result.entryId);
      assert.equal(actual.result.outcome, current.envelope.data.data.result.outcome);
    }
    if (!actual.success) assert.deepEqual(actual.replies, current.envelope.data.middleware.replies);
  }
});
