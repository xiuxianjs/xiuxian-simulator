import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import treasures from '../../src/response/treasures/res';
import recharge from '../../src/response/recharge/info/res';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });

function delivered(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      const row = node as { type?: string; value?: unknown; options?: { autoEnter?: boolean } };
      if (row.type === 'MD.button') assert.equal(row.options?.autoEnter, false);
      if (Array.isArray(row.value)) walk(row.value);
    }
  };
  walk(message.nodes);
  assert.doesNotMatch(JSON.stringify(message.nodes), /"show"\s*:/);
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  return view;
}

const entries = [
  { handler: treasures, command: '/宝物', operation: 'treasures.overview', reason: '宝物系统数据结构尚未升级，请先执行宝物系统迁移', fallback: '暂未取得完整预览或数据' },
  { handler: treasures, command: '/上古遗珍', operation: 'ancient-relics.overview', reason: '宝物旧规则账户尚未完成迁移，请先核对旧计数与资产，未自动重置保底', fallback: '暂未取得完整预览或数据' },
  { handler: treasures, command: '/灵脉租契', operation: 'spirit-vein.overview', reason: '灵脉租契数据结构尚未升级，请执行宝物系统迁移', fallback: '暂未取得完整预览或数据' },
  { handler: recharge, command: '/充值', operation: 'recharge.catalog', reason: '宝物系统数据结构尚未升级，请先执行宝物系统迁移', fallback: '读取充值信息失败' },
  { handler: recharge, command: '/充值 灵脉租契', operation: 'recharge.catalog', reason: '灵脉租契配置与当前30元／30日规则不符，请联系管理员核对', fallback: '读取充值信息失败' },
  { handler: recharge, command: '/充值 日礼包', operation: 'recharge.catalog', reason: '每日宝物礼包尚未执行v3数据迁移', fallback: '读取充值信息失败' }
];

for (const entry of entries) for (const privateChat of entry.command.includes('日礼包') ? [true] : [true, false]) test(`已审阅503原因不再被通用提示遮盖 ${entry.command} private=${privateChat}`, async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'SERVICE_UNAVAILABLE', message: entry.reason }), 503);
  const event = privateChat ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
  const view = delivered(await app.runHandler(entry.handler, event));
  assert.ok(view.text.includes(entry.reason));
  assert.ok(!view.text.includes(entry.fallback));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, `/api/v2/robot/business/${entry.operation}`);
  assert.ok(!view.commands.some(command => /^\/(确认宝物|确认礼包|充值购买)/.test(command)));
});

for (const entry of entries.filter(entry => ['/宝物', '/充值'].includes(entry.command))) {
  for (const response of [
    { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'SQL private_table secret-token' },
    { status: 503, code: 'SERVICE_UNAVAILABLE', message: `${entry.reason} SQL private_table secret-token` },
    { status: 500, code: 'INTERNAL', message: entry.reason },
    { status: 503, code: 'INTERNAL', message: entry.reason }
  ]) test(`未知或混入诊断的可用性错误不透出 ${entry.command} ${response.status}/${response.code}/${response.message.startsWith('SQL')}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: response.code, message: response.message }), response.status);
    const view = delivered(await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })));
    assert.ok(view.text.includes(entry.fallback));
    assert.doesNotMatch(view.text, /SQL|private_table|secret-token/);
    assert.ok(!view.text.includes(entry.reason));
    assert.equal(requests.length, 1);
  });
}

test('充值服务端既有失败反馈只展示一次，保持失败且不伪造目录或付款入口', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [
    { title: '充值', heading: '', text: '⚠️ 读取充值信息失败，请稍后重试', buttons: [], advice: [] }
  ]));
  const view = delivered(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' })));
  assert.equal(view.text.match(/读取充值信息失败/g)?.length, 1);
  assert.ok(!view.commands.some(command => command.startsWith('/充值购买')));
  assert.equal(requests.length, 1);
});
