import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__marketSell={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as sell} from './src/response/market/sell/res.ts';export {default as old} from 'old-sell';export {presentMarketSellable} from './src/api/bot/market-sell-query.ts';export {parseBackendMarketSellable} from './src/api/bot/market-trade.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'market-sell',setup(b){
 b.onResolve({filter:/^old-sell$/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/market-sell-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|response-apps\/market\/sell\/app|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});export const withBackendRepeatDetection=async(b,u,c,text)=>text;
 export { useMessage } from 'alemonjs';
 export const fetchSellableList=async()=>globalThis.__marketSell.list;
 export const fetchPriceRange=async()=>globalThis.__marketSell.range;
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__marketSell;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessMarketSell','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_MARKET_SELL_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=20);
const flat=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flat(n.value):[n]);
const textOf=nodes=>flat(nodes).map(n=>String(n.value??'')).join('');
async function render(kind,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(h[kind], e, ()=>{state.next++});return state.sent;}
function oldRange(range,submission){return {code:'OK',data:{minPrice:range.minPrice,maxPrice:range.maxPrice,refPrice:range.referencePrice,source:range.source,isAboveThreshold:range.credibilityReady,maxListingQuantity:range.maxListingQuantity,fixedQuantity:range.fixedQuantity},submission};}
test('sell preserves original category menu, all category lists, price hints, write and refusal bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business')){state.result=row.result;if(row.result.success){const d=row.result.data;if(d.mode==='list')state.list={code:'OK',data:h.presentMarketSellable(h.parseBackendMarketSellable(d),row.args.category)};if(d.mode==='start')state.range=oldRange(d.range,d.message===undefined?undefined:{code:'OK',data:{message:d.message,listingId:d.listingId}});}
  else {const reply=row.result.middleware.replies.at(-1);state.list={code:'LOAD_FAILED',data:{message:reply.text}};if(reply.text==='市场上架规则加载失败，请稍后再试')state.range=state.list;else if(row.args.mode==='start') {const range=rows.find(r=>r.result.data?.range&&r.args.category===row.args.category).result.data.range;state.range=oldRange(range,{code:'FAIL',data:{message:reply.text,canAdjustListings:reply.buttons.length>0}});}}
  const actual=await render('sell',row.text);assert.equal(state.calls,1);assert.equal(state.op,'market.sell');assert.equal(state.next,0);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old',row.text));if(row.result.data?.message)assert.ok(textOf(actual[0]).includes(`上架ID：${row.result.data.listingId}`));
 }
});
test('sell admission delegates every local mode; transport and invalid DTO terminate after one attempt',async()=>{
 for(const text of ['/交易上架','/交易上架 道具','/交易上架 道具 2','/交易上架 错误']){state.result=rows.find(r=>r.result.branch==='middleware').result;await render('sell',text);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('sell',text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;}
});
