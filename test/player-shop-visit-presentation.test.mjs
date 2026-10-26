import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__shopVisit={sent:[],calls:0,mention:null,targetUid:null};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as visit} from './src/response/shop/playerShop/visit/res.ts';export {default as old} from 'old-visit';export {parseBackendPlayerShopVisit} from './src/api/bot/player-shop-visit-query.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'shop-visit',setup(b){
 b.onResolve({filter:/^old-visit$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/player-shop-visit-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:'alemon',namespace:'framework'}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
 b.onLoad({filter:/.*/,namespace:'framework'},()=>({contents:`export * from '${pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href}';export const useMention=()=>[{findOne:async()=>({count:globalThis.__shopVisit.mention?1:0,data:{UserId:globalThis.__shopVisit.mention}})}];`}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context|response-apps\/shop\/playerShop\/visit\/app)$/},a=>({path:a.path,namespace:'seam'}));
 // Keep the real no-HTTP target parser; replace only the legacy identity API.
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'identity'}));
 b.onLoad({filter:/.*/,namespace:'identity'},()=>({contents:`export const getBackendRobotIdentity=async()=>{if(globalThis.__shopVisit.kind==='visit')throw new Error('unexpected identity request');return{account:{status:globalThis.__shopVisit.targetUid?'registered':'unknown',playerId:globalThis.__shopVisit.targetUid}};};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export default async()=>globalThis.__shopVisit.app;export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__shopVisit;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessPlayerShopVisit','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_SHOP_VISIT_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=16);
async function render(name,text){state.kind=name;state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
test('visit retains original Go data, bubble, currency card, pagination and refusals',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business')){state.result=row.result;state.mention=row.args.target?.bid??null;state.targetUid=row.result.data?.shop?.userId??null;state.app=row.result.success?{code:'OK',data:h.parseBackendPlayerShopVisit(row.result.data)}:{code:'LOAD_FAILED',data:{message:row.result.middleware.replies.at(-1).text}};const actual=await render('visit',row.text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old',row.text),row.text);}
});
test('visit admission and malformed/transport failures each stop after one request',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const text of ['/逛店','/逛店 abc','/逛店 2','/逛店 @目标 2']){state.mention='market-writer';state.result=muted;await render('visit',text);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('visit',text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;}
});
