import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import menu from '../../src/response/storage/newBag/main/res';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

// Match the GET /content/tianshu wire shape. Startup commands are static;
// the current-player access response can already come from the updated server.
const catalogue = (fixed: boolean) => ({
  gateVersion: 1, intro: '功能门槛目录', realmUnlocks: [], notes: [],
  commandFeatures: { 储物袋: 'inventory', 我: 'profile', 属性面板: 'profile', 查看主线: 'profile', 我的活动: 'activities', 商店: 'shop',
    ...(fixed ? { 垂钓: 'fishing', 渔获: 'fishing', 钓具: 'fishing', 渔市: 'fishing' } : {}) },
  featureCatalog: [{ stageLevel: 0, stageName: '通用',
    features: ['inventory', 'profile', 'activities', 'shop', ...(fixed ? ['fishing'] : [])].map(id => ({
      id, name: id, description: '', realm: '无境界限制', realmReached: true, visible: true, conditions: []
    })) }]
});

for (const fixed of [false, true]) for (const state of ['炼气八层未开塘', '高境界已开塘']) {
  test(`储物袋真实功能过滤：${fixed ? '修复目录首排四项' : '旧启动目录首排三项'}，${state}`, async t => {
    const { app, requests } = await gameFixture(t, request => {
      if (request.path === '/api/v1/content/tianshu') { return catalogue(fixed); }
      if (request.path === '/api/v1/content/tianshu?view=access') {
        return { gateVersion: 1, features: { inventory: true, profile: true, activities: true, shop: true,
          fishing: true, 'fishing-build': state === '高境界已开塘' } };
      }
      assert.ok(request.path.endsWith('/storage.menu'));
      return businessEnvelope(request.bid, { message: '' });
    });
    await app.invoke(app.events.privateMessage({ platform: 'qq-bot' }), startFeatureVisibility);

    let sent!: () => void;
    const delivered = new Promise<void>(resolve => { sent = resolve; });
    app.actions.on('message.send', () => {
      sent();
      return [createResult(ResultCode.Ok, 'Offline delivery', { id: 'bag-capture' })];
    });
    // The real legacy handler uses void send. Keep this test execution alive
    // until its real asynchronous filter/HTTP/send finishes; do not mock policy.
    const capture = onResponse(menu.select, async event => {
      assert.equal(typeof menu.current, 'function');
      if (typeof menu.current !== 'function') { throw new Error('Storage handler shape changed'); }
      await menu.current(event);
      await delivered;
    });
    const result = await app.runHandler(capture, app.events.privateMessage({ text: '/储物袋', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    const firstRow = ['/储物袋 道具 丹药', '/储物袋 材料 草药', '/储物袋 装备'];
    assert.deepEqual(view.commands.slice(0, fixed ? 4 : 3), fixed ? [...firstRow, '/垂钓 渔获 1'] : firstRow);
    assert.equal(view.commands.includes('/垂钓 渔获 1'), fixed);
    t.diagnostic(`实际首排：道具／材料／装备${fixed ? '／渔获' : ''}；${state}；个人access已包含fishing:true。`);
    for (const command of ['/储物袋 天工', '/储物袋 功法', '/储物袋 本命', '/储物袋 礼盒', '/我']) {
      assert.ok(view.commands.includes(command));
    }
    const markdown = message.nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown && Array.isArray(markdown.value));
    const fish = markdown.value.find(node => node.type === 'MD.button' && node.options?.data === '/垂钓 渔获 1');
    if (fixed) {
      assert.ok(fish && fish.type === 'MD.button');
      assert.equal(fish.options?.autoEnter, false);
      assert.ok(!Object.hasOwn(fish.options ?? {}, 'show'));
      assert.ok([...fish.options!.data!].length <= 80);
    } else { assert.equal(fish, undefined); }
    assert.equal(requests.filter(request => request.path === '/api/v1/content/tianshu').length, 1);
    assert.equal(requests.filter(request => request.path.includes('view=access')).length, 1);
    assert.equal(requests.filter(request => request.path.endsWith('/storage.menu')).length, 1);
    assert.ok(!requests.some(request => /fishing|catches|pond/.test(request.path)));
  });
}
