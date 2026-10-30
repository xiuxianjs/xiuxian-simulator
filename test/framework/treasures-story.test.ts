import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger, type DataEnums } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

const previews = new Map<string, string>();
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
  result: { operationId, rulesVersion: 'treasure-v8-first-guards-20261029', message: '上古遗珍探索完成', source: 'dao_crystal', count,
    paidAmount: count === 1 ? 12 : 108, experienceGranted: count * 100, rewards: rewards.map((reward, index) => ({ ...reward, pullIndex: index + 1 })) }
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

type StoryScenario = {
  label: string;
  story: string;
  rewards: Array<ReturnType<typeof fragment> & { autoSynthesized?: number; fragmentsRemaining?: number }>;
  count?: 1 | 10;
  preview?: string;
};
const directBody = (rarity: number) => ({ ...fragment(rarity), kind: 'body', newlyOwned: true });
const scenarios: StoryScenario[] = [
  { label: '直接获得稀有完整宝物', story: '你越过瘴雾深谷', rewards: [directBody(4)], preview: '稀有·紫完整本体' },
  { label: '直接获得史诗完整宝物', story: '你横渡沧海', rewards: [directBody(5)], preview: '史诗·金完整本体' },
  { label: '直接获得神话完整宝物', story: '你踏尽四海八荒', rewards: [body], preview: '神话·红完整本体' },
  { label: '仅有神话碎片', story: '你踏过断碑荒径', rewards: [fragment(6)], count: 1, preview: '仅有碎片·最高神话，仍为基础场景' },
  { label: '稀有完整本体与神话碎片同出', story: '你越过瘴雾深谷', rewards: [directBody(4), fragment(6)] },
  { label: '史诗完整本体与神话碎片同出', story: '你横渡沧海', rewards: [directBody(5), fragment(6)] },
  { label: '多个完整本体取最高神话', story: '你踏尽四海八荒', rewards: [body, directBody(4), directBody(5)] },
  { label: '神话碎片自动合成本体', story: '你踏过断碑荒径', rewards: [{ ...fragment(6), autoSynthesized: 1, fragmentsRemaining: 0, newlyOwned: true }], count: 1 },
  { label: '精良完整本体与神话碎片同出', story: '你踏过断碑荒径', rewards: [directBody(3), fragment(6)] }
];

for (const scenario of scenarios) {
  test(`${scenario.label}按本次完整本体选叙事，满3秒后才发探索结果`, async t => {
    const rewards = [...scenario.rewards, ...Array.from({ length: (scenario.count ?? 10) - scenario.rewards.length }, () => fragment())];
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, receipt(rewards)));
    const { pending } = await start(app);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('treasures.confirm'));
    assert.deepEqual(requests[0].body.arguments, { confirmationRef });
    assert.equal(sendCalls(app).length, 1);
    const narrative = liveViews(app)[0];
    assert.match(narrative.text, /^上古遗珍\n/);
    assert.ok(narrative.text.includes(scenario.story));
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
    if (scenario.preview) previews.set(scenario.preview, `## 探索叙事与结果（${scenario.preview}）\n\n离线真实处理器示例：仅本次直接获得的完整本体决定紫、金、红叙事；碎片及自动合成不提升场景。结算先完成，再分别发送以下两条消息。\n\n第一条消息（没有操作按钮）：\n\n${views[0].text}\n\n等待3秒后，第二条消息：\n\n${views[1].text}\n\n结果中的按钮均为手动发送（autoEnter:false），仍引用原操作结果。\n`);
  });
}

test('直接本体保留星标，自动合成用➥且不重复奖励', async t => {
  const rewards = [body, { ...fragment(5), quantity: 3, autoSynthesized: 1, fragmentsRemaining: 2, newlyOwned: true }, ...Array.from({ length: 8 }, () => fragment())];
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, receipt(rewards)));
  const { pending } = await start(app);
  await app.clock.advance(3000);
  const views = delivered(await pending);
  assert.match(views[1].text, /⭐ 乾坤鼎 · 本体 ×1 · 已激活/);
  assert.match(views[1].text, /万木春符 · 碎片 ×3/);
  assert.doesNotMatch(views[1].text, /⭐ .* · 碎片|直接完整本体/);
  assert.match(views[1].text, /➥ 自动合成1本体，余片2/);
  assert.doesNotMatch(views[1].text, /⭐ 自动合成/);
  assert.equal(views[1].text.match(/⭐ 乾坤鼎/g)?.length, 1);
  assert.equal(views[1].text.match(/自动合成1本体/g)?.length, 1);
});

test('探索结果仅操作与消耗引用，奖励和查看同行在框外，合成独立下一行', async t => {
  const rewards = [body, { ...fragment(6), quantity: 3, autoSynthesized: 1, fragmentsRemaining: 2, newlyOwned: true }, ...Array.from({ length: 8 }, () => fragment())];
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, receipt(rewards)));
  const { pending } = await start(app);
  await app.clock.advance(3000);
  const result = await pending;
  delivered(result);
  const nodes = result.messages[1].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const quotes = nodes.filter(node => node.type === 'MD.blockquote');
  assert.equal(quotes.length, 2);
  assert.ok(JSON.stringify(quotes[0]).includes(operationId));
  assert.ok(JSON.stringify(quotes[1]).includes('宝物经验 +1000'));
  assert.doesNotMatch(JSON.stringify(quotes), /乾坤鼎|九天息壤|自动合成|查看/);
  const bodyIndex = nodes.findIndex(node => node.type === 'MD.text' && String(node.value).startsWith('⭐ 乾坤鼎'));
  const viewButton = nodes[bodyIndex + 1];
  assert.ok(bodyIndex > nodes.indexOf(quotes[1]));
  assert.ok(viewButton.type === 'MD.button');
  assert.equal(viewButton.options?.data, '/宝物 详情 603');
  assert.equal(viewButton.options?.autoEnter, false);
  const synthesisIndex = nodes.findIndex(node => node.type === 'MD.text' && node.value === '➥ 自动合成1本体，余片2');
  assert.ok(synthesisIndex > bodyIndex);
  assert.equal(nodes[synthesisIndex - 1].type, 'MD.newline');
});

for (const rarity of [4, 5, 6]) for (const newlyOwned of [false, true]) {
  test(`${['稀有', '史诗', '神话'][rarity - 4]}自动合成只用普通场景与➥ newlyOwned=${newlyOwned}`, async t => {
    const reward = { ...fragment(rarity), quantity: 3, autoSynthesized: 1, fragmentsRemaining: 2, newlyOwned };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, receipt([reward], 1)));
    const { pending } = await start(app);
    const narrative = liveViews(app)[0];
    assert.match(narrative.text, /你踏过断碑荒径/);
    assert.doesNotMatch(narrative.text, /你越过瘴雾深谷|你横渡沧海|你踏尽四海八荒/);
    await app.clock.advance(3000);
    const done = await pending;
    const views = delivered(done);
    assert.equal(views.length, 2);
    assert.match(views[1].text, /➥ 自动合成1本体，余片2/);
    assert.ok(views[1].text.includes(`${reward.name} · 碎片 ×${reward.quantity}${newlyOwned ? ' · 已激活' : ''}`));
    assert.equal(views[1].text.includes('已激活'), newlyOwned);
    assert.doesNotMatch(views[1].text, /⭐|你越过瘴雾深谷|你横渡沧海|你踏尽四海八荒/);
    assert.equal(views[1].text.match(/自动合成1本体/g)?.length, 1);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { confirmationRef });
    const walk = (nodes: unknown[]) => {
      for (const raw of nodes) {
        const node = raw as { type?: string; value?: unknown; options?: { autoEnter?: boolean } };
        if (node.type === 'MD.button') assert.equal(node.options?.autoEnter, false);
        if (Array.isArray(node.value)) walk(node.value);
      }
    };
    for (const message of done.messages) walk(message.nodes);
    assert.doesNotMatch(JSON.stringify(done.messages.map(message => message.nodes)), /"show"\s*:/);
    if (rarity === 6 && newlyOwned) previews.set('神话碎片自动合成首次激活', `## 神话碎片自动合成首次激活（真实处理器离线示例）\n\n${views[0].text}\n\n${views[1].text}\n`);
  });
}

for (const [rarity, story] of [[3, '你踏过断碑荒径'], [4, '你越过瘴雾深谷'], [5, '你横渡沧海']] as const) test(`${rarity}档直接本体与神话自动合成同次出现时，场景不被合成提升`, async t => {
  const rewards = [directBody(rarity), { ...fragment(6), autoSynthesized: 1, fragmentsRemaining: 0, newlyOwned: true }, ...Array.from({ length: 8 }, () => fragment())];
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, receipt(rewards, 10)));
  const { pending } = await start(app);
  assert.ok(liveViews(app)[0].text.includes(story));
  await app.clock.advance(3000);
  const views = delivered(await pending);
  assert.match(views[1].text, /➥ 自动合成1本体，余片0/);
  assert.doesNotMatch(views[0].text, /你踏尽四海八荒/);
  assert.equal(requests.length, 1);
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
