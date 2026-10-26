import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__emailQueriesPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as list} from './src/response/email/MyEmailList/res.ts';export {default as detail} from './src/response/email/findEmail/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ resolveDir: process.cwd(), contents: `import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))}; export class BackendAPIError extends Error {} export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__emailQueriesPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(withBusinessRecovery(op,state.raw));return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessEmailQueriesV1ParityReadLifecycleAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_EMAIL_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));



test('email list preserves empty and page-specific action buttons within each quote',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='emails.list'&&r.result.success)){
    const nodes=await render('list','/我的邮件',row.data),d=row.data.data;
    if(!d.list.length){assert.ok(textOf(nodes).includes('暂无邮件'));continue;}
    for(const item of d.list){
      assert.ok(textOf(nodes).includes(`【${item.id}】${item.name}`));
      assert.ok(commands(nodes).includes(`/查看邮件 ${item.id}`));
      assert.equal(commands(nodes).includes(`/领取邮件 ${item.id}`),item.canClaim);
      assert.equal(commands(nodes).includes(`/删除邮件 ${item.id}`),item.canDelete);
    }
    assert.equal(commands(nodes).includes('/一键领取邮件'),d.hasClaimable);
    assert.equal(commands(nodes).includes('/一键删除邮件'),d.hasDeletable);
    assert.ok(!commands(nodes).includes('/查看邮件 3'));
  }
});
test('email detail keeps raw goods, nullable text and read or claimed lifecycle actions',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='emails.detail'&&r.result.success)){
    const d=row.data,nodes=await render('detail',`/查看邮件 ${d.id}`,d);
    assert.ok(textOf(nodes).includes(`邮件ID：${d.id}`));
    assert.ok(textOf(nodes).includes(`副标题：${d.subtitle||'无'}`));
    assert.ok(textOf(nodes).includes(`内容：${d.data||'无'}`));
    assert.equal(commands(nodes).includes(`/领取邮件 ${d.id}`),d.canClaim);
    assert.equal(commands(nodes).includes(`/删除邮件 ${d.id}`),d.canDelete);
    if(d.id===1)assert.ok(textOf(nodes).includes('【道具】药草 ×2'));
    if(d.name===null)assert.ok(textOf(nodes).includes('附件：无'));
  }
});
test('backend refusals retain original empty or not-found wording without another request',async()=>{
  for(const {op,result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render(op==='emails.list'?'list':'detail','/查看邮件 12',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(commands(nodes).includes(op==='emails.list'?'/更多':'/我的邮件'));
  }
});
test('transport failures stay distinct from empty or missing mail and finish after one attempt',async()=>{
  state.transportError=true;
  try{
    assert.ok(textOf(await render('list','/我的邮件',{})).includes('邮件列表查询失败'));
    assert.ok(textOf(await render('detail','/查看邮件 12',{})).includes('邮件详情查询失败'));
  }finally{state.transportError=false;}
});
