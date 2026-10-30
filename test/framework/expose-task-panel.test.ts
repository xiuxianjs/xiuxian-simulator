import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('任务面板 Expose 保留真实师门、道侣及服务端错误状态', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessTaskPanelDailySocial$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_TASK_PANEL_DAILY=(.+)/g)].map(row => JSON.parse(row[1]));
  assert.equal(rows.length, 3);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/task-panel.view');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.arguments);
    assert.equal(body.messageText, current.text);
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const row of rows) {
    current = row;
    const response = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_task_panel', { tab: row.arguments.tab }), 'ai-plugin');
    assert.equal(response.value.ok, true, JSON.stringify(response.value));
    if (!response.value.ok) continue;
    const result = (response.value.data as any).result;
    assert.equal(result.requestedTab, row.result.data.requestedTab);
    assert.deepEqual(result.tabs, row.result.data.view.tabs);
    assert.deepEqual(result.selection, row.result.data.view.selection);
    if (row.state === '失败') assert.equal(result.tabs.find((tab: any) => tab.tabKey === 'master').items[0].status, 'ERROR');
  }
});
