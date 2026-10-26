import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildStorylineChallengePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as challenge} from './src/response/guild/storyline/challengeRes.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildStorylineChallengePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildStorylineChallengeSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GUILD_STORYLINE_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => JSON.parse(m[2]).data);

test('challenge preserves original clearing and non-clearing settlement bubbles', async () => {
  const success = receipts.filter(r => r.success);
  assert.ok(success.some(r => r.data.reward.stageCleared));
  assert.ok(success.some(r => !r.data.reward.stageCleared));
  for (const row of success) {
    const nodes = await render('challenge', '/宗门主线挑战', row.data), text = textOf(nodes), r = row.data.reward;
    for (const value of [`宗门主线第${row.data.stageIndex}关结算`, `本次伤害：${r.damageDealt}`, `血量变化：${r.bossHpBefore} -> ${r.stageCleared ? 0 : r.bossHpAfter}`, r.stageCleared ? '本关已攻破' : '本关尚未攻破']) assert.ok(text.includes(value), value);
    assert.deepEqual(commands(nodes), [
      ...(!r.stageCleared?[r.damageDealt>0?'/宗门主线':'/我的功法']:[]),
      '/宗门主线', '/宗门主线记录', '/宗门日常', '/我', '/属性面板', '/查看主线', '/我的活动', '/商店'
    ]);
    if(!r.stageCleared){
      assert.ok(commands(nodes).includes(r.damageDealt>0?'/宗门主线':'/我的功法'));
      assert.ok(text.includes(r.damageDealt>0?'伤害已计入当前关卡':'本次未造成有效伤害'));
    }
  }
});
test('challenge preserves every exact error including backend repeat suffix without a second request', async () => {
  const failures = receipts.filter(r => !r.success);
  assert.ok(failures.some(r => r.middleware.replies.at(-1).text.includes('\n\n')));
  for (const row of failures) {
    const reply = row.middleware.replies.at(-1), text = textOf(await render('challenge', '/宗门主线挑战', reply, true));
    assert.ok(text.includes(reply.text)); assert.ok(!text.includes('本次伤害：'));
  }
});
test('challenge network failure stops after one game request', async () => {
  state.transportError = true;
  try { assert.ok(textOf(await render('challenge', '/宗门主线挑战', {})).includes('网络超时')); }
  finally { state.transportError = false; }
});
