import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildRoleActionPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state, { mentions: [] });
const bundle = await build({
  stdin: { contents: `export {default as appoint} from './src/response/guild/appointRole/res.ts';export {default as resign} from './src/response/guild/resignRole/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error {};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildRoleActionPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildRoleActionsHierarchyTargetsConfirmationAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_ROLE_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('appointment retains original usage and result or failure text including repeat suffix',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.role-appoint')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('appoint','/设置身份为 长老 4',raw,!row.result.success),text=textOf(nodes);
  if(row.result.success&&raw.outcome==='usage'){assert.ok(text.includes('使用方法：设置身份为 职位名 <UID|@目标>'));for(const role of raw.roles)assert.ok(text.includes(`${role.name}（ID:${role.id}）`));assert.ok(text.includes('任命时会检查职位上限'));}
  else assert.ok(text.includes(row.result.success?raw.message:raw.text));
 }
});
test('resignation directory keeps self and allowed demotion choices, including disciple empty state',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.role-resign'&&r.result.success&&r.result.data.outcome==='options')){
  const d=row.result.data.data,nodes=await render('resign','/卸任',row.result.data),cmd=commands(nodes),text=textOf(nodes);
  const role=d.operatorRoleName??'弟子';assert.equal(cmd.includes('/卸任 1'),role!=='弟子');
  for(const m of d.members.filter(m=>m.userId!==1))assert.equal(cmd.includes('/卸任 '+m.userId),m.canDemote&&['副宗主','长老'].includes(m.roleName??'弟子'));
  if(role==='弟子'&&!d.members.some(m=>m.canDemote))assert.ok(text.includes('您是弟子，没有可操作的卸任对象'));
 }
});
test('resignation retains original confirmation and committed message; errors end with plain feedback',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.role-resign'&&(!r.result.success||r.result.data.outcome!=='options'))){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('resign','/卸任 1',raw,!row.result.success),text=textOf(nodes);
  if(row.result.success&&raw.outcome==='confirmation'){assert.ok(text.includes('确认要卸任当前职位吗'));assert.ok(text.includes('请在60秒内再次点击确认'));assert.ok(commands(nodes).includes('/卸任 1'));}
  else assert.ok(text.includes(row.result.success?raw.message:raw.text));
 }
});
test('role transport errors preserve error feedback without a retry API',async()=>{
 state.transportError=true;
 try{for(const name of ['appoint','resign'])assert.ok(textOf(await render(name,name==='appoint'?'/设置身份为 长老 4':'/卸任 1',{})).includes('网络超时'));}
 finally{state.transportError=false;}
});
