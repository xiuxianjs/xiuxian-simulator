import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildAutoRefreshPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as refresh} from './src/response/guild/autoRefreshShop/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildAutoRefreshPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildAutoRefreshStatesCASAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_AUTO_REFRESH_RESPONSE=([^|]+)\|(.+)/g)].map(m=>JSON.parse(m[2]).data);
test('auto-refresh view preserves status, vice-leader choices and parameter help',async()=>{
 for(const row of receipts.filter(r=>r.success&&r.data.outcome==='view')){
  const d=row.data.data,nodes=await render('refresh','/宗门商店自动刷新',row.data);
  assert.ok(textOf(nodes).includes(d.enabled?'当前状态：已开启':'当前状态：未开启'));assert.ok(textOf(nodes).includes('1-3个整点(0-23)'));
  const leader=d.isLeader||d.isViceLeader;
  assert.equal(commands(nodes).includes('/宗门商店自动刷新 '+(d.enabled?'关闭':'开启')),leader);
  if(!leader)assert.ok(!commands(nodes).includes('/宗门商店自动刷新 8 12 20'));
 }
});
test('auto-refresh writes preserve success status and settings button',async()=>{
 for(const row of receipts.filter(r=>r.success&&r.data.outcome==='set')){
  const nodes=await render('refresh','/宗门商店自动刷新 开启',row.data);
  assert.ok(textOf(nodes).includes('商店自动刷新设置成功：'));assert.ok(commands(nodes).includes('/宗门商店自动刷新'));
  if(row.data.data.enabled)for(const hour of row.data.data.hours)assert.ok(textOf(nodes).includes(hour+':00'));
  else assert.ok(textOf(nodes).includes('已关闭'));
 }
});
test('auto-refresh failures preserve same-request leadership shortcuts',async()=>{
 for(const row of receipts.filter(r=>!r.success)){
  const reply=row.middleware.replies.at(-1),nodes=await render('refresh','/宗门商店自动刷新 开启',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.equal(textOf(nodes).includes('快捷设置：'),reply.buttons.length>0);
  for(const b of reply.buttons)assert.ok(commands(nodes).includes(b.command));
 }
});
