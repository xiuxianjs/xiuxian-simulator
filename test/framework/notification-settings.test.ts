import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/notification/settings/res';
import { businessEnvelope } from './fixture';

after(async () => { await shutdownLogger(); });

test('通知设置显示分类，按真实玩家修改单类并提供重新开启按钮', async () => {
  let enabled = true;
  const writes: unknown[] = [];
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.endsWith('/player/categories')) {
      assert.equal(body.userId, 1);
      if (typeof body.enabled === 'boolean') {
        writes.push(body);
        enabled = body.enabled;
      }
      res.end(JSON.stringify({ data: [{ id: 'team', label: '队伍', enabled }] }));
    } else {
      res.end(JSON.stringify({ data: businessEnvelope(String(req.headers['x-bid'] ?? ''), {}) }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const app = createTestApp({ config: {
    processor: { repeated_user_time: 0 },
    'qq-bot': { app_id: '123' },
    'xiuxian-game': { backend: { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'test', worker_token: 'test' } }
  } });
  try {
    for (const text of ['/通知设置', '/通知设置 team 关闭', '/通知设置 team 开启']) {
      const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(result.messages[0].nodes);
      assert.match(view.text, /队伍/);
      assert.ok(view.commands.includes(`/通知设置 team ${enabled ? '关闭' : '开启'}`));
    }
    assert.deepEqual(writes, [
      { userId: 1, category: 'team', enabled: false },
      { userId: 1, category: 'team', enabled: true }
    ]);
  } finally {
    await app.dispose();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
