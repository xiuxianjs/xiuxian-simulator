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

const state=globalThis.__skillBatchLearn={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/batchLearn/res.ts';export {default as original} from 'old-batch-learn';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-batch-learn$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-batch-learn-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__skillBatchLearn;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillBatchLearn;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchLearn','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_BATCH_LEARN=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,66);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('batch learning preview, current selection, cancel and failures preserve original group/private bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.batch-learn',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const data=row.result.success?row.result.data:null;
  const interrupted=data?.mode==='execute'&&(data.selection.skippedConflicts.length||data.results.some(result=>!result.success));
  const text=data?.selection.skippedConflicts.length?'已有同技能功法':row.result.middleware.replies.at(-1)?.text??'';
  let comparable=withoutExpectedAdvice(actual,!row.result.success||interrupted?inventoryAdvice('batch-learn',text):[]);
  if(data?.mode==='preview'){
   const addition='确认时重新选择当前可学实例，预览不锁定清单；批量学习不会替换已有同技能功法，取消不会撤销已经执行的学习。';
   assert.ok(bubbleSemantics(comparable).text.includes(addition));comparable=replaceExpectedText(comparable,addition,'');
  }
  const expected=await run('original',row,isPrivate);
  if(data?.mode==='execute'&&!interrupted)assert.deepEqual(comparable,expected,row.state+' '+row.mode);
  else assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(expected,data?.mode==='preview'?['/我的功法']:[]),row.state+' '+row.mode);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/一键学习功法 确认',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('一键学习功法结果未获完整确认，请先核对已学列表、秘籍背包与原回执。'));}state.transport=false;
});
