import { withoutDecomposeRecovery } from './helpers/equipment-recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__equipmentDecompose={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`
 export {default as decompose} from './src/response/equipment/decompose/res.ts';
 export {default as old_decompose} from 'old-decompose';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'equipment-decompose',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/equipment-decompose-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});export const writeTraceContext=()=>({});
 export const requestBackend=async(bid,op,options)=>{const s=globalThis.__equipmentDecompose;if(!s.kind.startsWith('old_'))throw new Error('supplementary API');s.legacyCalls++;if(!Number.isFinite(options.body.instanceId))throw new Error('Body is not JSON serializable');if(!s.row.v1)throw new Error('instanceId 必须为正整数');if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export const withBackendRepeatDetection=async(bid,uid,command,message)=>{const suffix=globalThis.__equipmentDecompose.row.repeatSuffix??globalThis.__equipmentDecompose.row.v1?.presentation?.repeat?.suffix;return suffix?message+'\\n\\n'+suffix:message};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__equipmentDecompose;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){next();return{handled:true}}if(!r.success){await feedback(withBusinessRecovery(op,r.middleware.replies.at(-1)));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentDecompose','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_EQUIPMENT_DECOMPOSE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,200);
async function run(name,row,isPrivate){Object.assign(state,{kind:name,sent:[],calls:0,next:0,legacyCalls:0,row});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[name], e, ()=>state.next++);return state.sent;}
const kind=row=>'decompose';
test('equipment decompose preserves original success, usage, refusal and repeat bubbles in group/private',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [false,true]){
  const name=kind(row),actual=await run(name,row,isPrivate);
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.arguments);assert.equal(actual.length,1);
  assert.deepEqual(withoutDecomposeRecovery(actual,row.result.success?'':row.result.middleware.replies.at(-1).text),await run('old_'+name,row,isPrivate),row.text+' '+row.state);
 }

});
test('equipment decompose mute uses parent next; transport and malformed/refusal DTOs end without supplementary API',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='middleware')){await run(kind(row),row,true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const name of ['decompose'])for(const transport of [true,false]){
  const candidates=[{}, {instanceId:0}];
  for(const data of candidates){
   state.transport=transport;await run(name,{text:'/分解装备 2',result:{success:true,branch:'business',data}},false);
   assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
   assert.ok(JSON.stringify(state.sent).includes('分解装备失败，请稍后再试或联系运营。'));
  }
 }state.transport=false;
});
