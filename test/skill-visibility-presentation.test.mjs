import { goTestFixture } from './helpers/go-fixture.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { inventoryAdvice, rejectsInventoryInput } from './helpers/skill-inventory-recovery-delta.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__skillVisibility={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['hide','show'].map(k=>`export {default as ${k}} from './src/response/skillBook/${k}/res.ts';export {default as old_${k}} from 'old-${k}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'visibility',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/skill-visibility-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/client$|^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async(bid,op,options)=>{const s=globalThis.__skillVisibility;if(!s.kind.startsWith('old_'))throw new Error('supplementary API');if(!Number.isSafeInteger(options.path.bookId))throw new Error('Invalid parameter bookId');s.legacyCalls++;if(s.status!==200)throw new Error('SQL failure');return s.original};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillVisibility;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillVisibilityV1ParityReplayAndAdmission$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_VISIBILITY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,132);
async function run(name,row,isPrivate){state.kind=name;state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;state.result=row.result;state.original=row.v1?.data;state.status=row.status;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[name], e, ()=>state.next++);return state.sent;}
test('all original success, refusal, SQL fault and usage bubbles match in group/private',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [false,true]){
  const name=row.op.split('.').at(-1),actual=await run(name,row,isPrivate);
  if(row.arguments.bookId!==''&&rejectsInventoryInput('visibility',row.arguments)){assert.equal(state.calls,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('参数错误'));continue;}
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.arguments);assert.equal(actual.length,1);
  const comparable=withoutExpectedAdvice(actual,row.result.success?[]:inventoryAdvice(name,row.result.middleware.replies.at(-1).text));
  const expected=await run('old_'+name,row,isPrivate);
  if(row.result.success)assert.deepEqual(comparable,expected,row.text);else assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(expected),row.text);
 }
});
test('mute uses parent next, and transport/DTO failures stop without another API',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='middleware')){await run(row.op.split('.').at(-1),row,true);if(row.arguments.bookId!==''&&rejectsInventoryInput('visibility',row.arguments)){assert.equal(state.calls,0);assert.equal(state.next,0);assert.ok(bubbleSemantics(state.sent).text.includes('参数错误'));}else{assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}}
 for(const name of ['hide','show'])for(const transport of [true,false]){
  state.transport=transport;await run(name,{text:name==='hide'?'/隐藏功法 1':'/显示功法 1',result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});


test('valid zero-padded IDs keep their raw value; ambiguous IDs and extra tokens do not request',async()=>{
 for(const name of ['hide','show']){
  const original=rows.find(r=>r.op==='skill-books.'+name&&r.result.success&&r.result.branch==='business'&&r.arguments.bookId==='1');
  const command=name==='hide'?'隐藏功法':'显示功法';
  for(const text of ['＃'+command+' 0001','/'+command+' 1.5 extra','/'+command+' 1e2']){
   const row={...original,text,arguments:{bookId:text.includes('0001')?'0001':text.includes('1.5')?'1.5':'1e2'}};const actual=await run(name,row,false);if(!text.includes('0001')){assert.equal(state.calls,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('参数错误'));continue;}assert.equal(state.calls,1);assert.deepEqual(state.args,row.arguments);assert.deepEqual(actual,await run('old_'+name,row,false));
  }
 }
});


test('a refusal DTO cannot be displayed as a successful mutation',async()=>{
 for(const name of ['hide','show'])for(const code of ['NOT_FOUND','IN_USE','UNCHANGED']){
  await run(name,{text:name==='hide'?'/隐藏功法 1':'/显示功法 1',result:{success:true,branch:'business',data:{code,bookId:1,name:'太虚诀',isHidden:name==='hide',message:'原拒绝'}}},false);
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.ok(JSON.stringify(state.sent).includes('未获完整确认'));assert.ok(!JSON.stringify(state.sent).includes('✅ '));
 }
});
