import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import equip from '../../src/response/equipment/equipItem/res';
import unequip from '../../src/response/equipment/unequipItem/res';
import auto from '../../src/response/equipment/autoEquip/res';
import equipped from '../../src/response/equipment/myEquipments/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: equip, command: '/装备 101', operation: 'equipment.equip', args: { identifier: '101' }, fallback: '装备操作失败' },
  { handler: unequip, command: '/卸下 武器', operation: 'equipment.unequip-one', args: { equipmentTypeName: '武器' }, fallback: '卸下装备操作失败' },
  { handler: auto, command: '/一键装备', operation: 'equipment.auto-equip', args: {}, fallback: '一键装备失败' },
  { handler: equipped, command: '/我的装备', operation: 'equipment.equipped', args: {}, fallback: '获取装备信息失败' }
];
const cases = [
  { ...entries[0], reason: '未找到该装备', expected: '/储物袋 装备', text: '模板ID和页内序号不能替代实例ID' },
  { ...entries[0], reason: '未找到该装备或装备已被装备', expected: '/我的装备', text: '确认该装备是否已经穿戴' },
  { ...entries[0], reason: '该物品属于天工工具，请使用 /替换 指令切换', expected: '/储物袋 天工', text: '不占普通战斗装备部位' },
  { ...entries[0], reason: '境界不足，无法装备该品级的装备', expected: '/查看主线', text: '挑战主线获取修为' },
  { ...entries[0], reason: '装备失败，请稍后重试\n\n重复提醒', expected: '/我的装备', text: '不认定失败就没有更换' },
  { ...entries[1], reason: '未找到该装备类型', expected: '/我的装备', text: '卸下参数是装备类型' },
  { ...entries[1], reason: '未找到武器类型的装备', expected: '/我的装备', text: '不是物品名或实例ID' },
  { ...entries[1], reason: '未装备任何武器', expected: '/我的装备', text: '该部位没有装备时无需重复卸下' },
  { ...entries[2], reason: '暂无装备类型数据', expected: '/储物袋 装备', text: '联系管理员核对类型配置' },
  { ...entries[2], reason: '一键装备失败，请稍后重试', expected: '/我的装备', text: '先查看当前穿戴' },
  { ...entries[3], reason: '获取装备信息失败，请稍后重试', expected: '/储物袋 装备', text: '不证明装备已丢失' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.includes('/一键装备'));
    assert.ok(!view.commands.some(command => /^\/(装备|卸下|替换)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} incomplete result does not assert unchanged equipment private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(entry.fallback));
    assert.ok(view.commands.includes(entry.handler === equipped ? '/储物袋 装备' : '/我的装备'));
    assert.ok(!view.text.includes('成功装备'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const state of ['partial', 'unavailable', 'best']) for (const isPrivate of [false, true]) {
  test(`auto equip ${state} preserves original rows and power private=${isPrivate}`, async t => {
    const data = { success: state !== 'partial', message: '原汇总', power: 123, results: state === 'best'
      ? [{ typeName: '武器', equipped: false, equipmentName: '原剑', reason: '已是最佳' }]
      : [{ typeName: '武器', equipped: true, equipmentName: '原剑' }, { typeName: '鞋子', equipped: false, reason: '无可用装备' }] };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: '/一键装备', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键装备', platform: 'qq-bot' });
    const result = await app.runHandler(auto, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原剑', '原汇总', '123']) assert.ok(view.text.includes(text));
    assert.ok(view.text.includes(state === 'partial' ? '保留逐部位结果' : state === 'unavailable' ? '不代表整个背包为空' : '无需反复提交'));
    assert.ok(view.commands.includes(state === 'unavailable' ? '/储物袋 装备' : '/我的装备'));
    assert.ok(!view.commands.includes('/一键装备'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} server quote/advice/buttons retained private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '原返回', command: '/我的装备' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原拒绝', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/我的装备']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`empty equipment types refer to configuration rather than realm private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { playerName: '青云', canUseFifthLayerFeature: false, types: [], slots: [], items: [], sets: [] }));
    const event = isPrivate ? app.events.privateMessage({ text: '/我的装备', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的装备', platform: 'qq-bot' });
    const result = await app.runHandler(equipped, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('暂无装备类型数据'));
    assert.ok(view.text.includes('不能据此认定背包为空或境界不足'));
    assert.ok(view.commands.includes('/储物袋 装备'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
