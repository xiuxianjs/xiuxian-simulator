import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const state=globalThis.__taskContinue={};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessTaskContinuationV1OrderAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
const rows=[...output.matchAll(/ROBOT_TASK_CONTINUATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,60);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as old} from 'old-task';export {default as oldStrategy} from 'old-strategy';export {default as strategy} from './src/response/strategy.ts';export {default as escape} from './src/response/task/continue/res.ts';export {default as fallback} from './src/response/mwBusinessFallback.ts';export {finishRobotBusiness} from './src/response/robotBusiness.ts';export {businessInputFromEvent} from './src/api/bot/middleware-entry.ts';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'task',setup(b){
 b.onResolve({filter:/^@alemonjs\/qq-bot$/},()=>({path:import.meta.resolve('@alemonjs/qq-bot'),external:true}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-strategy$/},()=>({path:'strategy',namespace:'old-strategy'}));
 b.onLoad({filter:/.*/,namespace:'old-strategy'},()=>({loader:'ts',resolveDir:resolve('src/response'),contents:readFileSync(new URL('./fixtures/strategy-before-v2.ts.txt',import.meta.url),'utf8')}));
 b.onResolve({filter:/\.png$/},()=>({path:'image',namespace:'asset'}));
 b.onLoad({filter:/.*/,namespace:'asset'},()=>({contents:'export default "$file:/guild.png"'}));
 b.onResolve({filter:/^old-task$/},()=>({path:'old',namespace:'old'}));
 b.onLoad({filter:/.*/,namespace:'old'},()=>({loader:'ts',resolveDir:resolve('src/response/task/continue'),contents:readFileSync(new URL('./fixtures/tasks-continue-before-v2.ts.txt',import.meta.url),'utf8')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|api\/bot\/(identity|task-runtime-action|robot-business)|response\/(config|mwFeatureTrack|mwBan))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/(mwFeatureTrack|mwBan|identity|robot-business)$/},a=>({path:a.path,namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export default ()=>true;export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const isRobotPublicEntry=op=>op==='navigation.strategy';export const requestRobotBusiness=async(e,op,args,decode)=>{const s=globalThis.__taskContinue;s.calls++;assertStrategy(op,args);return {...s.strategyResult,data:decode(s.strategyResult.data,1)}};function assertStrategy(op,args){if(op!=='navigation.strategy'||Object.keys(args).length)throw new Error('unexpected API')};export const seedEventBackendRobotIdentity=()=>{};export const getBackendRobotIdentity=async()=>{const s=globalThis.__taskContinue;s.legacy++;return{account:{status:'registered',playerId:1}}};export const runBackendTaskRuntimeAction=async()=>{const s=globalThis.__taskContinue;s.legacy++;return s.row.original};export { useMessage } from 'alemonjs';`}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function render(mode,row,isPrivate){
 Object.assign(state,{row,sent:[],legacy:0,next:0});
 const event={name:isPrivate?'private.message.create':'message.create',UserId:'player',MessageId:'task',MessageText:'/任务 '+row.input,Platform:'onebot',isPrivate:isPrivate==='unset-private'?undefined:isPrivate};
 if(mode==='old') await framework.invoke(event, ()=>h.old(event,()=>state.next++), ()=>state.next++);
 else {
  await framework.invoke(event,()=>h.escape(event,()=>state.next++));
  assert.equal(state.legacy,0);assert.equal(state.next,1);
  assert.equal(h.businessInputFromEvent(event).taskInput,row.input);
  assert.equal(h.businessInputFromEvent(event).taskInput,undefined);
  if(isPrivate==='unset-private')event.isPrivate=true;
  let downstream;
  await framework.invoke(event, async()=>{await h.finishRobotBusiness(event,row.result,()=>{downstream=h.fallback.current(event)});await downstream;}, ()=>{downstream=h.fallback.current(event)});
  await downstream;assert.equal(event.__res,undefined);
 }
 await new Promise(resolve=>setImmediate(resolve));
 return structuredClone(state.sent);
}
test('task continuation uses the exact original shortcut and empty-task bubbles',async()=>{
 let compared=0;
 for(const row of rows.filter(r=>r.status===200&&r.state!=='unregistered'&&(r.result.middleware.reason==='TASK'||r.result.branch==='business'&&r.result.success)))for(const isPrivate of [false,true,'unset-private']) {
  const current=await render('current',row,isPrivate);assert.equal(state.legacy,0);
  const old=await render('old',row,isPrivate);assert.equal(state.legacy,2);
  assert.deepEqual(current,old,row.state+'/'+row.input);compared++;
 }
 assert.ok(compared>=50);
});


test('strategy retains the original image format after one public business API',async()=>{
 for(const isPrivate of [false,true])for(const scope of ['group','c2c','direct']) {
  const event={name:isPrivate?'private.message.create':'message.create',UserId:'player',MessageId:'strategy',MessageText:'/攻略',Platform:'onebot',isPrivate,Target:{scope,targetId:'target'}};
  Object.assign(state,{sent:[],calls:0,strategyResult:{success:true,branch:'business',middleware:{identity:{bid:'player',account:{status:'registered',playerId:1}},replies:[],contextWarnings:[],outcome:'allow',reason:'ALLOWED'},data:{}}});
  await framework.run(h.strategy, event, ()=>{throw new Error('strategy advanced next')});
  const actual=structuredClone(state.sent);assert.equal(state.calls,1);
  state.sent=[];
  await framework.run(h.oldStrategy, event, ()=>{throw new Error('legacy advanced next')});
  assert.deepEqual(actual,state.sent);
 }
});


test('routing candidate matches the original Go-confirmed step including historical extra prefixes',async()=>{
 for(const input of ['任务清空 2','/任务清空 2','//任务清空 2','！＃任务清空 2','# /任务清空 2','/\uFEFF任务清空   2']) {
  const executed=input.replace(/^(!|！|\/|#|＃)\s*/,'').trim().replace(/\s+/g,' ');
  Object.assign(state,{sent:[],legacy:0,row:{original:{outcome:'completed',executed}}});
  const old={name:'message.create',UserId:'player',MessageText:'/任务 '+input};
  await framework.invoke(old, ()=>h.old(old,()=>{}), ()=>{});
  const current={name:'message.create',UserId:'player',MessageText:'/任务 '+input};
  let next=0;await framework.invoke(current,()=>h.escape(current,()=>next++));
  assert.equal(next,1);assert.equal(current.MessageText,old.MessageText,input);
 }
});
