import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__newcomerActivityPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as overview} from './src/response/activity/newcomerLogin/res.ts';export {default as claim} from './src/response/activity/newcomerTaskClaim/res.ts';export {default as oldOverview} from 'old-overview';export {default as oldClaim} from 'old-claim';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'newcomer-presentation',setup(b){
 b.onResolve({filter:/^old-(overview|claim)$/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/newcomer-activity-${a.path==='old-overview'?'overview':'claim'}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|api\/bot\/context|utils\/backendRepeatDetector|response-apps\/activity\/(newcomerLogin|newcomerTaskClaim)\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export const createBackendRequestContext=()=>({});export { useMessage } from 'alemonjs';export default async()=>globalThis.__newcomerActivityPresentation.legacy;export const withBackendRepeatDetection=async(b,u,c,m)=>{const s=globalThis.__newcomerActivityPresentation;if(!s.reply.startsWith(m))throw new Error('legacy failure text changed');return s.reply};export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__newcomerActivityPresentation;s.calls++;s.args=args;s.op=op;if(s.transport)throw new Error('transport');if(s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessNewcomerActivity','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_NEWCOMER_ACTIVITY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(name,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(handlers[name], e, ()=>{state.next++});return state.sent;}
test('newcomer overview and day details render exactly like the original res',async()=>{
 for(const row of receipts.filter(r=>r.op==='newcomer-activity.overview'&&r.result.branch==='business'&&r.result.success)){state.result=row.result;state.legacy={code:'OK',data:row.result.data};
 for(const text of ['/新人狂欢','/初入仙途','/新人狂欢 1','/新人狂欢 2','/新人狂欢 7','/新人狂欢 8']){
  const current=await render('overview',text);assert.equal(state.calls,1);assert.deepEqual(state.args,{});assert.equal(state.next,0);assert.equal(current.length,1);assert.deepEqual(current,await render('oldOverview',text));
 }}
});
test('newcomer committed rewards preserve the original bubble including explicit zero rewards',async()=>{
 for(const row of receipts.filter(r=>r.op==='newcomer-activity.claim-task'&&r.result.branch==='business'&&r.result.success)){
  state.result=row.result;state.legacy={code:'OK',data:row.result.data};const text=`/新人任务领取 ${row.args.taskConfigId}`,current=await render('claim',text);assert.equal(state.calls,1);assert.deepEqual(state.args,row.args);assert.equal(state.next,0);assert.equal(current.length,1);assert.deepEqual(current,await render('oldClaim',text));
  if(row.result.data.spiritCrystal===0&&row.result.data.vipExpYuan===0)assert.ok(textOf(current[0]).includes('获得：无'));
 }
});
test('newcomer refusals preserve original usage, progress and repeat feedback without next',async()=>{
 for(const row of receipts.filter(r=>!r.result.success&&Number.isInteger(r.args.taskConfigId??0))){
  state.result=row.result;const reply=row.result.middleware.replies.at(-1).text;state.reply=reply;
  const name=row.op==='newcomer-activity.overview'?'overview':'claim',text=name==='overview'?'/新人狂欢':row.args.taskConfigId===null?'/新人任务领取':`/新人任务领取 ${row.args.taskConfigId}`;
  if(name==='overview')state.legacy=reply.startsWith('查询失败')?{code:'LOAD_FAILED'}:{code:'OUT_OF_PERIOD',message:reply};
  else if(reply.startsWith('无效的任务ID'))state.legacy={code:'INVALID_TASK_ID'};
  else if(reply.startsWith('您已过新人期'))state.legacy={code:'OUT_OF_PERIOD'};
  else if(reply.startsWith('任务不存在'))state.legacy={code:'TASK_NOT_FOUND'};
  else if(reply.startsWith('该任务尚未解锁'))state.legacy={code:'NOT_UNLOCKED'};
  else if(reply.startsWith('该里程碑奖励已领取'))state.legacy={code:'ALREADY_CLAIMED'};
  else if(reply.startsWith('宗门贡献不足'))state.legacy={code:'INSUFFICIENT_PROGRESS',data:{taskLabel:'宗门贡献',required:3,current:0,unit:''}};
  else state.legacy={code:'CLAIM_FAILED'};
  const current=await render(name,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(current.length,1);assert.ok(textOf(current[0]).includes(reply));assert.deepEqual(current,await render(name==='overview'?'oldOverview':'oldClaim',text));
 }
});
test('newcomer transport and bad DTO are terminal and retain original error bubbles',async()=>{
 for(const [name,text,errorText] of [['overview','/新人狂欢','查询失败，请稍后再试。'],['claim','/新人任务领取 21','领取失败，请稍后再试。']]){
  for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};const sent=await render(name,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(sent.length,1);assert.ok(textOf(sent[0]).includes(errorText));}
 }
 state.transport=false;
});
test('newcomer backend middleware branches only pass to the parent fallback',async()=>{
 for(const row of receipts.filter(r=>r.result.branch==='middleware')){state.result=row.result;const name=row.op.endsWith('overview')?'overview':'claim';const sent=await render(name,name==='overview'?'/新人狂欢':'/新人任务领取 21');assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(sent.length,0);}
});
