import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__pvp={sent:[],calls:0};
const framework = createPresentationHarness(state);
const files={scarecrow:'scarecrow/res'};
const decoders={scarecrow:'parseBackendScarecrow'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseBackendScarecrow} from './src/api/bot/scarecrow.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'pvp',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot(?:\/context)?)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/scarecrow\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__pvp.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__pvp;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessScarecrow','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_SCARECROW_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=9);
async function render(name,text,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
test('scarecrow actual Go battles preserve private/group summary, skill and crit sections and battle-memory links',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){state.result=row.result;state.app=row.result.success?{code:'OK',data:h.parseBackendScarecrow(row.result.data)}:{code:'FAIL',data:{message:row.result.middleware.replies.at(-1).text}};const actual=await render('scarecrow',row.text,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,'scarecrow.challenge');assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old_scarecrow',row.text,isPrivate));}
});
test('scarecrow admission delegates before battle; malformed responses and transport errors do not retry or next',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const text of ['/挑战稻草人','/挑战稻草人 0','/挑战稻草人 0001','/挑战稻草人 '+ '9'.repeat(400)]){state.result=muted;await render('scarecrow',text,true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('scarecrow','/挑战稻草人',true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
});
test('invalid precise-route arguments now request backend refusal with the original failure bubble',async()=>{
 const invalid=[...output.matchAll(/ROBOT_SCARECROW_INVALID_ROUTE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(invalid.length,28);
 for(const row of invalid.filter(r=>!r.task))for(const isPrivate of [true,false]) {
  state.result=row.result;
  const actual=await render('scarecrow','/'+row.input,isPrivate);
  assert.equal(state.calls,1);assert.deepEqual(state.args,row.arguments);
  if(row.muted){assert.equal(state.next,1);assert.equal(actual.length,0);continue;}
  assert.equal(state.next,0);assert.equal(actual.length,1);
  state.app={code:'FAIL',data:{message:row.result.middleware.replies.at(-1).text}};
  assert.deepEqual(actual,await render('old_scarecrow','/挑战稻草人',isPrivate));
 }
});

test('scarecrow renders exact large DOT damage without rejecting the real handler response', async()=>{
 const source=rows.find(r=>r.result.success && r.result.data?.summary);
 assert.ok(source);
 state.result=structuredClone(source.result);
 const summary=state.result.data.summary;
 Object.assign(summary,{totalDamage:2767011611058678850,totalDamageText:'2767011611058678850',skillDamage:2245954,skillDamageText:'2245954',buffDamage:2767011611056432896,buffDamageText:'2767011611056432896',maxSingleDamage:461168601842738816,maxSingleDamageText:'461168601842738816'});
 const parsed=h.parseBackendScarecrow(state.result.data);
 assert.equal(parsed.summary.totalDamage,2767011611058678850n);
 assert.equal(parsed.summary.buffDamage,2767011611056432896n);
 for(const isPrivate of [false,true]){
 const messages=await render('scarecrow','/挑战稻草人',isPrivate);
 const text=JSON.stringify(messages).replaceAll(',','');
 assert.ok(text.includes('2767011611058678850'));
 assert.ok(text.includes('2767011611056432896'));
 assert.ok(!text.includes('响应不完整'));
 }
 summary.totalDamageText='invalid';
 assert.throws(()=>h.parseBackendScarecrow(state.result.data),/响应不完整/);
});
