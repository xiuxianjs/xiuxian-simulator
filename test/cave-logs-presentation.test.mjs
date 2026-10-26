import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { caveQueryAdvice, emptyNearbyAdvice, emptyCaveLogAdvice, restrictedCaveAdvice } from './helpers/cave-query-recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__caveLogs={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as logs} from './src/response/cavePlot/logs/res.ts';export {default as old_logs} from 'old-logs';export * from './src/api/bot/cave-queries.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'caveLogs',setup(b){
 b.onResolve({filter:/^old-logs$/},()=>({path:'logs',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/cave-logs-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=async()=>{globalThis.__caveLogs.legacyCalls++;return globalThis.__caveLogs.originalData};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__caveLogs;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCaveLogsV1AndReadOnly$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,37);
const old=[...output.matchAll(/ROBOT_CAVE_LOGS_V1=([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],page:m[2],status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(old.length,36);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
test('cave logs preserve original private/group pagination and access/guide bubbles',async()=>{
 for(let n=0;n<old.length;n++)for(const isPrivate of [true,false]){
  if(old[n].status!==200)continue;
  const row=rows[n];state.result=row.result;state.originalData=old[n].body.data;
  const actual=await render('logs',row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const expected=await render('old_logs',row,isPrivate);
  if(!row.result.success){
   const reason=row.result.middleware.replies.at(-1).text;
   const comparable=withoutExpectedAdvice(actual,caveQueryAdvice(reason));
   assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(replaceExpectedText(expected,'灵药师尚未入门',reason)),old[n].state+row.text);
  }else{
   if(!row.result.data.logs.length)withoutExpectedAdvice(actual,emptyCaveLogAdvice);
   assert.deepEqual(actual,expected,old[n].state+row.text);
  }assert.equal(state.legacyCalls,1);
 }
});
test('cave log service failures give feedback and end without any supplementary API',async()=>{
 for(let n=0;n<old.length;n++)if(old[n].status!==200){state.result=rows[n].result;await render('logs',rows[n],false);assert.equal(state.calls,1);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.match(JSON.stringify(state.sent),/获取洞府记录失败/);}
});
test('cave logs middleware delegates once and transport/DTO failures never supplement game HTTP',async()=>{
 state.result=rows.at(-1).result;await render('logs',rows[0],false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls,1);
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('logs',rows[0],true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}state.transport=false;
 for(const v of [null,{}, {logs:[],page:0}])assert.throws(()=>h.parseBackendCaveLogs(v));
});
