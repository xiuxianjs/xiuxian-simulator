import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/fishing/res';
import { parseFishingCommand } from '../../src/response/fishing/commands';
import { parseBackendNormalCheckout } from '../../src/api/bot/sponsor-payment';
import { ImageCache } from '../../src/utils/imageCdn';
import { businessEnvelope, gameFixture } from './fixture';
import { readFileSync, writeFileSync } from 'node:fs';

const actualWire = JSON.parse(readFileSync(new URL('../fixtures/fishing-checkout-actual-wire.json', import.meta.url), 'utf8'));
const actualPackages = JSON.parse(readFileSync(new URL('../fixtures/fishing-package-views-actual.json', import.meta.url), 'utf8'));
const actualShop = JSON.parse(readFileSync(new URL('../fixtures/fishing-shop-vip8-actual-view.json', import.meta.url), 'utf8'));
const actualNet = JSON.parse(readFileSync(new URL('../fixtures/fishing-net-receipt-actual.json', import.meta.url), 'utf8'));
const actualBlessings = JSON.parse(readFileSync(new URL('../fixtures/fishing-blessing-overview-actual.json', import.meta.url), 'utf8'));
const actualRecords = JSON.parse(readFileSync(new URL('../fixtures/fishing-records-chinese-view.json', import.meta.url), 'utf8'));
const actualImmediate = JSON.parse(readFileSync(new URL('../fixtures/fishing-immediate-views-actual.json', import.meta.url), 'utf8'));

const captures: { name: string; messages: TestRunResult['messages'] }[] = [];
let currentTest = '';
beforeEach(t => { currentTest = t.name; mock.timers.enable({ apis: ['setInterval'] }); });
afterEach(() => mock.timers.reset());
after(async () => {
  if (process.env.FISHING_PAYMENT_PREVIEW_OUTPUT) {
    writeFileSync(process.env.FISHING_PAYMENT_PREVIEW_OUTPUT, JSON.stringify({ scope: 'Real QQ handlers and Format nodes; backend/image cache/platform are offline fixtures.', captures }, null, 2));
  }
  await shutdownLogger();
});
const orderNo = 'FP_0123456789abcdef0123456789abcdef';
const checkout = { order: { orderNo, orderType: 'fishing_pack', packageId: null, payAmount: 600, status: 'PENDING' },
  packageName: '稳如老狗', payUrl: 'https://payment.example.test/fishing-original' };
const action = (label: string, command: string) => ({ label, command });
const section = (title: string, lines: string[], actions: ReturnType<typeof action>[] = []) => ({ title, id: '', suffix: '', lines, actions });
const view = (changes: Record<string, unknown> = {}) => ({ rulesVersion: 'fishing-pack-fixture', view: 'packages', title: '垂钓礼包', status: '',
  sections: [], footer: [action('返回垂钓', '/垂钓')], ...changes });
function sent(result: TestRunResult, count = 1) {
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, count);
  captures.push({ name: currentTest, messages: result.messages });
  for (const message of result.messages) {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const walk = (nodes: unknown[]) => { for (const raw of nodes) {
      const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> };
      if (node.type === 'MD.button' || node.type === 'Button') {
        assert.notEqual(node.options?.autoEnter, true); assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        if (node.options?.type !== 'link') { assert.ok([...String(node.options?.data ?? '')].length <= 80); }
      }
      if (Array.isArray(node.value)) { walk(node.value); }
    } };
    walk(message.nodes);
  }
  return result.messages.map(message => inspectMessage(message.nodes));
}

test('无参数开钓一次调用服务端当前配置写操作，不查询参数页或自行选竿饵', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view({ view: 'receipt', title: '开始垂钓',
    sections: [section('', ['按当前配置开始，计划12小时；已预留本次已有物资。'])] })));
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 开钓', platform: 'qq-bot' })));
  assert.ok(page.text.includes('12小时')); assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/fishing.start-current'));
  assert.deepEqual(requests[0].body.arguments, { kind: 'start-current' });
});

test('更换钓具的使用开钓只透传原竿编号直接开始，不先打开参数页', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view({ view: 'receipt', title: '开始垂钓',
    sections: [section('', ['按选定原竿开始，计划12小时。'])] })));
  const rodId = 'fr_' + 'a'.repeat(32);
  sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 开钓 ' + rodId, platform: 'qq-bot' })));
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/fishing.start-current'));
  assert.deepEqual(requests[0].body.arguments, { kind: 'start-current', rodId });
});

test('主饵和备用顺序分别直接保存partial，不在客户端混排或重置另一项', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.path.endsWith('/fishing.query') ? actualImmediate.cases.bait : actualImmediate.cases.settingsReceipt));
  const [menu] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 饵料', platform: 'qq-bot' })));
  const primary = menu.commands.find(command => command === '/垂钓 设置 主饵 聚灵饵')!;
  assert.ok(primary);
  for (const command of [primary, '/垂钓 设置 饵序 唤王饵 定鳞饵']) {
    const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.ok(!page.commands.some(value => value.startsWith('/垂钓 确认 ')));
  }
  assert.deepEqual(requests[0].body.arguments, { view: 'settings', sku: 'bait' });
  assert.ok(requests.slice(1).every(request => request.path.endsWith('/fishing.configure')));
  assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [
    { kind: 'settings', settings: { primaryBaitType: 'realm' } },
    { kind: 'settings', settings: { baitOrder: ['king', 'steady'] } }
  ]);
});

test('收杆和收竿均直接提交当前会话一次，显示后端回执而不取得确认预览', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view({ view: 'receipt', title: '收杆已受理',
    sections: [section('', ['已停止开新竿，已有渔获按原进度结算。'])] })));
  for (const command of ['/垂钓 收杆', '/垂钓 收竿']) {
    const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.ok(page.text.includes('收杆已受理')); assert.ok(!page.commands.some(value => value.includes('确认')));
  }
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.path.endsWith('/fishing.stop-current')));
  assert.deepEqual(requests.map(request => request.body.arguments), [{ kind: 'stop-current' }, { kind: 'stop-current' }]);
});

for (const command of ['/垂钓 开钓', '/垂钓 收杆', '/垂钓 购买 灵鳞钱 bait:plain 1', '/垂钓 设置 持续打窝 关', '/垂钓 打窝 聚鳞散 1']) test(`直接写操作结果不明只提示核对，不重新购买或误称缺预览：${command}`, async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'offline failure' }), 500);
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
  assert.ok(page.text.includes('尚未核实')); assert.ok(!page.text.includes('未取得原预览'));
  assert.equal(requests.length, 1); assert.ok(page.commands.includes('/垂钓'));
});

test('真实Go收银台wire兼容uint32订单号与空普通套餐ID，显示原金额与二维码', async t => {
  t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/fishing-pay.png');
  const { app, requests } = await gameFixture(t, () => actualWire.cases.pending.data);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot', userId: 'player' }));
  const [page] = sent(result, 2);
  const original = actualWire.cases.pending.data.data.order.orderNo;
  assert.ok(page.text.includes('¥6.00')); assert.ok(page.text.includes(original));
  assert.ok(page.commands.includes('/继续支付 ' + original)); assert.equal(requests.length, 1);
});

for (const sku of ['steady_6', 'all_50']) test(`真实服务端礼包单选页四标签及原价权益：${sku}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, actualPackages[sku]));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包 ' + sku, platform: 'qq-bot' }));
  const [page] = sent(result);
  assert.deepEqual(requests[0].body.arguments, { view: 'packages', sku });
  assert.ok(page.text.includes(sku === 'steady_6' ? '价格：6元' : '价格：50元'));
  for (const name of ['稳如老狗', '乘风逐浪', '潜渊寻珍', '我全都要']) { assert.ok(page.text.includes(name)); }
  assert.ok(page.text.includes(sku === 'steady_6' ? '▸稳如老狗' : '▸我全都要'));
  assert.equal((page.text.match(/▸/g) ?? []).length, 1);
  assert.ok(page.commands.includes('/垂钓 礼包购买 ' + sku));
  assert.ok(!page.text.includes('超值')); assert.ok(!page.text.includes('总价值'));
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  const bold = quote.value.filter(node => node.type === 'MD.bold').map(node => node.value);
  for (const name of ['玄磐定波竿', '素灵饵', '定鳞饵', '聚灵饵', '引珍饵', '唤王饵', '聚鳞散', '催鳞散', '引珍散', '唤王散', '引灵散', '升灵散']) {
    assert.ok(bold.includes(name), `${sku} missing bold item ${name}`);
  }
  if (sku === 'all_50') {
    assert.ok(bold.includes('流云逐浪竿')); assert.ok(bold.includes('照渊寻珍竿'));
  }
});

for (const [key, status] of [['timeout', 409], ['link_failure', 503]] as const) test(`真实Go ${status}原单wire恢复查询与继续支付，不进入非PENDING收银台`, async t => {
  const data = actualWire.cases[key].error;
  const { app, requests } = await gameFixture(t, () => data, status);
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' })));
  assert.ok(page.text.includes('原订单待核对')); assert.ok(page.text.includes(data.details.orderNo));
  assert.ok(page.commands.includes('/查询充值订单 ' + data.details.orderNo));
  assert.ok(page.commands.includes('/继续支付 ' + data.details.orderNo));
  assert.ok(!page.text.includes('未取得原预览')); assert.equal(requests.length, 1);
});

test('礼包单选页透传服务端SKU标签与全包事实，不本地计算金额或合并权益', async t => {
  const data = view({ navRows: [[action('稳如老狗', '/垂钓 礼包 steady_6'), action('我全都要', '/垂钓 礼包 all_50')]],
    sections: [section('我全都要', ['价格：¥44.00', '已计入单购：¥6.00', '只补齐服务端列明的剩余权益。'], [action('购买', '/垂钓 礼包购买 all_50')])] });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包 我全都要', platform: 'qq-bot' })));
  assert.deepEqual(requests[0].body.arguments, { view: 'packages', sku: 'all_50' });
  assert.ok(page.text.includes('¥44.00')); assert.ok(!page.text.includes('超值'));
  assert.ok(page.commands.includes('/垂钓 礼包 steady_6')); assert.ok(page.commands.includes('/垂钓 礼包 all_50'));
  assert.deepEqual(page.commands.filter(command => command.startsWith('/垂钓 礼包购买')), ['/垂钓 礼包购买 all_50']);
  assert.deepEqual(parseFishingCommand('/垂钓 礼包 all_50'), { operation: 'fishing.query', input: { view: 'packages', sku: 'all_50' } });
});

test('权威强调名单使同一引用多物品独立加深，最长名优先且事实字符与数量价格原样', async t => {
  const lines = ['青竹灵竿 · 一阶×1', '素灵饵×100，聚鳞散×2；素灵饵单价100灵石。'];
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, view({
    emphasisNames: ['灵竿', '青竹灵竿', '素灵饵', '聚鳞散', '', '素灵饵'],
    sections: [section('礼包明细', lines)]
  })));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包 steady_6', platform: 'qq-bot' }));
  const [page] = sent(result);
  for (const line of lines) { assert.ok(page.text.includes(line)); }
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  const bold = quote.value.filter(node => node.type === 'MD.bold').map(node => node.value);
  assert.ok(bold.includes('青竹灵竿')); assert.ok(!bold.includes('灵竿'));
  assert.equal(bold.filter(value => value === '素灵饵').length, 2); assert.ok(bold.includes('聚鳞散'));
  assert.ok(!bold.some(value => /\d/.test(String(value))));
  assert.ok(!page.text.includes('**'));
});

test('已知中文礼包名映射真实SKU，未知中文不发送API', async t => {
  for (const [name, sku] of [['稳如老狗', 'steady_6'], ['乘风逐浪', 'swift_18'], ['潜渊寻珍', 'treasure_30'], ['我全都要', 'all_50'], ['筑基水域补给', 'pond_supply_2']]) {
    assert.deepEqual(parseFishingCommand('/垂钓 礼包 ' + name), { operation: 'fishing.query', input: { view: 'packages', sku } });
  }
  const { app, requests } = await gameFixture(t, () => { throw new Error('unknown package must not request'); });
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包 未知礼包', platform: 'qq-bot' })));
  assert.ok(page.text.includes('参数错误')); assert.equal(requests.length, 0);
});

test('渔市购买商品整行序号加粗仅作展示，出售列表不加序号', async t => {
  let selling = false;
  const data = () => !selling ? actualShop : view({ view: 'shop', title: '渔市 · 出售鱼类',
    navRows: [[action(selling ? '转为购买' : '转为出售', '/垂钓 渔市 buy bait 1')]],
    sections: [section('', ['灵鳞钱：8,640']), section('素灵饵', ['每竿消耗1份'], [action('灵鳞钱购买', '/垂钓 购买 coin bait:plain 1')])] });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data()));
  const bought = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 渔市 bait 1', platform: 'qq-bot' }));
  assert.ok(sent(bought)[0].commands.includes('/垂钓 购买 coin bait:plain 1'));
  const buyText = inspectMessage(bought.messages[0].nodes).text;
  assert.ok(buyText.includes('灵石：368（原价400）/1份 · 日限购10/10'));
  assert.ok(buyText.includes('灵鳞钱：36（原价40）/10份 · 无限制'));
  assert.ok(buyText.indexOf('鱼王权重×3') < buyText.indexOf('灵石：368'));
  assert.ok(JSON.stringify(bought.messages[0].nodes).includes('【1】素灵饵'));
  const markdown = bought.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value) && quote.value.some(node => node.type === 'MD.bold' && node.value === '【1】素灵饵'));
  selling = true;
  const sold = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 渔市 sell fish 1', platform: 'qq-bot' }));
  sent(sold); assert.ok(!JSON.stringify(sold.messages[0].nodes).includes('【1】'));
  assert.deepEqual(requests[0].body.arguments, { view: 'shop', shopCategory: 'bait', page: 1 });
});

test('打窝物品名加粗，当前状态普通行保持原样', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, view({ view: 'chum', title: '垂钓 · 打窝',
    sections: [section('', ['当前窝料：无']), section('聚鳞散', ['可用：2份', '每份固定6小时。'], [action('打窝1份', '/垂钓 打窝 聚鳞散 1')])] })));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 打窝', platform: 'qq-bot' }));
  sent(result);
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value) && quote.value.some(node => node.type === 'MD.bold' && node.value === '聚鳞散'));
  assert.ok(markdown.value.some(node => node.type === 'MD.text' && node.value === '当前窝料：无'));
});

test('赐福鱼名加粗，星级加成与放生按钮同行保持原位置', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, view({ view: 'blessing', title: '锦鲤赐福 · 筑基',
    sections: [section('', ['放归生灵，获取修为赐福。']), section('铁鳞鲫', ['⭐⭐→⭐⭐⭐', '主线修为 +2% → 3%'], [action('放生10条', '/垂钓 赐福预览 fishing_r2_a')])] })));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 赐福 筑基', platform: 'qq-bot' }));
  const [page] = sent(result);
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  assert.equal(quote.value[0].type, 'MD.bold'); assert.equal(quote.value[0].value, '铁鳞鲫');
  assert.equal(quote.value[2].type, 'MD.button');
  assert.ok(page.commands.includes('/垂钓 赐福预览 fishing_r2_a'));
  assert.ok(page.text.includes('⭐⭐→⭐⭐⭐')); assert.ok(page.text.includes('主线修为 +2% → 3%'));
});

test('真实捕灵网回执直接展示鱼名重量与合并物品数量，不展示计算过程', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, actualNet));
  const ref = 'r1_1_y_mh9of000_0123456789abcdef01234567';
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 确认 ' + ref, platform: 'qq-bot' }));
  const [page] = sent(result);
  assert.ok(page.text.includes('捕获清单')); assert.ok(page.text.includes('重量：'));
  assert.ok(!/计算|随机种子|控鱼率|虚拟推进|经验/.test(page.text));
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  assert.equal(markdown.value.filter(node => node.type === 'MD.blockquote').length, 1);
  const compact = inspectMessage([{ type: 'Markdown', value: quote.value }]).text;
  for (const section of actualNet.sections) {
    assert.ok(compact.includes(`${section.title} · ${section.lines.join(' ')}`));
    if (section.title !== '待入袋') { assert.ok(quote.value.some(node => node.type === 'MD.bold' && node.value === section.title)); }
  }
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/fishing.confirm'));
  assert.deepEqual(requests[0].body.arguments, { ref });
});

test('真实赐福总览显示后端合计，先总览后已解锁境界，仙塘11标签为3行', async t => {
  let realm = '仙';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, actualBlessings.cases[realm]));
  for (const [index, name] of ['仙', '筑基', '凡物'].entries()) {
    realm = name;
    const command = index === 0 ? '/垂钓 赐福 总览' : '/垂钓 赐福';
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    const [page] = sent(result);
    assert.deepEqual(requests[index].body.arguments, index === 0 ? { view: 'blessing', sku: 'overview' } : { view: 'blessing' });
    const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown && Array.isArray(markdown.value));
    const introAt = markdown.value.findIndex(node => node.type === 'MD.text' && node.value === '放归生灵，获取修为赐福。');
    const tabsAt = markdown.value.findIndex(node => node.type === 'MD.button');
    assert.ok(introAt >= 0 && introAt < tabsAt);
    assert.ok(page.commands.indexOf('/垂钓 赐福 总览') < page.commands.indexOf('/垂钓 赐福 0'));
    for (const section of actualBlessings.cases[realm].sections) {
      for (const line of section.lines) { assert.ok(page.text.includes(line)); }
    }
    if (realm === '仙') {
      assert.equal(actualBlessings.cases[realm].navRows.length, 3);
      assert.ok(page.text.includes('150 / 150')); assert.ok(page.text.includes('全部修为：+30%'));
      assert.ok(page.text.includes('主线修为：+60%（专属30%＋通用30%）')); assert.ok(page.commands.includes('/垂钓 赐福 9'));
    } else {
      assert.ok(!page.commands.includes('/垂钓 赐福 ' + (realm === '筑基' ? '3' : '1')));
    }
  }
  assert.ok(requests.every(request => request.path.endsWith('/fishing.query')));
  assert.deepEqual(parseFishingCommand('/垂钓 赐福 凡物'), { operation: 'fishing.query', input: { view: 'blessing', blessingRealm: 0 } });
});

test('钓具名加粗且不显示原编号，使用开钓仍携带完整原竿编号', async t => {
  const rodId = 'fr_' + 'b'.repeat(32);
  const gear = view({ view: 'gear', title: '垂钓 · 钓具', sections: [{ ...section('青竹灵竿', ['阶位：二阶'],
    [action('使用开钓', '/垂钓 开钓 ' + rodId), action('升阶预览', '/垂钓 升竿 ' + rodId)]), id: rodId }] });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('fishing.query') ? gear : view({ view: 'receipt', title: '开始垂钓' })));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 钓具 1', platform: 'qq-bot' }));
  const [page] = sent(result);
  assert.ok(!page.text.includes(rodId));
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value) && quote.value.some(node => node.type === 'MD.bold' && node.value === '青竹灵竿'));
  const command = page.commands.find(value => value.startsWith('/垂钓 开钓 '))!;
  assert.equal(command, '/垂钓 开钓 ' + rodId);
  sent(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
  assert.deepEqual(requests[1].body.arguments, { kind: 'start-current', rodId });
});

test('鱼种列表与鱼谱隐藏物种代码，原详情动作保留且单尾实例编号仍可见', async t => {
  const speciesId = 'fishing_r2_b'; const catchId = 'ff_' + 'c'.repeat(32);
  const { app, requests } = await gameFixture(t, request => {
    const input = request.body.arguments as { view: string };
    const data = ['species', 'catalog'].includes(input.view)
      ? view({ view: input.view, title: '我的渔获', sections: [{ ...section('金须鲤', ['持有：1尾'],
        [action('查看详情', `/垂钓 鱼种 ${speciesId} 1 1`)]), id: speciesId }] })
      : view({ view: input.view, title: '金须鲤', sections: [{ ...section('金须鲤', ['重量：1.840千克'],
        [action('单尾详情', `/垂钓 鱼 ${catchId} 1 1`)]), id: catchId }] });

    return businessEnvelope(request.bid, data);
  });
  for (const command of ['/垂钓 渔获 1', '/垂钓 鱼谱 1']) {
    const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.ok(!page.text.includes(speciesId)); assert.ok(page.text.includes('金须鲤'));
    assert.ok(page.commands.includes(`/垂钓 鱼种 ${speciesId} 1 1`));
  }
  const [instances] = sent(await app.runHandler(handler, app.events.privateMessage({ text: `/垂钓 鱼种 ${speciesId} 1 1`, platform: 'qq-bot' })));
  assert.ok(instances.text.includes(catchId));
  const fishResult = await app.runHandler(handler, app.events.privateMessage({ text: `/垂钓 鱼 ${catchId} 1 1`, platform: 'qq-bot' }));
  const [fish] = sent(fishResult);
  assert.ok(fish.text.includes(catchId));
  const markdown = fishResult.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quote = markdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  assert.ok(quote.value.some(node => node.type === 'MD.bold' && node.value === '金须鲤'));
  assert.ok(quote.value.some(node => node.type === 'MD.text' && String(node.value).includes(catchId)));
  assert.ok(!quote.value.some(node => node.type === 'MD.bold' && String(node.value).includes(catchId)));
  assert.deepEqual(requests[2].body.arguments, { view: 'instances', speciesId, page: 1, returnPage: 1 });
  assert.deepEqual(requests[3].body.arguments, { view: 'fish', catchId, page: 1, returnPage: 1 });
});

test('中文渔获杂获记录不画内部代码，原战报动作与pending单尾编号保留', async t => {
  let selected = 'history';
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, actualRecords.cases[selected]));
  for (const [key, command] of [
    ['history', '/垂钓 战报 1'], ['loot', '/垂钓 杂获 1'],
    ['cast', '/垂钓 战报 fc_00000000000000000000000000000002'], ['pending', '/垂钓 待入袋 1']
  ]) {
    selected = key;
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    const [page] = sent(result);
    for (const section of actualRecords.cases[key].sections) {
      assert.ok(page.text.includes(section.title)); assert.ok(!page.text.includes(section.id));
      for (const action of section.actions) { assert.ok(page.commands.includes(action.command)); }
    }
    assert.ok(page.text.includes('矿石精华'));
    const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown && Array.isArray(markdown.value));
    const bold = markdown.value.flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value)
      ? node.value.filter(child => child.type === 'MD.bold').map(child => child.value) : []);
    assert.ok(bold.includes('矿石精华')); assert.ok(!bold.some(value => String(value).includes('中文名待核对')));
    assert.ok(!/fishing_r|物品 #|宝物碎片 #/.test(page.text));
  }
  const catchId = 'ff_' + 'd'.repeat(32);
  const pendingFish = { ...actualRecords.cases.pending, emphasisNames: ['青背鲫'], sections: [
    { ...section('青背鲫', ['重量：0.180千克']), id: catchId }
  ] };
  actualRecords.cases.pendingFish = pendingFish; selected = 'pendingFish';
  const [pending] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 待入袋 1', platform: 'qq-bot' })));
  assert.ok(pending.text.includes(catchId));
});

for (const active of [false, true]) test(`首页操作逐行并在底部标签前分隔，运行中=${active}`, async t => {
  const footer = [['我的渔获', '/垂钓 渔获 1'], ['渔市', '/垂钓 渔市'], ['锦鲤赐福', '/垂钓 赐福'], ['设置', '/垂钓 设置'], ['帮助', '/垂钓 帮助']].map(([label, command]) => action(label, command));
  const data = view({ view: 'overview', title: '洞府垂钓', sections: [section('', ['水域：筑基水域']), section('', ['青竹灵竿']),
    section('', ['本次渔获：0尾']), section('', [active ? '……持续垂钓中……' : '……尚未垂钓……'],
      [action(active ? '收杆' : '甩杆', active ? '/垂钓 收竿' : '/垂钓 开钓'), action('使用渔具', '/垂钓 渔具')])], footer });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓', platform: 'qq-bot' })));
  assert.ok(page.text.includes('——————'));
  assert.ok(page.text.indexOf('使用渔具') < page.text.indexOf('——————'));
  assert.ok(page.text.indexOf('——————') < page.text.indexOf('我的渔获'));
  assert.ok(page.commands.includes(active ? '/垂钓 收竿' : '/垂钓 开钓'));
  assert.deepEqual(page.commands.slice(-5), footer.map(item => item.command));
});

for (const preview of [true, false]) test(`渔市购买${preview ? '确认' : '完成'}使用普通商店正文句式，不触发客户端自动确认`, async t => {
  const ref = 'r1_1_y_mh9of000_0123456789abcdef01234567';
  const data = view({ view: preview ? 'shop-purchase-preview' : 'shop-purchase-receipt', title: '渔市',
    sections: [section('', [preview ? '将购买：聚鳞散 ×1；合计：200灵晶' : '购买成功：聚鳞散，支付200灵晶，获得×1'])],
    ...(preview ? { confirmationRef: ref, operationId: 'purchase-original', expiresAt: '2026-11-05T12:05:00+08:00' } : {}),
    footer: preview ? [action('确认购买', '/垂钓 确认 ' + ref), action('取消', '/垂钓 渔市 chum 1')] : [action('返回渔市', '/垂钓 渔市 chum 1')] });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 购买 crystal chum:basic 1', platform: 'qq-bot' }));
  const [page] = sent(result); assert.ok(page.text.includes(preview ? '将购买：' : '购买成功：'));
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  assert.ok(!markdown.value.some(node => node.type === 'MD.blockquote'));
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/fishing.purchase'));
  assert.deepEqual(requests[0].body.arguments, { kind: 'purchase', sku: 'chum:basic', currency: 'crystal', quantity: 1 });
  if (preview) { assert.ok(page.commands.includes('/垂钓 确认 ' + ref)); } else { assert.ok(!page.commands.some(command => command.includes('确认'))); }
});

test('FP订单兼容无普通套餐ID，原下单回显金额并发送与日礼包相同的二维码图片', async t => {
  t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/fishing-pay.png');
  assert.equal(parseBackendNormalCheckout(checkout).order.orderNo, orderNo);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, checkout));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' }));
  const [page] = sent(result, 2);
  assert.ok(page.text.includes(orderNo)); assert.ok(page.text.includes('¥6.00'));
  for (const command of [`/查询充值订单 ${orderNo}`, `/继续支付 ${orderNo}`]) { assert.ok(page.commands.includes(command)); }
  assert.ok(JSON.stringify(result.messages[1].nodes).includes('fishing-pay.png'));
  assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { sku: 'steady_6' });
});

for (const status of ['PAID', 'TIMEOUT']) test(`旧FP订单${status}不放宽付款schema，仅保留原订单恢复`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...checkout, order: { ...checkout.order, status } }));
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' })));
  assert.ok(page.text.includes('原订单待核对')); assert.ok(!page.text.includes('未取得原预览'));
  assert.ok(page.commands.includes(`/查询充值订单 ${orderNo}`)); assert.ok(page.commands.includes(`/继续支付 ${orderNo}`));
  assert.equal(requests.length, 1); assert.ok(!JSON.stringify(page).includes(checkout.payUrl));
});

test('已知原订单但收银台字段缺失时不丢单号、不再提示尚未取得预览', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...checkout, payUrl: '' }));
  const [page] = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' })));
  assert.ok(page.text.includes(orderNo)); assert.ok(page.commands.includes(`/继续支付 ${orderNo}`));
  assert.ok(!page.text.includes('预览')); assert.equal(requests.length, 1);
});

test('支付图片失败保留已建订单与查询恢复，不再次创建', async t => {
  t.mock.method(ImageCache.prototype, 'getOrCreate', async () => null);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, checkout));
  const pages = sent(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' })), 2);
  assert.ok(pages[1].text.includes('支付图片生成失败'));
  assert.ok(pages[1].commands.includes(`/查询充值订单 ${orderNo}`)); assert.ok(pages[1].commands.includes(`/继续支付 ${orderNo}`));
  assert.equal(requests.length, 1);
});

test('收银台投递失败不生成二维码或启动轮询，仍只核对原订单', async t => {
  const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/fishing-pay.png');
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, checkout));
  let attempts = 0;
  app.actions.on('message.send', () => [createResult(++attempts === 1 ? ResultCode.Fail : ResultCode.Ok, 'Offline delivery', {})]);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 2);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Fail);
  const recovery = inspectMessage(result.messages[1].nodes);
  assert.ok(recovery.commands.includes(`/查询充值订单 ${orderNo}`)); assert.equal(render.mock.callCount(), 0);
  mock.timers.tick(10000);
  assert.equal(requests.length, 1);
});

test('礼包轮询复用normal.payment-state并显示fishing原回执，不追加直充奖励', async t => {
  t.mock.method(ImageCache.prototype, 'getOrCreate', async () => 'https://offline.example.test/fishing-pay.png');
  const receipt = { orderNo, packageRewards: { spiritMilk: 0, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] },
    bonusSpiritMilk: 0, vipUpgrade: null, newcomerDayGranted: null, monthCardExtended: false, seclusionPassActivated: false,
    fishingPack: { sku: 'steady_6', name: '稳如老狗', orderNo, rodIds: ['fr_0123456789abcdef0123456789abcdef'], coinGrant: 0,
      items: [{ key: 'bait:plain', itemId: 90001, quantity: 100, held: 100, name: '素灵饵' },
        { key: 'chum:basic', itemId: 90002, quantity: 1, held: 1, name: '聚鳞散' }] } };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.path.endsWith('fishing.pack-checkout') ? checkout : { order: { ...checkout.order, status: 'SUCCESS' }, timedOut: false, receipt }));
  let complete!: () => void; const completed = new Promise<void>(resolve => { complete = resolve; }); let sends = 0;
  app.actions.on('message.send', () => { if (++sends === 3) { complete(); } return [createResult(ResultCode.Ok, 'Offline delivery', {})]; });
  const event = app.events.privateMessage({ text: '/垂钓 礼包购买 steady_6', platform: 'qq-bot' });
  const result = await app.invoke(event, async () => {
    if (typeof handler.current !== 'function') { throw new Error('Fishing handler shape changed'); }
    await handler.current(event); mock.timers.tick(10000); await completed;
  });
  const pages = sent(result, 3);
  assert.ok(pages[2].text.includes('稳如老狗')); assert.ok(pages[2].text.includes('素灵饵 ×100'));
  assert.ok(pages[2].text.includes('聚鳞散 ×1'));
  const receiptMarkdown = result.messages[2].nodes.find(node => node.type === 'Markdown');
  assert.ok(receiptMarkdown && Array.isArray(receiptMarkdown.value));
  const quote = receiptMarkdown.value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote && Array.isArray(quote.value));
  const bold = quote.value.filter(node => node.type === 'MD.bold').map(node => node.value);
  assert.ok(bold.includes('素灵饵')); assert.ok(bold.includes('聚鳞散')); assert.ok(!bold.includes('素灵饵 ×100'));
  assert.ok(!pages[2].text.includes('道晶 +'));
  assert.equal(requests.filter(request => request.path.endsWith('fishing.pack-checkout')).length, 1);
  assert.deepEqual(requests.find(request => request.path.endsWith('normal.payment-state'))?.body.arguments, { orderNo });
});
