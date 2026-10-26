import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__checkinPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as hub} from './src/response/signIn/hub/res.ts';export {default as newcomer} from './src/response/activity/newcomerLoginClaim/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__checkinPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_match' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);


test('hub retains ordered receipts, partial failure retry and navigation',async()=>{
 const nodes=await render('hub','/签到',{results:[{name:'日常签到',status:'done',message:'签到成功'},{name:'新人签到',status:'error',message:'加载失败'},{name:'宗门签到',status:'skip',message:'不可用'}]});
 for(const part of ['🎉 日常签到：签到成功','❌ 新人签到：加载失败','· 宗门签到：不可用'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/新人签到','/任务面板','/我'])assert.ok(commands(nodes).includes(command),command);
 const failed=await render('hub','/签到',{text:'❌ 统一签到失败：签到服务未初始化'},true);assert.ok(textOf(failed).includes('签到服务未初始化'));assert.ok(commands(failed).includes('/任务面板'));
});
test('newcomer claim retains reward display, informational outcomes and failure bubble',async()=>{
 const nodes=await render('newcomer','/初入仙途签到',{code:'OK',data:{claimDay:1,spiritCrystal:8,grantedItems:['灵草×2']}});
 for(const part of ['【初入仙途】','第1天修行完成','灵晶×8','灵草×2'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/初入仙途 1','/初入仙途'])assert.ok(commands(nodes).includes(command),command);
 assert.ok(!commands(await render('newcomer','/初入仙途签到',{code:'OK',data:{claimDay:7,spiritCrystal:0,grantedItems:[]}})).includes('/初入仙途 7'));
 assert.ok(textOf(await render('newcomer','/初入仙途签到',{code:'ALL_CLAIMED'})).includes('全部7天签到'));
 assert.ok(textOf(await render('newcomer','/初入仙途签到',{code:'NO_CLAIMABLE'})).includes('前6天错过不可补领'));
 assert.ok(textOf(await render('newcomer','/初入仙途签到',{text:'道友入世已久，初入仙途的试炼期已过。'},true)).includes('试炼期已过'));
});
