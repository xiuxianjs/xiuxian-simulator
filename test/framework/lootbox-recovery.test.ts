import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import open from '../../src/response/lootbox/open/res';
import list from '../../src/response/storage/newBag/lootboxes/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const cases = [
  { handler: open, command: '/开启礼盒 201 3', operation: 'lootboxes.open', args: { lootboxName: '201', openCount: 3 }, reason: '未找到名为【201】的礼盒', expected: '/储物袋 礼盒', detail: '使用列表开启按钮' },
  { handler: open, command: '/开启礼盒 201 3', operation: 'lootboxes.open', args: { lootboxName: '201', openCount: 3 }, reason: '你没有【旧礼盒】', expected: '/储物袋 礼盒', detail: '实际开启数量以服务端回执为准' },
  { handler: open, command: '/开启礼盒 201 3', operation: 'lootboxes.open', args: { lootboxName: '201', openCount: 3 }, reason: '礼盒数量不足', expected: '/储物袋 礼盒', detail: '库存或配置可能已变化' },
  { handler: open, command: '/开启礼盒 201 3', operation: 'lootboxes.open', args: { lootboxName: '201', openCount: 3 }, reason: '礼盒配置不存在（lootboxId: 201）', expected: '/储物袋 礼盒', detail: '不能修复奖励配置' },
  { handler: open, command: '/开启礼盒 201 3', operation: 'lootboxes.open', args: { lootboxName: '201', openCount: 3 }, reason: '礼盒配置已更新，请重试', expected: '/储物袋 礼盒', detail: '不自动重复开启' },
  { handler: open, command: '/开启礼盒', operation: 'lootboxes.open', args: { lootboxName: '' }, reason: '用户和礼盒必须为正整数', expected: '/储物袋 礼盒', detail: '从当前列表选择礼盒及开启数量' },
  { handler: open, command: '/开启礼盒 201 3', operation: 'lootboxes.open', args: { lootboxName: '201', openCount: 3 }, reason: '操作未获确认\n\n重复提醒', expected: '/储物袋 礼盒', detail: '失败不能证明礼盒未扣除' },
  { handler: list, command: '/储物袋 礼盒', operation: 'storage.lootboxes', args: { args: [] }, reason: '查询礼盒失败，请稍后重试', expected: '/储物袋 礼盒 1', detail: '查询失败不代表持有礼盒消失' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '礼盒', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.detail), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/开启礼盒\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const text of ['abc', 'Infinity', 'NaN']) for (const isPrivate of [false, true]) {
  test(`non-finite supplied count does not default-open ${text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('No write for invalid count'); });
    const command = `/开启礼盒 201 ${text}`;
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(open, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 0);
    assert.ok(view.text.includes('开启数量无法解析'));
    assert.ok(view.commands.includes('/储物袋 礼盒'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const handler of [open, list]) for (const isPrivate of [false, true]) {
  test(`incomplete ${handler === open ? 'open' : 'list'} has query action private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const command = handler === open ? '/开启礼盒 201 3' : '/储物袋 礼盒';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(handler === open ? '开启礼盒失败' : '查询礼盒失败'));
    assert.ok(view.commands.includes(handler === open ? '/储物袋 礼盒' : '/储物袋 礼盒 1'));
    assert.ok(!view.text.includes('获得：'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const total of [0, 7]) for (const isPrivate of [false, true]) {
  test(`empty lootbox page total=${total} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { page: 3, pageSize: 5, total, items: [] }));
    const event = isPrivate ? app.events.privateMessage({ text: '/储物袋 礼盒 3', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/储物袋 礼盒 3', platform: 'qq-bot' });
    const result = await app.runHandler(list, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(total ? '当前共 7 条礼盒记录' : '暂无礼盒'));
    assert.ok(view.commands.includes(total ? '/储物袋 礼盒 1' : '/我的邮件'));
    assert.ok(!view.commands.some(command => /^\/开启礼盒\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const valid of [false, true]) for (const isPrivate of [false, true]) {
  test(`lootbox capability remains authoritative valid=${valid} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { page: 1, pageSize: 5, total: 1, items: [{
      id: 90, lootboxId: 201, name: '原礼盒', quantity: 3, description: '原描述', capabilities: [{ kind: 'open', valid, options: [{ requestedCount: 10, effectiveCount: 3 }] }]
    }] }));
    const event = isPrivate ? app.events.privateMessage({ text: '/储物袋 礼盒', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/储物袋 礼盒', platform: 'qq-bot' });
    const result = await app.runHandler(list, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('原礼盒 x3'));
    assert.ok(view.text.includes('原描述'));
    assert.equal(view.commands.includes('/开启礼盒 201 10'), valid);
    assert.equal(view.text.includes('当前没有可用开启入口'), !valid);
    if (valid) assert.ok(view.text.includes('开启 x10（本次 x3）'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const count of [undefined, 0, 20]) for (const isPrivate of [false, true]) {
  test(`server effective opening is kept request=${count} private=${isPrivate}`, async t => {
    const effective = count === 20 ? 3 : 1;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { lootboxName: '原礼盒', openCount: effective, rewards: [{ category: 'item', rewardId: 9, name: '药草', quantity: 2 }] }));
    const command = `/开启礼盒 201${count === undefined ? '' : ` ${count}`}`;
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(open, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { lootboxName: '201', ...(count === undefined ? {} : { openCount: count }) });
    assert.ok(view.text.includes('原礼盒'));
    assert.ok(view.text.includes('药草 ×2'));
    if (effective > 1) assert.ok(view.text.includes(`×${effective}`));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const handler of [open, list]) for (const isPrivate of [false, true]) {
  test(`original feedback structure survives ${handler === open ? 'open' : 'list'} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '礼盒', heading: '', text: '原原因', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '礼盒', command: '/储物袋 礼盒' }]
    }]));
    const command = handler === open ? '/开启礼盒 201 3' : '/储物袋 礼盒';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原原因', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/储物袋 礼盒']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
