import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutSoulWashRecovery, removeExpectedWashNode } from './helpers/soul-wash-recovery-delta.mjs';
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
const state=globalThis.__soulWashPreview={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/soulArtifact/wash/res.ts';export {default as original} from 'old-wash';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-wash$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-wash-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async(b,u,c,m)=>m+(globalThis.__soulWashPreview.row.repeatSuffix?'\\n\\n'+globalThis.__soulWashPreview.row.repeatSuffix:'');export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__soulWashPreview;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status===0)throw new Error(s.row.feedback);if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.compatibilityV1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulWashPreview;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulWashPreview','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_WASH_PREVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,178);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('soul wash single preview preserves original group/private rendering for the same actual generated DTO',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if (!/^[!！/#＃]?本命物洗涤\s*(\d+)?$/.test(row.text)) {
   assert.equal(state.calls.length,0);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
   const view=bubbleSemantics(actual);assert.ok(view.text.includes('本命物洗涤仅支持单次'));assert.ok(view.commands.includes('/本命物信息'));assert.ok(!view.commands.some(command=>/^\/(?:本命物洗涤|确认本命物洗涤|取消本命物洗涤)(?:\s|$)/.test(command)));
   continue;
  }
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'soul-artifacts.wash',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const reviewed = row.result.success ? removeExpectedWashNode(actual, 'expiry') : withoutSoulWashRecovery(actual, row.result.middleware.replies.at(-1).text);
  assert.deepEqual(reviewed,await run('original',row,isPrivate),row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/本命物洗涤',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('本命物洗涤结果未获完整确认'));}state.transport=false;
});
