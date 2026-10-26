import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__masterTargetPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as teach} from './src/response/master/teach/res.ts';export {default as bless} from './src/response/master/bless/res.ts';export {default as gift} from './src/response/master/gift/res.ts';export {default as expel} from './src/response/master/expel/res.ts';export {default as apply} from './src/response/master/apply/res.ts';export {default as claim} from './src/response/master/claimTitle/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'master-target-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: 'alemon', namespace: 'framework' }));
    builder.onResolve({ filter: /^file:/ }, args => ({path:args.path,external:true}));
    builder.onLoad({ filter: /.*/, namespace: 'framework' }, () => ({ contents: `export * from '${pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href}'; export const useMention=()=>[{findOne:async()=>({count:0})}];` }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__masterTargetPresentation;state.calls++;if(state.failure){await feedback({text:state.raw.message});return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, 1);
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');

test('master interactions preserve settlement facts and original confirmations', async () => {
  const teach = textOf(await render('teach', '/传功 2', {outcome:'result',targetUid:2,message:'传功',rewardExperience:3,virtueExperience:5,virtueLevel:1}));
  for (const text of ['传功成功。','徒弟 UID：2','基础修为奖励：3','当前师德：5','师德等级：1']) assert.ok(teach.includes(text));
  const bless = textOf(await render('bless', '/赐福 2', {outcome:'result',targetUid:2,message:'赐福',rewardExperience:1,virtueExperience:8,virtueLevel:1}));
  assert.ok(bless.includes('基础修为奖励：1')); assert.ok(bless.includes('当前师德：8'));
  for (const [name,command,message] of [['gift','赐丹','已赠予筑基丹×1'],['expel','逐出师门','已逐出师门']]) {
    assert.ok(textOf(await render(name, `/${command} 2`, {outcome:'result',targetUid:2,message})).includes(message));
  }
});

test('master usage bubbles preserve original instructions after the same API admission', async () => {
  for (const [name,command,expected] of [
    ['teach','传功',['使用方法：传功 <徒弟UID|@目标>']],
    ['bless','赐福',['使用方法：赐福 <徒弟UID|@目标>','消耗：元力丹×1','12小时','1次师门互动']],
    ['gift','赐丹 筑基丹',['使用方法：赐丹 <徒弟UID|@目标> [培元丹|筑基丹]','筑基丹×1','培元丹×2']],
    ['expel','逐出师门',['使用方法：逐出师门 <徒弟UID|@目标>']]
  ]) {
    const text = textOf(await render(name, `/${command}`, {outcome:'usage'}));
    for(const part of expected) assert.ok(text.includes(part),part);
  }
});

test('master apply retains pending inline options on success and false feedback',async()=>{
 for(const failure of [false,true]){
  const nodes=await render('apply','/拜师 2',{outcome:'result',targetUid:2,message:failure?'请等待回应':'已向师父发起拜师申请，等待对方同意'},failure);
  const commands=nodes.filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
  assert.ok(commands.includes('/我的师门'));assert.ok(!commands.includes('/同意拜师'));
 }
 assert.match(textOf(await render('apply','/拜师',{outcome:'usage'})),/使用方法：拜师 <师父UID\|@目标>/);
});

test('master title success and false feedback retain title and both footer links',async()=>{
 for(const failure of [false,true]){
  const nodes=await render('claim','/领取师门称号',failure?{message:'你已持有「桃李满天下」称号。'}:{title:'桃李满天下'},failure);
  assert.ok(textOf(nodes).includes('领取师门称号'));
  assert.ok(textOf(nodes).includes(failure?'你已持有':'称号已发放'));
  const commands=nodes.filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
  assert.ok(commands.includes('/我的师门'));assert.ok(commands.includes('/我的称号'));
 }
});
