import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildShopPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as shop} from './src/response/guild/shop/res.ts';export {default as exchange} from './src/response/guild/exchange/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildShopPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_match' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildShopTransactionsProjectionAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GUILD_SHOP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[3]).data }));
function checkPage(nodes, page) {
  const text = textOf(nodes), buttons = commands(nodes);
  assert.ok(text.includes(`贡献点：${page.contributionPoints}`)); assert.ok(text.includes(`自动刷新：${page.autoRefreshStatusText}`));
  assert.ok(buttons.includes('/我的宗门')); assert.ok(buttons.includes('/宗门商店 刷新'));
  assert.equal(buttons.includes('/宗门商店自动刷新'), page.isLeader);
  assert.equal(buttons.includes('/宗门商店自动刷新 关闭'), page.isLeader && page.autoRefreshEnabled);
  for (const item of page.items) {
    assert.ok(text.includes(`${item.name} ×${item.quantity}`)); assert.ok(text.includes(`价格：${item.priceContribution} 贡献点`));
    assert.equal(buttons.includes(`/宗门商店兑换 ${item.index}`), item.canExchange);
    if (!item.canExchange) assert.ok(text.includes(`（${item.statusText}）`));
  }
}
test('shop keeps original contribution, status, prices and permission-based quote buttons', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.shop')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    const nodes = await render('shop', '/宗门商店', raw, !row.result.success);
    if (!row.result.success) { assert.ok(textOf(nodes).includes(raw.text)); continue; }
    checkPage(nodes, raw);
  }
});
test('refresh keeps receipt with page, while post-commit page failure has no success claim', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.shop-refresh')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    const nodes = await render('shop', '/宗门商店 刷新', raw, !row.result.success), text = textOf(nodes);
    if (!row.result.success) { assert.ok(text.includes(raw.text)); assert.ok(!text.includes('商店刷新成功')); continue; }
    checkPage(nodes, raw.page);
    assert.ok(text.includes(`✨ 商店刷新成功，消耗${raw.receipt.cost}宗门灵石，剩余刷新次数：${raw.receipt.remaining}/${raw.page.refreshDailyLimit}`));
  }
});
test('exchange keeps usage and awarded item, prestige, remaining daily count and navigation', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.shop-exchange')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    const nodes = await render('exchange', '/宗门商店兑换 1', raw, !row.result.success), text = textOf(nodes);
    if (!row.result.success) { assert.ok(text.includes(raw.text)); continue; }
    if (raw.outcome === 'usage') {
      assert.ok(text.includes('选择本次列表中的有效商品编号'));
      assert.ok(commands(nodes).includes('/宗门商店'));
      continue;
    }
    const receipt = raw.receipt;
    assert.ok(text.includes('🎉 兑换成功')); assert.ok(text.includes(`获得：${receipt.itemName} × ${receipt.quantity}`));
    assert.ok(text.includes(`宗门声望 +${receipt.prestigeGain}`)); assert.ok(text.includes(`今日剩余声望获取次数：${receipt.remainingDailyCount}/3`));
    assert.ok(commands(nodes).includes('/宗门商店')); assert.ok(commands(nodes).includes('/我的宗门'));
  }
});
test('shop network failures end with original navigation after one API attempt', async () => {
  state.transportError = true;
  try {
    for (const command of ['/宗门商店', '/宗门商店 刷新', '/宗门商店兑换 1']) {
      const nodes = await render(command.includes('兑换') ? 'exchange' : 'shop', command, {});
      assert.ok(textOf(nodes).includes('网络超时'));
    }
  } finally { state.transportError = false; }
});

test('fixed six slots show purpose and a locked mineral position without fake price or exchange', async () => {
  const refreshed = receipts.find(row => row.op === 'guild.shop-refresh' && row.result.success);
  assert.ok(refreshed);
  const page = structuredClone(refreshed.result.data.page);
  assert.equal(page.items.length, 6);
  assert.ok(page.items.every(item => typeof item.slotName === 'string' && item.slotName));
  page.items[4] = { ...page.items[4], id: 0, itemId: 0, name: '矿石精华', quantity: 0, priceContribution: 0, canExchange: false, locked: true, statusText: '商店二级解锁' };
  let nodes = await render('shop', '/宗门商店', page);
  assert.ok(textOf(nodes).includes('【5】锻造耗材'));
  assert.ok(textOf(nodes).includes('商店二级解锁'));
  assert.ok(!textOf(nodes).includes('矿石精华 ×0'));
  assert.ok(!textOf(nodes).includes('价格：0 贡献点'));
  assert.ok(!commands(nodes).includes('/宗门商店兑换 5'));
  assert.ok(commands(nodes).includes('/宗门商店兑换 6'));
  assert.ok(textOf(nodes).includes('【6·锻造传承与工具】'));
  page.items[4].statusText = '已解锁，请刷新商店上架';
  nodes = await render('shop', '/宗门商店', page);
  assert.ok(textOf(nodes).includes('已解锁，请刷新商店上架'));
  assert.ok(!commands(nodes).includes('/宗门商店兑换 5'));
});
