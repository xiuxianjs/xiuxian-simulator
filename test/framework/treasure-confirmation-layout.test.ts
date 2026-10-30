import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const expiresAt = '2026-10-30T12:34:56+08:00';
const expiryText = '有效至 2026-10-30 12:34:56+08:00';
const validity = '确认凭据24小时有效；状态变化时请重新预览。网络结果不明时请重试原确认。';
const replayNotice = '确认后按本次预览结算；重复确认只返回原操作结果。';
const previews: string[] = [];
type Node = { type?: string; value?: unknown; options?: Record<string, unknown> };
const plainText = (node: Node): string => Array.isArray(node.value)
  ? node.value.map(value => plainText(value as Node)).join('')
  : typeof node.value === 'string' ? node.value : '';

after(async () => {
  if (process.env.TREASURE_CONFIRMATION_LAYOUT_PREVIEW_OUTPUT) {
    writeFileSync(process.env.TREASURE_CONFIRMATION_LAYOUT_PREVIEW_OUTPUT, previews.join('\n'), 'utf8');
  }
  await shutdownLogger();
});

function delivered(result: TestRunResult) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []) as Node[];
  const quotes = nodes.filter(node => node.type === 'MD.blockquote');
  const view = inspectMessage(message.nodes);
  const walk = (items: Node[]) => {
    for (const node of items) {
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
      }
      if (Array.isArray(node.value)) walk(node.value as Node[]);
    }
  };
  walk(message.nodes as Node[]);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  return { nodes, quotes, view };
}

function confirmOutsideQuote(result: ReturnType<typeof delivered>, command: string, cancel: string) {
  assert.equal(result.quotes.length, 1);
  assert.ok(!JSON.stringify(result.quotes[0]).includes('MD.button'));
  const quoteIndex = result.nodes.indexOf(result.quotes[0]);
  const buttons = result.nodes.filter(node => node.type === 'MD.button');
  assert.deepEqual(buttons.slice(0, 2).map(button => button.options?.data), [command, cancel]);
  assert.ok(result.nodes.indexOf(buttons[0]) > quoteIndex);
  assert.ok(result.nodes.indexOf(buttons[1]) > quoteIndex);
}

for (const scenario of [
  { command: '/宝物 升品 504', kind: 'promote', action: '「神农鼎」星尘1阶 → 星尘2阶；消耗重复本体1、仙蕴0。', displayed: '「神农鼎」星尘1 → 星尘2；消耗重复本体1、仙蕴0。', tips: [], cancel: '/宝物' },
  { command: '/宝物 升级 504', kind: 'upgrade', action: '「神农鼎」等级1 → 2；消耗宝物经验20。', displayed: '「神农鼎」等级1 → 2；消耗宝物经验20。', tips: ['升级提升战斗数值，生活特效保持当前品级。'], cancel: '/宝物' },
  { command: '/宝物 分解 本体 504 1', kind: 'decompose', action: '「神农鼎」重复本体1 × 220仙蕴＝220仙蕴', displayed: '「神农鼎」重复本体1 × 220仙蕴＝220仙蕴', tips: ['共获得220仙蕴；主宝物不消耗，分解后不能撤销。'], cancel: '/宝物' },
  { command: '/上古遗珍 自选 604', kind: 'select-mythic', action: '消耗累计探索神话自选次数1次，领取「掌天瓶」1本体；允许重复。', displayed: '消耗累计探索神话自选次数1次，领取「掌天瓶」1本体；允许重复。', tips: ['自选不增加探索次数，不重置保底。'], cancel: '/上古遗珍' },
  { command: '/灵脉租契 领取', kind: 'claimLease', action: '领取已到期收益2日，共4000灵晶。', displayed: '领取已到期收益2日，共4000灵晶。', tips: [], cancel: '/我的权益 灵脉租契' }
] as const) {
  test(`${scenario.kind}权威动作摘要在引用块外，说明和动态有效期在块内，确认取消独立一行`, async t => {
    const summary = [scenario.action, ...scenario.tips, validity];
    const original = structuredClone(summary);
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      kind: scenario.kind, summary, operationId: 'layout-preview-operation', confirmationRef, expiresAt
    }));
    const result = delivered(await app.runHandler(handler, app.events.privateMessage({ text: scenario.command, platform: 'qq-bot' })));
    confirmOutsideQuote(result, `/确认宝物 ${confirmationRef}`, scenario.cancel);
    const actionIndex = result.nodes.findIndex(node => node.type === 'MD.text' && node.value === scenario.displayed);
    assert.ok(actionIndex >= 0 && actionIndex < result.nodes.indexOf(result.quotes[0]));
    const explanation = plainText(result.quotes[0]);
    assert.ok(!explanation.includes(scenario.displayed));
    for (const tip of scenario.tips) assert.ok(explanation.includes(tip));
    assert.ok(explanation.includes(validity));
    assert.ok(explanation.includes(expiryText));
    assert.ok(explanation.includes(replayNotice));
    assert.deepEqual(summary, original, '展示去阶后缀不能改冻结summary');
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/treasures.preview'));
    previews.push(`## ${scenario.command}\n\n${result.view.text}\n`);
  });
}

for (const [command, source, count, cost, unit] of [
  ['/上古遗珍 十连探索 灵晶', 'spirit_crystal', 10, 10800, '灵晶'],
  ['/上古遗珍 探索 道晶', 'dao_crystal', 1, 12, '道晶'],
  ['/上古遗珍 十连探索 道晶', 'dao_crystal', 10, 108, '道晶'],
  ['/上古遗珍 探索 藏宝图', 'treasure_map', 1, 1, '张藏宝图'],
  ['/上古遗珍 免费探索', 'free', 1, 0, '']
] as const) {
  test(`${source}/${count}探索确认只保留原摘要在块内，确认取消在块外`, async t => {
    const action = source === 'free'
      ? '上古遗珍：使用每日免费探索次数1次，获得100点宝物经验；免费探索1次。'
      : `上古遗珍：消耗${cost}${unit}，获得${count * 100}点宝物经验；附赠${count}次探索。`;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      kind: 'explore', operationId: 'layout-original-explore', confirmationRef, expiresAt,
      summary: [action, '内部完整判定、保底与其他服务端说明不展示。', validity]
    }));
    const result = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    confirmOutsideQuote(result, `/确认宝物 ${confirmationRef}`, '/上古遗珍');
    assert.equal(plainText(result.quotes[0]), action);
    assert.match(result.view.text, /^操作确认\n/);
    assert.doesNotMatch(result.view.text, /内部完整判定|24小时有效|有效至|重复确认只返回/);
    assert.deepEqual(requests[0].body.arguments, { kind: 'explore', source, count });
    assert.equal(requests.length, 1);
    previews.push(`## ${command}\n\n${result.view.text}\n`);
  });
}

for (const kind of ['batch-promote', 'batch-upgrade'] as const) {
  test(`${kind}逐项动作及合计在块外，不遗漏权威逐项消耗`, async t => {
    const action = kind === 'batch-promote'
      ? ['「神农鼎」星尘1阶 → 星尘2阶；消耗该宝物重复本体1、仙蕴0。', '「乾坤鼎」真阳5阶 → 仙藏1阶；消耗该宝物重复本体3、仙蕴100。']
      : ['「神农鼎」Lv.1 → Lv.2；消耗宝物经验20。', '「乾坤鼎」Lv.1 → Lv.2；消耗宝物经验20。'];
    const total = kind === 'batch-promote' ? '合计提升2件；宝物经验0、重复本体4、仙蕴100。' : '合计提升2件；宝物经验40、重复本体0、仙蕴0。';
    const tip = '按全部已拥有宝物处理，高稀有度优先；仅确认本次清单，库存或条件变化须重新预览。';
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
      kind, operationId: 'layout-batch-original', confirmationRef, expiresAt, summary: [...action, total, tip, validity]
    }));
    const command = kind === 'batch-promote' ? '/宝物 一键突破' : '/宝物 一键升级';
    const result = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    confirmOutsideQuote(result, `/确认宝物 ${confirmationRef}`, '/宝物');
    for (const line of [...action.map(line => line.replace(/((?:星尘|真阳|仙藏)\d+)阶/gu, '$1')), total]) {
      const index = result.nodes.findIndex(node => node.type === 'MD.text' && node.value === line);
      assert.ok(index >= 0 && index < result.nodes.indexOf(result.quotes[0]));
    }
    assert.ok(plainText(result.quotes[0]).includes(tip));
    assert.ok(plainText(result.quotes[0]).includes(validity));
    previews.push(`## ${command}\n\n${result.view.text}\n`);
  });
}

test('0元领取保留原礼包确认入口，首摘要在块外，资源与有效期在块内', async t => {
  const first = '全包原价30元，已付单项抵扣后本次0元；领取剩余1元礼包3份、6元礼包0份、18元礼包0份。';
  const resources = '获得道晶30、灵晶4500、藏宝图0及对应随机碎片。';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
    kind: 'daily-pack-free', operationId: 'layout-daily-free-original', confirmationRef, expiresAt,
    summary: [first, resources, '确认仅领取本次清单；库存、付款或业务日变化须重新预览。确认24小时有效，结果不明时重试原引用。']
  }));
  const result = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 领取全包', platform: 'qq-bot' })));
  confirmOutsideQuote(result, `/确认礼包 ${confirmationRef}`, '/充值 日礼包 30元全包');
  assert.ok(result.nodes.findIndex(node => node.type === 'MD.text' && node.value === first) < result.nodes.indexOf(result.quotes[0]));
  assert.ok(plainText(result.quotes[0]).includes(resources));
  assert.ok(plainText(result.quotes[0]).includes(expiryText));
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/treasures.daily-pack-free-preview'));
  previews.push(`## 0元剩余礼包确认\n\n${result.view.text}\n`);
});

test('确认保留完整最大合法短引用，不因按钮移出引用块截断', async t => {
  const maxRef = 'r1_zzzzzzzzzzzzz_b_zzzzzzzzzzzzz_ffffffffffffffffffffffff';
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    kind: 'promote', summary: ['「神农鼎」星尘1阶 → 星尘2阶；消耗重复本体1、仙蕴0。', validity],
    operationId: 'layout-max-ref', confirmationRef: maxRef, expiresAt
  }));
  const result = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 升品 504', platform: 'qq-bot' })));
  confirmOutsideQuote(result, `/确认宝物 ${maxRef}`, '/宝物');
});

for (const command of ['/宝物 升品 504', '/上古遗珍 领取全包']) {
  test(`${command}无权威摘要不生成盲确认`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      kind: command.includes('领取全包') ? 'daily-pack-free' : 'promote', operationId: 'layout-empty-summary', summary: [], confirmationRef, expiresAt
    }));
    const result = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.ok(!result.view.commands.some(value => /^\/确认(?:宝物|礼包) /.test(value)));
    assert.equal(requests.length, 1);
  });
}
