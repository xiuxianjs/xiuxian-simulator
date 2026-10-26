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
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__skillWudao={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/wudao/res.ts';export {default as original} from 'old-wudao';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-wudao$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-wudao-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__skillWudao;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillWudao;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillWudao','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_WUDAO=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,156);
const validId=id=>typeof id==='string'&&/^\d+$/.test(id)&&Number.isSafeInteger(Number(id))&&Number(id)>0;
const rejected=row=>(row.arguments.bookId!==null&&!validId(row.arguments.bookId))||/\s/.test(row.arguments.label);
const spends=command=>/^[/!！#＃]?悟道\s+\S+\s+\S/.test(command);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('wudao options and settlement preserve original group/private bubbles and failure button rows',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);if(rejected(row)){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('参数错误'));assert.ok(!bubbleSemantics(actual).commands.some(spends));continue;}assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.wudao',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const data=row.result.success?row.result.data:null;
  const settled=data?.result;
  const stop=settled&&(settled.remaining===0||settled.newMax===settled.templateMax);
  const reply=row.result.middleware.replies.at(-1);
  const tips=!row.result.success?[...inventoryAdvice('wudao',reply.text),...(validId(row.arguments.bookId)?[{text:'只读取当前候选，不消耗悟道石',command:'/悟道 '+row.arguments.bookId}]:[])]:stop?inventoryAdvice('wudao',settled.remaining===0?'悟道石不足':'该属性已达到模板约定上限'):[];
  let comparable=withoutExpectedAdvice(actual,tips);
  if(data&&!settled){
   const addition='本次只读取可选属性，尚未消耗；选择属性才提交悟道，执行时重新检查条件与当前上限。';
   assert.ok(bubbleSemantics(comparable).text.includes(addition));comparable=replaceExpectedText(comparable,addition,'');
  }
  const expected=await run('original',row,isPrivate);
  if(!data){
   const before=bubbleSemantics(expected),after=bubbleSemantics(comparable);
   const removed=before.commands.filter(spends);
   assert.deepEqual(removed,[...new Set(reply.buttons.filter(button=>spends(button.command)).map(button=>button.command))].sort());
   before.commands=before.commands.filter(command=>!spends(command));assert.ok(!after.commands.some(spends));assert.deepEqual(after,before,row.state+' '+row.text);
  }else if(!settled||stop)assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(expected),row.state+' '+row.text);
  else assert.deepEqual(comparable,expected,row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/悟道 2',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('悟道结果未获完整确认，请先核对当前上限、悟道石与原回执。'));}state.transport=false;
});
