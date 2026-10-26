import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import reset from '../../src/response/skillBook/reset/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const modes = [
  { mode: 'preview', command: '/重制功法 0002', bookId: '0002' },
  { mode: 'confirm', command: '/确认重制功法', bookId: null },
  { mode: 'cancel', command: '/取消重制功法', bookId: null }
];
const pending = {
  userSkillBookId: 2, skillBook: { id: 1, name: '测试心法', skillType: '心法', grade: '黄阶', realm: '炼气' },
  refundExp: 3200, refundSpiritStone: 140, upgradeCount: 2, affectedAttrs: ['物理攻击', '暴击率']
};
const dataFor = (mode: string) => mode === 'cancel' ? { mode, pending } : { mode, result: { pending, refundExp: 3200, refundSpiritStone: 140, upgradeCount: 2, affectedAttrs: ['物理攻击', '暴击率'], items: [{ name: '功法残页', quantity: 3, expValue: 1000 }] } };
const cases = [
  { reason: '❌ 参数错误\n使用方法:\n/重制功法 功法ID', expected: '本人已学功法列表' },
  { reason: '找不到ID为 2 的已学功法', expected: '模板编号和未学习秘籍' },
  { reason: '使用中的功法不能重制，请先换下该功法', expected: '不会自动换下' },
  { reason: '该功法当前没有可重制的词条或等级', expected: '无需为重制先消耗资源升级' },
  { reason: '当前没有待确认的功法重制结果', expected: '不反复确认旧预览' },
  { reason: '当前没有待取消的功法重制结果', expected: '不反复确认旧预览' },
  { reason: '待确认的功法已不存在或状态已变化，重制结果已作废', expected: '状态已变化' },
  { reason: '操作繁忙，请稍后再试', expected: '不自动重放' },
  { reason: '功法待确认状态服务未配置', expected: '持续异常时保留原反馈' }
];
for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) for (const entry of cases) {
  test(`reset refusal ${mode} private=${isPrivate}: ${entry.reason}`, async t => {
    const current = entry.reason.includes('待取消') ? modes[2] : entry.reason.includes('待确认') || entry.reason.includes('作废') ? modes[1] : modes[0];
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' });
    const result = await app.runHandler(reset, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/skill-books.reset'));
    assert.deepEqual(requests[0].body.arguments, { mode: current.mode, bookId: current.bookId });
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.reason), view.text);
    assert.ok(view.text.includes(entry.expected), view.text);
    assert.ok(view.commands.includes('/我的功法'));
    assert.ok(!view.commands.some(command => /确认重制功法|取消重制功法|^\/重制功法\s+\d|^\/换下/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'raw']) {
  test(`known pending preview offers explicit choice ${wire} private=${isPrivate}`, async t => {
    const reason = '你有一份功法重制结果待确认，请先发送 /确认重制功法 或 /取消重制功法';
    const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: reason } : businessEnvelope(request.bid, undefined, [{
      title: '', heading: '', text: wire === 'raw' ? '' : reason, buttons: [], advice: [], ...(wire === 'structured' ? { blocks: [{ text: reason, quoted: false }] } : wire === 'raw' ? { rawLines: [reason] } : {})
    }]), wire === 'http' ? 409 : 200);
    const result = await app.runHandler(reset, isPrivate ? app.events.privateMessage({ text: '/重制功法 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/重制功法 2', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('预览有效期为60秒'));
    assert.ok(view.text.includes('只删除待确认预览'));
    for (const command of ['/我的功法', '/确认重制功法', '/取消重制功法']) assert.equal(view.commands.filter(value => value === command).length, 1);
    assert.equal(view.text.split(reason).length - 1, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const current of modes) for (const isPrivate of [false, true]) {
  test(`structured feedback retains every field ${current.mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '原标题', heading: '原抬头', text: '原业务拒绝', quote: '原引用',
      blocks: [{ text: '原业务拒绝', quoted: false }, { text: '原引用说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }],
      buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/我的功法', description: '原服务建议' }]
    }]));
    const result = await app.runHandler(reset, isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原抬头', '原业务拒绝', '原引用', '原引用说明', '原服务建议', '不把预览中的返还当作已到账']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我', '/丹方', '/我的功法', '/我的信息', '/储物袋 材料 经验材料']) assert.ok(view.commands.includes(command));
    assert.equal(view.text.split('原业务拒绝').length - 1, 1);
    assert.equal(view.commands.filter(value => value === '/我的功法').length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  for (const shape of ['malformed', 'wrong-mode', 'server-error']) {
    test(`unknown result ${current.mode} ${shape} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => shape === 'server-error' ? { code: 'INTERNAL', message: 'internal commit failure with secret' }
        : businessEnvelope(request.bid, shape === 'wrong-mode' ? dataFor(current.mode === 'confirm' ? 'cancel' : 'confirm') : { mode: current.mode }), shape === 'server-error' ? 500 : 200);
      const result = await app.runHandler(reset, isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' }));
      const view = inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length, 1);
      assert.ok(view.text.includes('功法重制结果未获完整确认'));
      assert.ok(view.text.includes('不自动重放'));
      assert.ok(!view.text.includes('secret'));
      assert.ok(!view.commands.some(command => command.includes('重制功法')));
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
  test(`actual result facts preserved ${current.mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, dataFor(current.mode)));
    const result = await app.runHandler(reset, isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { mode: current.mode, bookId: current.bookId });
    assert.ok(view.text.includes('测试心法'));
    if (current.mode === 'preview') {
      for (const text of ['3200', '140', '2 -> 0', '80%', '70%', '60秒', '尾差会舍弃']) assert.ok(view.text.includes(text));
      assert.ok(view.commands.includes('/确认重制功法'));
      assert.ok(view.commands.includes('/取消重制功法'));
      assert.ok(!view.text.includes('重制完成'));
    } else if (current.mode === 'confirm') {
      for (const text of ['重制完成', '3200', '140', '功法残页 x3', '1000经验/个']) assert.ok(view.text.includes(text));
      assert.ok(view.commands.includes('/查看功法 2'));
      assert.ok(!view.commands.includes('/确认重制功法'));
    } else {
      assert.ok(view.text.includes('保持原状'));
      assert.ok(!view.text.includes('返还灵石'));
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const current of modes) {
  test(`real router dispatch ${current.mode}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, dataFor(current.mode)));
    const router = Router.create({ events: ['message.create', 'private.message.create'] });
    router.use(current.mode === 'preview' ? '重制功法' : current.mode === 'confirm' ? '确认重制功法' : '取消重制功法', async () => ({ default: reset }));
    await app.mount({ responseRouter: router.define });
    const event = app.events.groupMessage({ text: current.command, platform: 'qq-bot' });
    const result = await app.dispatch(event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    await app.dispatch(event);
    assert.equal(requests.length, 1);
  });
}
