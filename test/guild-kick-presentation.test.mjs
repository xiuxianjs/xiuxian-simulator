import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildKickPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as kick} from './src/response/guild/kickMember/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildKickPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_target' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildKickDirectoryTargetsTransactionAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_KICK_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('kick preserves grouped directory, missing user names, result, failures and quiet target',async()=>{
 for(const row of receipts){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('kick',row.result.success&&raw.outcome==='directory'?'/踢出成员':'/踢出成员 2',raw,!row.result.success),text=textOf(nodes);
  if(!row.result.success)assert.ok(text.includes(raw.text));
  else if(raw.outcome==='directory'){
   if(!raw.data.kickableMembers.length)assert.ok(text.includes('当前没有可踢出的成员，或您没有踢人权限'));
   else{assert.ok(text.includes('点击 [踢出] 可直接踢出对应成员'));assert.ok(commands(nodes).includes('/我的宗门'));for(const m of raw.data.kickableMembers){assert.ok(commands(nodes).includes('/踢出成员 '+m.userId));assert.ok(text.includes(m.userExists?m.name:'未知'));}}
  }else if(raw.outcome==='result')assert.ok(text.includes(raw.message));
 }
});
test('kick transport failure sends once without retry',async()=>{
 state.transportError=true;
 try{assert.ok(textOf(await render('kick','/踢出成员 2',{})).includes('网络超时'));}
 finally{state.transportError=false;}
});
