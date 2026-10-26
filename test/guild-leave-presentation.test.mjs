import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildLeavePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as leave} from './src/response/guild/leaveGuild/res.ts';export {default as cancel} from './src/response/guild/cancelLeave/res.ts';export {default as absence} from './src/response/guild/leaderLeave/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildLeavePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildLeaveCancelAbsenceAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_LEAVE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('leave preserves original confirmation, exit receipt and navigation',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.leave')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('leave','/退出宗门',raw,!row.result.success),text=textOf(nodes);
  if(!row.result.success)assert.ok(text.includes(raw.text));
  else if(raw.outcome==='confirmation_required'){assert.ok(text.includes('⚠️ 退出宗门确认'));assert.ok(text.includes(`您确定要退出【${raw.guildName}】吗`));assert.ok(text.includes('所有待审核的申请将自动撤回'));assert.ok(commands(nodes).includes('/退出宗门'));assert.ok(commands(nodes).includes('/取消退出宗门'));}
  else{assert.ok(text.includes('✅ 退出成功'));assert.ok(text.includes(raw.message));assert.ok(commands(nodes).includes('/宗门列表'));}
 }
});
test('cancel always retains original confirmation text and return footer including failures',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.leave-cancel')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('cancel','/取消退出宗门',raw,!row.result.success);
  assert.ok(textOf(nodes).includes(row.result.success?'✅ 已取消退出宗门操作':raw.text));assert.ok(commands(nodes).includes('/我的宗门'));
 }
});
test('leader absence retains original result and same-request repeat suffix',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.leader-leave')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('absence','/宗主请假',raw,!row.result.success);
  assert.ok(textOf(nodes).includes(row.result.success?raw.message:raw.text));
 }
});
test('leave transport errors send original error and do not retry game API',async()=>{
 state.transportError=true;
 try{for(const name of ['leave','cancel','absence'])assert.ok(textOf(await render(name,{leave:'/退出宗门',cancel:'/取消退出宗门',absence:'/宗主请假'}[name],{})).includes('网络超时'));}
 finally{state.transportError=false;}
});
