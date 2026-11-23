import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/notification/settings/res';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { businessEnvelope } from './fixture';

after(async () => { await shutdownLogger(); });

test('通知设置在启用功能过滤时仍提供每类独立的手动开关', async () => {
  // market（珍宝楼交易）默认关闭；其余分类默认开启，与服务端 notificationCategories 一致。
  const categories = [
    ['meditation', '闭关'], ['exploration', '秘境探索'], ['cave', '洞府灵田'], ['forge', '锻造委托'], ['tribulation', '渡劫'],
    ['pk', '切磋与劫掠'], ['friend', '好友'], ['companion', '道侣'], ['master', '师徒'], ['team', '队伍'],
    ['guild', '宗门'], ['flymail', '飞信'], ['black-box', '黑盒'], ['market', '珍宝楼交易'], ['other', '其他及旧版通知']
  ].map(([id, label]) => ({ id, label, enabled: id !== 'market' }));
  const writes: unknown[] = [];
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.endsWith('/player/categories')) {
      assert.equal(body.userId, 1);
      if (typeof body.enabled === 'boolean') {
        const category = categories.find(item => item.id === body.category);
        assert.ok(category);
        writes.push(body);
        category.enabled = body.enabled;
      }
      res.end(JSON.stringify({ data: categories }));
    } else if (req.url?.includes('/v1/content/tianshu')) {
      const data = req.url.includes('view=access')
        ? { gateVersion: 1, features: { notifications: true } }
        : {
            gateVersion: 1,
            intro: '',
            realmUnlocks: [],
            notes: [],
            commandFeatures: { 通知设置: 'notifications', 我的通知: 'notifications' },
            featureCatalog: [{ stageLevel: 0, stageName: '通用', features: [
              { id: 'notifications', name: '通知', description: '', realm: '无境界限制', realmReached: true, visible: true, conditions: [] }
            ] }]
          };

      res.end(JSON.stringify({ data }));
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
    const startup = await app.invoke(app.events.privateMessage({ platform: 'qq-bot' }), startFeatureVisibility);
    assert.deepEqual(startup.errors, []);
    for (const text of ['/通知设置', '/通知设置 team 关闭', '/通知设置 team 开启']) {
      const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(result.messages[0].nodes);
      assert.doesNotMatch(view.text, /黑盒/);
      const buttons = result.messages[0].nodes
        .flatMap(node => node.type === 'Markdown' ? node.value : [])
        .flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [])
        .filter(node => node.type === 'MD.button');

      assert.equal(buttons.length, 14);
      for (const [index, item] of categories.filter(category => category.id !== 'black-box').entries()) {
        // team 是本轮唯一被指令切换的分类；market 保持默认关闭，其余维持默认开启。
        const enabled = item.id === 'team' ? !text.endsWith('关闭') : item.enabled;
        const action = enabled ? '关闭' : '开启';

        assert.ok(view.text.includes(`${item.label} · ${enabled ? '已开启' : '已关闭'} ‹${action}›`));
        assert.deepEqual(buttons[index], { type: 'MD.button', value: `‹${action}›`, options: { data: `/通知设置 ${item.id} ${action}`, autoEnter: false } });
      }
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
