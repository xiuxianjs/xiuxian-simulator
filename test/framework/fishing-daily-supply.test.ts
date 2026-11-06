import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { fishingChums } from '../../src/api/bot/fishing';
import handler from '../../src/response/fishing/res';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

const dailySupply = '/垂钓 每日补给';
const date = '2026-11-06';
const section = (lines: string[], actions: { label: string; command: string }[] = []) => ({ lines, actions });
const choices = Object.keys(fishingChums).map(name => ({ label: name, command: `${dailySupply} 领取 ${name} ${date}` }));
const fishingView = (view: string, title: string, sections: ReturnType<typeof section>[]) => ({
  rulesVersion: 'daily-supply-fixture', view, title, sections,
  footer: [{ label: '返回垂钓', command: '/垂钓' }]
});
const overview = (available: boolean) => fishingView('overview', '洞府垂钓', [
  section(['水域：筑基水域']), section(['钓具：青竹灵竿']), section(['本次渔获：0尾']),
  section(['🎣持续垂钓中🎣'], [
    ...(available ? [{ label: '每日补给', command: dailySupply }] : []),
    { label: '结束垂钓', command: '/垂钓 收竿' }, { label: '使用渔具', command: '/垂钓 渔具' }
  ])
]);
const menu = fishingView('daily-supply', '每日补给', [
  section(['数量：每日任选一种窝料，免费领取1份'], choices.slice(0, 3)),
  section(['物品：其他窝料'], choices.slice(3))
]);
const receipt = fishingView('daily-supply-receipt', '每日补给 · 已领取', [section(['获得：升灵散 ×1'])]);
const captures: Record<string, TestRunResult['messages']> = {};
after(async () => {
  if (process.env.FISHING_DAILY_SUPPLY_CAPTURE) {
    writeFileSync(process.env.FISHING_DAILY_SUPPLY_CAPTURE, JSON.stringify(captures, null, 2));
  }
  await shutdownLogger();
});

function sent(result: TestRunResult, capture?: string) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];

  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const check = (nodes: unknown[]) => nodes.forEach(raw => {
    const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> };

    if (node.type === 'MD.button') {
      assert.equal(node.options?.autoEnter, false);
      assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
      assert.ok([...String(node.options?.data)].length <= 80);
    }
    if (Array.isArray(node.value)) check(node.value);
  });
  check(message.nodes);
  if (capture) captures[capture] = result.messages;

  return inspectMessage(message.nodes);
}

test('每日补给在垂钓状态下、结束垂钓前单独一行，发送原日期领取后隐藏', async t => {
  let claimed = false;
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/fishing.query')) return businessEnvelope(request.bid, overview(!claimed));
    const input = request.body.arguments as { date?: string };

    if (input.date === undefined) return businessEnvelope(request.bid, menu);
    claimed = true;

    return businessEnvelope(request.bid, receipt);
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
  const run = async (text: string, messageId: string, capture?: string) => sent(
    await app.dispatch(app.events.groupMessage({ text, messageId, platform: 'qq-bot' })), capture
  );
  const retry = async (text: string, messageId: string) => sent(
    await app.runHandler(handler, app.events.groupMessage({ text, messageId, platform: 'qq-bot' }))
  );
  const before = await run('/垂钓', 'home-before', 'available');
  assert.match(before.text, /🎣持续垂钓中🎣[^\S\n]*\n[^\S\n]*‹每日补给›[^\S\n]*\n[^\S\n]*‹结束垂钓›[^\S\n]*\n[^\S\n]*‹使用渔具›/);
  const read = before.commands.find(command => command === dailySupply)!;
  const selectable = await run(read, 'supply-read', 'menu');
  await retry(read, 'supply-read');
  assert.ok(!claimed);
  assert.deepEqual(selectable.commands.filter(command => command.startsWith(`${dailySupply} 领取`)), choices.map(choice => choice.command));
  const claim = selectable.commands.find(command => command.includes('领取 升灵散'))!;
  const received = await run(claim, 'supply-write', 'receipt');
  await retry(claim, 'supply-write');
  assert.match(received.text, /升灵散 ×1/);
  assert.ok(!received.commands.some(command => command.includes('领取')));
  const done = await run('/垂钓', 'home-after', 'claimed');
  assert.match(done.text, /🎣持续垂钓中🎣[^\S\n]*\n[^\S\n]*‹结束垂钓›[^\S\n]*\n[^\S\n]*‹使用渔具›/);
  assert.ok(!done.commands.includes(dailySupply));
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { view: 'overview' }, {}, {},
    { chumType: 'deep_realm', date }, { chumType: 'deep_realm', date },
    { view: 'overview' }
  ]);
  assert.ok(requests.slice(1, 5).every(request => request.path.endsWith('/fishing.daily-supply')));
  assert.notEqual(requests[1].idempotencyKey, requests[2].idempotencyKey);
  assert.ok(requests[3].idempotencyKey);
  assert.equal(requests[3].idempotencyKey, requests[4].idempotencyKey);
});

test('每日补给拒绝不完整、坏日期、未知窝料及额外份数，零业务请求', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('invalid command'); });
  for (const text of [
    `${dailySupply} 领取 聚鳞散`, `${dailySupply} 领取 聚鳞散 2026-02-29`,
    `${dailySupply} 领取 未知散 ${date}`, `${dailySupply} 领取 聚鳞散 ${date} 2`,
    `${dailySupply} 领取 聚鳞散 2026-11-6`, `${dailySupply} 聚鳞散 ${date}`
  ]) {
    const view = sent(await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' })));
    assert.match(view.text, /参数错误/);
  }
  assert.equal(requests.length, 0);
});

test('每日补给领取结果未知时仅提供查看或手动重试原日期', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'isolated failure' }), 500);
  const original = `${dailySupply} 领取 聚鳞散 ${date}`;
  const view = sent(await app.runHandler(handler, app.events.privateMessage({ text: original, platform: 'qq-bot' })));
  assert.match(view.text, /领取结果待核对/);
  assert.ok(view.commands.includes(original));
  assert.ok(view.commands.includes(dailySupply));
  assert.equal(requests.length, 1);
});
