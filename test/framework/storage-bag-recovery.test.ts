import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import menu from '../../src/response/storage/newBag/main/res';
import materials from '../../src/response/storage/newBag/materials/res';
import props from '../../src/response/storage/newBag/props/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: menu, op: 'storage.menu', text: '/储物袋', args: {} },
  { handler: materials, op: 'storage.materials', text: '/储物袋 材料 草药 9', args: { args: ['草药', '9'] } },
  { handler: props, op: 'storage.props', text: '/储物袋 道具 丹药 9', args: { args: ['丹药', '9'] } }
];
for (const entry of entries) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback', 'malformed', 'structured']) {
  test(`${entry.op} ${mode} private=${isPrivate}`, async t => {
    const reason = '原查询失败';
    const { app, requests } = await gameFixture(t, request => {
      if (mode === 'http') return { code: 'CONFLICT', message: reason };
      if (mode === 'malformed') return businessEnvelope(request.bid, {});
      return businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: mode === 'structured' ? [{ label: '原返回', command: '/我' }] : [],
        blocks: [{ text: reason, quoted: false }, { text: '原说明', quoted: true }], quote: '原引用',
        advice: mode === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]);
    }, mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    if (mode !== 'malformed') assert.ok(view.text.includes(reason));
    if (mode === 'feedback' || mode === 'structured') for (const text of ['原说明', '原引用']) assert.ok(view.text.includes(text));
    if (mode === 'structured') {
      assert.ok(view.text.includes('原服务建议'));
      assert.ok(view.commands.includes('/我的信息'));
      assert.ok(view.commands.includes('/我'));
    } else {
      assert.ok(view.text.includes('无法据此判断物品数量或是否丢失'), view.text);
      assert.ok(view.commands.includes('/储物袋'));
    }
    assert.ok(!view.text.includes('该分类暂无物品'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries.slice(1)) for (const isPrivate of [false, true]) for (const total of [0, 7]) {
  test(`${entry.op} empty page total=${total} private=${isPrivate}`, async t => {
    const data = { activeSubcategory: entry.op === 'storage.props' ? 'pill' : 'herb', pagination: { page: 9, pageSize: 5, total, totalPages: total ? 2 : 1 }, items: [], capabilities: [{ kind: 'viewProfile' }], playerStageLevel: 0 };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, entry.args);
    if (total) {
      assert.ok(view.text.includes('当前分类共 7 条记录'));
      assert.ok(view.text.includes('本页为空不等于全部用完'));
      assert.ok(view.commands.includes(entry.op === 'storage.props' ? '/储物袋 道具' : '/储物袋 材料'));
      assert.ok(!view.text.includes('该分类暂无物品'));
    } else {
      assert.ok(view.text.includes('这里只表示当前子分类没有记录'));
      assert.ok(view.commands.includes('/储物袋'));
    }
    assert.ok(!view.commands.some(command => /^\/(锁定|解锁|使用)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
