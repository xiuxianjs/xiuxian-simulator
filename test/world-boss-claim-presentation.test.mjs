import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__worldBossClaimPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as claim} from './src/response/worldBoss/claim/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__worldBossClaimPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessWorldBossClaimPartialSettlementAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_WORLD_BOSS_CLAIM_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

test('partial and complete claims retain original item details, totals and navigation',async()=>{
  const rows=receipts.filter(r=>r.result.success);
  assert.ok(rows.some(r=>r.result.data.items.length>1));
  assert.ok(rows.some(r=>r.result.data.items.length===1));
  for(const {result:row} of rows){
    const raw=row.data,nodes=await render('claim','/领取凶兽奖励',raw),text=textOf(nodes);
    assert.ok(text.includes('✅ 凶兽奖励领取成功'));
    for(const item of raw.items){
      assert.ok(text.includes(`${item.bossDate} · ${item.stageName} · ${item.tierName}`));
      if(item.spiritStone>0)assert.ok(text.includes(`灵石 ×${item.spiritStone}`));
      if(item.spiritCrystal>0)assert.ok(text.includes(`灵晶 ×${item.spiritCrystal}`));
    }
    assert.equal(text.includes('【合计】'),raw.items.length>1);
    assert.ok(commands(nodes).includes('/凶兽'));
  }
});
test('active, empty and fatal partial settlement failures keep original plain messages',async()=>{
  const rows=receipts.filter(r=>!r.result.success);
  assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('historical config unavailable')));
  for(const {result:row} of rows){
    const reply=row.middleware.replies.at(-1),nodes=await render('claim','',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(!textOf(nodes).includes('✅ 凶兽奖励领取成功'));
    assert.ok(!commands(nodes).includes('/凶兽'));
  }
});
test('network failure stops after one request and preserves original feedback',async()=>{
  state.transportError=true;
  try{assert.ok(textOf(await render('claim','',{})).includes('网络超时'));}
  finally{state.transportError=false;}
});
