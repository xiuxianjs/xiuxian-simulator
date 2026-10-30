import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import treasures from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

const previews: Array<Record<string, unknown>> = [];
after(async () => {
  if (process.env.QQ_RELICS_PREVIEW_OUTPUT) {
    mkdirSync(dirname(process.env.QQ_RELICS_PREVIEW_OUTPUT), { recursive: true });
    writeFileSync(process.env.QQ_RELICS_PREVIEW_OUTPUT, JSON.stringify({ origin: 'Actual createTestApp recharge/exploration handlers and successful message.send nodes; backend/platform are offline fixtures.', scenarios: previews }, null, 2));
  }
  await shutdownLogger();
});
const overview = {
  rulesVersion: 'treasure-v10-exploration-pity-20261029', poolVersion: 'treasure-36-v2', serverDate: '2026-10-30',
  balances: { spiritCrystal: 30000, daoCrystal: 500, treasureMaps: 10 }, freeAvailable: true,
  spiritTenDiscountAvailable: true, daoTenDiscountAvailable: true, spiritTenCost: 6000, daoTenCost: 60,
  totalExplorations: 0, milestoneProgress: 0, pendingSelections: 0,
  shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
  pity: [], wholeRates: [], rules: [], records: []
};
function sent(result: TestRunResult, key: string, name: string, command: string, capture = true) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const node = raw as { type?: string; value?: unknown; options?: Record<string, unknown> };
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        assert.ok([...String(node.options?.data ?? '')].length <= 80);
      }
      if (Array.isArray(node.value)) { walk(node.value); }
    }
  };
  walk(message.nodes);
  const view = inspectMessage(message.nodes);
  if (capture) {
    previews.push({ key, name, command, text: view.text, commands: view.commands, messages: result.messages, actions: result.actions });
  }

  return view;
}

for (const [spirit, dao] of [[true, true], [false, true], [true, false], [false, false]]) {
  test(`两种币首十连独立报价 spirit=${spirit} dao=${dao}`, async t => {
    const data = { ...overview, spiritTenDiscountAvailable: spirit, daoTenDiscountAvailable: dao, spiritTenCost: spirit ? 6000 : 12000, daoTenCost: dao ? 60 : 108 };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const view = sent(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍', platform: 'qq-bot' })), `relics-${spirit ? 'spirit-first' : 'spirit-used'}-${dao ? 'dao-first' : 'dao-used'}`, `上古遗珍 · 灵晶${spirit ? '首半价' : '已用'} / 道晶${dao ? '首半价' : '已用'}`, '/上古遗珍');

    assert.match(view.text, new RegExp(`消耗${data.spiritTenCost}灵晶`));
    assert.match(view.text, new RegExp(`消耗${data.daoTenCost}道晶`));
    assert.match(view.text, /消耗1200灵晶/);
    assert.match(view.text, /消耗12道晶/);
    assert.match(view.text, spirit ? /灵晶探索 · 每日首次十连半价/ : /灵晶探索 · 今日首十连半价已使用 · 后续原价/);
    assert.match(view.text, dao ? /道晶探索 · 每日首次十连半价/ : /道晶探索 · 今日首十连半价已使用 · 后续9折/);
    assert.ok(view.commands.includes('/上古遗珍 十连探索 灵晶'));
    assert.ok(view.commands.includes('/上古遗珍 十连探索 道晶'));
    assert.equal(requests.length, 1);
  });
}

for (const [currency, discount, cost] of [
  ['灵晶', true, 12000], ['灵晶', false, 6000], ['道晶', true, 108], ['道晶', false, 60]
] as const) {
  test(`${currency}优惠标记${discount}与报价${cost}不一致时仅停对应十连`, async t => {
    const data = currency === '灵晶'
      ? { ...overview, spiritTenDiscountAvailable: discount, spiritTenCost: cost }
      : { ...overview, daoTenDiscountAvailable: discount, daoTenCost: cost };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const view = sent(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍', platform: 'qq-bot' })), '', '', '/上古遗珍', false);
    const other = currency === '灵晶' ? '道晶' : '灵晶';

    assert.ok(!view.commands.includes(`/上古遗珍 十连探索 ${currency}`));
    assert.ok(view.commands.includes(`/上古遗珍 探索 ${currency}`));
    assert.ok(view.commands.includes(`/上古遗珍 十连探索 ${other}`));
    assert.ok(view.commands.includes('/上古遗珍 免费探索'));
    assert.ok(view.text.includes(`${currency}探索 · 十连报价暂未取得`));
    assert.ok(!view.text.includes(`消耗${cost}${currency}`));
  });
}

test('旧响应缺新权威报价时保留单抽并停发十连，不猜优惠价', async t => {
  const { daoTenDiscountAvailable: _dao, spiritTenCost: _spiritCost, daoTenCost: _daoCost, ...legacy } = overview;
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, legacy));
  const view = sent(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍', platform: 'qq-bot' })), 'relics-missing-price', '上古遗珍 · 报价未同步', '/上古遗珍');

  assert.ok(view.commands.includes('/上古遗珍 探索 灵晶'));
  assert.ok(view.commands.includes('/上古遗珍 探索 道晶'));
  assert.ok(!view.commands.includes('/上古遗珍 十连探索 灵晶'));
  assert.ok(!view.commands.includes('/上古遗珍 十连探索 道晶'));
  assert.match(view.text, /十连报价暂未取得/);
  assert.doesNotMatch(view.text, /消耗6000灵晶|消耗60道晶|首发9折/);
});

for (const daoTenCost of [0, 88]) {
  test(`道晶凭据或报价异常${daoTenCost}仅禁道晶十连，不当免费或猜108`, async t => {
    const reason = '本日道晶优惠凭据异常，请先核账';
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
      ...overview, daoTenDiscountAvailable: false, daoTenCost, daoTenUnavailableReason: reason
    }));
    const view = sent(await app.runHandler(treasures, app.events.privateMessage({ text: '/上古遗珍', platform: 'qq-bot' })), `relics-invalid-dao-${daoTenCost}`, `上古遗珍 · 道晶报价异常${daoTenCost}`, '/上古遗珍');

    assert.ok(!view.commands.includes('/上古遗珍 十连探索 道晶'));
    assert.ok(view.commands.includes('/上古遗珍 探索 道晶'));
    assert.ok(view.commands.includes('/上古遗珍 十连探索 灵晶'));
    assert.ok(view.commands.includes('/上古遗珍 免费探索'));
    assert.ok(view.text.includes(reason));
    assert.doesNotMatch(view.text, /消耗0道晶|消耗88道晶|消耗108道晶/);
  });
}

for (const [name, source, cost] of [['灵晶', 'spirit_crystal', 6000], ['道晶', 'dao_crystal', 60], ['灵晶', 'spirit_crystal', 12000], ['道晶', 'dao_crystal', 108]] as const) {
  test(`${name}十连确认只使用服务端冻结费用${cost}`, async t => {
    const reference = 'r1_1_b_mh9of000_0123456789abcdef01234567';
    const action = `上古遗珍：消耗${cost}${name}，获得1000点宝物经验；附赠10次探索。`;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      kind: 'explore', operationId: `half-price-${source}-${cost}`, confirmationRef: reference,
      expiresAt: '2026-10-31T12:00:00+08:00', summary: [action, '原服务端冻结价格；库存或业务日期改变时须重新预览。']
    }));
    const command = `/上古遗珍 十连探索 ${name}`;
    const view = sent(await app.runHandler(treasures, app.events.privateMessage({ text: command, platform: 'qq-bot' })), `confirm-${source}-${cost}`, `${name}十连确认 · ${cost}`, command);

    assert.ok(view.text.includes(action));
    assert.ok(view.commands.includes(`/确认宝物 ${reference}`));
    assert.deepEqual(requests[0].body.arguments, { kind: 'explore', source, count: 10 });
    assert.equal(requests.length, 1);
  });
}
