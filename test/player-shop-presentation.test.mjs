import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__playerShop={sent:[],calls:0};
const framework = createPresentationHarness(state);
const names=['list','mine','ranking','rename','description'];
const bundle=await build({stdin:{contents:names.map(n=>`export {default as ${n}} from './src/response/shop/playerShop/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseBackendShopList,parseBackendShopRanking} from './src/api/bot/shop-queries.ts';export {parseBackendOwnPlayerShop} from './src/api/bot/player-shop-own.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'player-shop',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/player-shop-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/shop\/playerShop\/[^/]+\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__playerShop.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});export const withBackendRepeatDetection=async(b,u,c,text)=>text;
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__playerShop;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessPlayerShop','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_PLAYER_SHOP_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({name:m[1].split('.')[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=25);
const commands={list:'/小店',mine:'/我的小店',ranking:'/小店排行',rename:'/命名店铺',description:'/店铺简介'};
async function render(name,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
function appResult(row){const r=row.result;if(!r.success){const reply=r.middleware.replies.at(-1);return{code:row.name==='rename'&&reply.buttons.length===2?'OK':'LOAD_FAILED',data:{message:reply.text}};}const d=r.data;return{code:'OK',data:row.name==='list'?h.parseBackendShopList(d):row.name==='mine'?{shop:h.parseBackendOwnPlayerShop(d)}:row.name==='ranking'?{ranking:h.parseBackendShopRanking(d)}:d};}
test('five direct shop handlers preserve original bubbles for actual Go results, pages and validation',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business')){state.result=row.result;state.app=appResult(row);const text=row.text==='/小店'?commands[row.name]:row.text;const actual=await render(row.name,text);assert.equal(state.calls,1);assert.equal(state.op,'player-shop.'+row.name);assert.equal(state.next,0);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old_'+row.name,text),row.name+': '+text);}
 const ranking=rows.find(r=>r.name==='ranking'&&r.result.data?.length);state.result=ranking.result;state.app=appResult(ranking);for(const text of ['/小店排行 1','/小店排行 99']){const actual=await render('ranking',text);assert.equal(state.calls,1);assert.deepEqual(actual,await render('old_ranking',text));}
});
test('shop admission delegates; transport and malformed DTO stop after one attempt',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const name of names){state.result=muted;await render(name,commands[name]);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(name,commands[name]);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;}
});
