import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__demonTowerChallengePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as challenge} from './src/response/demonTower/challenge/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__demonTowerChallengePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDemonTowerChallengeSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_DEMON_TOWER_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));


test('usage preserves original star instructions',async()=>{
  const nodes=await render('challenge','/妖塔挑战',{outcome:'usage'});
  assert.ok(textOf(nodes).includes('请指定挑战星级：妖塔挑战 1/2/3'));
});
test('real wins keep original progression, rewards, buff choices and battle memory links',async()=>{
  const rows=receipts.filter(r=>r.result.success&&r.result.data.outcome==='result'&&r.result.data.data.success);
  assert.ok(rows.some(r=>r.result.data.data.allCleared));
  assert.ok(rows.some(r=>r.result.data.data.needSelectBuff));
  for(const {result:row} of rows){
    const d=row.data.data,nodes=await render('challenge','/妖塔挑战 3',row.data);
    assert.ok(textOf(nodes).includes(`获得 ${d.starsEarned}🌟`));
    assert.ok(textOf(nodes).includes(`本关积分：+${d.scoreEarned}`));
    assert.ok(textOf(nodes).includes(`总积分：${d.totalTowerScore}`));
    if(d.spiritStoneEarned>0){assert.ok(textOf(nodes).includes(`通层奖励：+${d.spiritStoneEarned} 灵石`));}
    if(d.allCleared){assert.ok(textOf(nodes).includes('恭喜！全塔通关！'));}
    assert.ok(commands(nodes).includes('/妖塔'));
    assert.equal(commands(nodes).includes('/妖塔挑战 1'),!d.needSelectBuff);
    for(const buff of d.availableBuffs){assert.ok(commands(nodes).includes(`/妖塔选buff ${buff.cnKey} 1`));}
    assert.ok(commands(nodes).includes(`/查看战斗过程 ${d.logId}`));
    assert.ok(commands(nodes).includes(`https://tatian-online.alemonjs.com/components/battle-memory/${d.logId}`));
  }
});
test('a settled loss remains a normal battle bubble without another challenge button',async()=>{
  const row=receipts.find(r=>r.result.success&&r.result.data.data?.success===false).result;
  const nodes=await render('challenge','/妖塔挑战 3',row.data);
  assert.ok(textOf(nodes).includes('战斗落败，今日闯塔结束'));
  assert.ok(!commands(nodes).includes('/妖塔挑战 1'));
  assert.ok(commands(nodes).includes(`/查看战斗过程 ${row.data.data.logId}`));
});
test('refusals preserve invalid-star, qualification, repeat and safe internal-error feedback',async()=>{
  for(const {result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render('challenge',reply.text.startsWith('星级只能')?'/妖塔挑战 0':'/妖塔挑战 3',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(!commands(nodes).some(c=>c.startsWith('/查看战斗过程 ')));
    assert.ok(!commands(nodes).includes('/妖塔挑战 1'));
  }
});
test('network failure ends after one attempt with original failure layout',async()=>{
  state.transportError=true;
  try{assert.ok(textOf(await render('challenge','/妖塔挑战 3',{})).includes('网络超时'));}
  finally{state.transportError=false;}
});
