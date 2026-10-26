import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import reroll from '../../src/response/skillBook/reroll/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { mode: 'preview', command: '/换词 0002 物攻', bookId: '0002', attrLabel: '物攻' },
  { mode: 'confirm', command: '/确认换词 2', bookId: '2', attrLabel: null },
  { mode: 'cancel', command: '/取消换词', bookId: null, attrLabel: null }
];
const book = { id: 1, name: '测试功法', grade: '黄阶', realm: '炼气' };
const pending = { userSkillBookId: 2, skillBook: book, sourceLabel: '物攻', targetLabel: '气血', targetPool: 'zero', targetWasActive: false, sourceCurrentText: '8', sourceMaxText: '70', targetCurrentText: '30', targetMaxText: '100' };
const dataFor = (mode: string) => mode === 'preview' ? { mode, bookId: 2, result: { mode: 'preview', skillBook: book, ownedCount: 2, pending } } : { mode, bookId: mode === 'confirm' ? 2 : 0, pending };
const refusals = [
  { text: '参数错误', expected: '不发送缺编号的确认', entry: 0 },
  { text: '找不到ID为 2 的已学功法', expected: '有效编号', entry: 0 },
  { text: '换词符不足', expected: '仅查看词条列表不消耗', entry: 0 },
  { text: '无法识别词条「未知词条」', expected: '完整名称', entry: 0 },
  { text: '当前功法没有激活词条「物攻」', expected: '当前激活词条', entry: 0 },
  { text: '该功法当前没有可替换的有效词条', expected: '不为重试继续购买', entry: 0 },
  { text: '当前没有可替换的目标词条', expected: '不为重试继续购买', entry: 0 },
  { text: '你有一份功法换词结果待确认，请先发送 /确认换词 或 /取消换词', expected: '不能用本次请求编号代替', entry: 0 },
  { text: '当前待确认的是功法ID 3 的换词结果', expected: '不把错误编号改成另一笔确认', entry: 1 },
  { text: '当前没有待确认的换词结果', expected: '预览过期不代表换词符返还', entry: 1 },
  { text: '当前没有待取消的换词结果', expected: '不自动重新生成', entry: 2 },
  { text: '待确认的功法已不存在，换词结果已作废', expected: '失效结果不能继续确认', entry: 1 },
  { text: '操作繁忙，请稍后再试', expected: '结果尚未明确时不重复消耗', entry: 0 },
  { text: '功法待确认状态服务未配置', expected: '失败提示不证明', entry: 0 }
];
for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback']) for (const item of refusals) {
  test(`reroll refusal ${item.text} ${wire} private=${isPrivate}`, async t => {
    const current = entries[item.entry];
    const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: item.text } : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: item.text, buttons: [], advice: [] }]), wire === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' });
    const result = await app.runHandler(reroll, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/skill-books.reroll'));
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, { mode: current.mode, bookId: current.bookId, attrLabel: current.attrLabel });
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(item.text));
    assert.ok(view.text.includes(item.expected), view.text);
    assert.ok(view.commands.includes(item.text === '换词符不足' ? '/储物袋' : '/我的功法'));
    assert.ok(!view.commands.some(command => /^\/(?:确认换词|取消换词|换词)(?:\s|$)/.test(command)));
    assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const current of entries) for (const isPrivate of [false, true]) {
  test(`reroll preserves structured feedback ${current.mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '', heading: '原抬头', text: '原业务拒绝', quote: '原引用', blocks: [{ text: '原业务拒绝', quoted: false }, { text: '原引用说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/我的功法', description: '原服务建议' }]
    }]));
    const result = await app.runHandler(reroll, isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原抬头', '原引用', '原引用说明', '原服务建议', '取消不返还']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我', '/丹方', '/我的功法', '/储物袋']) assert.ok(view.commands.includes(command));
    assert.equal(view.text.split('原业务拒绝').length - 1, 1);
    assert.equal(view.commands.filter(command => command === '/我的功法').length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  for (const shape of ['malformed', 'wrong-mode', 'server-error']) {
    test(`reroll unknown result ${current.mode} ${shape} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => shape === 'server-error' ? { code: 'INTERNAL', message: 'private storage commit failure' } : businessEnvelope(request.bid, shape === 'wrong-mode' ? dataFor(current.mode === 'confirm' ? 'cancel' : 'confirm') : { mode: current.mode }), shape === 'server-error' ? 500 : 200);
      const result = await app.runHandler(reroll, isPrivate ? app.events.privateMessage({ text: current.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: current.command, platform: 'qq-bot' }));
      const view = inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length, 1);
      assert.ok(view.text.includes('功法换词结果未获完整确认'));
      assert.ok(view.text.includes('不自动重放'));
      assert.ok(!view.text.includes('private storage'));
      assert.ok(!view.commands.some(command => /^\/(?:确认换词|取消换词|换词)(?:\s|$)/.test(command)));
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}
for (const isPrivate of [false, true]) for (const shape of ['list', 'empty-list', 'no-charms', 'zero-pool', 'active-pool', 'confirm', 'confirm-zero', 'cancel']) {
  test(`reroll facts and executable actions ${shape} private=${isPrivate}`, async t => {
    const entry = shape.startsWith('confirm') ? entries[1] : shape === 'cancel' ? entries[2] : entries[0];
    const command = shape === 'confirm-zero' ? '/确认换词 0' : entry.command;
    let data: Record<string, unknown> = dataFor(entry.mode);
    if (shape.endsWith('list') || shape === 'no-charms') data = { mode: 'preview', bookId: 2, result: { mode: 'list', skillBook: book, ownedCount: shape === 'no-charms' ? 0 : 3, availableAttrs: shape === 'empty-list' ? [] : [{ label: '物攻', currentText: '8', maxText: '70' }] } };
    if (shape === 'active-pool') data = { ...data, result: { ...dataFor('preview').result, pending: { ...pending, targetPool: 'active', targetWasActive: true } } };
    if (shape === 'confirm-zero') data = { ...data, bookId: 0 };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(reroll, isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    if (shape !== 'cancel') assert.ok(view.text.includes('测试功法'), view.text);
    if (shape.endsWith('list') || shape === 'no-charms') {
      assert.ok(view.text.includes('选择词条消耗换词符×1'));
      assert.ok(view.text.includes('没有可用未激活词条时才使用已激活词条池'));
      assert.ok(!view.text.includes('概率较低'));
      assert.ok(view.text.includes('取消不返还'));
      if (shape === 'empty-list') { assert.ok(view.text.includes('当前没有可选择的词条')); assert.ok(!view.commands.includes('/换词 2 物攻')); }
      else assert.ok(view.commands.includes('/换词 2 物攻'));
      if (shape === 'no-charms') { assert.ok(view.text.includes('换词符 0 张')); assert.ok(view.commands.includes('/储物袋')); }
    } else if (shape.endsWith('pool')) {
      for (const text of ['60秒', '换词符×1', '取消不返还', '8', '70', '30', '100']) assert.ok(view.text.includes(text));
      if (shape === 'active-pool') assert.ok(view.text.includes('已激活词条数量会减少1条'));
      assert.ok(view.commands.includes('/确认换词 2'));
      assert.ok(view.commands.includes('/取消换词'));
    } else if (shape.startsWith('confirm')) {
      assert.ok(view.text.includes('已替换：物攻 -> 气血'));
      assert.ok(view.commands.includes('/查看功法 2'));
      assert.ok(!view.commands.includes('/查看功法 0'));
      assert.equal((requests[0].body.arguments as { bookId: string }).bookId, shape === 'confirm-zero' ? '0' : '2');
    } else assert.ok(view.text.includes('换词符不返还'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const current of entries) {
  test(`reroll router dispatch and dedupe ${current.mode}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, dataFor(current.mode)));
    const router = Router.create({ events: ['message.create', 'private.message.create'] });
    router.use(current.mode === 'preview' ? '换词' : current.mode === 'confirm' ? '确认换词' : '取消换词', async () => ({ default: reroll }));
    await app.mount({ responseRouter: router.define });
    const event = app.events.groupMessage({ text: current.command, platform: 'qq-bot' });
    const result = await app.dispatch(event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    await app.dispatch({ ...event });
    assert.equal(requests.length, 1);
  });
}

for (const isPrivate of [false, true]) {
  test(`reroll valid raw feedback preserves reason and recovery private=${isPrivate}`, async t => {
    const reason = '你有一份功法换词结果待确认，请先发送 /确认换词 或 /取消换词';
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '', rawLines: [reason], buttons: [], advice: [] }]));
    const result = await app.runHandler(reroll, isPrivate ? app.events.privateMessage({ text: '/换词 9 物攻', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/换词 9 物攻', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(reason));
    assert.ok(view.text.includes('预览有效期60秒'));
    assert.ok(view.text.includes('不能用本次请求编号代替'));
    assert.ok(view.commands.includes('/我的功法'));
    assert.ok(!view.commands.some(command => /^\/(?:确认换词|取消换词|换词)(?:\s|$)/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
