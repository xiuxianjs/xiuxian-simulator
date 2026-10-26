import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildHistoryPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as logs} from './src/response/guild/viewLogs/res.ts';export {default as apps} from './src/response/guild/myApplications/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildHistoryPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildHistoryScopePagingAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_HISTORY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('guild logs preserve guild title, persisted dates, ordering and paging buttons',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.logs'&&r.result.success)){
  const d=row.result.data,nodes=await render('logs','/宗门日志 99',d),text=textOf(nodes);
  assert.ok(text.includes('【'+d.guildName+'】宗门日志'));
  for(const log of d.logs){assert.ok(text.includes(log.content));assert.ok(text.includes('时间：'+log.formattedTime));}
  if(d.logs.length)assert.ok(text.includes(`第 ${d.page}/${d.totalPages} 页，共 ${d.total} 条日志`));
 }
});
test('own applications preserve membership, empty state and quoted cancel controls',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.my-applications'&&r.result.success)){
  const d=row.result.data,nodes=await render('apps','/我的申请',d),text=textOf(nodes);
  if(d.hasGuild){assert.ok(text.includes(`您已是【${d.guildNameText}】的成员`));assert.ok(commands(nodes).includes('/我的宗门'));}
  else if(!d.applications.length){assert.ok(text.includes('您还没有申请加入任何宗门'));assert.ok(commands(nodes).includes('/宗门列表'));}
  else{assert.ok(text.includes(`共有 ${d.applications.length} 条待审核申请`));for(const app of d.applications){assert.ok(text.includes(`【${app.guildNameText}】 - ${app.statusText}`));assert.ok(text.includes(app.createdDateText));assert.equal(commands(nodes).includes('/取消宗门申请 '+app.id),app.canCancel);}}
 }
});
test('guild log failures retain unheaded original feedback without extra API',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.logs'&&!r.result.success)){
  const reply=row.result.middleware.replies.at(-1),nodes=await render('logs','/宗门日志',reply,true);assert.ok(textOf(nodes).includes(reply.text));
 }
});
