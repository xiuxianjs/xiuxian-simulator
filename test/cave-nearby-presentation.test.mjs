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

const state=globalThis.__caveNearby={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as logs} from './src/response/cavePlot/nearby/res.ts';export {default as old_logs} from 'old-logs';export * from './src/api/bot/cave-nearby-queries.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'caveNearby',setup(b){
 b.onResolve({filter:/^old-logs$/},()=>({path:'logs',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/cave-nearby-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=async()=>{globalThis.__caveNearby.legacyCalls++;return globalThis.__caveNearby.originalData};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__caveNearby;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCaveNearbyV1AndState$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,23);
const old=[...output.matchAll(/ROBOT_CAVE_NEARBY_V1=([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],status:Number(m[2]),body:JSON.parse(m[3])}));assert.equal(old.length,22);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
// Preserve every player/action node while allowing the compact heading and labels.
const compactNearby=nodes=>nodes.flatMap(node=>{
 if(node.type==='MD.newline')return [];
 if(Array.isArray(node.value))return [{...node,value:compactNearby(node.value)}];
 if(node.type!=='MD.text')return [node];
 if(/^附近玩家灵田（共\d+位）$/.test(node.value))return [];
 return [{...node,value:String(node.value).replace(/^【\d+】【([^】]+)】(.+)$/,'$2 · $1').replace(/^状态：/,'')}];
});
test('cave nearby preserve original private/group pagination and access/guide bubbles',async()=>{
 for(let n=0;n<old.length;n++)for(const isPrivate of [true,false]){
  if(old[n].status!==200)continue;
  const row=rows[n];state.result=row.result;state.originalData=old[n].body.data;
  const actual=await render('logs',row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const comparable=row.result.success&&!row.result.data.players.length?withoutExpectedAdvice(actual,emptyNearbyAdvice):actual;assert.deepEqual(comparable.map(compactNearby),(await render('old_logs',row,isPrivate)).map(compactNearby),old[n].state+row.text);assert.equal(state.legacyCalls,1);
 }
});
test('cave nearby service failures give feedback and end without any supplementary API',async()=>{
 for(let n=0;n<old.length;n++)if(old[n].status!==200){state.result=rows[n].result;await render('logs',rows[n],false);assert.equal(state.calls,1);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.match(JSON.stringify(state.sent),/获取附近灵田失败/);}
});
test('cave nearby middleware delegates once and transport/DTO failures never supplement game HTTP',async()=>{
 state.result=rows.at(-1).result;await render('logs',rows[0],false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls,1);
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('logs',rows[0],true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}state.transport=false;
 for(const v of [null,{}, {players:[{}]}])assert.throws(()=>h.parseBackendCaveNearby(v));
});
