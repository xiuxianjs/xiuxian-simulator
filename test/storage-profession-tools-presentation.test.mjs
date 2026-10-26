import { withoutSpecialStorageRecovery } from './helpers/storage-special-recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__storageProfession={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/storage/newBag/tiangong/res.ts';export {default as old} from 'old-profession';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'storage-profession-tools',setup(b){
 b.onResolve({filter:/^old-profession$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/storage-profession-tools-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/storage/newBag/tiangong')}));
 b.onResolve({filter:/^@src\/api\/bot$/},()=>({path:resolve('src/api/bot/queries.ts')}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import {withBusinessRecovery} from '${resolve('src/response/businessRecovery.ts')}';
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__storageProfession;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query=args.query;if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'query failed');return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__storageProfession;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(withBusinessRecovery(op,r.middleware.replies.at(-1)));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorageProfession','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_STORAGE_PROFESSION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,180);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('profession tool bag preserves original bubbles, types and capabilities',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'storage.profession-tools',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  assert.deepEqual(withoutSpecialStorageRecovery(actual,row,'storage.profession-tools'),await run('old',row,isPrivate),row.state+' '+row.text);
  if(row.status){assert.equal(String(state.query.page),row.pageText);assert.equal(state.query.typeName??'',row.typeName);}
 }
});
test('profession middleware calls parent next; transport or invalid receipt ends with original failure bubble',async()=>{
 await run('current',rows.find(r=>r.state==='muted'),false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/储物袋 天工',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('查询天工工具失败，请稍后重试'));}state.transport=false;
});
