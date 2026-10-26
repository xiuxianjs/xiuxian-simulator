import { unsafeCaveFixture, assertCaveInputRefusal } from './helpers/cave-input-recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { caveSnapshotAdvice, hasCaveSnapshotFailure } from './helpers/cave-snapshot-recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__caveCultivate={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as logs} from './src/response/cavePlot/cultivate/res.ts';export {default as old_logs} from 'old-logs';export * from './src/api/bot/cave-command.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'caveCultivate',setup(b){
 b.onResolve({filter:/^old-logs$/},()=>({path:'logs',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/cave-cultivate-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});export const requestBackend=async()=>{globalThis.__caveCultivate.legacyCalls++;return globalThis.__caveCultivate.originalData};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__caveCultivate;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCaveCultivateV1TransactionAndReceipt$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,91);
const old=[...output.matchAll(/ROBOT_CAVE_CULTIVATE_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(old.length,90);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
test('cave cultivate preserve original private/group pagination and access/guide bubbles',async()=>{
 for(let n=0;n<old.length;n++)for(const isPrivate of [true,false]){
  if(old[n].status!==200)continue;
  const row=rows[n];state.result=row.result;state.originalData=old[n].body.data;
  const actual=await render('logs',row,isPrivate);if(unsafeCaveFixture(row)){assertCaveInputRefusal(state,actual);continue;}assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const comparable=withoutExpectedAdvice(actual,hasCaveSnapshotFailure(row.result.data)?caveSnapshotAdvice():[]);
  assert.deepEqual(comparable,await render('old_logs',row,isPrivate),old[n].state+row.text);assert.equal(state.legacyCalls,1);
 }
});
test('cave cultivate service failures give feedback and end without any supplementary API',async()=>{
 for(let n=0;n<old.length;n++)if(old[n].status!==200){state.result=rows[n].result;const actual=await render('logs',rows[n],false);if(unsafeCaveFixture(rows[n])){assertCaveInputRefusal(state,actual);continue;}assert.equal(state.calls,1);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.ok(state.result.middleware.replies.at(-1).text);assert.ok(bubbleSemantics(state.sent).text.includes(state.result.middleware.replies.at(-1).text.replace(/\s+/g,' ').trim()));}
});
test('cave cultivate middleware delegates once and transport/DTO failures never supplement game HTTP',async()=>{
 state.result=rows.at(-1).result;await render('logs',rows[0],false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls,1);
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('logs',rows[0],true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}state.transport=false;
 for(const v of [null,{}, {message:1}])assert.throws(()=>h.parseBackendCaveCommand(v));
});
