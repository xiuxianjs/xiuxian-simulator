import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger, type DataEnums } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

const previews = new Map<number, string>();
after(async () => {
  if (process.env.TREASURE_STORY_PREVIEW_OUTPUT) writeFileSync(process.env.TREASURE_STORY_PREVIEW_OUTPUT, [...previews.values()].join('\n'), 'utf8');
  await shutdownLogger();
});
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const operationId = 'original-story-operation';
const fragment = (rarity = 1) => ({ treasureId: rarity * 100 + 1, name: ({ 1: '锈剑残片', 4: '采薇竹篮', 5: '万木春符', 6: '九天息壤' } as Record<number, string>)[rarity] ?? '测试碎片', rarity, kind: 'fragment', quantity: 1, newlyOwned: false });
const body = { treasureId: 603, name: '乾坤鼎', rarity: 6, kind: 'body', quantity: 1, newlyOwned: true };
const receipt = (rewards: ReturnType<typeof fragment>[], count = rewards.length) => ({
  kind: 'explore', operationId,
  result: { operationId, rulesVersion: 'treasure-v3-complete-20261027', message: '上古遗珍探索完成', source: 'dao_crystal', count,
    paidAmount: count === 1 ? 12 : 108, experienceGranted: count * 100, rewards }
});
type App = Awaited<ReturnType<typeof gameFixture>>['app'];
const sendCalls = (app: App) => app.calls.filter(call => call.name === 'message.send');
function liveViews(app: App) {
  return sendCalls(app).map(call => {
    const request = call.request as { payload: { params: { format: DataEnums[] } } };
    return inspectMessage(request.payload.params.format);
  });
}
async function waitUntil(test: () => boolean) {
  const deadline = performance.now() + 2000;
  while (performance.now() < deadline) {
    if (test()) return;
    await nextTurn();
  }
  throw new Error('真实处理器未进入预期的发送或时钟节点');
}
async function start(app: App) {
  const initialCalls = sendCalls(app).length;
  const pending = app.runHandler(handler, app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' }));
  await waitUntil(() => app.clock.pending > 0 || sendCalls(app).length > initialCalls + 1);
  return { pending };
}
function delivered(result: TestRunResult) {
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  return result.messages.map(message => inspectMessage(message.nodes));
}

for (const [rarity, story] of [
  [1, '你踏过断碑荒径'], [2, '你踏过断碑荒径'], [3, '你踏过断碑荒径'],
  [4, '你越过瘴雾深谷'], [5, '你横渡沧海'], [6, '你踏尽四海八荒']
] as const) {
  test(`最高奖励${rarity}品叙事独立发送，满3秒后才发探索结果`, async t => {
    const rewards = Array.from({ length: 10 }, (_, index) => index === 0 ? { ...fragment(), kind: 'body' } : fragment(index === 9 ? rarity : 1));
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, receipt(rewards)));
    const { pending } = await start(app);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('treasures.confirm'));
    assert.deepEqual(requests[0].body.arguments, { confirmationRef });
    assert.equal(sendCalls(app).length, 1);
    const narrative = liveViews(app)[0];
    assert.match(narrative.text, /^上古遗珍\n/);
    assert.ok(narrative.text.includes(story));
    assert.doesNotMatch(narrative.text, /操作编号|宝物经验|碎片|本体|消耗|确认/);
    assert.deepEqual(narrative.commands, []);
    await app.clock.advance(2999);
    assert.equal(sendCalls(app).length, 1);
    await app.clock.advance(1);
    const result = await pending;
    const views = delivered(result);
    assert.equal(views.length, 2);
    assert.match(views[1].text, /^上古遗珍探索完成\n/);
    assert.ok(views[1].text.includes(`操作编号 ${operationId}`));
    assert.ok(!views[1].text.includes('宝物操作回执'));
    assert.deepEqual(views[1].commands.slice(-3), ['/宝物', '/上古遗珍', '/充值 灵脉租契']);
    assert.equal(requests.length, 1);
    if (rarity >= 4) previews.set(rarity, `## 探索叙事与结果（最高${({ 4: '稀有·紫', 5: '史诗·金', 6: '神话·红' } as Record<number, string>)[rarity]}）\n\n离线真实处理器示例：本例最高品质来自碎片，叙事不代表获得同档完整本体。结算先完成，再分别发送以下两条消息。\n\n第一条消息（没有操作按钮）：\n\n${views[0].text}\n\n等待3秒后，第二条消息：\n\n${views[1].text}\n\n结果中的按钮均为手动发送（autoEnter:false），仍引用原操作结果。\n`);
  });
}

test('结果只给本体及自动合成本体加星，碎片不加星且不重复奖励', async t => {
  const rewards = [body, { ...fragment(5), autoSynthesized: 1, fragmentsRemaining: 2, newlyOwned: true }, ...Array.from({ length: 8 }, () => fragment())];
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, receipt(rewards)));
  const { pending } = await start(app);
  await app.clock.advance(3000);
  const views = delivered(await pending);
  assert.match(views[1].text, /⭐ 乾坤鼎 · 本体 ×1 · 已激活/);
  assert.match(views[1].text, /万木春符 · 碎片 ×1/);
  assert.doesNotMatch(views[1].text, /⭐ .* · 碎片|直接完整本体/);
  assert.match(views[1].text, /⭐ 自动合成1本体，余片2/);
  assert.equal(views[1].text.match(/⭐ 乾坤鼎/g)?.length, 1);
  assert.equal(views[1].text.match(/自动合成1本体/g)?.length, 1);
});

for (const failedSend of [1, 2]) {
  test(`第${failedSend}段发送返回失败码后保留原ref，重试只取原结算结果`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, receipt([body])));
    let sends = 0;
    app.actions.on('message.send', () => [{ code: ++sends === failedSend ? ResultCode.Fail : ResultCode.Ok, message: 'offline transport', data: null }]);
    const { pending } = await start(app);
    if (failedSend === 2) await app.clock.advance(3000);
    const result = await pending;
    const last = result.messages.at(-1)!;
    assert.equal(result.actions[last.actionIndex].results?.[0].code, ResultCode.Ok);
    const recovery = inspectMessage(last.nodes);
    assert.match(recovery.text, /探索已结算，消息未确认送达/);
    assert.ok(recovery.commands.includes(`/确认宝物 ${confirmationRef}`));
    assert.equal(requests.length, 1);
    const { pending: retry } = await start(app);
    await app.clock.advance(3000);
    const replay = delivered(await retry);
    assert.equal(replay.length, 2);
    assert.equal(requests.length, 2);
    for (const request of requests) {
      assert.ok(request.path.endsWith('treasures.confirm'));
      assert.deepEqual(request.body.arguments, { confirmationRef });
    }
    assert.ok(replay[1].text.includes(operationId));
  });
}
