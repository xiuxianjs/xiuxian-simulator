import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildApplicationActionsPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as cancel} from './src/response/guild/cancelApplication/res.ts';export {default as approve} from './src/response/guild/approveApplication/res.ts';export {default as reject} from './src/response/guild/rejectApplication/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error {};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildApplicationActionsPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildApplicationActionsTransactionsAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_APPLICATION_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('cancel retains preview, empty instructions, success and failure footer',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.application-cancel')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('cancel','/取消宗门申请 11',raw,!row.result.success),text=textOf(nodes);
  if(row.result.success&&raw.outcome==='list'){
   if(!raw.data.applications.length)assert.ok(text.includes('您当前没有待审核的宗门申请'));
   else{assert.ok(text.includes('待处理的申请'));for(const app of raw.data.applications)assert.ok(text.includes('申请编号：'+app.id));}
  }else if(row.result.success){assert.ok(text.includes('✅ 取消成功'));assert.ok(text.includes(raw.message));assert.ok(commands(nodes).includes('/我的申请'));}
  else{assert.ok(text.includes(raw.text));if(raw.heading){assert.ok(text.includes('取消失败'));assert.ok(text.includes('• 申请不属于您'));assert.ok(commands(nodes).includes('/我的申请'));}}
 }
});
test('approve and reject retain results and give navigation when target is unresolved',async()=>{
 for(const row of receipts.filter(r=>r.op!=='guild.application-cancel'&&r.result.success)){
  const op=row.op==='guild.application-approve'?'approve':'reject',nodes=await render(op,op==='approve'?'/宗门审核同意 2':'/宗门审核拒绝 3',row.result.data);
  if(row.result.data.outcome==='no_target'){
   assert.ok(textOf(nodes).includes('未能确定审核对象'));
   assert.ok(commands(nodes).includes('/宗门审核'));
   assert.ok(!textOf(nodes).includes('审核成功'));
   continue;
  }
  assert.ok(textOf(nodes).includes('✅ 审核成功'));assert.ok(textOf(nodes).includes(row.result.data.message));assert.ok(commands(nodes).includes('/宗门审核'));
  assert.equal(textOf(nodes).includes('玩家已成功加入宗门'),op==='approve');
 }
});
test('committed auto-rejection and transaction errors retain original failure bubbles',async()=>{
 for(const row of receipts.filter(r=>r.op!=='guild.application-cancel'&&!r.result.success)){
  const reply=row.result.middleware.replies.at(-1),op=row.op==='guild.application-approve'?'approve':'reject',nodes=await render(op,op==='approve'?'/宗门审核同意 2':'/宗门审核拒绝 3',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));if(reply.heading){assert.ok(textOf(nodes).includes('❌ 审核失败'));assert.ok(commands(nodes).includes('/宗门审核'));}
 }
});
