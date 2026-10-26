import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__marketActions={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as purchase} from './src/response/market/confirmBuy/res.ts';export {default as cancel} from './src/response/market/cancel/res.ts';export {default as old_purchase} from 'old-confirmBuy';export {default as old_cancel} from 'old-cancel';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'market-actions',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/market-${a.path.slice(4)}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|response-apps\/market\/[^/]+\/app|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},a=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});export const withBackendRepeatDetection=async(b,u,c,text)=>text;
 export { useMessage } from 'alemonjs';
 export default async()=>globalThis.__marketActions.legacy;
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__marketActions;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessMarketActions','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_MARKET_ACTION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({kind:m[1].slice(7),args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=15);
const flat=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flat(n.value):[n]);
async function render(kind,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(h[kind], e, ()=>{state.next++});return state.sent;}
test('purchase and cancellation preserve original preview, success, repeat and refusal bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business')){state.result=row.result;state.legacy=row.result.success?(row.result.data.preview?{code:'NEED_CONFIRM',data:row.result.data.preview}:{code:'OK',data:row.result.data}):{code:'LOAD_FAILED',data:{message:row.result.middleware.replies.at(-1).text}};const actual=await render(row.kind,row.text);assert.equal(state.calls,1);assert.equal(state.op,'market.'+row.kind);assert.equal(state.next,0);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old_'+row.kind,row.text));if(row.result.data?.preview){const commands=flat(actual[0]).filter(n=>['Button','MD.button'].includes(n.type)).map(n=>n.options.data);assert.ok(commands.includes('/选购 12 2 确认'));}}
});
test('market action middleware delegates without business feedback, transport and bad DTO end after one attempt',async()=>{
 for(const kind of ['purchase','cancel']){state.result=rows.find(r=>r.kind===kind&&r.result.branch==='middleware').result;const text=kind==='purchase'?'/选购 10':'/交易下架 20';await render(kind,text);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(kind,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;}
});
