import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__dungeonSweepsPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as sweep} from './src/response/dungeon/sweep/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error {} export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__dungeonSweepsPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonSweepsSettlementPartialAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_DUNGEON_SWEEP_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));



test('ordinary sweep renders actual affordable rounds, costs and returned rewards',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='dungeon.sweep'&&r.result.success&&r.result.data.outcome==='result')){
    const d=row.data.data,nodes=await render('sweep','/扫荡秘境 试炼 10',row.data);
    assert.ok(textOf(nodes).includes(`${d.dungeonName} × ${d.times} | 精力 -${d.totalSpiritCost} | 修为 +${d.totalExp}`));
    assert.ok(textOf(nodes).includes('药草×2'));
    assert.equal(commands(nodes).includes(`/扫荡秘境 ${d.dungeonName} ${d.times}`), d.times === 10);
    if(d.times < 10){
      assert.ok(textOf(nodes).includes(`本次实际完成 ${d.times}/10 次`));
      assert.ok(commands(nodes).includes('/查看秘境'));
      assert.ok(commands(nodes).includes('/我的信息'));
    }
  }
});
test('free sweep keeps partial success, stop reason and navigation',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='dungeon.sweep-free'&&r.result.success)){
    const d=row.data,nodes=await render('sweep','/扫荡免费秘境',d);
    assert.ok(textOf(nodes).includes(`共结算 ${d.sweptDungeons.length} 个秘境 | 免费扫荡 ${d.totalTimes} 次 | 修为 +${d.totalExp}`));
    for(const skipped of d.skippedDungeons)assert.ok(textOf(nodes).includes(`${skipped.dungeonName}：${skipped.message}`));
    assert.equal(commands(nodes).includes('/扫荡免费秘境'), d.skippedDungeons.length === 0);
    assert.ok(commands(nodes).includes('/查看秘境'));
  }
});
test('refusals keep server repeat text, energy pill and original free navigation',async()=>{
  for(const {op,result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render('sweep',op==='dungeon.sweep-free'?'/扫荡免费秘境':'/扫荡秘境 试炼 10',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    for(const button of reply.buttons)assert.ok(commands(nodes).includes(button.command));
  }
});
test('no match stays silent and transport errors end after one attempt',async()=>{
  await render('sweep','/其他指令',{outcome:'no_match'});
  state.transportError=true;
  try{for(const text of ['/扫荡秘境 试炼 10','/扫荡免费秘境']){
    const nodes=await render('sweep',text,{});
    assert.ok(textOf(nodes).includes('网络超时'));
  }}finally{state.transportError=false;}
});
