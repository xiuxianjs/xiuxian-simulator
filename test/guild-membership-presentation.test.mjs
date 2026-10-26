import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildMembershipPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as create} from './src/response/guild/createGuild/res.ts';export {default as apply} from './src/response/guild/joinGuild/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildMembershipPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildMembershipCreateApplyAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_MEMBERSHIP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('create keeps original usage, creation receipt, headings and navigation',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.create')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('create',raw.outcome==='usage'?'/创建宗门':'/创建宗门 青云',raw,!row.result.success),text=textOf(nodes);
  if(!row.result.success){assert.ok(text.includes('创建失败'));assert.ok(text.includes(raw.text));assert.deepEqual(commands(nodes),['/我','/属性面板','/查看主线','/我的活动','/商店']);}
  else if(raw.outcome==='usage'){assert.ok(text.includes('创建宗门需要消耗100灵石'));assert.ok(text.includes('宗门名称限制2-6个字'));assert.ok(commands(nodes).includes('/创建宗门'));}
  else{assert.ok(text.includes('创建成功'));assert.ok(text.includes(`宗门【${raw.receipt.name}】创建成功，您已成为宗主`));assert.ok(text.includes('建设宗门设施'));assert.ok(commands(nodes).includes('/我的宗门'));}
 }
});
test('apply keeps original usage, pending receipt and plain errors',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.apply')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('apply',raw.outcome==='usage'?'/加入宗门':'/加入宗门 1',raw,!row.result.success),text=textOf(nodes);
  if(!row.result.success){assert.ok(text.includes(raw.text));assert.ok(!text.includes('申请失败'));assert.deepEqual(commands(nodes),['/我','/属性面板','/查看主线','/我的活动','/商店']);}
  else if(raw.outcome==='usage'){assert.ok(text.includes('请指定要加入的宗门ID'));assert.ok(commands(nodes).includes('/宗门列表'));}
  else{assert.ok(text.includes('✅ 申请成功'));assert.ok(text.includes(`已向【${raw.receipt.guildName}】提交加入申请，请等待审核`));assert.ok(text.includes(`等级：${raw.receipt.levelName}`));assert.ok(text.includes(`成员数：${raw.receipt.memberCount}人`));assert.ok(commands(nodes).includes('/我的申请'));assert.ok(commands(nodes).includes('/宗门列表'));}
 }
});
test('membership network errors keep original feedback and do not retry',async()=>{
 state.transportError=true;
 try{for(const name of ['create','apply'])assert.ok(textOf(await render(name,name==='create'?'/创建宗门 青云':'/加入宗门 1',{})).includes('网络超时'));}
 finally{state.transportError=false;}
});
