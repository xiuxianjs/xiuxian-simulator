import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildRosterPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as members} from './src/response/guild/memberList/res.ts';export {default as review} from './src/response/guild/reviewApplications/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildRosterPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildRosterAuthorityProjectionAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_ROSTER_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('member list preserves titles, deputy, leave dates, activity and self controls',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.members'&&r.result.success)){
  const d=row.result.data,nodes=await render('members','/宗门成员列表',d),text=textOf(nodes);
  assert.ok(text.includes('【'+d.guildName+'】成员列表'));
  for(const m of d.members){assert.ok(text.includes(`ID:${m.userId}  日活:${m.dailyActivity}  周活:${m.weeklyActivity}`));assert.equal(commands(nodes).includes('/查看信息 '+m.userId),m.userId!==1);if(m.isDeputy)assert.ok(text.includes('【代理宗主】'));if(m.isOnLeave)assert.ok(text.includes('请假至'));}
  assert.ok(commands(nodes).includes('/我的宗门'));assert.ok(commands(nodes).includes('/飞信 宗门'));
 }
});
test('review list preserves empty state, unknown names and applicant buttons inside quotes',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.review-applications'&&r.result.success)){
  const d=row.result.data,nodes=await render('review','/宗门审核',d),text=textOf(nodes);
  assert.ok(text.includes('📋 宗门审核'));assert.ok(text.includes('【'+(d.guildName??'')+'】'));
  if(!d.total)assert.ok(text.includes('暂无待审核的申请'));
  else for(const a of d.applications){assert.ok(text.includes(`【${a.userId}】【${a.realmName??'未知'}】${a.userName??'未知'}`));assert.ok(commands(nodes).includes('/宗门审核同意 '+a.userId));assert.ok(commands(nodes).includes('/宗门审核拒绝 '+a.userId));}
 }
});
test('roster failure bubbles preserve bold headings, role text and no-guild footer',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const reply=row.result.middleware.replies.at(-1),nodes=await render(row.op==='guild.members'?'members':'review',row.op==='guild.members'?'/宗门成员列表':'/宗门审核',reply,true);
  assert.ok(textOf(nodes).includes(reply.text));if(reply.heading)assert.ok(textOf(nodes).includes(reply.heading));for(const b of reply.buttons)assert.ok(commands(nodes).includes(b.command));
 }
});
