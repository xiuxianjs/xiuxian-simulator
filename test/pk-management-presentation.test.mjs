import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { shutdownLogger } from 'alemonjs';
after(async () => { await shutdownLogger(); });
const state = globalThis.__pkManagement = { sent: [], calls: [], raw: null };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as targets} from './src/response/pkTargets/res.ts';export {default as hiding} from './src/response/pkHiding/res.ts';export {default as hide} from './src/response/pkHide/res.ts';export {default as ranking} from './src/response/killGodList/res.ts';export {default as history} from './src/response/pkHistory/res.ts';export {default as report} from './src/response/pkReport/res.ts';export {default as replay} from './src/response/pkReplay/res.ts';export * from './src/api/bot/pk-management.ts';export * from './src/api/bot/pk-history.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'pk-management-test', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const requestBackend=()=>{throw new Error('unexpected direct API');};export const writeContext=()=>({});
      export { useMessage } from 'alemonjs';
      export const runRobotBusiness=async(e,op,args,decode)=>{const s=globalThis.__pkManagement;s.calls.push({op,args});return {handled:false,data:decode(s.raw,1)};};
    ` }));
  } }]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);
const text = nodes => nodes.map(node => typeof node.value === 'string' ? node.value : '').join('');
async function render(name, command, raw, isPrivate = true) {
  state.raw = raw; state.sent = []; state.calls = [];
  const event = { name: 'message.create', UserId: 'player', MessageText: command, isPrivate, uid: 1 };
  await framework.run(handlers[name], event, () => { throw new Error('unexpected next'); });
  assert.equal(state.sent.length, 1);
  return flatten(state.sent[0]);
}
const view = { capacity: 4, used: 1, assets: [{ assetKind: 'item', assetId: 8, ownerId: 1, hiddenQuantity: 2, heldQuantity: 3, updatedAt: '2026-10-18T22:00:00+08:00' }] };
const inventory = { assetKind: 'item', view, inventory: { nextCursor: 99, items: [
  { assetKind: 'item', assetId: 8, name: '普通草药', quantity: 12, hiddenQuantity: 2, heldQuantity: 3, maxHiddenQuantity: 9, protectionText: '' },
  { assetKind: 'item', assetId: 9, name: '真灵丹', quantity: 4, hiddenQuantity: 0, heldQuantity: 0, maxHiddenQuantity: 0, protectionText: '保护物，无需隐藏' },
  { assetKind: 'item', assetId: 10, name: '暂存草药', quantity: 1, hiddenQuantity: 0, heldQuantity: 1, maxHiddenQuantity: 0, protectionText: '原物暂存中，不可隐藏' }
] } };

test('target actions use only server permission and keep fixed candidate odds distinct from guaranteed drops', async () => {
  const raw = { canAttack: true, reason: '', qiCost: 15, dailyRemaining: 9, dailyLimit: 10, nextCursor: 8, items: [{ uid: 2, name: '道友', realmName: '筑基', sameTargetRemaining: 4, pairOrdinal: 2, rewardPercent: 60, itemChancePercent: 24, wallet: 'DO_NOT_RENDER', hidden: 'DO_NOT_RENDER' }] };
  const nodes = await render('targets', '/可打劫道友 5', raw);
  assert.deepEqual(state.calls, [{ op: 'pvp.pk-targets', args: { cursor: 5 } }]);
  assert.ok(commands(nodes).includes('/打劫 2')); assert.ok(commands(nodes).includes('/可打劫道友 8'));
  assert.ok(text(nodes).includes('24%（可能落空）')); assert.ok(!JSON.stringify(nodes).includes('DO_NOT_RENDER'));
  const closed = await render('targets', '/可打劫道友', { ...raw, canAttack: false, reason: '普通打劫暂未开放' });
  assert.ok(!commands(closed).includes('/打劫 2'));
  assert.throws(() => handlers.parsePKTargets({ ...raw, canAttack: 'invalid' }));
});

test('hiding keeps actions inside the explanatory quote and never offers held/protected stock', async () => {
  const nodes = await render('hiding', '/隐藏物品 物品', inventory);
  assert.deepEqual(state.calls, [{ op: 'pvp.pk-hiding', args: { private: true, assetKind: 'item', cursor: 0 } }]);
  assert.ok(text(nodes).includes('库存12 · 已隐藏2 · 争夺暂存3'));
  assert.ok(commands(nodes).includes('/设置隐藏 物品 8 1'));
  assert.ok(commands(nodes).includes('/设置隐藏 物品 8 0'));
  assert.ok(!commands(nodes).includes('/设置隐藏 物品 8 10'));
  assert.ok(!commands(nodes).some(command => /^\/设置隐藏 物品 (9|10) /.test(command)));
  assert.ok(commands(nodes).includes('/隐藏物品 物品 99'));
  const walk = nodes => nodes.flatMap(node => [node, ...(Array.isArray(node.value) ? walk(node.value) : [])]);
  const quotes = walk(state.sent[0]).filter(node => node.type === 'MD.blockquote');
  assert.ok(quotes.some(node => commands(flatten(node.value)).includes('/设置隐藏 物品 8 1') && text(flatten(node.value)).includes('普通草药')));
});

test('group defense never renders hidden names even if an upstream success is misrouted', async () => {
  const nodes = await render('hiding', '/隐藏物品', inventory, false);
  assert.ok(text(nodes).includes('仅限私聊')); assert.ok(!text(nodes).includes('普通草药'));
  assert.deepEqual(state.calls[0].args.private, false);
});

test('hide writes are absolute, preserve zero and carry invalid command numbers to admission as null', async () => {
  const nodes = await render('hide', '/设置隐藏 物品 8 0', { assetKind: 'item', assetId: 8, quantity: 0, view: { ...view, used: 0, assets: [] } });
  assert.deepEqual(state.calls, [{ op: 'pvp.pk-hide', args: { private: true, assetKind: 'item', assetId: 8, quantity: 0 } }]);
  assert.ok(text(nodes).includes('已隐藏0份')); assert.ok(commands(nodes).includes('/隐藏物品 物品'));
  for (const command of ['/设置隐藏 物品 8 -1', '/设置隐藏 物品 8 1.5', '/设置隐藏 物品 9007199254740992 1']) {
    await render('hide', command, null); assert.equal(state.calls.length, 1);
    assert.ok(state.calls[0].args.quantity === null || state.calls[0].args.assetId === null);
  }
  assert.throws(() => handlers.parsePKHiding({ ...inventory, view: { ...view, assets: [{ ...view.assets[0], ownerId: 2 }] } }, 1));
  assert.throws(() => handlers.parsePKHiding({ ...inventory, inventory: { items: [{ ...inventory.inventory.items[0], assetKind: 'equipment' }] } }, 1));
});

test('kill-god ranking exposes current discovery actions even when empty', async () => {
  const raw = { list: [], shaQiInfo: { shaQi: 0, onKillGodList: false, killGodThreshold: 30, dailyDecayAmount: 1, jinpenReduceAmount: 5 }, robberyRemaining: 10, robberyDailyMax: 10, streak: 0, streakBonusPercent: 0, streakText: '', killGodThreshold: 30, rankingRuleText: '', hasKillGodTitle: false, canClaimTitle: false };
  for (const list of [[], [{ rank: 1, uid: 2, name: '道友', shaQi: 30 }]]) {
    const nodes = await render('ranking', '/杀神榜', { ...raw, list });
    assert.ok(commands(nodes).includes('/可打劫道友'));
    assert.ok(commands(nodes).includes('/隐藏物品'));
  }

});

const summary = (reportId, viewerRole = 'victim') => ({ reportId, viewerRole, opponentUid: 2, opponentName: '同一道友', createdAt: '2026-10-18T10:00:00+08:00', resultText: viewerRole === 'attacker' ? '普通打劫成功' : '对方普通打劫成功', moneyText: viewerRole === 'attacker' ? '灵石 +200' : '灵石 -200', originalAssetText: '原物状态以这份战报为准', counterStatusText: '可免费反击一次', canCounterAttack: viewerRole === 'victim', counterDeadline: '2026-10-19T10:00:00+08:00' });

test('history preserves same-opponent reports and links the selected original SQL report', async () => {
  const nodes = await render('history', '/争夺历史 我被打 80', { items: [summary(72), summary(71)], nextCursor: 71 });
  assert.deepEqual(state.calls, [{ op: 'pvp.pk-history', args: { scope: 'defenses', cursor: 80 } }]);
  assert.ok(commands(nodes).includes('/争夺战报 72'));
  assert.ok(commands(nodes).includes('/争夺战报 71'));
  assert.ok(commands(nodes).includes('/争夺历史 我被打 71'));
  assert.ok(!commands(nodes).some(command => command.startsWith('/回击')));
});

test('report counter belongs to the original victim and durable replay buttons never use Redis log IDs', async () => {
  const nodes = await render('report', '/争夺战报 71', { summary: summary(71), hasOrdinaryReplay: true, hasCounterReplay: true });
  assert.ok(commands(nodes).includes('/回击 71'));
  assert.ok(commands(nodes).includes('/争夺回放 71 原战 1'));
  assert.ok(commands(nodes).includes('/争夺回放 71 反击 1'));
  assert.ok(!commands(nodes).some(command => command.startsWith('/查看战斗过程')));
  const actor = await render('report', '/争夺战报 71', { summary: summary(71, 'attacker'), hasOrdinaryReplay: false, hasCounterReplay: false });
  assert.ok(!commands(actor).some(command => command.startsWith('/回击')));
  assert.ok(text(actor).includes('灵石 +200'));
  assert.ok(!text(actor).includes('暂无完整原战持久回放'));assert.ok(!commands(actor).includes('/争夺回放 71 原战 1'));
  assert.throws(() => handlers.parsePKReport({ summary: { ...summary(71, 'attacker'), canCounterAttack: true }, hasOrdinaryReplay: true, hasCounterReplay: false }));
});

test('durable replay is paginated read-only text and goes back to the exact original report', async () => {
  const nodes = await render('replay', '/争夺回放 71 反击 2', { summary: summary(71), phase: 'counter', page: 2, totalPages: 3, totalActions: 48, text: '已保存战斗，以原战报状态为准\n第21回合：道友使用普通攻击' });
  assert.deepEqual(state.calls, [{ op: 'pvp.pk-replay', args: { reportId: 71, phase: 'counter', page: 2 } }]);
  assert.ok(commands(nodes).includes('/争夺战报 71'));
  assert.ok(commands(nodes).includes('/争夺回放 71 反击 3'));
  assert.ok(!text(nodes).includes('不会重新战斗或结算'));assert.ok(text(nodes).includes('第21回合：道友使用普通攻击'));
  assert.ok(!commands(nodes).some(command => command.startsWith('/回击')));
});

test('invalid report/replay input still reaches admission as null, and mismatched receipts do not render a success', async () => {
  await render('report', '/争夺战报 9007199254740992', null);
  assert.deepEqual(state.calls, [{ op: 'pvp.pk-report', args: { reportId: null } }]);
  const wrong = await render('report', '/争夺战报 71', { summary: summary(72), hasOrdinaryReplay: true, hasCounterReplay: false });
  assert.ok(text(wrong).includes('读取争夺战报失败'));
  assert.ok(!commands(wrong).includes('/回击 72'));
});

test('battle discovery strips implementation notes while keeping costs, quotes and privacy state',async()=>{
 const raw={mode:'active',canAttack:true,reason:'',qiCost:15,dailyRemaining:9,dailyLimit:10,items:[{uid:2,name:'青云',realmName:'筑基',sameTargetRemaining:4,pairOrdinal:2,rewardPercent:60,itemChancePercent:24}]};
 const nodes=await render('targets','/可打劫道友',raw);
 assert.ok(text(nodes).includes('每次15元力'));assert.ok(text(nodes).includes('剩余4次'));
 for(const phrase of ['重新核验','UID','双方今日第'])assert.ok(!text(nodes).includes(phrase));
 const hiding=await render('hiding','/隐藏物品 物品',inventory);
 assert.ok(!text(hiding).includes('共享容量'));assert.ok(!text(hiding).includes('手动锁不能替代隐藏'));
});
