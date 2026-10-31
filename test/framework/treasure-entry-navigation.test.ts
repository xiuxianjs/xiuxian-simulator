import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

type Node = { type?: string; value?: unknown; options?: Record<string, unknown> };
const previews = new Map<string, { text: string; commands: string[]; nodes: unknown[] }>();
const stats = { physicalAttack: 0, magicAttack: 0, physicalDefense: 0, magicDefense: 0, hp: 0 };
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const catalogIds = [101, 102, 103, 104, 105, 106, 401, 501, 601, 602, 603, 604, 605];
const catalog = catalogIds.map(id => ({
  id,
  name: `宝物${id}`,
  rarity: Math.floor(id / 100),
  rarityName: ['普通', '优秀', '精良', '稀有', '史诗', '神话'][Math.floor(id / 100) - 1],
  baseAttributes: { ...stats, physicalAttack: id, hp: id * 10 },
  perLevelAttributes: stats,
  basePercentAttributes: stats,
  effectDescription: id >= 400 ? `基础生活效果${id}` : '',
  stageValues: [],
  maxGrade: id >= 500 ? 24 : 15,
  weight: 1
})).reverse();
const overview = {
  experience: 100,
  xianYun: 5,
  levelCap: 10,
  version: 1,
  decompositionValues: [10, 20, 40, 100, 220, 500].map((bodyXianYun, index) => ({
    rarity: index + 1,
    bodyXianYun,
    fragmentXianYun: bodyXianYun / 10
  })),
  records: [],
  fortune: { score: 1, level: 1, maxLevel: 20, nextThreshold: 3, bonus: { critRate: 1, hitRate: 1, dodgeRate: 1, critDamage: 5 } },
  items: catalog.map(definition => ({
    definition,
    owned: definition.id === 101,
    grade: definition.id === 101 ? 1 : 0,
    gradeName: definition.id === 101 ? '星尘1' : '',
    level: definition.id === 101 ? 1 : 0,
    fragments: definition.id === 101 ? 3 : definition.id === 601 ? 2 : 0,
    duplicates: definition.id === 101 ? 2 : 0,
    attributes: definition.id === 101 ? definition.baseAttributes : stats,
    percentAttributes: stats,
    currentEffect: '',
    nextLevelCost: 20,
    promotion: null,
    canUpgrade: false,
    canPromote: false
  }))
};
const relics = {
  rulesVersion: 'treasure-v10-exploration-pity-20261029',
  serverDate: '2026-10-30',
  balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 9 },
  freeAvailable: true,
  spiritTenDiscountAvailable: true,
  daoTenDiscountAvailable: true,
  spiritTenCost: 6000,
  daoTenCost: 60,
  totalExplorations: 0,
  milestoneProgress: 0,
  pendingSelections: 0,
  shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
  pity: [],
  wholeRates: [],
  rules: [],
  records: []
};

after(async () => {
  const output = process.env.TREASURE_ENTRY_PREVIEW_OUTPUT;

  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify({
      note: '离线 createTestApp 运行真实处理器和消息格式；条目及后端响应为测试夹具，不代表 QQ 实机投递。',
      previews: [...previews].map(([command, view]) => ({ command, ...view }))
    }, null, 2) + '\n', 'utf8');
  }
  await shutdownLogger();
});

function plainText(node: Node): string {
  return Array.isArray(node.value)
    ? node.value.map(value => plainText(value as Node)).join('')
    : typeof node.value === 'string' ? node.value : '';
}

function delivered(result: TestRunResult, command: string) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];

  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const checkButtons = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        const data = node.options?.data;

        assert.equal(typeof data, 'string');
        assert.ok([...(data as string)].length <= 80);
      }
      if (Array.isArray(node.value)) checkButtons(node.value as Node[]);
    }
  };

  checkButtons(message.nodes as Node[]);
  const view = inspectMessage(message.nodes);
  const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []) as Node[];

  previews.set(command, { text: view.text, commands: view.commands, nodes: message.nodes });

  return { ...view, nodes };
}

function topButtonRows(nodes: Node[]) {
  const firstQuote = nodes.findIndex(node => node.type === 'MD.blockquote');

  assert.ok(firstQuote >= 0);
  const rows: Node[][] = [];
  let row: Node[] = [];

  for (const node of nodes.slice(0, firstQuote)) {
    if (node.type === 'MD.button') row.push(node);
    if (node.type === 'MD.newline' && row.length) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);

  return rows;
}

for (const command of ['/宝物', '/宝物 效果']) {
  test(`${command} 的分解按钮与顶部导航同排并先于首个引用块`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, overview));
    const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
    const rows = topButtonRows(view.nodes);

    assert.equal(rows.length, 1);
    assert.deepEqual(new Set(rows[0].map(node => node.options?.data)), new Set(['/宝物', '/宝物 气运', '/宝物 效果', '/宝物 分解', '/宝物 记录']));
    assert.equal(plainText(rows[0].find(node => node.options?.data === '/宝物 分解')!), '‹分解›');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/treasures.overview');
  });
}

test('上古遗珍首排图鉴与概率、记录同列，秘宝商人在第二排日常活跃右侧', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, relics));
  const command = '/上古遗珍';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  const rows = topButtonRows(view.nodes);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].map(node => node.options?.data), ['/上古遗珍 概率', '/上古遗珍 记录', '/上古遗珍 图鉴']);
  assert.deepEqual(rows[0].map(plainText), ['‹概率公示›', '‹探索记录›', '‹宝物图鉴›']);
  assert.deepEqual(rows[1].map(node => node.options?.data), ['/充值 日礼包', '/日常活跃', '/上古遗珍 秘宝商人']);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/ancient-relics.overview');
});

test('宝物图鉴按稀有度展示，六档按钮可达未拥有条目并保留旧全局页链接', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, catalog));
  const run = async (command: string) => delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  const first = await run('/上古遗珍 图鉴');

  assert.ok(first.text.includes('‹▸宝物图鉴›'));

  assert.deepEqual([...first.text.matchAll(/【[^】]+】宝物(\d+)/g)].map(match => Number(match[1])), catalogIds.slice(0, 6));
  assert.match(first.text, /物攻 \+101/);
  assert.match(first.text, /生命 \+1,010/);
  assert.match(first.text, /暂无特殊效果/);
  for (let rarity = 1; rarity <= 6; rarity++) assert.ok(first.commands.includes(`/上古遗珍 图鉴 品质 ${rarity}`));
  const next = first.commands.find(command => command === '/上古遗珍 图鉴 品质 4');

  assert.ok(next);
  const second = await run(next);

  assert.deepEqual([...second.text.matchAll(/【[^】]+】宝物(\d+)/g)].map(match => Number(match[1])), [401]);
  assert.match(second.text, /稀有 1 件/);
  assert.match(second.text, /基础生活效果401/);
  assert.ok(!second.commands.some(command => /^\/上古遗珍 图鉴 p\d/.test(command)));
  const empty = await run('/上古遗珍 图鉴 品质 2');

  assert.match(empty.text, /该稀有度暂无宝物资料/);
  const last = await run('/上古遗珍 图鉴 p3');

  assert.deepEqual([...last.text.matchAll(/【[^】]+】宝物(\d+)/g)].map(match => Number(match[1])), [601, 602, 603, 604, 605]);
  assert.ok(last.text.includes('‹▸神话›'));
  assert.ok(last.commands.includes('/上古遗珍 图鉴 品质 6'));
  assert.equal(requests.length, 4);
  for (const request of requests) {
    assert.equal(request.path, '/api/v2/robot/business/treasures.catalog');
    assert.deepEqual(request.body.arguments, {});
  }
});

test('旧宝物图鉴仍打开持有页，不请求全量图鉴或显示未持有神话', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, overview));
  const command = '/宝物 图鉴';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /宝物101/);
  assert.doesNotMatch(view.text, /宝物601|基础生活效果601/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.overview');
});

for (const command of [
  '/上古遗珍 图鉴 p0', '/上古遗珍 图鉴 p-1', '/上古遗珍 图鉴 p1 extra', '/上古遗珍 图鉴 2', '/上古遗珍 图鉴 p1000000000',
  '/上古遗珍 图鉴 品质', '/上古遗珍 图鉴 品质 0', '/上古遗珍 图鉴 品质 7', '/上古遗珍 图鉴 品质 6 p0',
  '/上古遗珍 图鉴 品质 6 p1 extra'
]) {
  test(`图鉴拒绝无效参数且不请求后端：${command}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('invalid command must not request backend'); });
    const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

    assert.match(view.text, /参数错误/);
    assert.equal(requests.length, 0);
  });
}

test('实际顶部分解按钮进入合并份数库存，份数与旧形态选择都只生成预览', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.preview') ? {
    kind: 'decompose',
    summary: ['「宝物101」分解清单；主宝物不消耗，分解后不能撤销。', '确认凭据24小时有效；状态变化时请重新预览。'],
    confirmationRef,
    expiresAt: '2026-10-31T12:00:00+08:00',
    operationId: 'treasure-entry-decomposition-preview'
  } : overview));
  const run = async (command: string) => delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  const owned = await run('/宝物');
  const entry = topButtonRows(owned.nodes)[0].find(node => node.options?.data === '/宝物 分解');

  assert.ok(entry);
  const inventory = await run(entry.options!.data as string);

  assert.match(inventory.text, /本体2 · 碎片3/);
  assert.match(inventory.text, /可分解23份，每份1仙蕴/);
  assert.doesNotMatch(inventory.text, /宝物601/);
  assert.ok(inventory.commands.includes('/宝物 分解 份数 101 1'));
  const portionPreview = await run('/宝物 分解 份数 101 7');

  assert.ok(portionPreview.commands.includes(`/确认宝物 ${confirmationRef}`));
  assert.deepEqual(requests.at(-1)?.body.arguments, { kind: 'decompose', items: [{ treasureId: 101, kind: 'portion', quantity: 7 }] });
  for (const [kind, command] of [['body', '/宝物 分解 本体 101 1'], ['fragment', '/宝物 分解 碎片 101 1']] as const) {
    const preview = await run(command);

    assert.ok(preview.commands.includes(`/确认宝物 ${confirmationRef}`));
    assert.deepEqual(requests.at(-1)?.body.arguments, { kind: 'decompose', items: [{ treasureId: 101, kind, quantity: 1 }] });
    assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/treasures.preview');
  }
  assert.deepEqual(requests.map(request => request.path), [
    '/api/v2/robot/business/treasures.overview',
    '/api/v2/robot/business/treasures.overview',
    '/api/v2/robot/business/treasures.preview',
    '/api/v2/robot/business/treasures.preview',
    '/api/v2/robot/business/treasures.preview'
  ]);
});

test('QQ分解按六档稀有度切换，精确显示13份与真实每份价值，零库存不生成数量入口', async t => {
  const data = structuredClone(overview);
  const rare = data.items.find(item => item.definition.id === 401)!;

  Object.assign(rare, { owned: true, grade: 1, level: 1, duplicates: 1, fragments: 3 });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const command = '/宝物 分解 品质 4';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /宝物401/);
  assert.match(view.text, /本体1 · 碎片3/);
  assert.match(view.text, /可分解13份，每份10仙蕴/);
  assert.doesNotMatch(view.text, /宝物101|宝物601|本体2 · 碎片3/);
  for (let rarity = 1; rarity <= 6; rarity++) assert.ok(view.commands.includes(`/宝物 分解 品质 ${rarity}`));
  assert.ok(view.commands.includes('/宝物 分解 份数 401 1'));
  assert.ok(!view.commands.includes('/宝物 一键分解'));
  const empty = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 分解 品质 5', platform: 'qq-bot' })), '/宝物 分解 品质 5');

  assert.match(empty.text, /宝物501/);
  assert.match(empty.text, /本体0 · 碎片0/);
  assert.match(empty.text, /可分解0份，每份22仙蕴/);
  assert.ok(!empty.commands.some(value => value.startsWith('/宝物 分解 份数 ')));
  assert.equal(requests.length, 2);
});

test('QQ分解默认最低有库存档，空库存仍可查看六档分类', async t => {
  const data = structuredClone(overview);

  for (const item of data.items) Object.assign(item, { duplicates: 0, fragments: item.definition.id === 601 ? 2 : 0 });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 分解', platform: 'qq-bot' })), '/宝物 分解（仅神话余片）');

  assert.match(view.text, /宝物601/);
  assert.match(view.text, /本体0 · 碎片2/);
  assert.match(view.text, /可分解2份，每份50仙蕴/);
  assert.doesNotMatch(view.text, /宝物101|宝物401/);
  for (const item of data.items) item.fragments = 0;
  const empty = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 分解', platform: 'qq-bot' })), '/宝物 分解（空库存）');

  for (let rarity = 1; rarity <= 6; rarity++) assert.ok(empty.commands.includes(`/宝物 分解 品质 ${rarity}`));
  assert.ok(!empty.commands.some(value => value.startsWith('/宝物 分解 份数 ')));
  assert.ok(!empty.commands.includes('/宝物 一键分解'));
});

test('QQ满品一键入口在列表下方，非当前稀有度满品余片也符合全稀有度资格', async t => {
  const data = structuredClone(overview);
  const mythic = data.items.find(item => item.definition.id === 601)!;

  Object.assign(mythic, { owned: true, grade: mythic.definition.maxGrade, level: 1, duplicates: 0, fragments: 2 });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.preview') ? {
    kind: 'decompose', summary: ['「宝物601」2份（每份1碎片）× 50仙蕴＝100仙蕴'], confirmationRef,
    expiresAt: '2026-11-01T12:00:00+08:00', operationId: 'all-maxed-fragments-only'
  } : data));
  const command = '/宝物 分解 品质 1';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  const oneClickIndex = view.nodes.findIndex(node => node.type === 'MD.button' && node.options?.data === '/宝物 一键分解');
  const lastInventoryIndex = view.nodes.findLastIndex(node => node.type === 'MD.blockquote' && plainText(node).includes('可分解'));

  assert.ok(lastInventoryIndex >= 0 && oneClickIndex > lastInventoryIndex);
  assert.match(view.text, /全部稀有度|所有稀有度/);
  const preview = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 一键分解', platform: 'qq-bot' })), '/宝物 一键分解（满品余片）');

  assert.match(preview.text, /2份（每份1碎片）× 50仙蕴＝100仙蕴/);
  assert.deepEqual(requests.at(-1)?.body.arguments, { kind: 'decompose', allMaxed: true });
  assert.ok(!requests.some(request => request.path.endsWith('/treasures.confirm')));
});

test('QQ池内图鉴隐藏阶段及旧描述内的效果百分比，保留基础战斗百分比', async t => {
  const data = structuredClone(catalog).map(item => item.id === 601 ? {
    ...item,
    effectDescription: '收获时，3%概率增加产量；额外增加基础产量的＋5%／10％／16%／24%。',
    basePercentAttributes: { ...stats, hp: 0.5 },
    stageValues: ['3%', '6%', '9%', '12%']
  } : item);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const command = '/上古遗珍 图鉴 品质 6';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /宝物601/);
  assert.match(view.text, /生命 \+0.5%/);
  assert.match(view.text, /一定概率增加产量/);
  assert.match(view.text, /额外增加基础产量的相应比例/);
  assert.doesNotMatch(view.text, /星尘|晓月|纯阳|仙藏|3%|5%／|10％|16%|24%|6%|9%|12%/);
});

test('完整36件旧图鉴p4映射稀有分类，默认普通且品质切换不串档', async t => {
  const data = Array.from({ length: 36 }, (_, index) => {
    const rarity = Math.floor(index / 6) + 1;
    const id = rarity * 100 + index % 6 + 1;

    return { ...catalog[0], id, name: `宝物${id}`, rarity, rarityName: ['普通', '优秀', '精良', '稀有', '史诗', '神话'][rarity - 1] };
  });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const run = async (command: string) => delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  const legacy = await run('/上古遗珍 图鉴 p4');

  assert.match(legacy.text, /共 36 件宝物 · 稀有 6 件 · 第 1\/1 页/);
  assert.deepEqual([...legacy.text.matchAll(/【[^】]+】宝物(\d+)/g)].map(match => Number(match[1])), [401, 402, 403, 404, 405, 406]);
  const mythic = await run('/上古遗珍 图鉴 品质 6');

  assert.deepEqual([...mythic.text.matchAll(/【[^】]+】宝物(\d+)/g)].map(match => Number(match[1])), [601, 602, 603, 604, 605, 606]);
});

for (const command of [
  '/宝物 分解 品质 0', '/宝物 分解 品质 7', '/宝物 分解 品质 4 extra', '/宝物 分解 品质 4 p0',
  '/宝物 分解 份数 401 0', '/宝物 分解 份数 401 -1', '/宝物 分解 份数 401 1.5',
  '/宝物 分解 份数 401 9007199254740993', '/宝物 分解 份数 401 1 extra'
]) {
  test(`QQ分解拒绝无效品质或份数且不请求后端：${command}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('invalid decomposition must not call backend'); });
    const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

    assert.match(view.text, /参数错误/);
    assert.equal(requests.length, 0);
  });
}
