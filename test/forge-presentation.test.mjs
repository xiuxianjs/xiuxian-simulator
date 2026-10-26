import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { logger } from 'alemonjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/forge-contracts.json', import.meta.url), 'utf8'));
const httpFixture = JSON.parse(readFileSync(new URL('./fixtures/forge-robot-contracts.json', import.meta.url), 'utf8'));
const state = globalThis.__forgePresentation = {};
const framework = createPresentationHarness(state);
const bundle = await build({
  entryPoints: ['src/response/profession/forge/res.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'forge-seams', setup(b) {
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    b.onResolve({ filter: /^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/ }, a => ({ path: a.path, namespace: 'seam' }));
    b.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export { useMessage } from 'alemonjs';
      export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{
        const s=globalThis.__forgePresentation;s.calls.push({op,args});
        if(s.transport)throw new Error('test transport failure');
        if(s.middleware){next();return {handled:true}}
        if(s.refusal){await feedback({title:'锻造提示',text:'配置未开放'});return {handled:true}}
        e.uid=s.uid;return {handled:false,data:decode(s.data,s.uid)};
      };
    ` }));
  } }]
});
const handler = (await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default;
async function render(text, data, options = {}) {
  Object.assign(state, { sent: [], calls: [], next: 0, uid: 1, middleware: false, refusal: false, transport: false, data: structuredClone(data) }, options);
  const e = { name: 'message.create', UserId: 'forge-player', MessageText: text, isPrivate: options.isPrivate ?? true };
  await framework.run(handler, e, () => state.next++);
  return JSON.stringify(state.sent);
}

test('forge commands use exactly one business request with explicit arguments', async () => {
  const cases = [
    ['/我的锻造', 'forge.overview', {}, fixture.overview],
    ['/锻造图纸 1', 'forge.overview', {}, fixture.overview],
    ['/加入锻造师', 'forge.preview', { tutorial: true, recipeId: 0 }, fixture.preview],
    ['/打造 1', 'forge.preview', { tutorial: false, recipeId: 1 }, fixture.preview],
    ['/确认打造 signed-token', 'forge.confirm', { token: 'signed-token' }, fixture.result],
    ['/锻造进阶 0', 'forge.advance', { expectedLevel: 0 }, fixture.overview],
    ['/学习锻造图纸', 'forge.learn', {}, fixture.overview],
    ['/锻造作品 2', 'forge.history', { page: 2 }, fixture.history],
    ['/委托锻造 1 1 7', 'forge.order-preview', { crafterId: 1, recipeId: 1, fee: 7 }, fixture.orderPreview],
    ['/确认锻造委托 signed-token', 'forge.order-create', { token: 'signed-token' }, fixture.orderCreated],
    ['/接取锻造委托 1', 'forge.order-accept', { orderId: 1 }, fixture.orderDelivered],
    ['/取消锻造委托 1', 'forge.order-cancel', { orderId: 1 }, { ...fixture.orderCreated, status: 'cancelled', canCancel: false }],
    ['/锻造委托', 'forge.orders', { page: 1 }, fixture.orders]
  ];
  for (const [text, op, args, data] of cases) for (const isPrivate of [false, true]) {
    await render(text, data, { isPrivate });
    assert.deepEqual(state.calls, [{ op, args }], text);
    assert.equal(state.sent.length, 1, text);
    assert.equal(state.next, 0);
    assert.equal(JSON.stringify(state.sent).includes('mention'), !isPrivate, text);
  }
});

test('preview contains cost, attribute range, binding and confirmation in the same quote', async () => {
  const out = await render('/委托锻造 1 1 7', fixture.orderPreview);
  for (const text of ['工费 7', '950～1000', '不可交易', '托管：灵石 12', '24 小时', '确认委托']) assert.ok(out.includes(text), text);
  const nodes = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'MD.blockquote') nodes.push(value);
    Object.values(value).forEach(visit);
  }
  visit(state.sent[0]);
  const quote = nodes.find(node => JSON.stringify(node).includes('工费 7'));
  assert.ok(quote, 'cost appears inside a quote');
  assert.ok(JSON.stringify(quote).includes('/确认锻造委托 ' + fixture.orderPreview.token), 'confirmation stays in the same quote');
});

test('commission lists stay compact and historical details never offer snapshot equipment actions', async () => {
  const items = { items: [fixture.orderDelivered], page: 1, hasMore: false };
  const list = await render('/锻造委托', items, { uid: 2 });
  assert.ok(list.includes('/锻造委托详情 ' + fixture.orderDelivered.id + ' 1'));
  assert.ok(!list.includes('（制作时）'));
  assert.ok(!list.includes('/装备 '));
  const detail = await render(`/锻造委托详情 ${fixture.orderDelivered.id} 1`, items, { uid: 2 });
  assert.ok(detail.includes('署名：测试匠师'));
  assert.ok(detail.includes('（制作时）'));
  assert.ok(detail.includes('制作记录'));
  assert.ok(detail.includes('/储物袋 装备'));
  assert.ok(!detail.includes('/装备 '));
  const crafter = await render('/接取锻造委托 1', fixture.orderDelivered, { uid: 1 });
  assert.ok(!crafter.includes('/装备 '));
  assert.ok(crafter.includes(`经验 +${fixture.orderDelivered.result.expGained}`));
  assert.ok(!crafter.includes('/接取锻造委托 '));
});

test('pending order actions follow service permissions and cancelled orders show refunds', async () => {
  const owner = await render('/确认锻造委托 token', fixture.orderCreated, { uid: 2 });
  assert.ok(owner.includes('/取消锻造委托 '));
  assert.ok(!owner.includes('/接取锻造委托 '));
  const summary = await render('/锻造委托', fixture.orders);
  assert.ok(summary.includes('/锻造委托详情 '));
  assert.ok(!summary.includes('/接取锻造委托 '));
  const crafter = await render(`/锻造委托详情 ${fixture.orders.items[0].id} 1`, fixture.orders);
  assert.ok(crafter.includes('测试矿石 ×3'));
  assert.ok(crafter.includes('接单并交付'));
  assert.ok(crafter.includes('/接取锻造委托 '));
  assert.ok(!crafter.includes('/取消锻造委托 '));
  const cancelled = await render('/取消锻造委托 1', { ...fixture.orderCreated, status: 'cancelled', canCancel: false });
  assert.ok(cancelled.includes('已取消并退款'));
  assert.ok(cancelled.includes('灵石 12'));
  assert.ok(cancelled.includes('已退回：测试矿石 ×3'));
  assert.ok(!cancelled.includes('/取消锻造委托 '));
});

test('invalid input makes no request; middleware and refusal do not add a success bubble', async () => {
  for (const text of ['/打造', '/打造 -1', '/确认打造', '/确认锻造委托', '/委托锻造 1 1 -1', '/委托锻造 1', '/锻造作品 0', '/锻造图纸 abc', '/锻造委托 -1', '/接取锻造委托 0', '/锻造进阶']) {
    await render(text, {}); assert.equal(state.calls.length, 0, text); assert.equal(state.sent.length, 1, text);
  }
  await render('/我的锻造', {}, { middleware: true });
  assert.equal(state.next, 1); assert.equal(state.sent.length, 0);
  const refusal = await render('/我的锻造', {}, { refusal: true });
  assert.equal(state.sent.length, 1); assert.ok(refusal.includes('配置未开放'));
  assert.ok(refusal.includes('/我的锻造')); assert.ok(refusal.includes('/锻造图纸'));
});

test('expired escrow is shown as awaiting refund until service confirms the refund', async () => {
  const pending = {...fixture.orderCreated, expiresAt: 1, refundPending: true, canAccept: false, canCancel: true};
  const owner = await render('/取消锻造委托 1', pending, {uid: 2});
  assert.ok(owner.includes('已到期，待退款'));
  assert.ok(owner.includes('托管：灵石 12'));
  assert.ok(owner.includes('领取退款'));
  assert.ok(owner.includes('/取消锻造委托 '));
  assert.ok(!owner.includes('已退回'));
  assert.ok(!owner.includes('已退回 测试矿石'));
  assert.ok(!owner.includes('/接取锻造委托 '));
  const list = await render('/锻造委托', {items: [pending], page: 1, hasMore: false}, {uid: 2});
  assert.ok(list.includes('已到期，待退款'));
  const crafter = await render('/锻造委托详情 1 1', {items: [{...pending, canCancel: false}], page: 1, hasMore: false});
  assert.ok(crafter.includes('已到期，待退款'));
  assert.ok(!crafter.includes('/取消锻造委托 '));
  const completed = await render('/取消锻造委托 1', {...pending, status: 'expired', refundPending: false, canCancel: false}, {uid: 2});
  assert.ok(completed.includes('已到期并退款'));
  assert.ok(completed.includes('灵石 12'));
  assert.ok(!completed.includes('尚未退回'));
  // A past timestamp alone must not make the bot invent settlement state.
  const old = {...pending}; delete old.refundPending;
  assert.ok((await render('/确认锻造委托 token', old, {uid: 2})).includes('待接单'));
});

test('transport or malformed DTO failure directs players to receipts without extra requests', async t => {
  t.mock.method(logger, 'error', () => {});
  for (const transport of [false, true]) {
    const out = await render('/确认锻造委托 token', {}, { transport });
    assert.equal(state.calls.length, 1); assert.equal(state.sent.length, 1);
    assert.ok(out.includes('查看委托状态')); assert.ok(out.includes('/锻造委托'));
    assert.ok(!out.includes('已交付'));
  }
});


test('overview focuses on growth, recipe list keeps sources inside detail', async () => {
  const overview = await render('/我的锻造', fixture.overview);
  assert.ok(overview.includes('考核：'));
  assert.ok(!overview.includes('测试矿石：可用'));
  const list = await render('/锻造图纸', fixture.overview);
  const recipe = fixture.overview.recipes[0];
  assert.ok(list.includes(`/锻造图纸详情 ${recipe.id}`));
  assert.ok(!list.includes(recipe.materials[0].source));
  const detail = await render(`/锻造图纸详情 ${recipe.id}`, fixture.overview);
  assert.equal(detail.includes(recipe.materials[0].source), recipe.materials[0].available < recipe.materials[0].required);
  assert.equal(state.calls.length, 1);
});

test('history detail respects current existence and ownership, list does not expand attributes', async () => {
  const item = fixture.history.items[0];
  const list = await render('/锻造作品', fixture.history);
  assert.ok(!list.includes('（制作时）'));
  assert.ok(list.includes(`/锻造作品详情 ${item.result.craftId} 1`));
  for (const [exists, owned] of [[true, true], [true, false], [false, false]]) {
    const data = { ...fixture.history, items: [{ ...item, exists, owned }] };
    const detail = await render(`/锻造作品详情 ${item.result.craftId} 1`, data);
    assert.ok(!detail.includes('/装备 '), 'historical equipment eligibility is never reused');
    assert.ok(detail.includes('署名'));
    if (!exists) assert.ok(detail.includes('装备已不存在'));
    else if (!owned) assert.ok(detail.includes('装备当前不属于你'));
    assert.equal(state.calls.length, 1);
  }
});

test('detail locates stable record id and refuses to show another item after page movement', async () => {
  for (const [text, data] of [
    ['/锻造委托详情 999 1', fixture.orders],
    ['/锻造作品详情 999 1', fixture.history],
    ['/锻造图纸详情 999', fixture.overview]
  ]) {
    const out = await render(text, data);
    assert.ok(out.includes('重新查看') || out.includes('暂不可查看'));
    assert.ok(!out.includes('（制作时）'));
    assert.ok(!out.includes('/装备 '));
    assert.equal(state.calls.length, 1);
  }
  for (const text of ['/锻造委托详情 1', '/锻造作品详情 1 0', '/锻造图纸详情 1 2', '/锻造委托详情 1 100001']) {
    await render(text, {}); assert.equal(state.calls.length, 0);
  }
});

test('guide explains participant handoff and has no game mutation', async () => {
  const out = await render('/锻造指引', {});
  assert.equal(state.calls.length, 0);
  for (const text of ['匠师编号', '图纸编号', '灵石工费', '/我的编号', '/储物袋 天工', '/替换', '/珍宝楼 筛选 天工 价格升序 1']) assert.ok(out.includes(text));
});

test('recipe tool guidance provides inventory and marketplace paths only in detail', async () => {
  const data = structuredClone(fixture.overview);
  Object.assign(data.recipes[0], {toolType: '炼器台', toolGrade: 2, canCraft: false, reason: '缺少符合品阶的炼器台'});
  const id = data.recipes[0].id;
  const detail = await render(`/锻造图纸详情 ${id}`, data);
  for (const text of ['炼器台', '品阶 ≥ 2', '/储物袋 天工', '/替换', '/珍宝楼 筛选 天工 价格升序 1']) assert.ok(detail.includes(text), text);
  assert.ok(!detail.includes('/切换'));
  assert.ok(!detail.includes(`/打造 ${id}`));
  const list = await render('/锻造图纸', data);
  assert.ok(!list.includes('不保证有货'));
  assert.ok(!list.includes('/珍宝楼 筛选'));
  data.recipes[0].toolType = '';
  data.recipes[0].toolGrade = 0;
  const noTool = await render(`/锻造图纸详情 ${id}`, data);
  assert.ok(!noTool.includes('/替换'));
  assert.ok(!noTool.includes('/珍宝楼 筛选'));
});

test('tutorial tool bubble describes the preview and preserves historical equipment state', async () => {
  const preview = await render('/加入锻造师', httpFixture['tutorial-preview'].data);
  assert.ok(preview.includes('赠送：测试基础台'));
  assert.ok(preview.includes('绑定'));
  for (const equipped of [true, false]) {
    const data = structuredClone(httpFixture['tutorial-confirm'].data);
    data.tutorialTool.equipped = equipped;
    const result = await render('/确认打造 signed-token', data);
    assert.ok(result.includes('获得工具：测试基础台'));
    assert.ok(result.includes(equipped ? '已启用' : '已存入天工背包'));
    assert.ok(result.includes('/储物袋 天工'));
    assert.ok(result.includes('/锻造图纸'));
  }
  const old = structuredClone(httpFixture['tutorial-confirm'].data); delete old.tutorialTool;
  assert.ok(!(await render('/确认打造 old-token', old)).includes('入门工具记录'));
});

test('assessment pagination retains filter and the return path from recipe detail', async () => {
  const data = structuredClone(fixture.overview);
  const base = data.recipes[0];
  data.recipes = Array.from({ length: 6 }, (_, i) => ({ ...base, id: i + 1, name: `本阶段图纸${i + 1}`, requiredLevel: data.level, assessment: true, completed: false }));
  data.recipes.push({ ...base, id: 90, name: '其他阶段图纸', requiredLevel: data.level + 1, assessment: true, completed: false, canCraft: false });
  data.recipes.push({ ...base, id: 91, name: '已完成图纸', requiredLevel: data.level, assessment: true, completed: true });
  const first = await render('/锻造图纸 考核', data);
  assert.ok(first.includes('第1/2页，共6条'));
  assert.ok(first.includes('/锻造图纸 考核 2'));
  assert.ok(!first.includes('本阶段图纸6'));
  assert.ok(!first.includes('其他阶段图纸'));
  assert.ok(!first.includes('已完成图纸'));
  const second = await render('/锻造图纸 考核 2', data);
  assert.ok(second.includes('本阶段图纸6'));
  assert.ok(second.includes('/锻造图纸详情 6 考核 2'));
  assert.ok(second.includes('/锻造图纸 考核 1'));
  assert.equal(state.calls.length, 1);
  const detail = await render('/锻造图纸详情 6 考核 2', data);
  assert.ok(detail.includes('/锻造图纸 考核 2'));
  assert.equal(state.calls.length, 1);
});

test('growth panel and empty filters provide the next read action without pretending eligibility', async () => {
  const data = structuredClone(fixture.overview);
  data.recipes.forEach(r => { r.canCraft = false; r.completed = true; });
  const home = await render('/我的锻造', data);
  assert.ok(home.includes('/锻造图纸 考核'));
  assert.ok(home.includes('/锻造图纸 可制作'));
  const ready = await render('/锻造图纸 可制作', data);
  assert.ok(ready.includes('暂无可打造图纸'));
  assert.ok(!ready.includes('/打造 '));
  const assessment = await render('/锻造图纸 考核', data);
  assert.ok(assessment.includes('暂无待考核图纸'));
  data.joined = false;
  const unjoined = await render('/锻造图纸 考核', data);
  assert.ok(unjoined.includes('尚未入门'));
  for (const text of ['/锻造图纸 考核 0', '/锻造图纸 未知', '/锻造图纸 可制作 1 2', '/锻造图纸详情 1 考核 0']) {
    await render(text, {}); assert.equal(state.calls.length, 0);
  }
});

test('zero-exp preview retains costs and assessment without explanatory prose', async () => {
  for (const assessmentNew of [false, true]) {
    const preview = { ...fixture.preview, tutorial: false, expGained: 0, assessmentNew };
    const out = await render('/打造 1', preview);
    assert.ok(out.includes('经验 +0'));
    assert.ok(out.includes(`消耗：灵石 ${preview.recipe.spiritStoneCost}`));
    assert.ok(out.includes('/确认打造 ' + preview.token));
    assert.ok(!out.includes('查看成长'));
    assert.equal(out.includes('首次考核'), assessmentNew);
    assert.equal(state.calls.length, 1);
  }
  const tutorial = await render('/加入锻造师', { ...fixture.preview, tutorial: true, expGained: 0 });
  assert.ok(tutorial.includes('免费教学'));
  assert.ok(!tutorial.includes('仍会按预览消耗资源'));
});


test('forge presentation keeps focused navigation and removes repeated instructions', async () => {
  const preview = await render('/打造 1', fixture.preview);
  assert.ok(!preview.includes('预览有效期'));
  assert.ok(!preview.includes('/锻造指引'));
  assert.ok(preview.includes('/确认打造 ' + fixture.preview.token));
  const list = await render('/锻造图纸', fixture.overview);
  assert.ok(!list.includes('经验：'));
  assert.ok(!list.includes('/替换'));
  assert.ok(list.includes('材料 ' + fixture.overview.recipes[0].materials.length + ' 种'));
  const result = await render('/确认打造 token', fixture.result);
  assert.ok(result.indexOf('物攻') < result.indexOf('署名：'));
  assert.ok(!result.includes(' · 装备 ' + fixture.result.equipment.id));
  assert.ok(result.includes('（制作时）'));
});

 test('pending commission expiry uses Beijing time for Unix seconds', async () => {
  const order = { ...fixture.orderCreated, status: 'pending', expiresAt: 1792886400, refundPending: false };
  const out = await render('/确认锻造委托 signed-token', order);
  assert.ok(out.includes('到期：2026-10-25 08:00'));
});
