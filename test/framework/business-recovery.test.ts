import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import consume from '../../src/response/consume/res';
import sweep from '../../src/response/storyline/sweep/res';
import ranking from '../../src/response/ranking/batchChallenge/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

const cases = [
  { reason: '储物袋中没有【培元丹】', commands: ['/储物袋 道具', '/商店 万宝楼', '/珍宝楼'] },
  { reason: '【精力丹】数量不足（拥有 1，需要 3）', commands: ['/储物袋 道具', '/商店 万宝楼', '/珍宝楼'] },
  { reason: '未找到"精力丸"对应的道具', commands: ['/储物袋 道具'] },
  { reason: '筑基丹需达到炼气九层方可服用', commands: ['/我的信息'] },
  { reason: '当前没有装备中的功法', commands: ['/我的功法'] },
  { reason: '明悟丹只能将熟练度提升至60%，当前装备的所有功法熟练度均已达到60%。60%以上只能通过比试提升。', commands: ['/我的功法'] },
  { reason: '今日明悟丹使用次数已达上限(10/10)', commands: ['/我的功法'] },
  { reason: '今日明悟丹剩余2次，无法服用3颗', commands: ['/储物袋 道具 丹药'] },
  { reason: '该丹药最多只能服用3次，已服用2次，还可服用1次', commands: ['/储物袋 道具 丹药'] },
  { reason: '该丹药最多只能服用3次，已服用3次', commands: ['/储物袋 道具 丹药'] },
  { reason: '丹方已改为图鉴解锁制，无需通过物品学习', commands: ['/丹方'] },
  { reason: '本命物已改为直接存储，请在储物袋-本命物中查看和炼化', commands: ['/储物袋 本命'] }
];

for (const privateChat of [false, true]) {
  for (const entry of cases) {
    test(`服丹失败附带对应入口：${entry.reason}（${privateChat ? '私聊' : '群聊'}）`, async t => {
      const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: entry.reason }), 409);
      const event = privateChat
        ? app.events.privateMessage({ text: '/服用 培元丹 3', platform: 'qq-bot' })
        : app.events.groupMessage({ text: '/服用 培元丹 3', platform: 'qq-bot' });
      const result = await app.runHandler(consume, event);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/v2/robot/business/items.consume');
      assert.ok(requests[0].idempotencyKey);
      assert.equal(result.messages.length, 1);
      assert.equal(result.nextCalls.length, 0);
      const message = result.messages[0];
      const view = inspectMessage(message.nodes);
      assert.ok(view.text.includes(entry.reason));
      assert.doesNotMatch(view.text, /建议：/);
      for (const command of entry.commands) assert.ok(view.commands.includes(command), JSON.stringify(view.commands));
      assert.ok(!view.commands.some(command => command.startsWith('/服用 ')), '建议不直接再次消耗丹药');
      if (!entry.reason.includes('数量不足') && !entry.reason.includes('储物袋中没有')) {
        assert.ok(!view.commands.includes('/商店 万宝楼'), '条件或次数限制不引导购买');
      }
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      assert.equal(message.target?.targetId, privateChat ? event.UserId : event.ChannelId);
    });
  }
}

for (const mode of ['feedback', 'data'] as const) {
  test(`业务${mode}分支也补全缺药建议`, async t => {
    const reason = '储物袋中没有【培元丹】';
    const { app, requests } = await gameFixture(t, request =>
      mode === 'feedback'
        ? businessEnvelope(request.bid, undefined, [{ title: '消耗道具', heading: '', text: reason, buttons: [], advice: [] }])
        : businessEnvelope(request.bid, { outcome: 'rejected', message: reason })
    );
    const result = await app.runHandler(consume, app.events.privateMessage({ text: '/服用 培元丹', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.ok(view.commands.includes('/商店 万宝楼'));
    assert.ok(view.commands.includes('/珍宝楼'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('服务端已有建议保留，说明和入口在同一引用块，不附加购买建议', async t => {
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, undefined, [
      {
        title: '消耗道具',
        heading: '',
        text: '筑基丹需达到炼气九层方可服用',
        buttons: [{ label: '个人信息', command: '/我的信息' }],
        advice: [{ command: '/闭关', description: '前往闭关积累修为' }]
      }
    ])
  );
  const result = await app.runHandler(consume, app.events.privateMessage({ text: '/服用 筑基丹', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.includes('/我的信息'));
  assert.ok(!view.commands.includes('/珍宝楼'));
  const quotes = message.nodes?.flatMap(node => (node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : [])) ?? [];
  assert.ok(
    quotes.some(quote => {
      if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) return false;
      const quoted = inspectMessage([{ type: 'Markdown', value: quote.value }]);
      return quoted.text.includes('前往闭关积累修为') && quoted.commands.includes('/闭关');
    })
  );
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const entry of [
  { handler: sweep, command: '/主线扫荡 1-1 3', reason: '精力不足，无法扫荡' },
  { handler: ranking, command: '/连续爬塔', reason: '元力不足' }
]) {
  for (const mode of ['http', 'feedback'] as const) {
    test(`其他操作${mode}也附带资源恢复入口：${entry.reason}`, async t => {
      const { app, requests } = await gameFixture(
        t,
        request =>
          mode === 'http'
            ? { code: 'CONFLICT', message: entry.reason }
            : businessEnvelope(request.bid, undefined, [{ title: '操作未完成', heading: '', text: entry.reason, buttons: [], advice: [] }]),
        mode === 'http' ? 409 : 200
      );
      const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }));
      assert.equal(requests.length, 1);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      const view = inspectMessage(message.nodes);
      assert.ok(view.text.includes(entry.reason));
      assert.ok(view.commands.includes('/储物袋 道具 丹药'));
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}

test('未知业务错误保留原因，不猜测解决方式', async t => {
  const { app } = await gameFixture(t, () => ({ code: 'CONFLICT', message: '该丹药配置无效，请联系运营' }), 409);
  const result = await app.runHandler(consume, app.events.privateMessage({ text: '/服用 培元丹', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('该丹药配置无效，请联系运营'));
  assert.ok(!view.commands.includes('/商店 万宝楼'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('成功使用不附带失败建议', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'consumed', message: '服用成功', remainingQuantity: 1 }));
  const result = await app.runHandler(consume, app.events.privateMessage({ text: '/服用 精力丹', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('服用成功'));
  assert.ok(!view.text.includes('建议：'));
  assert.ok(!view.commands.includes('/珍宝楼'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
