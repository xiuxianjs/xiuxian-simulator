import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildDailyPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as checkin} from './src/response/guild/checkin/res.ts';export {default as daily} from './src/response/guild/daily/res.ts';export {default as weekly} from './src/response/guild/weekly/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildDailyPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildDailyCheckinQueriesAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_DAILY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
const success=op=>receipts.find(r=>r.op===op&&r.result.success).result.data;
test('guild check-in preserves settlement text and no-member eligibility navigation',async()=>{
 const nodes=await render('checkin','/宗门签到',success('guild.checkin'));
 for(const part of ['签到成功','贡献点增加50','声望增加5','宗门日活+5','周活跃度+20','灵石+3000'])assert.ok(textOf(nodes).includes(part),part);
 const failures=receipts.filter(r=>r.op==='guild.checkin'&&!r.result.success);
 for(const row of failures){const reply=row.result.middleware.replies.at(-1);const stopped=await render('checkin','/宗门签到',reply,true);assert.ok(textOf(stopped).includes(reply.text));for(const b of reply.buttons)assert.ok(commands(stopped).includes(b.command));}
 assert.ok(!commands(await render('checkin','/宗门签到',failures[0].result.middleware.replies.at(-1),true)).includes('/创建宗门'));
 assert.ok(commands(await render('checkin','/宗门签到',failures[1].result.middleware.replies.at(-1),true)).includes('/创建宗门'));
});
test('guild daily preserves five tasks, activity rewards and action navigation',async()=>{
 const nodes=await render('daily','/宗门日常',success('guild.daily'));
 for(const part of ['贡献点：50','活跃度：45/45','【活跃度奖励】'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/宗门周常','/一键领取宗门日活奖励','/我的宗门'])assert.ok(commands(nodes).includes(command),command);
 const reply=receipts.find(r=>r.op==='guild.daily'&&!r.result.success).result.middleware.replies.at(-1);
 const refused=await render('daily','/宗门日常',reply,true);for(const command of ['/宗门列表','/我的宗门'])assert.ok(commands(refused).includes(command),command);
});
test('guild weekly preserves authoritative counters, stipend multipliers and milestones',async()=>{
 const nodes=await render('weekly','/宗门周常',success('guild.weekly'));
 for(const part of ['活跃度：40/60','预计俸禄：120灵石','基础100','1.2倍','签到（3/3）','采矿结算（10/10小时）'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/宗门签到','/宗门采矿','/一键领取宗门周活奖励','/领取宗门俸禄'])assert.ok(commands(nodes).includes(command),command);
 const reply=receipts.find(r=>r.op==='guild.weekly'&&!r.result.success).result.middleware.replies.at(-1);
 assert.ok(textOf(await render('weekly','/宗门周常',reply,true)).includes('你还没有加入宗门。'));
});

test('guild query failures retain original title and navigation boundary',async()=>{
 for(const name of ['daily','weekly']){
  const row=receipts.filter(r=>r.op==='guild.'+name&&!r.result.success).at(-1);
  const reply=row.result.middleware.replies.at(-1);
  const nodes=await render(name,name==='daily'?'/宗门日常':'/宗门周常',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));assert.ok(!commands(nodes).includes('/宗门列表'));
 }
});
