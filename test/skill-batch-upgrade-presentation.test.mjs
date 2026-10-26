import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { inventoryAdvice, rejectsInventoryInput, assertInventoryGuard } from './helpers/skill-inventory-recovery-delta.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__skillBatchUpgrade={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/batchUpgrade/res.ts';export {default as original} from 'old-upgrade';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-upgrade$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-batch-upgrade-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__skillBatchUpgrade;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillBatchUpgrade;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchUpgrade','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_BATCH_UPGRADE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,185);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('skill batch upgrade selection, consumption and stopping keep original group/private bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if(rejectsInventoryInput('upgrade',row.arguments)){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assertInventoryGuard(actual,'upgrade');continue;}
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.batch-upgrade',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const expected=await run('original',row,isPrivate);
  const data=row.result.success&&row.result.data?.mode==='execute'?row.result.data.result:null;
  const stopped=data&&data.successCount<data.upgradeCount;
  const tips=stopped?inventoryAdvice('upgrade',data.stopReason):!row.result.success?inventoryAdvice('upgrade',row.result.middleware.replies.at(-1).text):[];
  const comparable=withoutExpectedAdvice(actual,tips);
  if(stopped){
   let removed=0;
   for(const nodes of expected)for(const node of nodes)if(node.type==='Markdown'){
    const i=node.value.findIndex(child=>child.type==='MD.button'&&child.value==='[继续升级]');
    if(i<0)continue;
    assert.equal(node.value[i].options.data,`/升级功法 ${data.skillBookId} ${data.upgradeCount}`);
    assert.deepEqual(node.value[i+1],{type:'MD.text',value:' '});node.value.splice(i,2);removed++;
   }
   assert.equal(removed,1);
   assert.ok(!JSON.stringify(actual).includes('[继续升级]'));
  }
  if(row.result.success)assert.deepEqual(comparable,expected,row.state+' '+row.text);
  else assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(expected),row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/升级功法 2',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('功法升级结果未获完整确认，请先核对等级、材料与原回执。'));}state.transport=false;
});
