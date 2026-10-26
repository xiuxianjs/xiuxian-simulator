import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import consume from '../../src/response/consume/res';
import reset from '../../src/response/skillBook/reset/res';
import all from '../../src/response/achievements/allAchievements/res';
import completed from '../../src/response/achievements/myAchievements/res';
import supply from '../../src/response/soulPath/supply/res';
import { buildRechargeSuccessContent } from '../../src/response/recharge/paymentView';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const privateChat of [false, true]) {
  test(`缺药反馈保留真实缺口、查询入口与默认bar，保留必要恢复说明 private=${privateChat}`, async t => {
    const reason = '精力丹数量不足（拥有1，需要3）';
    const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: reason }), 409);
    const result = await app.runHandler(consume, privateChat
      ? app.events.privateMessage({ text: '/服用 精力丹 3', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/服用 精力丹 3', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.doesNotMatch(view.text, /建议：|\[\/储物袋/);
    for (const command of ['/储物袋 道具', '/商店 万宝楼', '/珍宝楼', '/我', '/属性面板', '/查看主线', '/我的活动', '/商店']) assert.ok(view.commands.includes(command));
    assert.ok(!view.commands.some(command => command.startsWith('/服用 ')));
  });
}

test('服务端专有建议完整保留费用、取消后果和操作', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, undefined, [{
    title: '原反馈', heading: '', text: '原拒绝原因', buttons: [],
    advice: [{ command: '/查看主线', description: '原条件：消耗灵石500，取消不返还' }]
  }]));
  const result = await app.runHandler(consume, app.events.privateMessage({ text: '/服用 培元丹 1', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(requests.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /原条件：消耗灵石500，取消不返还/);
  assert.ok(view.commands.includes('/查看主线'));
});

test('带实际写入后果的确认建议仍保留说明，不折叠成无说明按钮', async t => {
  const reason = '你有一份功法重制结果待确认';
  const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: reason }), 409);
  const result = await app.runHandler(reset, app.events.privateMessage({ text: '/重制功法 9', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(requests.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /会重置等级和词条，并按原预览返还资源/);
  assert.ok(view.commands.includes('/确认重制功法'));
  assert.ok(view.commands.includes('/取消重制功法'));
  assert.ok(view.text.includes('先核对上一条重制预览'));
});

for (const [handler, command, operation] of [[all, '/所有成就 2', 'achievements.all'], [completed, '/我的成就 2', 'achievements.completed']] as const) {
  test(`${command}使用引用块与真实分页，不再显示代码块和手输教程`, async t => {
    const page = { items: [{ id: 9, name: '登塔新秀', description: '达成原目标', displayIndex: 6, completedAt: '2026-10-22T08:00:00+08:00' }], page: { currentPage: 2, totalPages: 3, total: 11 } };
    const data = operation === 'achievements.all' ? page : { access: { canUseFifthLayerFeature: true, realmName: '筑基初期' }, data: page };
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data));
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { page: 2, pageSize: 5 });
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /登塔新秀/);
    assert.match(view.text, /达成原目标/);
    const prefix = command.replace(/ 2$/, '');
    assert.ok(view.commands.includes(`${prefix} 1`));
    assert.ok(view.commands.includes(`${prefix} 3`));
    assert.doesNotMatch(view.text, /成就ID|使用.*页数/);
    const nodes = result.messages[0].nodes.flatMap(n => n.type === 'Markdown' ? n.value : []);
    assert.ok(nodes.some(n => n.type === 'MD.blockquote'));
    assert.ok(!nodes.some(n => n.type === 'MD.code'));
  });
}

test('补给方向入口只展示选项，选择前不请求后端或修改偏好', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('选择前不应请求后端'); });
  const result = await app.runHandler(supply, app.events.privateMessage({ text: '/神魂补给', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(requests.length, 0);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  for (const name of ['自动', '定魂', '养魄', '悟道', '出窍']) assert.ok(view.commands.includes(`/神魂补给 ${name}`));
});

test('付款到账按真实数量展示，回执缺名称时不伪造商品名称', () => {
  const base = { orderNo: 'N1', bonusSpiritMilk: 0, vipUpgrade: null, newcomerDayGranted: null, monthCardExtended: false, seclusionPassActivated: false };
  const message = buildRechargeSuccessContent({ ...base, packageRewards: { spiritStone: 0, spiritCrystal: 0, spiritMilk: 0, items: [{ id: 1, quantity: 3 }, { id: 2, quantity: 5 }], equipments: [], skills: [] } });
  assert.match(inspectMessage([{ type: 'Markdown', value: message.value.value }]).text, /物品 ×8（2种，详情见储物袋）/);
  const named = buildRechargeSuccessContent({ ...base, packageRewards: { spiritStone: 0, spiritCrystal: 0, spiritMilk: 0, items: [{ id: 1, name: '精力丹', quantity: 5 }], equipments: [], skills: [] } });
  assert.match(inspectMessage([{ type: 'Markdown', value: named.value.value }]).text, /精力丹 ×5/);
});
