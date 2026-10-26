import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildClaimsPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as single} from './src/response/guild/claimMilestone/res.ts';export {default as all} from './src/response/guild/claimAllMilestones/res.ts';export {default as stipend} from './src/response/guild/stipend/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildClaimsPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildClaimsSettlementPartialAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_CLAIMS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('guild claims render original receipts, usage and partial settlement',async()=>{
 for(const row of receipts.filter(r=>r.result.success)){
  const name=row.op==='guild.stipend-claim'?'stipend':row.op==='guild.milestone-claim-all'?'all':'single';
  const text=name==='stipend'?'/领取宗门俸禄':name==='all'?'/一键领取宗门日活奖励':row.result.data.outcome==='usage'?'/领取宗门日活奖励':'/领取宗门日活奖励 '+row.result.data.receipt.milestoneId;
  const nodes=await render(name,text,row.result.data);
  assert.ok(textOf(nodes).includes(row.result.data.message??'请指定奖励ID，例如：领取宗门日活奖励 1'));
  if(name==='all')assert.ok(commands(nodes).includes('/宗门日常'));
  if(name==='all'&&row.result.data.partial){
   assert.ok(textOf(nodes).includes('已列出的奖励已经领取'));
   assert.ok(textOf(nodes).includes('不自动重新领取整批奖励'));
  }
  if(name==='single'&&row.result.data.outcome==='usage')assert.ok(commands(nodes).includes('/宗门日常'));
 }
 assert.ok(receipts.some(r=>r.result.success&&r.result.data.partial===true));
});
test('guild claim failures preserve default and daily/weekly return navigation',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const name=row.op==='guild.stipend-claim'?'stipend':row.op==='guild.milestone-claim-all'?'all':'single';
  const reply=row.result.middleware.replies.at(-1);
  for(const kind of ['日','周']){
   const text=name==='stipend'?'/领取宗门俸禄':name==='all'?`/领取全部宗门${kind}活奖励`:`/领取宗门${kind}活奖励 1`;
   const nodes=await render(name,text,reply,true);assert.ok(textOf(nodes).includes(reply.text));
   if(name==='all')assert.ok(commands(nodes).includes(kind==='日'?'/宗门日常':'/宗门周常'));
  }
 }
});
