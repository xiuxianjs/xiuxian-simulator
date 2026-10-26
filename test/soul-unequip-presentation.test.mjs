import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
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
const state=globalThis.__soulUnequip={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/soulArtifact/unequip/res.ts';export {default as original} from 'old-unequip';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-unequip$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-unequip-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async(b,u,c,m)=>m+(globalThis.__soulUnequip.row.repeatSuffix?'\\n\\n'+globalThis.__soulUnequip.row.repeatSuffix:'');export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__soulUnequip;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulUnequip;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulUnequip','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_UNEQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,130);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('soul separation preserves original preview, refund, empty/undefined names and repeated group/private bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if (!/^[!！/#＃]?分离(?:\s*(确认))?$/.test(row.text)) {
   assert.equal(state.calls.length,0);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
   const view=bubbleSemantics(actual);assert.ok(view.text.includes('格式错误'));assert.ok(view.commands.includes('/本命物信息'));assert.ok(!view.commands.includes('/分离 确认'));
   continue;
  }
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'soul-artifacts.unequip',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const expected=await run('original',row,isPrivate);
  if(row.result.success)assert.deepEqual(actual,expected,row.state+' '+row.text);
  else {
   const text=row.result.middleware.replies.at(-1).text;
   const tips=/请先炼化本命物|当前未装备本命物/.test(text)?[{command:'/储物袋 本命',text:'没有装备时不能据此推断'}]:[{command:'/本命物信息',text:'不直接重放'},{command:'/储物袋 本命',text:'不把结果未知当作材料丢失'},{command:'/储物袋 材料 其它',text:'不重复提交补领'}];
   assert.deepEqual(bubbleSemantics(withoutExpectedAdvice(actual,tips)),bubbleSemantics(expected),row.state+' '+row.text);
  }
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/分离',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('本命物培养结果未获完整确认'));}state.transport=false;
});
