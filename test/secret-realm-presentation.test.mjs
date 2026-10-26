import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__secretRealmPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['home','list','view'].map(n=>`export {default as ${n}} from './src/response/guildSecretRealmWar/${n}/res.ts';export {default as old${n}} from 'old-${n}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'srw-presentation',setup(b){
 b.onResolve({filter:/^old-(home|list|view)$/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/secret-realm-${a.path.slice(4)}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|response-apps\/guildSecretRealmWar\/(home|list|view)\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export default async()=>globalThis.__secretRealmPresentation.legacy;export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__secretRealmPresentation;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport failed');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSecretRealmQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_SECRET_REALM_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
async function render(name,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(handlers[name], e, ()=>{state.next++});return state.sent;}
const command=row=>row.op.endsWith('home')?'/灵脉攻防战':row.op.endsWith('list')?`/灵脉攻防战列表 ${row.args.page}`:row.args.realmNo===null?'/灵脉攻防战查看':`/灵脉攻防战查看 ${row.args.realmNo} ${row.args.page}`;
test('secret realm read bubbles match original active settled nonmember list positions and failure rendering',async()=>{
 for(const row of rows){
  if(row.result.branch==='middleware'||[row.args.page,row.args.realmNo].some(v=>v&&String(Number(v)).includes('e')))continue;
  const kind=row.op.slice('secret-realm.'.length),text=command(row);state.result=row.result;
  if(row.result.success){state.legacy={code:'OK',data:kind==='home'?row.result.data:kind==='list'?{items:row.result.data}:{positions:row.result.data}};}
  else if(kind==='view'&&(row.args.realmNo===null||row.args.realmNo==='0')){state.legacy={code:'NEED_REALM_NO'};}
  else{state.legacy={code:'LOAD_FAILED',data:{message:row.result.middleware.replies.at(-1).text}};}
  const actual=await render(kind,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old'+kind,text));
  if(row.result.success&&kind==='home'){assert.ok(textOf(actual[0]).includes(`状态：${row.result.data.display.statusLabel}`));assert.equal(textOf(actual[0]).includes('领取本期奖励。'),row.result.data.display.canPromptClaim);}
 }
});
test('secret realm invalid DTO and transport failure stay in original feedback bubble without next or another API',async()=>{
 for(const kind of ['home','list','view'])for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};const text=kind==='home'?'/灵脉攻防战':kind==='list'?'/灵脉攻防战列表 1':'/灵脉攻防战查看 1';await render(kind,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.ok(textOf(state.sent[0]).includes(transport?'transport failed':kind==='home'?'灵脉攻防战主页展示投影不完整':kind==='list'?'灵脉攻防战列表响应不完整':'灵脉攻防战详情响应不完整'));}state.transport=false;
});
test('secret realm middleware hands off once without a business bubble',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='middleware')){state.result=row.result;const kind=row.op.slice('secret-realm.'.length);await render(kind,command(row));assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
