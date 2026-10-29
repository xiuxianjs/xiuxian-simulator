import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessEncyclopediaMenusListsDetailsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const categories = ['道具', '材料', '装备', '天工', '功法', '本命', '本命物'];
const rows = [...output.matchAll(/ROBOT_ENCYCLOPEDIA_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3]) })).filter(row => row.op === 'encyclopedia.browse' ? !row.args.category || categories.includes(row.args.category) : categories.includes(row.args.category) && Number.isSafeInteger(row.args.targetId) && row.args.targetId > 0);
assert.ok(rows.some(row => row.op === 'encyclopedia.browse' && row.envelope.data.data?.mode === 'list'));
assert.ok(rows.some(row => row.op === 'encyclopedia.detail' && row.envelope.data.success));
assert.ok(rows.some(row => row.op === 'encyclopedia.detail' && !row.envelope.data.success));
test('图鉴查询保留分类、详情与服务端拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const browse = current.op === 'encyclopedia.browse';
    const input = browse ? { ...(current.args.category ? { category: current.args.category } : {}), ...(current.args.subCategory ? { subCategory: current.args.subCategory } : {}), page: current.args.page } : current.args;
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', browse ? 'browse_encyclopedia' : 'get_encyclopedia_detail', input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      if (browse) {
        assert.equal(result.result.mode, source.data.mode);
        if (source.data.mode === 'list') assert.equal(result.result.result.items.length, source.data.result.items.length);
      } else assert.deepEqual(JSON.parse(result.result.detailsJson), source.data);
    } else assert.equal(result.result, undefined);
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
