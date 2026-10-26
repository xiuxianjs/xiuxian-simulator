import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__dungeonChallengePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as challenge} from './src/response/dungeon/enter/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error {} export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__dungeonChallengePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonChallengeSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_DUNGEON_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));



test('wins keep personal rewards, first clear, costs and battle buttons',async()=>{
  for(const {result:row} of receipts.filter(r=>r.result.success&&r.result.data.outcome==='result'&&r.result.data.data.won)){
    const d=row.data.data,nodes=await render('challenge','/秘境挑战 试炼',row.data),own=d.rewardsByUser.find(r=>r.userId===1);
    assert.ok(textOf(nodes).includes('秘境挑战成功'));
    if(own.eligible){
      assert.ok(textOf(nodes).includes(`修为 +${own.experienceGained}`));
      assert.equal(textOf(nodes).includes('精力 -20'),own.spiritCostPaid===20);
      assert.equal(textOf(nodes).includes('首通奖励：'),Boolean(own.firstClear?.length));
      assert.ok(textOf(nodes).includes('药草×2'));
    }else{
      assert.ok(textOf(nodes).includes('本次参战无收益（本人精力不足，本次参战无收益）'));
      assert.ok(!textOf(nodes).includes('获得：'));
      assert.ok(commands(nodes).includes('/储物袋 道具 丹药'));
    }
    assert.equal(commands(nodes).includes('/秘境挑战 试炼'), own.eligible);
    assert.ok(commands(nodes).includes(`/查看战斗过程 ${d.logId}`));
    assert.ok(commands(nodes).some(c=>c.includes(encodeURIComponent(d.logId))));
  }
});
test('a battle loss remains a normal settlement bubble without rewards',async()=>{
  const row=receipts.find(r=>r.result.success&&r.result.data.outcome==='result'&&!r.result.data.data.won).result;
  const nodes=await render('challenge','/秘境挑战 试炼',row.data);
  assert.ok(textOf(nodes).includes('秘境挑战失败'));
  assert.ok(textOf(nodes).includes('对方胜利'));
  assert.ok(!textOf(nodes).includes('修为 +'));
  assert.ok(!commands(nodes).includes('/秘境挑战 试炼'));
  assert.ok(commands(nodes).includes('/我的功法'));
  assert.ok(commands(nodes).includes('/我的境界'));
});
test('usage and refusal preserve original text and only execution failures get navigation',async()=>{
  for(const {result:row} of receipts.filter(r=>!r.result.success)){
    const reply=row.middleware.replies.at(-1),nodes=await render('challenge','/秘境挑战 试炼',reply,true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.equal(commands(nodes).includes('/我的队伍'),reply.buttons.length>0);
    assert.equal(commands(nodes).includes('/查看秘境'),reply.buttons.length>0);
  }
});
test('silent unmatched input and transport failures end after one attempt',async()=>{
  await render('challenge','/其他指令',{outcome:'no_match'});
  state.transportError=true;
  try{
    const nodes=await render('challenge','/秘境挑战 试炼',{});
    assert.ok(textOf(nodes).includes('网络超时'));
    assert.ok(commands(nodes).includes('/我的队伍'));
  }finally{state.transportError=false;}
});
