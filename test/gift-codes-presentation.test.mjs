import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__giftCodesPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {BackendAPIError} from './src/api/bot/client.ts';export {default as oldGame} from './src/response/comeback/oldGameCode/res.ts';export {default as hub} from './src/response/redeemCode/res.ts';export {default as claim} from './src/response/redeemCode/claim/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ resolveDir: process.cwd(), contents: `import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))}; export class BackendAPIError extends Error {} export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__giftCodesPresentation;state.calls++;if(state.transportFailure){throw state.transportFailure;}if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(withBusinessRecovery(op,state.raw));return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false, isPrivate=true) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_match' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGiftCodesSettlementFallbackRemoteProtocolAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GIFT_CODE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));



test('gift hub keeps original shortcuts after admission',async()=>{
 const nodes=await render('hub','/兑换码',{outcome:'menu'});
 for(const command of ['/领取邀请奖励','/领取回归礼包','/凡人修仙礼包码','/领取测试礼包','/我'])assert.ok(commands(nodes).includes(command));
 assert.ok(textOf(nodes).includes('公测预约'));
});
test('missing code keeps original input guide and email navigation',async()=>{
 const nodes=await render('claim','/礼包码',{outcome:'usage'});
 assert.ok(textOf(nodes).includes('真实兑换码'));
 assert.ok(!commands(nodes).includes('/礼包码 ABCD1234'));
 assert.ok(commands(nodes).includes('/兑换码'));
 assert.ok(commands(nodes).includes('/凡人修仙礼包码'));
 assert.ok(commands(nodes).includes('/我的邮件'));
});
test('local, comeback, test and pending-confirm receipts render only authoritative summaries',async()=>{
 for(const {result:row} of receipts.filter(r=>r.op==='gift-codes.redeem'&&r.result.success&&r.result.data.outcome==='result')){
  const nodes=await render('claim','/礼包码 LIVEGIFT',row.data),d=row.data.data;
  assert.ok(textOf(nodes).includes(d.message));
  for(const reward of d.rewardSummary??[])assert.ok(textOf(nodes).includes(reward));
  assert.ok(commands(nodes).includes('/我的邮件'));
  assert.ok(!commands(nodes).includes('/储物袋'));
 }
});
test('refusals keep original wording and add read-only recovery without another request',async()=>{
 for(const {result:row} of receipts.filter(r=>!r.result.success)){
  const reply=row.middleware.replies.at(-1),nodes=await render('claim','/礼包码 LIVEGIFT',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));
  assert.ok(commands(nodes).includes('/我的邮件') || commands(nodes).includes('/兑换码'));
 }
});
test('transport failure ends after one attempt with original generic error',async()=>{
 state.transportError=true;
 try{assert.ok(textOf(await render('claim','/礼包码 LIVEGIFT',{})).includes('礼包码兑换失败，请稍后再试'));}
 finally{state.transportError=false;}
});

test('SDK transport failures retain the original backend message without fallback requests',async()=>{
 state.transportFailure=new handlers.BackendAPIError('接口传输失败','SDK_TIMEOUT');
 try{assert.ok(textOf(await render('claim','/礼包码 LIVEGIFT',{})).includes('接口传输失败'));}
 finally{state.transportFailure=null;}
});


const oldGameOutput = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessOldGameIssueTrustedIdentityReplayAndAdmission$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const oldGameReceipts = [...oldGameOutput.matchAll(/ROBOT_OLD_GAME_ISSUE_RESPONSE=player\|(.+)/g)].map(m => JSON.parse(m[1]).data);
test('old-game private issue preserves returned code and immediate redeem button', async () => {
  const row = oldGameReceipts.find(r => r.success && r.branch === 'business');
  assert.ok(row);
  const nodes = await render('oldGame', '/凡人修仙礼包码', row.data);
  assert.ok(textOf(nodes).includes('你的凡人修仙礼包码：LIVE-CODE'));
  assert.ok(commands(nodes).includes('/礼包码 LIVE-CODE'));
});
test('old-game group issue keeps private reminder without displaying issued code', async () => {
  const nodes = await render('oldGame', '/凡人修仙礼包码', {giftCode:'LIVE-CODE'}, false, false);
  assert.ok(!textOf(nodes).includes('LIVE-CODE'));
  assert.ok(textOf(nodes).includes('为保障您的礼包码不被盗取，请私聊发送指令获取礼包码'));
  assert.ok(!commands(nodes).includes('/礼包码 LIVE-CODE'));
});
test('old-game business refusals show original server wording without redeem button', async () => {
  const rows = oldGameReceipts.filter(r => !r.success);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    const reply = row.middleware.replies.at(-1);
    const nodes = await render('oldGame', '/凡人修仙礼包码', reply, true);
    assert.ok(textOf(nodes).includes(reply.text));
    assert.ok(!commands(nodes).some(c => c.startsWith('/礼包码 ')));
  }
});
test('old-game transport failure preserves original Error message and ends', async () => {
  state.transportError = true;
  try { assert.ok(textOf(await render('oldGame', '/凡人修仙礼包码', {})).includes('网络超时')); }
  finally { state.transportError = false; }
});
