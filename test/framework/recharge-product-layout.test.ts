import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import recharge from '../../src/response/recharge/info/res';
import { businessEnvelope, gameFixture } from './fixture';

const previews: string[] = [];
after(async () => {
  if (process.env.RECHARGE_PRODUCT_LAYOUT_PREVIEW) writeFileSync(process.env.RECHARGE_PRODUCT_LAYOUT_PREVIEW, previews.join('\n\n'), 'utf8');
  await shutdownLogger();
});

const policy = ['不参加首充返利', '不参加新人返利', '不参加限时累计返利', '不参加周返利', '实付金额正常计入充值与VIP进度。'];
const kinds = ['normal', 'month_card', 'seclusion_pass', 'first_charge'];
const catalog = {
  showNewcomerRebate: false, showWeeklyRebate: false,
  catalog: {
    packages: kinds.map((packageType, index) => ({
      id: 81 + index, packageType, name: ['道晶直充', '月卡', '金手指', '优惠礼包'][index], priceAmount: 3000, priceYuan: 30,
      description: '服务端商品说明', grantSpiritStone: 0, grantSpiritCrystal: 0, grantSpiritMilk: 300,
      grantItemsJson: '[]', grantEquipmentsJson: '[]', grantSkillsJson: '[]', resolvedLimitPeriod: 'unlimited', boughtCount: 0,
      doubleAvailable: index === 0, limitText: '', doubleText: index === 0 ? ' · 首充双倍' : '', rewardParts: ['道晶 ×300', '灵晶 ×2000']
    })),
    rewardNames: { items: {}, equipments: {}, skills: {} }, activityPackages: [],
    sponsor: { totalYuan: 0, thresholdYuan: 100, remainingYuan: 100, hasThemePermission: false },
    benefitView: { sponsorIntro: '赞助说明', monthCardPrivilegeLines: ['月卡特权与每日奖励说明'], seclusionPassPrivilegeLines: ['金手指特权说明'], seclusionPassFallbackLine: '暂未开放' }
  }
};
const lease = { active: false, canPurchase: true, startDate: null, endDate: null, remainingDays: 0, claimableDays: 0, claimableCrystal: 0,
  maxDays: 180, packageId: 99, priceAmount: 3000, dailyCrystal: 3000, immediateDaoCrystal: 300 };
const packs = {
  serverDate: '2026-10-29', unresolvedOrderNo: null as string | null, quotas: [],
  products: ['small', 'medium', 'large', 'all'].map((sku, index) => ({
    sku, name: ['1元礼包', '6元礼包', '18元礼包', '全包'][index], packageId: 31 + index,
    priceAmount: [100, 600, 1800, 3000][index], basePriceAmount: [100, 600, 1800, 3000][index], creditedAmount: 0,
    canClaimFree: false, limit: [3, 2, 1, 1][index], remaining: [3, 2, 1, 1][index], available: true, unavailableReason: '',
    label: ['超值300%', '超值250%', '超值220%', '总展示估值262%'][index], promotionTexts: policy,
    rewardParts: index === 0 ? [
      { kind: 'dao_crystal', name: '道晶', quantity: 10 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 1500 },
      { kind: 'treasure_fragment', name: '稀有随机同名碎片', quantity: 2, independentRolls: 1, perRoll: 2 }
    ] : [
      { kind: 'dao_crystal', name: '道晶', quantity: [10, 60, 180, 330][index] },
      ...(index === 3 ? [{ kind: 'spirit_crystal', name: '灵晶', quantity: 4500 }] : []),
      { kind: 'treasure_map', name: '藏宝图', quantity: [0, 5, 10, 20][index] },
      ...(index === 3 ? [{ kind: 'treasure_fragment', name: '稀有随机同名碎片', quantity: 6, independentRolls: 3, perRoll: 2 }] : []),
      ...(index !== 2 ? [{ kind: 'treasure_fragment', name: '史诗随机碎片', quantity: index === 3 ? 2 : 1, independentRolls: index === 3 ? 2 : 1, perRoll: 1 }] : []),
      ...(index !== 1 ? [{ kind: 'treasure_fragment', name: '神话随机碎片', quantity: 1, independentRolls: 1, perRoll: 1 }] : [])
    ]
  }))
};

type Node = { type: string; value?: unknown; options?: { data?: string; autoEnter?: boolean; show?: unknown } };
function inspect(result: TestRunResult) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []) as Node[];
  const walk = (values: Node[]) => {
    for (const node of values) {
      if (node.type === 'MD.button') { assert.equal(node.options?.autoEnter, false); assert.ok(!Object.hasOwn(node.options ?? {}, 'show')); }
      if (Array.isArray(node.value)) walk(node.value as Node[]);
    }
  };
  walk(nodes);
  return { nodes, view: inspectMessage(message.nodes) };
}
function previewText(nodes: Node[], text: string) {
  for (const node of nodes) {
    if (node.type === 'MD.bold' && typeof node.value === 'string' && /^(?:超值|总展示估值|首充)/u.test(node.value)) {
      text = text.replace(node.value, `**${node.value}**`);
    }
  }
  return text;
}
function verifyCard(nodes: Node[], rendered: string, heading: string, command: string, emphasis?: string) {
  const headingIndex = nodes.findIndex(node => node.type === 'MD.text' && node.value === heading);
  const quoteIndex = nodes.findIndex((node, index) => index > headingIndex && node.type === 'MD.blockquote');
  const purchaseIndex = nodes.findIndex(node => node.type === 'MD.button' && node.options?.data === command);
  assert.ok(headingIndex >= 0 && quoteIndex > headingIndex && purchaseIndex > quoteIndex, '标题在引用外、奖励在引用内、购买在引用外');
  const quote = nodes[quoteIndex];
  assert.ok(Array.isArray(quote.value));
  const quoteNodes = quote.value as Node[];
  assert.ok(quoteNodes.every(node => node.type !== 'MD.button'), '引用内不能嵌入购买动作');
  assert.ok(!JSON.stringify(quote).includes(heading));
  assert.ok(!JSON.stringify(quote).includes(command));
  assert.ok(nodes.slice(quoteIndex + 1, purchaseIndex).every(node => node.type === 'MD.newline'));
  const lastLine = quoteNodes.filter(node => node.type === 'MD.text').at(-1)?.value;
  assert.ok(rendered.includes(`> ${lastLine}\n\n‹购买›`), '实际发送正文以一个空行隔开引用与购买');
  assert.equal(nodes[purchaseIndex].value, '‹购买›');
  if (emphasis) {
    const boldIndex = nodes.findIndex(node => node.type === 'MD.bold' && node.value === emphasis);
    assert.ok(boldIndex > headingIndex && boldIndex < quoteIndex);
    assert.ok(nodes.slice(boldIndex + 1, quoteIndex).filter(node => node.type === 'MD.newline').length >= 2, '粗体文案后空行再引用');
  }
  return quoteNodes;
}

for (const [index, label] of ['1元', '6元', '18元', '30元全包'].entries()) {
  test(`日礼包${label}标题和粗体在引用外，奖励返利在引用内，购买另行`, async t => {
    const product = packs.products[index];
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : packs));
    const command = `/充值 日礼包 ${label}`;
    const { nodes, view } = inspect(await app.runHandler(recharge, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    const heading = `${index === 3 ? '30元全包' : `${label}礼包`} · ¥${(product.priceAmount / 100).toFixed(2)} · 每日限购${product.remaining}/${product.limit}`;
    const quote = verifyCard(nodes, view.text, heading, `/充值购买 ${product.packageId}`, `${product.label}！！！`);
    const quoteText = JSON.stringify(quote);
    for (const line of policy) assert.ok(quoteText.includes(line.replace('周返利', '周周返利')));
    assert.ok(quoteText.includes(`道晶 ×${product.rewardParts[0].quantity}`));
    assert.match(view.text, /^每日礼包\n/);
    const headerPosition = view.text.indexOf('‹返回权益›‹商品分类›');
    const tabsPosition = view.text.indexOf(index === 0 ? '‹▸1元›' : '‹1元›');
    assert.ok(headerPosition >= 0 && tabsPosition > headerPosition && view.text.indexOf(heading) > tabsPosition);
    assert.ok(!view.text.includes('（粗体）') && !view.text.includes('\\'));
    if (index === 0) assert.ok(quoteText.includes('稀有随机同名碎片 ×2（独立1次，每次2片）'));
    assert.equal(requests.length, 2);
    previews.push(`## ${command}\n\n${previewText(nodes, view.text)}`);
  });
}

for (const [section, index, expectedBenefit] of [['道晶套餐', 0, '服务端商品说明'], ['月卡', 1, '月卡特权与每日奖励说明'], ['金手指', 2, '金手指特权说明'], ['优惠礼包', 3, '服务端商品说明']] as const) {
  test(`${section}实际商品使用同一结构，保留服务端ID和权益`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, catalog));
    const { nodes, view } = inspect(await app.runHandler(recharge, app.events.privateMessage({ text: `/充值 ${section}`, platform: 'qq-bot' })));
    const pkg = catalog.catalog.packages[index];
    const quote = verifyCard(nodes, view.text, `${pkg.name} · ¥30.00`, `/充值购买 ${pkg.id}`, index === 0 ? '首充双倍' : undefined);
    for (const line of [expectedBenefit, '道晶 ×300', '灵晶 ×2000']) assert.ok(JSON.stringify(quote).includes(line));
    assert.equal(requests.length, 1);
    previews.push(`## /充值 ${section}\n\n${previewText(nodes, view.text)}`);
  });
}

test('灵脉租契使用相同结构且权益不丢失', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : lease));
  const { nodes, view } = inspect(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 灵脉租契', platform: 'qq-bot' })));
  const quote = verifyCard(nodes, view.text, '灵脉租契 · ¥30.00', '/充值购买 99');
  for (const line of ['购买即得 300道晶', '新购每日 3000灵晶，共30收益日', '最多预存 180日']) assert.ok(JSON.stringify(quote).includes(line));
  assert.equal(requests.length, 2);
  previews.push(`## /充值 灵脉租契\n\n${previewText(nodes, view.text)}`);
});

test('未决订单保留原单入口，不生成额外购买按钮', async t => {
  const blocked = structuredClone(packs);
  blocked.unresolvedOrderNo = 'TD-original';
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('recharge.catalog') ? catalog : blocked));
  const { nodes, view } = inspect(await app.runHandler(recharge, app.events.privateMessage({ text: '/充值 日礼包 1元', platform: 'qq-bot' })));
  assert.ok(!nodes.some(node => node.type === 'MD.button' && node.options?.data?.startsWith('/充值购买')));
  assert.ok(view.commands.includes('/我的订单'));
  assert.ok(view.text.includes('TD-original'));
});
