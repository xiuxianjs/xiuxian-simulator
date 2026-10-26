import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildActivityPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as worship} from './src/response/guild/worship/res.ts';export {default as mining} from './src/response/guild/mining/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildActivityPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildActivitySettlementGuideAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_ACTIVITY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('worship guide preserves offer quote blocks, eligibility and navigation',async()=>{
 const guides=receipts.filter(r=>r.op==='guild.worship'&&r.result.success&&r.result.data.code==='GUIDE');
 assert.equal(guides.length,2);
 for(const row of guides){
  const data=row.result.data.data,nodes=await render('worship','/祭祀祖师',row.result.data);
  assert.ok(textOf(nodes).includes(data.introText));assert.ok(textOf(nodes).includes(data.noticeText));
  for(const offer of data.offers){assert.ok(textOf(nodes).includes(offer.line));assert.equal(commands(nodes).includes('/祭祀祖师 '+offer.name),offer.canWorship);}
  assert.equal(commands(nodes).includes('/我的宗门'),!data.canWorship);
 }
});
test('worship settlement renders original cost, actual daily gain and contribution',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.worship'&&r.result.success&&r.result.data.code==='OK')){
  const d=row.result.data.data,nodes=await render('worship','/祭祀祖师 '+d.offer,row.result.data);
  for(const part of [d.message,d.offerText,d.dailyActivityText,d.contributionText])assert.ok(textOf(nodes).includes(part),part);
  for(const command of ['/宗门日常','/宗门主线','/我的宗门'])assert.ok(commands(nodes).includes(command));
 }
});
test('mining renders original start, progress, resource-cap and six-hour receipts',async()=>{
 const rows=receipts.filter(r=>r.op==='guild.mining'&&r.result.success);
 assert.equal(rows.length,5);
 for(const row of rows){
  const nodes=await render('mining','/宗门采矿',row.result.data);assert.ok(textOf(nodes).includes(row.result.data.message));
  if(row.result.data.receipt.outcome==='in_progress'){
   assert.ok(textOf(nodes).includes('重复请求不会加快产出'));
   assert.ok(commands(nodes).includes('/宗门日常'));
  }
 }
 assert.ok(rows.some(r=>r.result.data.receipt.spiritStoneBonus===6 && r.result.data.message.includes('额外入池6灵石')));
 assert.ok(rows.some(r=>r.result.data.receipt.settledHours===6));assert.ok(rows.some(r=>r.result.data.receipt.spiritStoneAdded===5));
});
test('worship and mining refusal preserves original failure navigation',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const name=row.op==='guild.worship'?'worship':'mining',reply=row.result.middleware.replies.at(-1);
  const nodes=await render(name,name==='worship'?'/祭祀祖师':'/宗门采矿',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));for(const b of reply.buttons)assert.ok(commands(nodes).includes(b.command));
  if(name==='worship'&&reply.buttons.length===1)assert.ok(!commands(nodes).includes('/宗门主线'));
 }
});
