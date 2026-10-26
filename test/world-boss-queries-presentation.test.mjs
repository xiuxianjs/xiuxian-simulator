import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__worldBossQueriesPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as info} from './src/response/worldBoss/info/res.ts';export {default as ranking} from './src/response/worldBoss/leaderboard/res.ts';export {default as rewards} from './src/response/worldBoss/rewards/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__worldBossQueriesPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessWorldBossQueriesFactsFailuresAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_WORLD_BOSS_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

const names={'world-boss.info':'info','world-boss.ranking':'ranking','world-boss.rewards':'rewards'};
test('info keeps empty instance, closed activity and remaining-attempt button rules',async()=>{
  const rows=receipts.filter(r=>r.op==='world-boss.info'&&r.result.success);
  assert.ok(rows.some(r=>!r.result.data.hasInstance));
  assert.ok(rows.some(r=>!r.result.data.isActive));
  for(const {result:row} of rows){
    const nodes=await render('info','/凶兽',row.data),raw=row.data;
    assert.ok(textOf(nodes).includes(`${raw.config.bossTitle}·${raw.config.bossName}`));
    assert.ok(textOf(nodes).includes(raw.hasInstance?'【今日战况】':'今日凶兽尚未出现'));
    assert.equal(commands(nodes).includes('/挑战凶兽'),raw.isActive&&Number(raw.remainingAttempts)>0);
    assert.equal(commands(nodes).includes('/领取凶兽奖励'),raw.claimableRewardCount>0);
    assert.ok(commands(nodes).includes('/凶兽排行'));
  }
});
test('ranking keeps empty state, podium and actual personal rank',async()=>{
  const rows=receipts.filter(r=>r.op==='world-boss.ranking'&&r.result.success);
  assert.ok(rows.some(r=>r.result.data.ranking.length===0));
  for(const {result:row} of rows){
    const nodes=await render('ranking','/凶兽排行',row.data),raw=row.data;
    assert.ok(textOf(nodes).includes(raw.ranking.length?'道友#999':'暂无挑战记录'));
    assert.ok(textOf(nodes).includes(raw.myRank?`第 ${raw.myRank} 名`:'暂未参与'));
    assert.ok(commands(nodes).includes('/凶兽'));
  }
});
test('rewards retain original tier descriptions, amounts and claim eligibility',async()=>{
  const rows=receipts.filter(r=>r.op==='world-boss.rewards'&&r.result.success);
  for(const {result:row} of rows){
    const nodes=await render('rewards','/凶兽奖励',row.data),raw=row.data;
    assert.ok(textOf(nodes).includes('参与（参与即可）'));
    assert.ok(textOf(nodes).includes('伤害（≥ 100% 基准伤害）'));
    assert.ok(textOf(nodes).includes('灵石 ×10'));
    assert.ok(textOf(nodes).includes('灵晶 ×2'));
    assert.equal(commands(nodes).includes('/领取凶兽奖励'),raw.claimableRewardCount>0);
  }
});
test('business failures keep original feedback without extra game requests',async()=>{
  for(const {op,result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render(names[op],'',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(!commands(nodes).includes('/挑战凶兽'));
  }
});
test('network failures preserve each query original fallback and stop after one attempt',async()=>{
  state.transportError=true;
  try{
    for(const name of Object.values(names)){
      const nodes=await render(name,'',{});
      assert.ok(textOf(nodes).includes(name==='info'?'查询凶兽信息失败，请稍后再试。':'网络超时'));
    }
  }finally{state.transportError=false;}
});
