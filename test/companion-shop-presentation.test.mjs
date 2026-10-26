import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__companionShop={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['shopBuy'].map(n=>`export {default as ${n}} from './src/response/companion/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/companion-shop-robot.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'companionShop',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/companion-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},a=>({path:a.path,namespace:'access'}));
 b.onLoad({filter:/.*/,namespace:'access'},()=>({contents:`export {sendFifthLayerLockedPage} from './src/response/access/fifthLayerView.ts';export const canAccessFifthLayerFeature=async()=>globalThis.__companionShop.access;`,resolveDir:process.cwd()}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/companion\/(shopBuy)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__companionShop.app;export const checkShopBuy=async()=>globalThis.__companionShop.app;export const confirmShopBuy=async()=>{throw new Error('unexpected extra confirmation API')};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async(bid,uid,command,text)=>text;export const createBackendRequestContext=()=>({});
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const writeContext=()=>{throw new Error("unexpected write adapter")};export const requestBackend=()=>{throw new Error('unexpected supplementary game API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__companionShop;s.calls++;s.op=op;s.args=args;if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCompanionShop','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_COMPANION_SHOP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:'companion.shop-purchase',args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=25);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
const names={'companion.shop-purchase':'shopBuy'};
function original(row){
 if(row.result.success){const data=row.result.data;
  if(data.mode==='preview')return{code:'CONFIRM_NEEDED',data};
  return{code:'CONFIRM_NEEDED',data:{settledResult:{code:'OK',data}}};
 }
 return{code:'FAIL',data:{message:row.result.middleware.replies.at(-1).text}};
}
test('companion shop keeps original private/group usage, preview, result and error bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'&&!r.text.includes('null')))for(const isPrivate of [true,false]){
  const name=names[row.op];state.result=row.result;state.app=original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,1);assert.deepEqual(bubbleSemantics(actual),bubbleSemantics(await render('old_'+name,row,isPrivate)),row.text);
 }
});
test('companion relationship commands delegate only middleware to parent and never supplement requests',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const name of ['shopBuy']){const row=rows.find(r=>names[r.op]===name&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
