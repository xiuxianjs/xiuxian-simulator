import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import giftRecordsHandler from '../../src/response/companion/giftRecords/res';
import giftHandler from '../../src/response/companion/gift/res';
import proposeHandler from '../../src/response/companion/propose/res';
import taskHandler from '../../src/response/companion/dailyTask/res';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotCompanionGiftRecordsExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_COMPANION_QUERY_RESPONSE=companion\.gift-records\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), command: row[2], envelope: JSON.parse(row[3]) })).filter(row => row.envelope.data.success);
assert.equal(rows.length, 9);

test('赠礼记录使用服务端真实筛选、分页和记录', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/companion.gift-records');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    assert.equal(body.messageText, current.command);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_gift_records', { mode: current.args.mode, page: Number(current.args.page) }), 'ai-plugin');
    assert.deepEqual(run.errors, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = (run.value.data as any).result;
    const source = current.envelope.data.data;
    assert.equal(result.total, source.total);
    assert.equal(result.currentPage, source.page);
    assert.deepEqual(result.rows.map((row: any) => row.id), source.list.map((row: any) => row.id));
    for (const row of result.rows) assert.ok(Number.isFinite(Date.parse(row.createdAt)));
  }
});

test('不匹配赠礼记录指令时继续事件链', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' } } });
  t.after(() => app.dispose());
  for (const text of ['/赠礼记录工具', '/其他指令', '赠礼记录 收到 多余']) {
    const run = await app.runHandler(giftRecordsHandler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(run.errors, []);
    assert.equal(run.nextCalls.length, 1);
    assert.equal(run.messages.length, 0);
  }
  for (const [handler, text] of [[giftHandler, '/赠送工具'], [proposeHandler, '/结为道侣工具'], [taskHandler, '/道侣任务工具'], [taskHandler, '其他插件的道侣任务']] as const) {
    const run = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(run.errors, []);
    assert.equal(run.nextCalls.length, 1, text);
    assert.equal(run.messages.length, 0, text);
  }
});
