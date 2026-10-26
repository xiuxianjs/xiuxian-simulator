import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__storageBag={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as menu} from './src/response/storage/newBag/main/res.ts';export {default as props} from './src/response/storage/newBag/props/res.ts';export {default as materials} from './src/response/storage/newBag/materials/res.ts';export {default as oldMenu} from 'old-menu';export {default as oldProps} from 'old-props';export {default as oldMaterials} from 'old-materials';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'storage-bag',setup(b){
 b.onResolve({filter:/^old-(menu|props|materials)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/storage-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/storage/newBag',a.path==='menu'?'main':a.path)}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'original-api'}));
 b.onLoad({filter:/.*/,namespace:'original-api'},()=>({loader:'ts',contents:`export {getBackendInventory} from '${resolve('src/api/bot/inventory.ts')}';export {createBackendRequestContext} from '${resolve('src/api/bot/context.ts')}';`,resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import {withBusinessRecovery} from '${resolve('src/response/businessRecovery.ts')}';
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__storageBag;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.legacyQueries.push(args.query);if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__storageBag;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(withBusinessRecovery(op,r.middleware.replies.at(-1)));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorageBag','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_STORAGE_BAG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,495);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0,legacyQueries:[]});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
function withoutBagRecovery(messages,row) {
 const data=row.result.data;
 const failure=!row.result.success;
 const empty=!failure&&row.operation!=='storage.menu'&&data.pagination.total===0;
 const page=!failure&&row.operation!=='storage.menu'&&data.pagination.total>0&&!data.items.length;
 const category=row.operation==='storage.materials'?'材料':'道具';
 const expected=failure?{command:'/储物袋',text:'无法据此判断物品数量或是否丢失'}:empty?{command:'/储物袋',text:'这里只表示当前子分类没有记录'}:page?{command:`/储物袋 ${category}`,text:'本页为空不等于全部用完'}:null;
 const copy=withoutExpectedAdvice(messages,expected?[expected]:[]);
 let removed=0;
 for(const nodes of copy)for(const node of nodes)if(node.type==='Markdown'){
  const index=node.value.findIndex(child=>child.type==='MD.text'&&child.value===`本页暂无物品，当前分类共 ${data?.pagination?.total} 条记录`);
  if(index>=0){node.value.splice(index,1);removed++;}
 }
 assert.equal(removed,page?1:0,'expected empty-page explanation');
 return copy;
}
test('storage menu and bag pages retain original private/group layouts and capability buttons',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const kind=row.operation.split('.')[1],old='old'+kind[0].toUpperCase()+kind.slice(1);
  const actual=await run(kind,row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:row.operation,args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  assert.deepEqual(bubbleSemantics(withoutBagRecovery(actual,row)),bubbleSemantics(await run(old,row,isPrivate)),row.state+' '+row.text);
  if(row.query)assert.deepEqual(JSON.parse(JSON.stringify(state.legacyQueries)),[row.query],row.text);
 }
});
test('storage middleware calls parent next without a local reply or supplementary API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run(row.operation.split('.')[1],row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);assert.equal(state.legacyCalls,0);}
});

test('storage transport/malformed receipt sends one failure bubble and never calls next',async()=>{
 for(const kind of ['menu','props','materials'])for(const transport of [false,true]){
  state.transport=transport;await run(kind,{text:'/储物袋',result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);
 }state.transport=false;
});
