import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { Format } from 'alemonjs';

const state = globalThis.__teamMatchPresentation = { raw:null, sent:[], calls:0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin:{contents:`export {FormatGui} from './src/utils/messageHelper.ts';export {default as snapshot} from './src/response/teamMatch/status/res.ts';export {default as cancel} from './src/response/teamMatch/cancel/res.ts';export {default as mainline} from './src/response/teamMatch/startMainline/res.ts';export {default as dungeon} from './src/response/teamMatch/startDungeon/res.ts';`,resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'esm',
  plugins:[{name:'team-match-presentation-seam',setup(builder){
    builder.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
    builder.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},args=>({path:args.path,namespace:'seam'}));
    builder.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
    builder.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__teamMatchPresentation;s.calls++;s.op=op;s.args=args;if(s.transportError){throw new Error('transport failed')};if(s.failure){await feedback(s.raw);return {handled:true}};return {handled:false,data:decode(s.raw,1)}};` }));
  }}]
});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten=nodes=>nodes.flatMap(node=>Array.isArray(node.value)?flatten(node.value):[node]);
const textOf=nodes=>nodes.map(node=>String(node.value??'')).join('');
const commands=nodes=>nodes.filter(node=>['MD.button','Button'].includes(node.type)).map(node=>node.options.data);
const defaultCommands=commands(flatten(handlers.FormatGui({isPrivate:true,bid:'player',title:'副本匹配',content:Format.createMarkdown()}).format.value));
const route={snapshot:['/匹配状态','team-match.snapshot',{}],cancel:['/取消匹配','team-match.cancel',{}],mainline:['/匹配主线 7-3','team-match.start-mainline',{input:'7-3'}],dungeon:['/匹配秘境 5','team-match.start-dungeon',{input:'5'}]};
async function render(name,raw,failure=false,text=route[name][0]){
  state.raw=raw;state.failure=failure;state.sent=[];state.calls=0;
  const e={name:'message.create',UserId:'player',MessageText:text,isPrivate:true};
  await framework.run(handlers[name], e, async()=>{throw new Error('unexpected next')});
  assert.equal(state.calls,1);assert.equal(state.sent.length,1);assert.equal(state.op,route[name][1]);assert.deepEqual(state.args,name==='mainline'?{input:text.replace(/^(!|！|\/|#|＃)?匹配主线\s*/, '').trim()}:name==='dungeon'?{input:text.replace(/^(!|！|\/|#|＃)?匹配秘境\s*/, '').trim()}:route[name][2]);
  return flatten(state.sent[0]);
}
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessTeamMatch','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
const receipts=[...output.matchAll(/ROBOT_TEAM_MATCH_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
const rows=op=>receipts.filter(r=>r.op===op&&r.result.success&&r.result.branch==='business').map(r=>r.result.data);

test('snapshot retains no-match state and all four strategy labels without consuming result',async()=>{
 const labels={WAITING:'等待同目标修士进入匹配池',SAME_REALM:'仅匹配同大境界修士',ADJACENT_REALM:'优先同大境界，其次相邻大境界',NEAREST_REALM:'放宽到同目标副本的最近大境界修士'};
 const values=rows('team-match.snapshot');assert.ok(values.includes(null));assert.equal(new Set(values.filter(Boolean).map(v=>v.phase)).size,4);
 for(const value of values){
  const nodes=await render('snapshot',value),text=textOf(nodes);
  if(value===null){assert.ok(text.includes('当前未查到有效匹配记录'));assert.ok(!commands(nodes).includes('/取消匹配'));continue;}
  for(const part of ['状态：匹配中',`目标：${value.targetLabel}`,`已等待：${value.waitedSeconds}秒`,`当前策略：${labels[value.phase]}`,`时限：${value.timeoutSeconds}秒`])assert.ok(text.includes(part));
  assert.ok(commands(nodes).includes('/取消匹配'));
 }
});
test('cancel preserves target-specific feedback or no-match and original default navigation',async()=>{
 const values=rows('team-match.cancel');assert.ok(values.some(v=>v.cancelled));assert.ok(values.some(v=>!v.cancelled));
 for(const value of values){const nodes=await render('cancel',value);assert.ok(textOf(nodes).includes(value.cancelled?`已取消匹配：${value.targetLabel}`:'本次未取消有效匹配记录'));assert.deepEqual(commands(nodes),['/我的队伍',...defaultCommands]);}
});
test('both match starts preserve original target, three-minute prompt and buttons',async()=>{
 for(const name of ['mainline','dungeon']){
  const values=rows(route[name][1]);assert.ok(values.length>0);
  for(const value of values){const nodes=await render(name,value),text=textOf(nodes);for(const part of ['已进入匹配',`目标：${value.targetLabel}`,'匹配时限：3分钟','当前优先匹配同大境界修士'])assert.ok(text.includes(part));assert.ok(commands(nodes).includes('/匹配状态'));assert.ok(commands(nodes).includes('/取消匹配'));}
 }
});
test('all domain refusals including repeat suffix keep original failure bubble with no success footer',async()=>{
 const values=receipts.filter(r=>!r.result.success);assert.ok(values.some(r=>r.result.middleware.replies.at(-1).text.includes('道友，你是来找我玩的吗')));
 for(const row of values){const name=Object.keys(route).find(n=>route[n][1]===row.op),reply=row.result.middleware.replies.at(-1),nodes=await render(name,reply,true);assert.ok(textOf(nodes).includes(reply.text));assert.deepEqual(commands(nodes),defaultCommands);}
});
test('all transport errors stop after one call and preserve Error.message',async()=>{
 state.transportError=true;
 try{for(const name of Object.keys(route)){const nodes=await render(name,{});assert.ok(textOf(nodes).includes('transport failed'));assert.deepEqual(commands(nodes),defaultCommands);}}
 finally{state.transportError=false;}
});
test('invalid DTOs stop without supplementary reads or success buttons',async()=>{
 for(const [name,message]of [['snapshot','匹配状态接口数据不完整'],['cancel','取消匹配响应不完整'],['mainline','进入匹配响应不完整'],['dungeon','进入匹配响应不完整']]){const nodes=await render(name,{});assert.ok(textOf(nodes).includes(message));assert.deepEqual(commands(nodes),defaultCommands);}
});
test('route-local mainline and dungeon regex still accept original fullwidth hyphen and prefixes',async()=>{
 const mainline=rows('team-match.start-mainline')[0],dungeon=rows('team-match.start-dungeon')[0];
 await render('mainline',mainline,false,'！匹配主线 7 － 3');await render('dungeon',dungeon,false,'＃匹配秘境 5');
});


test('raw format refusals and Unicode argument inputs preserve the actual feedback bubble',async()=>{
 const rows=[...output.matchAll(/ROBOT_TEAM_MATCH_INPUT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,21);
 for(const row of rows){
  if(row.result.branch!=='business')continue;
  const name=row.op.endsWith('mainline')?'mainline':'dungeon';
  const reply=row.result.middleware.replies.at(-1);
  const nodes=await render(name,row.result.success?row.result.data:reply,!row.result.success,row.text);
  assert.deepEqual(state.args,row.arguments);
  if(!row.result.success){assert.ok(textOf(nodes).includes(reply.text));assert.deepEqual(commands(nodes),defaultCommands);}
 }
});
