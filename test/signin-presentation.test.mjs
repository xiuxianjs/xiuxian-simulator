import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__signinPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as daily} from './src/response/signIn/daily/res.ts';export {default as newcomer} from './src/response/signIn/newcomer/res.ts';export {default as celestial} from './src/response/signIn/celestial/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__signinPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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
const quotes = nodes => nodes.flatMap(n => [...(n.type === 'MD.blockquote' ? [n] : []), ...(Array.isArray(n.value) ? quotes(n.value) : [])]);
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);


test('daily and newcomer preserve counts, rewards, ritual placement and navigation',async()=>{
 for(const name of ['daily','newcomer']){
  const nodes=await render(name,'/'+(name==='daily'?'日常签到':'新人签到'),{accumulatedDays:1,issued:[{type:'currency',name:'SPIRIT_STONE',amount:3}],expireDate:'2026-11-07',ritualText:'原寄语',repeatSuffix:'原重复提醒'});
  for(const part of ['签到成功','灵石 ×3','原寄语','原重复提醒'])assert.ok(textOf(nodes).includes(part),part);
  for(const command of ['/日常签到','/新人签到','/登仙台签到','/宗门签到'])assert.ok(commands(nodes).includes(command),command);
  if(name==='newcomer')assert.ok(quotes(state.sent[0]).some(n=>textOf(flatten(n.value)).includes('原寄语')));
  const stopped=await render(name,'/新人签到',{text:'新人签到失败，请稍后再试。',quote:name==='newcomer'?'失败寄语':undefined},true);
  assert.ok(textOf(stopped).includes('签到失败'));if(name==='newcomer')assert.ok(textOf(stopped).includes('失败寄语'));
 }
 assert.ok(textOf(await render('daily','/日常签到',{accumulatedDays:1,issued:[],ritualText:'',repeatSuffix:''})).includes('今日暂无配置奖励'));
});
test('celestial preserves slot rewards, resource values and same-response failure ritual',async()=>{
 const nodes=await render('celestial','/登仙台签到',{signedSlots:['午时','晚间'],issued:[{type:'currency',name:'SPIRIT_STONE',amount:11},{type:'mental',name:'精力',amount:7}],ritualText:'登台寄语',repeatSuffix:''});
 for(const part of ['午时、晚间','灵石 ×11','精力 ×7','登台寄语'])assert.ok(textOf(nodes).includes(part),part);
 assert.ok(commands(nodes).includes('/登仙台签到'));
 assert.ok(textOf(await render('celestial','/登仙台签到',{text:'今日已签到\n原寄语'},true)).includes('原寄语'));
});
