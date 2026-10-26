import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import teach from '../../src/response/master/teach/res';
import bless from '../../src/response/master/bless/res';
import gift from '../../src/response/master/gift/res';
import teachAll from '../../src/response/master/teachAll/res';
import supportAll from '../../src/response/master/supportAll/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const plan = 'a'.repeat(64);
const cases = [
  { handler: teach, command: "/传功 2", reason: "今日该师徒互动次数已达上限", expected: "/我的师门", text: "补丹药不能增加已用完的次数" },
  { handler: bless, command: "/赐福 2", reason: "今日该师徒互动次数已达上限", expected: "/我的师门", text: "各项互动计数" },
  { handler: gift, command: "/赐丹 2 培元丹", reason: "徒弟已完成培养阶段，无法继续师门互动", expected: "/我的师门", text: "按培养进度安排出师" },
  { handler: teach, command: "/传功 2", reason: "师徒关系不存在", expected: "/我的师门", text: "当前师父、徒弟及历史关系" },
  { handler: bless, command: "/赐福 2", reason: "物品数量不足", expected: "/储物袋 道具 丹药", text: "赐福用元力丹" },
  { handler: gift, command: "/赐丹 2 筑基丹", reason: "物品数量不足", expected: "/商店 万宝楼", text: "徒弟持有量不能代替师父库存" },
  { handler: supportAll, command: "/一键赐福 确认 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", reason: "扶持次数或徒弟状态已变化，请重新预览确认", expected: "/一键赐福", text: "旧计划不能用于绕过状态变化" },
  { handler: supportAll, command: "/一键赐丹 确认 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", reason: "暂无可执行次数或丹药不足，请重新预览", expected: "/一键赐丹", text: "重新核对当前徒弟" },
  { handler: teachAll, command: "/一键传功", reason: "师徒关系不存在", expected: "/我的师门", text: "已有关系不重复建立" }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '师门', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.ok(!view.commands.some(command => /^\/(?:拜师|同意拜师|逐出师门|叛离师门|解除道侣)\s/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}




const partialMessages = [
  { handler: teachAll, command: '/一键传功', text: '本次共完成 2 次传功\n徒弟 UID 2：完成 2 次\n徒弟 UID 3：完成 0 次（传功失败，请稍后重试）' },
  { handler: supportAll, command: `/一键赐福 确认 ${plan}`, text: '本次共完成 1 次赐福\n徒弟 UID 2：完成 1 次\n徒弟 UID 3：完成 0 次（物品数量不足）\n消耗元力丹×1' },
  { handler: supportAll, command: `/一键赐丹 确认 ${plan}`, text: '本次共完成 1 次赐丹\n徒弟 UID 2：完成 1 次\n徒弟 UID 3：完成 0 次（未知业务失败）\n消耗培元丹×2' }
];
for (const entry of partialMessages) for (const isPrivate of [false, true]) {
  test(`逐人结算保留原次数消耗与失败 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { message: entry.text, plan, canConfirm: false }));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    for (const line of entry.text.split('\n')) assert.ok(view.text.includes(line), view.text);
    assert.ok(view.text.includes('不重放整批'));
    assert.ok(view.commands.includes('/我的师门'));
    if (entry.handler === supportAll) assert.ok(view.commands.includes('/储物袋 道具 丹药'));
    assert.ok(!view.commands.some(command => /一键.*确认/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const label of ['赐福', '赐丹']) for (const isPrivate of [false, true]) {
  test(`预览缺丹药与逐人次数分开处理 ${label} private=${isPrivate}`, async t => {
    const text = `本次可${label} 1 次\n徒弟 UID 2：0 次（今日次数已满）\n徒弟 UID 3：1 次\n${label === '赐福' ? '元力丹' : '筑基丹'}：需 1，拥有 0\n丹药不足，未执行任何操作`;
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { message: text, plan, canConfirm: false }));
    const event = isPrivate ? app.events.privateMessage({ text: `/一键${label}`, platform: 'qq-bot' }) : app.events.groupMessage({ text: `/一键${label}`, platform: 'qq-bot' });
    const result = await app.runHandler(supportAll, event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { plan: '' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    for (const line of text.split('\n')) assert.ok(view.text.includes(line));
    assert.ok(view.commands.includes('/储物袋 道具 丹药'));
    assert.ok(!view.commands.some(command => /一键.*确认/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`有可执行徒弟的预览保留真实计划 ${label} private=${isPrivate}`, async t => {
    const text = `本次可${label} 1 次\n徒弟 UID 2：0 次（今日次数已满）\n徒弟 UID 3：1 次`;
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { message: text, plan, canConfirm: true }));
    const event = isPrivate ? app.events.privateMessage({ text: `/一键${label}`, platform: 'qq-bot' }) : app.events.groupMessage({ text: `/一键${label}`, platform: 'qq-bot' });
    const result = await app.runHandler(supportAll, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.commands.includes(`/一键${label} 确认 ${plan}`));
    assert.ok(!view.text.includes('补丹药不能增加已用完的次数'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const message of ['暂无在门下的徒弟可传功', '本次可赐福 0 次\n今日暂无可执行的扶持']) {
  test(`无可执行目标提供师门进度入口 ${message}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { message, plan, canConfirm: false }));
    const result = await app.runHandler(message.includes('传功') ? teachAll : supportAll, app.events.privateMessage({ text: message.includes('传功') ? '/一键传功' : '/一键赐福', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes('核对师门互动进度') || view.text.includes('查看当前徒弟、培养阶段'));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.some(command => /确认/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const label of ['赐福', '赐丹']) {
  test(`损坏计划不生成无效确认按钮 ${label}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { message: '本次可执行', plan: 'not-a-plan', canConfirm: true }));
    const result = await app.runHandler(supportAll, app.events.privateMessage({ text: `/一键${label}`, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('师门扶持响应不完整'));
    assert.ok(!view.commands.some(command => /确认/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [{ handler: bless, command: '/赐福 2', text: '赐福道具不存在' }, { handler: gift, command: '/赐丹 2', text: '赠礼道具不存在' }]) {
  test(`道具配置缺失不误导玩家补库存 ${entry.text}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, undefined, [{ title: '师门', heading: '', text: entry.text, buttons: [], advice: [] }]));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.text));
    assert.ok(!view.commands.includes('/商店 万宝楼'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const entry of [
  { handler: teach, text: '/传功', label: '传功' },
  { handler: bless, text: '/赐福', label: '赐福' },
  { handler: gift, text: '/赐丹', label: '赐丹' }
]) for (const isPrivate of [false, true]) {
  test(`单次互动缺参查询有效徒弟 ${entry.label} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { outcome: 'usage' }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { targetArg: '' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`使用方法：${entry.label}`));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(view.text.includes('不会替你批量执行'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [{ handler: teachAll, text: '/一键传功' }, { handler: supportAll, text: `/一键赐福 确认 ${plan}` }]) for (const isPrivate of [false, true]) {
  test(`批量回执不完整先核对而不自动重试 ${entry.text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'UPSTREAM_ERROR', message: '互动回执暂不可用' }), 503);
    const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('互动回执暂不可用'));
    assert.ok(view.text.includes('不重放整批'));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.text.includes('本次共完成'));
    assert.ok(!view.commands.some(command => /一键.*确认/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
