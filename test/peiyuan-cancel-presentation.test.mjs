import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__peiyuanCancel={};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessPeiyuanCancel','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_PEIYUAN_CANCEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,14);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/peiyuanDan/cancel/res.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/peiyuan-cancel-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/peiyuanDan/cancel')}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=()=>({});
 export const withBackendRepeatDetection=async()=>{globalThis.__peiyuanCancel.repeats++;return globalThis.__peiyuanCancel.row.message};
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__peiyuanCancel;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport||s.row.status!==200)throw new Error('query failed');return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__peiyuanCancel;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(mode,row){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0,repeats:0});
 const e={name:'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:'/取消培元丹',isPrivate:false};
 await framework.run(handlers[mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('peiyuan cancellation preserves original pending details, footer and repeated refusal with one request',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'&&r.status===200)){
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:'peiyuan.cancel',args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  const expected=await run('old',row);
  if(row.result.success)assert.deepEqual(actual,expected,row.state);
  else assert.deepEqual(bubbleSemantics(withoutExpectedAdvice(actual,[{command:'/属性面板',text:'原预览'},{command:'/储物袋 道具 丹药',text:'取消或超时不返还'}])),bubbleSemantics(expected),row.state);
  assert.equal(state.legacy.length,1);
 }
});
test('only middleware advances next; query, DTO and transport failures now return feedback and end',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 for(const row of rows.filter(r=>r.status!==200&&r.state!=='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);}
 const ready=rows.find(r=>r.state==='ready');
 for(const transport of [false,true]){
  const row={...ready,transport,v1:{data:{}},result:{...ready.result,data:{}}};
  await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
  // The old handler propagated these errors without feedback. v2 ends with feedback.
  await assert.rejects(()=>run('old',row));
 }
});
