import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { parseGuildLeadershipTransfer } from '../src/api/bot/guild-member-lifecycle.ts';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildRoleQueryPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as roles} from './src/response/guild/changeRole/res.ts';export {default as transfer} from './src/response/guild/transferLeader/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildRoleQueryPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildRoleOptionsTransferConfirmationAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_ROLE_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('role options retain self exclusion and exact backend-authorized role buttons',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.role-options'&&r.result.success)){
  const d=row.result.data,nodes=await render('roles','/宗门改职',d),text=textOf(nodes);
  assert.ok(text.includes('【'+d.guildName+'】职位变更'));assert.ok(text.includes('职位：'+d.roles.map(r=>r.name).join('、')));
  for(const m of d.members)for(const role of d.roles)assert.equal(commands(nodes).includes(`/设置身份为 ${role.name} ${m.userId}`),m.userId!==1&&m.appointableRoles.some(r=>r.id===role.id));
  assert.ok(commands(nodes).includes('/宗门成员列表'));assert.ok(commands(nodes).includes('/我的宗门'));
 }
});
test('transfer preserves ranked candidates, confirm seconds, and original successful result',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.leadership-transfer'&&r.result.success)){
  const d=row.result.data,nodes=await render('transfer','/宗主转让 1',d),text=textOf(nodes);
  if(d.outcome==='candidates'){assert.ok(text.includes('近7天活跃度排行'));for(const m of d.candidates){assert.ok(text.includes(`【${m.index}】${m.name}（${m.roleName}）`));assert.ok(commands(nodes).includes('/宗主转让 '+m.index));}}
  else if(d.outcome==='confirmation_required'){assert.ok(text.includes('⚠️ '+d.message));assert.ok(text.includes('确认有效期：60秒'));assert.ok(commands(nodes).includes('/宗主转让 1'));}
  else assert.ok(text.includes('✅ '+d.message));
 }
});
test('role and transfer refusals remain unheaded text without extra requests',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const reply=row.result.middleware.replies.at(-1),nodes=await render(row.op==='guild.role-options'?'roles':'transfer','/宗主转让',reply,true);assert.ok(textOf(nodes).includes(reply.text));
 }
});
test('transport failures send original error and never retry',async()=>{
 state.transportError=true;
 try{for(const name of ['roles','transfer']){const nodes=await render(name,name==='roles'?'/宗门改职':'/宗主转让',{});assert.ok(textOf(nodes).includes('网络超时'));}}
 finally{state.transportError=false;}
});

test('transfer rejects unknown successful outcomes',()=>{assert.throws(()=>parseGuildLeadershipTransfer({outcome:'unknown',message:'bad',guildId:1,guildName:'青云',confirmationRequired:false,candidates:[]}));});
