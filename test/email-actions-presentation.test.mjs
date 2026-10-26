import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__emailActionsPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as remove} from './src/response/email/deleteEmail/res.ts';export {default as removeAll} from './src/response/email/deleteAllEmail/res.ts';export {default as claim} from './src/response/email/receiveEmail/res.ts';export {default as claimAll} from './src/response/email/receiveAllEmail/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ resolveDir: process.cwd(), contents: `import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))}; export class BackendAPIError extends Error {} export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__emailActionsPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(withBusinessRecovery(op,state.raw));return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessEmailActionsSettlementConfirmationPartialAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_EMAIL_ACTION_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));



test('delete confirmation retains the original raw command and 60-second window',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='emails.delete'&&r.result.success)){
    const d=row.data,nodes=await render('remove',`/删除邮件 ${d.emailId}`,d);
    if(d.confirmationRequired){
      assert.ok(textOf(nodes).includes(`删除邮件 ${d.emailId} · 60秒内有效`));
      assert.ok(commands(nodes).includes(`/删除邮件 ${d.emailId}`));
    }else assert.ok(textOf(nodes).includes('删除完成'));
  }
});
test('single claims keep the backpack and return buttons after authoritative settlement',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='emails.claim'&&r.result.success)){
    const nodes=await render('claim',`/领取邮件 ${row.data.emailId}`,row.data);
    assert.ok(textOf(nodes).includes('领取成功！物品已添加到背包'));
    assert.ok(commands(nodes).includes('/储物袋'));
    assert.ok(commands(nodes).includes('/我的邮件'));
  }
});
test('batch claims show actual success and per-mail failures',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='emails.claim-all'&&r.result.success)){
    const nodes=await render('claimAll','/一键领取邮件',row.data);
    assert.ok(textOf(nodes).includes(`成功领取 ${row.data.claimed} 封邮件的附件！`));
    assert.equal(textOf(nodes).includes('封未领取成功，请先核对邮件状态'),row.data.skipped>0);
    assert.ok(commands(nodes).includes('/储物袋'));
  }
});
test('batch deletion renders actual count without claiming attachments',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='emails.delete-all'&&r.result.success)){
    const nodes=await render('removeAll','/一键删除邮件',row.data);
    assert.ok(textOf(nodes).includes(`成功删除 ${row.data.deleted} 封邮件！`));
    assert.ok(commands(nodes).includes('/我的邮件'));
  }
});
const handlersByOp={'emails.delete':'remove','emails.claim':'claim','emails.delete-all':'removeAll','emails.claim-all':'claimAll'};
test('refusals retain repeat text, invalid-id navigation and batch deletion advice',async()=>{
  for(const {op,result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render(handlersByOp[op],'/领取邮件 1',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    if(op==='emails.delete-all' && reply.text.includes('暂无可删除'))assert.ok(textOf(nodes).includes('已领取邮件或已读且无附件'));
    if(op==='emails.delete-all' && reply.text.includes('操作失败'))assert.ok(textOf(nodes).includes('不自动重发确认'));
    assert.ok(commands(nodes).includes('/我的邮件'));
    assert.ok(!commands(nodes).some(command => /^\/(领取邮件|删除邮件)\s/.test(command)));
    assert.ok(!commands(nodes).includes('/储物袋'));
  }
});
test('transport errors stop after one attempt and recommend checking the unknown result',async()=>{
  state.transportError=true;
  try{for(const [name,text] of [['remove','/删除邮件 1'],['claim','/领取邮件 1'],['removeAll','/一键删除邮件'],['claimAll','/一键领取邮件']]){
    const nodes=await render(name,text,{});
    assert.ok(textOf(nodes).includes(name==='claim'||name==='claimAll'?'领取结果未获完整确认':'删除结果未获完整确认'));
    assert.ok(commands(nodes).includes('/我的邮件'));
  }}finally{state.transportError=false;}
});
