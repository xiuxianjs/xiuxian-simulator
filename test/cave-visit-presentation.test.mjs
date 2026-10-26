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

const state=globalThis.__caveVisit={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as logs} from './src/response/cavePlot/visit/res.ts';export {default as old_logs} from 'old-logs';export * from './src/api/bot/cave-visit-queries.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'caveVisit',setup(b){
 b.onResolve({filter:/^old-logs$/},()=>({path:'logs',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/cave-visit-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:'framework',namespace:'framework'}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
 b.onLoad({filter:/.*/,namespace:'framework'},()=>({contents:`export * from '${pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href}';export const useMention=()=>[{findOne:async()=>({count:globalThis.__caveVisit.mention?1:0,data:{UserId:globalThis.__caveVisit.mention}})}];`}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'identity'}));
 b.onLoad({filter:/.*/,namespace:'identity'},()=>({contents:`export const getBackendRobotIdentity=async()=>{if(globalThis.__caveVisit.kind==='logs')throw new Error('extra target identity HTTP');return{account:{status:globalThis.__caveVisit.targetUid?'registered':'unknown',playerId:globalThis.__caveVisit.targetUid}}};`}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/client$|^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export class BackendAPIError extends Error{constructor(message,code,status){super(message);this.status=status}};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=async()=>{const s=globalThis.__caveVisit;if(s.kind==='logs')throw new Error('extra game HTTP');s.legacyCalls++;if(s.status!==200)throw new BackendAPIError('query failed','ERROR',s.status);return s.originalData};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__caveVisit;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCaveVisitV1TargetsAndPrivacy$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,91);
const old=[...output.matchAll(/ROBOT_CAVE_VISIT_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(old.length,90);
async function render(name,row,isPrivate){state.kind=name;state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
test('cave visit preserve original private/group pagination and access/guide bubbles',async()=>{
 for(let n=0;n<old.length;n++)for(const isPrivate of [true,false]){
  if(old[n].status>=500)continue;
  const row=rows[n];state.result=row.result;state.originalData=old[n].body.data;state.status=old[n].status;state.mention=row.args.target?.bid??null;state.targetUid=old[n].status===0?null:row.args.target?.uid??2;
  const actual=await render('logs',row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const expected=await render('old_logs',row,isPrivate);
  if(!row.result.success){const reason=row.result.middleware.replies.at(-1).text;assert.deepEqual(bubbleSemantics(withoutExpectedAdvice(actual,caveQueryAdvice(reason))),bubbleSemantics(expected),old[n].state+row.text);}
  else {if(!row.result.data.canViewPlots)withoutExpectedAdvice(actual,restrictedCaveAdvice);assert.deepEqual(actual,expected,old[n].state+row.text);}assert.equal(state.legacyCalls,old[n].status===0?0:1);
 }
});
test('cave visit service failures give feedback and end without any supplementary API',async()=>{
 for(let n=0;n<old.length;n++)if(old[n].status>=500){state.mention=rows[n].args.target?.bid??null;state.result=rows[n].result;await render('logs',rows[n],false);assert.equal(state.calls,1);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.match(JSON.stringify(state.sent),/获取目标灵田失败/);}
});
test('cave visit middleware delegates once and transport/DTO failures never supplement game HTTP',async()=>{
 state.result=rows.at(-1).result;await render('logs',rows[0],false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls,1);
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('logs',rows[0],true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}state.transport=false;
 for(const v of [null,{}, {ownerUid:1}])assert.throws(()=>h.parseBackendCaveVisit(v));
});
