import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import detail from '../../src/response/equipment/equipmentDetail/res';
import bag from '../../src/response/storage/newBag/equipments/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const cases = [
  { handler: detail, command: '/我的武器', operation: 'equipment.detail', args: { typeName: '武器' }, reason: '未装备任何武器', expected: '/储物袋 装备', text: '没有穿戴不等于背包没有' },
  { handler: detail, command: '/我的饰品', operation: 'equipment.detail', args: { typeName: '饰品' }, reason: '请指定装备类型，例如：我的武器', expected: '/我的装备', text: '从当前穿戴面板核对部位名称' },
  { handler: detail, command: '/我的鞋子', operation: 'equipment.detail', args: { typeName: '鞋子' }, reason: '获取装备详情失败，请稍后重试\n\n重复提醒', expected: '/我的装备', text: '不自动换装、卸下或重试写入' },
  { handler: bag, command: '/储物袋 装备 武器 2', operation: 'storage.equipment', args: { args: ['武器', '2'] }, reason: '查询装备失败，请稍后重试', expected: '/储物袋 装备', text: '不能证明没有持有装备' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(装备|卸下|分解装备|解锁)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const emptyBag = { types: ['武器'], activeType: '武器', page: 1, total: 0, totalPages: 1, items: [], capabilities: [] };
for (const entry of [
  { command: '/储物袋 装备', data: { ...emptyBag, types: [], activeType: null }, text: '暂无装备类型', expected: '/我的装备' },
  { command: '/储物袋 装备 武器', data: emptyBag, text: '该类型暂无装备', expected: '/我的装备' },
  { command: '/储物袋 装备 武器 3', data: { ...emptyBag, page: 3, total: 7, totalPages: 2 }, text: '本页暂无装备，当前分类共 7 件', expected: '/储物袋 装备' },
  { command: '/储物袋 装备 武器 操作', data: emptyBag, text: '当前没有可用批量入口', expected: '/我的装备' }
]) for (const isPrivate of [false, true]) {
  test(`bag current-state recovery ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { bag: entry.data, requestedType: entry.data.activeType ?? '' }));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(bag, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(装备|解锁|卸下)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const stats = { physicalAttack: 12, magicAttack: 0, physicalDefense: 0, magicDefense: 0, hp: 0, speed: 0, physicalAttackPercent: 0, magicAttackPercent: 0, physicalDefensePercent: 0, magicDefensePercent: 0, hpPercent: 0, critRate: 0, critDamage: 0 };
for (const capabilities of [[], [{ kind: 'viewDetail' }]]) for (const isPrivate of [false, true]) {
  test(`bag never fabricates item capabilities count=${capabilities.length} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { requestedType: '武器', bag: { ...emptyBag, total: 1, items: [{
      ...stats, id: 101, equipmentId: 5, name: '原剑', equipmentType: '武器', grade: '一品', isEquipped: 0, isLocked: 1, canEquip: false, canLock: false, canDecompose: false,
      displayName: '原剑', displayEquipmentType: '武器', displayGrade: '一品', attributeParts: ['物攻:12'], capabilities
    }] } }));
    const event = isPrivate ? app.events.privateMessage({ text: '/储物袋 装备 武器', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/储物袋 装备 武器', platform: 'qq-bot' });
    const result = await app.runHandler(bag, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原剑', '一品', '物攻:12', '【101】']) assert.ok(view.text.includes(text), view.text);
    assert.equal(view.text.includes('当前没有可用操作'), capabilities.length === 0);
    assert.equal(view.commands.includes('/物品详情 装备 5'), capabilities.length > 0);
    for (const command of ['/装备 101', '/解锁 装备 101', '/分解装备 101']) assert.ok(!view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const handler of [detail, bag]) for (const isPrivate of [false, true]) {
  test(`incomplete equipment query keeps error distinct private=${isPrivate} detail=${handler === detail}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const command = handler === detail ? '/我的武器' : '/储物袋 装备';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(handler === detail ? '获取装备详情失败' : '查询装备失败'));
    assert.ok(view.commands.includes(handler === detail ? '/我的装备' : '/储物袋 装备'));
    assert.ok(!view.text.includes('该类型暂无装备'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`original equipment query feedback retained private=${isPrivate} detail=${handler === detail}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '', heading: '', text: '原原因', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '原返回', command: '/我的装备' }]
    }]));
    const command = handler === detail ? '/我的武器' : '/储物袋 装备';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原原因', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/我的装备']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
