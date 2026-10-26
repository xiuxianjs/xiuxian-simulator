import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildStorylinePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as home} from './src/response/guild/storyline/res.ts';export {default as records} from './src/response/guild/storyline/recordsRes.ts';export {default as claim} from './src/response/guild/storyline/claimRes.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildStorylinePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildStorylineHomeRecordsClaimsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GUILD_STORYLINE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

test('storyline home retains all fields and conditional challenge/claim navigation', async () => {
  for (const { result: row } of receipts.filter(r => r.op === 'guild.storyline-home' && r.result.success)) {
    const nodes = await render('home', '/宗门主线', row.data), text = textOf(nodes), buttons = commands(nodes), h = row.data.home;
    assert.ok(text.includes('宗门主线'));
    for (const value of [`${h.guildName} · ${h.guildLevel}级`, `血量：${h.bossRemainingHp}/${h.bossMaxHp}`, h.retryBuffText, `个人次数：${h.personalAttemptsUsed}/${h.personalAttemptsLimit}`, `今日个人伤害：${h.personalDamage}`, `参与点：${h.personalParticipation}（不可兑换）· 有效挑战 ${h.personalEffectiveChallenges}`]) assert.ok(text.includes(value), value);
    assert.equal(text.includes('今日四关已全通'), h.allCleared);
    assert.equal(buttons.includes('/宗门主线挑战'), h.canChallenge);
    assert.equal(buttons.includes('/领取宗门主线奖励'), h.hasClaimableStages);
    if (h.hasClaimableStages) assert.ok(text.includes(`可领取关卡：${h.claimableStagesText}`));
    assert.ok(buttons.includes('/宗门主线记录'));
    for (const stage of row.data.claimableStages) assert.ok(buttons.includes(`/领取宗门主线奖励 ${stage}`));
  }
});
test('storyline records retain empty text, order and every original record field', async () => {
  for (const { result: row } of receipts.filter(r => r.op === 'guild.storyline-records' && r.result.success)) {
    const nodes = await render('records', '/宗门主线记录', row.data), text = textOf(nodes);
    assert.ok(text.includes('【宗门主线记录】'));
    if (!row.data.records.length) assert.ok(text.includes('今日还没有挑战记录'));
    let previous = -1;
    for (const r of row.data.records) {
      const value = `第${r.attemptNo}次 · 第${r.stageIndex}关 · 伤害${r.damageDealt} · 参与点${r.participationPoint} · ${r.isEffective ? '有效' : '无效'} · ${r.battleResult ? '胜' : '负'}`;
      const index = text.indexOf(value); assert.ok(index > previous, value); previous = index;
    }
  }
});
test('claim receipt and all three failure presentations retain exact original text', async () => {
  for (const { op, result: row } of receipts) {
    const name = op.split('-').at(-1);
    if (row.success && name === 'claim') {
      const nodes = await render(name, '/领取宗门主线奖励', row.data);
      if(row.data.partial){
        assert.ok(textOf(nodes).includes(`已领取第${row.data.claimedStages.join('、')}关奖励，获得灵晶${row.data.spiritCrystal}`));
        assert.ok(textOf(nodes).includes(`第${row.data.failedStage}关领取中断：${row.data.failureReason}`));
        assert.ok(commands(nodes).includes('/宗门主线'));
      }else assert.ok(textOf(nodes).includes(`奖励领取成功，获得灵晶${row.data.spiritCrystal}`));
    } else if (!row.success) {
      const reply = row.middleware.replies.at(-1), nodes = await render(name, '/宗门主线', reply, true);
      assert.ok(textOf(nodes).includes(reply.text));
      assert.ok(!textOf(nodes).includes('奖励领取成功'));
    }
  }
});
test('storyline transport failure stops after a single attempt for every entry', async () => {
  state.transportError = true;
  try {
    for (const name of ['home', 'records', 'claim']) {
      assert.ok(textOf(await render(name, '/宗门主线', {})).includes('网络超时'));
    }
  } finally { state.transportError = false; }
});
