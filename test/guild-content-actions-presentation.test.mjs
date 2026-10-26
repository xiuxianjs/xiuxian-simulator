import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildContentActionPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as intro} from './src/response/guild/setIntro/res.ts';export {default as notice} from './src/response/guild/setNotice/res.ts';export {default as add} from './src/response/guild/addEssence/res.ts';export {default as remove} from './src/response/guild/removeEssence/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildContentActionPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildContentActionsPermissionsWritesAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_CONTENT_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
const entry=op=>({'guild.intro-set':['intro','设置宗门简介'],'guild.notice-set':['notice','设置宗门公告'],'guild.essence-add':['add','添加精华'],'guild.essence-remove':['remove','移除精华']})[op];
test('guild write usage retains original three lines, lengths and permission descriptions',async()=>{
 for(const row of receipts.filter(r=>r.result.success&&r.result.data.outcome==='usage')){
  const [name,command]=entry(row.op),nodes=await render(name,'/'+command,row.result.data);
  assert.ok(textOf(nodes).includes('使用方法：'+command));
  assert.ok(textOf(nodes).includes(name==='intro'?'简介内容不能超过30字':name==='notice'?'公告内容不能超过50字':name==='add'?'精华内容不能超过50字':'ID可通过"宗门精华"指令查看'));
  assert.ok(textOf(nodes).includes(name==='intro'||name==='notice'?'权限：副宗主及以上职位':'权限：长老及以上职位'));
 }
});
test('guild writes render only the original success message and repeat suffix',async()=>{
 for(const row of receipts.filter(r=>r.result.success&&r.result.data.outcome==='result')){
  const [name,command]=entry(row.op),nodes=await render(name,'/'+command+(name==='remove'?' 3':' 新内容'),row.result.data);
  assert.ok(textOf(nodes).includes(row.result.data.message));assert.ok(!commands(nodes).includes('/添加精华'));
 }
});
test('guild write refusals preserve original domain messages and repeat feedback',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const [name,command]=entry(row.op),reply=row.result.middleware.replies.at(-1);
  const nodes=await render(name,'/'+command+(name==='remove'?' 3':' 新内容'),reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.ok(!commands(nodes).includes('/移除精华 3'));
 }
});
