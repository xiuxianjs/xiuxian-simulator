import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__eventCheckinPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as checkin} from './src/response/limitedEvent/checkin/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__eventCheckinPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


test('event check-in retains successful rewards and original activity navigation',async()=>{
 const nodes=await render('checkin','/活动签到',{results:[{eventTitle:'试炼',subTitle:'当前阶段',dayIndex:2,issued:[{type:'free_token',name:'仙缘',amount:3},{type:'paid_token',name:'仙玉',amount:2}]}]});
 for(const part of ['✅ 活动签到成功！','试炼 - 当前阶段（第2天）','仙缘×3','仙玉×2'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/活动签到','/限时活动 商店'])assert.ok(commands(nodes).includes(command),command);
});
test('false event feedback retains each day quote, signed markers and header/footer',async()=>{
 const nodes=await render('checkin','/活动签到',{text:'今日所有活动已签到完成',blocks:[{text:'',quoted:false},{text:'',quoted:false},{text:'📅 试炼 - 当前阶段',quoted:false},{text:'✅ 第2天：仙缘奖励',quoted:true},{text:'⬜ 第3天：明日奖励',quoted:true},{text:'',quoted:false}]},true);
 for(const part of ['今日所有活动已签到完成','📅 试炼 - 当前阶段','✅ 第2天：仙缘奖励','⬜ 第3天：明日奖励'])assert.ok(textOf(nodes).includes(part),part);
 assert.ok(commands(nodes).includes('/活动签到'));assert.ok(commands(nodes).includes('/限时活动 商店'));
 const quoted=payload=>payload.flatMap(n=>[...(n.type==='MD.blockquote'?[n]:[]),...(Array.isArray(n.value)?quoted(n.value):[])]);
 for(const part of ['✅ 第2天：仙缘奖励','⬜ 第3天：明日奖励'])assert.ok(quoted(state.sent[0]).some(n=>n.value.length===1&&n.value[0].value===part),part);
 const failed=await render('checkin','/活动签到',{text:'活动状态读取失败'},true);assert.ok(textOf(failed).includes('活动状态读取失败'));assert.ok(commands(failed).includes('/限时活动 商店'));
});
