import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__dungeonQueriesPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as catalog} from './src/response/dungeon/list/res.ts';export {default as detail} from './src/response/dungeon/detail/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error {} export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__dungeonQueriesPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonQueriesV1ParityReadOnlyAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_DUNGEON_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));



test('catalog preserves empty, paginated, cleared and team-specific action buttons',async()=>{
  const rows=receipts.filter(r=>r.op==='dungeon.catalog'&&r.result.success);
  assert.ok(rows.some(r=>r.result.data.total===0));
  assert.ok(rows.some(r=>r.result.data.inTeam));
  for(const {result:row} of rows){
    const nodes=await render('catalog','/查看秘境',row.data),d=row.data;
    assert.equal(commands(nodes).includes('/扫荡免费秘境'),d.total>0);
    assert.equal(commands(nodes).includes('/妖塔'),d.canUseMeridian);
    if(d.total===0){assert.ok(textOf(nodes).includes('暂无秘境'));assert.ok(commands(nodes).includes('/天书'));assert.ok(commands(nodes).includes('/查看主线'));continue;}
    assert.ok(textOf(nodes).includes(`精力：${d.mentalValue}`));
    for(const item of d.items){
      assert.ok(commands(nodes).includes(`/秘境详情 ${item.name}`));
      assert.equal(commands(nodes).includes(`/扫荡秘境 ${item.name}`),!d.inTeam&&item.hasCleared);
      assert.equal(commands(nodes).includes(`/秘境挑战 ${item.name}`),d.inTeam||!item.hasCleared);
      assert.equal(commands(nodes).includes(`/匹配秘境 ${item.id}`),!d.inTeam&&!item.isSingle&&d.canMatchDungeon);
      assert.equal(commands(nodes).includes(`/探索秘境 ${item.name}`),!d.inTeam);
      assert.ok(!commands(nodes).includes(`/闭关 ${item.name}`));
    }
  }
});
test('detail keeps original drops, first clear, quotas, guild output and team actions',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='dungeon.detail'&&r.result.success)){
    const nodes=await render('detail','/秘境详情 桃花镇',row.data);
    if(row.data.outcome==='usage'){assert.ok(textOf(nodes).includes('请指定秘境名称'));continue;}
    const d=row.data.data;
    assert.ok(textOf(nodes).includes(`修为+${d.expReward}`));
    assert.ok(textOf(nodes).includes('灵石+11'));
    assert.ok(textOf(nodes).includes('御剑诀（1.0%）'));
    assert.ok(textOf(nodes).includes('灵草 ×2（80.0%）'));
    assert.ok(commands(nodes).includes('/物品详情 功法 13'));
    assert.ok(commands(nodes).includes('/物品详情 物品 11'));
    assert.ok(commands(nodes).includes('/物品详情 装备 12'));
    assert.equal(textOf(nodes).includes('🎉 首通奖励：'),d.firstClearReward!==null);
    assert.equal(commands(nodes).includes('/扫荡秘境 桃花镇'),d.hasCleared&&!d.inTeam);
    assert.equal(commands(nodes).includes('/秘境挑战 桃花镇'),!d.hasCleared||d.inTeam);
    assert.ok(textOf(nodes).includes(`今日免费：已用${d.freeUsed}/${d.freeLimit}次，剩余${d.freeRemaining}次`));
    if(d.outputMultiplier!==null){assert.ok(textOf(nodes).includes('1.10倍(✛10%）'));}
  }
});
test('detail failures preserve same-request repeat text and do not call another game API',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='dungeon.detail'&&!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render('detail','/秘境详情 不存在',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(!commands(nodes).includes('/秘境挑战 不存在'));
  }
});
test('detail network failure ends after its single attempt',async()=>{
  state.transportError=true;
  try{assert.ok(textOf(await render('detail','/秘境详情 桃花镇',{})).includes('网络超时'));}
  finally{state.transportError=false;}
});
