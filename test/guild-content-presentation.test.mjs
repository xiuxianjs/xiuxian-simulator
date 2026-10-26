import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildContentPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as notice} from './src/response/guild/viewNotice/res.ts';export {default as intro} from './src/response/guild/viewIntro/res.ts';export {default as essences} from './src/response/guild/viewEssences/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildContentPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildContentPagingRefreshAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_CONTENT_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('guild notice and intro retain null fallback, empty text and return buttons',async()=>{
 for(const name of ['notice','intro'])for(const row of receipts.filter(r=>r.op==='guild.'+name&&r.result.success)){
  const d=row.result.data,nodes=await render(name,name==='notice'?'/宗门公告':'/宗门简介',d);
  assert.ok(textOf(nodes).includes(`【${d.guildName??''}】宗门${name==='notice'?'公告':'简介'}`));
  assert.ok(textOf(nodes).includes(d[name]??(name==='notice'?'暂无公告':'暂无简介')));
  if(d[name]==='')assert.ok(!textOf(nodes).includes('暂无公告'));
  assert.ok(commands(nodes).includes('/我的宗门'));
 }
});
test('guild essence empty and clamped pages preserve creators and original navigation',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.essences'&&r.result.success)){
  const d=row.result.data,nodes=await render('essences','/宗门精华 '+d.page,d);
  assert.ok(textOf(nodes).includes(`【${d.guildName}】宗门精华`));
  if(!d.items.length){assert.ok(textOf(nodes).includes('暂无精华内容'));assert.ok(commands(nodes).includes('/添加精华'));}
  else{
   assert.ok(textOf(nodes).includes(`第 ${d.page}/${d.totalPages} 页，共 ${d.total} 条精华`));
   for(const item of d.items){assert.ok(textOf(nodes).includes(item.content));assert.ok(textOf(nodes).includes('创建者：'+(item.creatorName??'未知')));assert.ok(commands(nodes).includes('/移除精华 '+item.id));}
  }
 }
});
test('guild content failures render final feedback without membership navigation',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const name=row.op.split('.')[1],reply=row.result.middleware.replies.at(-1);
  const nodes=await render(name,name==='essences'?'/宗门精华':name==='notice'?'/宗门公告':'/宗门简介',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.ok(!commands(nodes).includes('/添加精华'));
 }
});
