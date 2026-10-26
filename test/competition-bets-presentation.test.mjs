import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__competitionBetPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as bet} from './src/response/guildCompetition/bet/res.ts';export {default as follow} from './src/response/guildCompetition/followBet/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__competitionBetPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionBetsTransactionsLimitsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_COMPETITION_BET_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

const names = { 'competition.bet': 'bet', 'competition.follow-bet': 'follow' };
test('bet choices retain the original amounts, quote and target buttons', async () => {
  const nodes = await render('bet', '/押注宗门大比 9', {outcome:'choices'});
  assert.ok(textOf(nodes).includes('请选择押注金额（宗门ID：9）'));
  assert.ok(!textOf(nodes).includes('可直接点击下方金额按钮'));
  for (const amount of [1000,5000,10000,50000,100000]) assert.ok(commands(nodes).includes(`/押注宗门大比 9 ${amount}`));
});
test('follow choices retain their original buttons', async () => {
  const nodes = await render('follow', '/追投宗门大比', {outcome:'choices'});
  assert.ok(textOf(nodes).includes('请选择追投金额'));
  for (const amount of [1000,5000,10000,50000,100000]) assert.ok(commands(nodes).includes(`/追投宗门大比 ${amount}`));
});
test('usage keeps the plain original format bubble', async () => {
  for (const name of Object.values(names)) {
    const nodes = await render(name, '', {outcome:'usage'});
    assert.ok(textOf(nodes).includes(name==='bet'?'指令格式：/押注宗门大比 [宗门ID] [灵石数量]':'指令格式：/追投宗门大比 [灵石数量]'));
    assert.ok(!commands(nodes).includes('/查看押注记录'));
  }
});
test('Go success and failure DTOs keep exact messages, repeated hints and navigation', async () => {
  assert.equal(new Set(receipts.map(r=>r.op)).size,2);
  let repeat=false;
  for (const {op,result:row} of receipts) {
    if (row.success && row.data.outcome !== 'result') continue;
    const raw=row.success?row.data:row.middleware.replies.at(-1);
    const nodes=await render(names[op], '',raw,!row.success);
    const message=row.success?row.data.message:raw.text;
    repeat ||= message.includes('\n\n');
    assert.ok(textOf(nodes).includes(message));
    assert.ok(commands(nodes).includes('/查看押注记录'));
    assert.ok(commands(nodes).includes('/宗门大比'));
  }
  assert.ok(repeat);
});
test('network failures stop after one attempt', async () => {
  state.transportError=true;
  try {for(const name of Object.values(names)) assert.ok(textOf(await render(name,'',{})).includes('网络超时'));}
  finally {state.transportError=false;}
});
