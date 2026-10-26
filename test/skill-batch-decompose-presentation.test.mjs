import { goTestFixture } from './helpers/go-fixture.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { inventoryAdvice } from './helpers/skill-inventory-recovery-delta.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const s=globalThis.__batch={sent:[],calls:[],next:[],cancelled:[],timers:[]};
const framework = createPresentationHarness(s);
s.setTimeout=(cb,ms)=>{assert.equal(ms,60000);s.timers.push(cb);return s.timers.length;};s.clearTimeout=()=>{};
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/batchDecompose/res.ts';export {default as original} from 'old-batch';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch',setup(b){
 b.onResolve({filter:/^old-batch$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-batch-decompose-before-v2.ts.txt',import.meta.url),'utf8').replaceAll('setTimeout(', 'globalThis.__batch.setTimeout(').replaceAll('clearTimeout(', 'globalThis.__batch.clearTimeout('),resolveDir:process.cwd()}));
 b.onLoad({filter:/src\/response\/skillBook\/batchDecompose\/res.ts$/},a=>({loader:'ts',contents:readFileSync(a.path,'utf8').replaceAll('setTimeout(', 'globalThis.__batch.setTimeout(').replaceAll('clearTimeout(', 'globalThis.__batch.clearTimeout('),resolveDir:resolve(a.path,'..')}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:'alemonjs',namespace:'framework'}));
 b.onLoad({filter:/.*/,namespace:'framework'},()=>({contents:`export * from '${pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href}';export const useSubscribe=()=>[{mount:fn=>{globalThis.__batch.subscription=fn;return{id:'test'}},cancel:sub=>globalThis.__batch.cancelled.push(sub.id)}];`}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async(bid,op,options)=>{const s=globalThis.__batch;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__batch;s.calls.push({op,args});if(s.row.v2Status!==200)throw new Error(s.row.v1.error.message);const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchDecompose','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_BATCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
const event=text=>({name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:s.isPrivate});
async function initial(kind,row,isPrivate){Object.assign(s,{kind,row,isPrivate,sent:[],calls:[],next:[],cancelled:[],legacyCalls:0,timers:[],subscription:null});const e=event(row.text);await framework.run(handlers[kind], e, (...args)=>s.next.push(args));return structuredClone(s.sent);}
async function confirm(kind,row,isPrivate){
 const name=row.arguments.gradeId===null?'全部':row.arguments.gradeId==='1'?'下品':'上品';
 const preview=rows.find(r=>r.state===(name==='下品'?'large':'first')&&r.arguments.gradeName===name&&r.result.success);
 await initial(kind,preview,isPrivate);assert.ok(s.subscription);s.row=row;s.sent=[];s.calls=[];s.next=[];s.legacyCalls=0;const e=event('确认分解');
 await framework.invoke(e, ()=>s.subscription(e,(...args)=>s.next.push(args)), (...args)=>s.next.push(args));
 return {sent:structuredClone(s.sent),event:e};
}
test('batch grade panels, previews, empty/invalid/error bubbles match original in group/private',async()=>{
 for(const row of rows.filter(r=>r.op==='skill-books.batch-decompose-query'&&r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await initial('current',row,isPrivate);assert.equal(s.calls.length,1);assert.deepEqual(s.calls[0],{op:row.op,args:row.arguments});assert.equal(s.next.length,0);assert.equal(s.legacyCalls,0);
  const data=row.result.success?row.result.data:null;
  if(data?.mode==='preview'&&data.selectedGrade.id>0&&(!data.preview.gradeBreakdown.length||data.preview.gradeBreakdown.some(grade=>grade.id!==data.selectedGrade.id))){
   const view=bubbleSemantics(actual);assert.ok(view.text.includes('分解预览与确认品级范围不一致'));assert.ok(!view.commands.includes('确认分解'));assert.equal(s.subscription,null);continue;
  }
  const text=row.result.middleware.replies.at(-1)?.text??'';
  let comparable=withoutExpectedAdvice(actual,row.result.success?[]:inventoryAdvice('batch-query',text));
  if(data?.mode==='preview'){
   const addition='确认时按当前品级范围重新筛选；预览不锁定具体功法，请先保护要保留的功法。';
   assert.ok(bubbleSemantics(comparable).text.includes(addition));comparable=replaceExpectedText(comparable,addition,'');
  }
  const expected=await initial('original',row,isPrivate);
  if(data?.mode==='choose')assert.deepEqual(comparable,expected,row.state+' '+row.text);
  else assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(expected),row.state+' '+row.text);
 }
});
test('batch subscription confirmation retains commit/refusal and exception semantics without extra API',async()=>{
 for(const row of rows.filter(r=>r.op==='skill-books.batch-decompose'&&r.state!=='muted'))for(const isPrivate of [false,true]){
  if(row.v2Status!==200){await assert.rejects(()=>confirm('current',row,isPrivate));assert.equal(s.calls.length,1);assert.equal(s.sent.length,0);await assert.rejects(()=>confirm('original',row,isPrivate));assert.equal(s.sent.length,0);continue;}
  const actual=(await confirm('current',row,isPrivate)).sent;assert.equal(s.calls.length,1);assert.deepEqual(s.calls[0],{op:row.op,args:row.arguments});assert.equal(s.next.length,0);assert.equal(s.legacyCalls,0);
  const text=row.result.middleware.replies.at(-1)?.text??'';
  const comparable=withoutExpectedAdvice(actual,row.result.success?[]:inventoryAdvice('batch-confirm',text));
  const expected=(await confirm('original',row,isPrivate)).sent;
  if(row.result.success)assert.deepEqual(comparable,expected,row.state+' '+JSON.stringify(row.arguments));
  else assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(expected),row.state+' '+JSON.stringify(row.arguments));
 }
});
test('batch confirmation middleware uses current event and hook continuation; cancel, hint and timeout keep original bubbles',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){
  if(row.op==='skill-books.batch-decompose-query'){await initial('current',row,false);assert.deepEqual(s.next,[[]]);assert.equal(s.sent.length,0);}
  else{const actual=await confirm('current',row,false);assert.deepEqual(s.next,[[true,true]]);assert.equal(actual.event.__res,row.result);assert.deepEqual(s.cancelled,['test']);assert.equal(s.sent.length,0);}
 }
 const preview=rows.find(r=>r.state==='first'&&r.arguments.gradeName==='全部');
 for(const choice of ['取消','别的指令','timeout'])for(const isPrivate of [false,true]){
  const run=async kind=>{await initial(kind,preview,isPrivate);s.sent=[];s.calls=[];s.next=[];if(choice==='timeout'){await framework.invoke(event(''),()=>s.timers[0]());}else{const e=event(choice);await framework.invoke(e, ()=>s.subscription(e,(...args)=>s.next.push(args)), (...args)=>s.next.push(args));}assert.equal(s.calls.length,0);return structuredClone(s.sent);};
  const actual=await run('current');const comparable=withoutExpectedAdvice(actual,choice==='别的指令'?[]:inventoryAdvice('batch-query',choice==='取消'?'已取消分解操作':'确认超时'));assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(await run('original')));
 }
});
