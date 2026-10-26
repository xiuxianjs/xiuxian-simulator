import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__worldBossChallengePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as challenge} from './src/response/worldBoss/challenge/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__worldBossChallengePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessWorldBossChallengeAttemptsPartialAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_WORLD_BOSS_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

test('invalid mode keeps original usage bubble',async()=>{
  const nodes=await render('challenge','/挑战凶兽 错误',{outcome:'usage'});
  assert.ok(textOf(nodes).includes('用法：/挑战凶兽 或 /挑战凶兽 全部'));
  assert.ok(!commands(nodes).includes('/凶兽'));
});
test('single round retains summary, remaining attempts and battle links',async()=>{
  const rows=receipts.filter(r=>r.result.success&&r.result.data.mode==='single');
  assert.ok(rows.length>0);
  for(const {result:row} of rows){
    const raw=row.data.data,nodes=await render('challenge','/挑战凶兽',row.data),text=textOf(nodes);
    assert.ok(text.includes('本次伤害：'));
    assert.ok(text.includes(`攻击次数：${raw.attackCount}`));
    assert.ok(text.includes('战斗类型：1v1'));
    assert.ok(commands(nodes).includes(`/查看战斗过程 ${raw.logId}`));
    assert.ok(commands(nodes).includes(`https://tatian-online.alemonjs.com/components/battle-memory/${raw.logId}`));
    assert.equal(commands(nodes).includes('/挑战凶兽 全部'),raw.remainingAttempts>0);
  }
});
test('partial and completed batches keep per-round lines, stopped hint and record buttons',async()=>{
  const rows=receipts.filter(r=>r.result.success&&r.result.data.mode==='all');
  assert.ok(rows.some(r=>r.result.data.data.stopReason));
  assert.ok(rows.some(r=>r.result.data.data.remainingAttempts===0));
  for(const {result:row} of rows){
    const raw=row.data.data,nodes=await render('challenge','/挑战凶兽 全部',row.data),text=textOf(nodes);
    assert.ok(text.includes(`本次连续挑战：${raw.attemptsUsed} 次`));
    assert.ok(text.includes(`剩余次数：${raw.remainingAttempts}`));
    assert.equal(text.includes('后续挑战已停止'),Boolean(raw.stopReason));
    for(const round of raw.rounds.slice(0,3))assert.ok(commands(nodes).includes(`/查看战斗过程 ${round.logId}`));
    assert.equal(commands(nodes).includes('/挑战凶兽 全部'),raw.remainingAttempts>0);
  }
});
test('business failures retain original plain feedback and repeated hint',async()=>{
  let repeated=false;
  for(const {result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render('challenge','',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(!commands(nodes).includes('/凶兽'));
    repeated ||= reply.text.includes('\n\n');
  }
  assert.ok(repeated);
});
test('transport failure stops after one attempt',async()=>{
  state.transportError=true;
  try{assert.ok(textOf(await render('challenge','',{})).includes('网络超时'));}
  finally{state.transportError=false;}
});
