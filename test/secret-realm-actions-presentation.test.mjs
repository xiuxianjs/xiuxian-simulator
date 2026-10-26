import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__secretRealmActionsPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['challenge','claim'].map(n=>`export {default as ${n}} from './src/response/guildSecretRealmWar/${n}/res.ts';export {default as old${n}} from 'old-${n}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'srw-presentation',setup(b){
 b.onResolve({filter:/^old-(challenge|claim)$/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/secret-realm-${a.path.slice(4)}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|response-apps\/guildSecretRealmWar\/(challenge|claim)\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export default async()=>globalThis.__secretRealmActionsPresentation.legacy;export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__secretRealmActionsPresentation;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport failed');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSecretRealmActions','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_SECRET_REALM_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
async function render(name,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(handlers[name], e, ()=>{state.next++});return state.sent;}
const command=row=>row.op.endsWith('challenge')?`/灵脉攻防战挑战 ${row.args.realmNo} ${row.args.positionNo}`:'/灵脉攻防战领取奖励';
test('secret realm action bubbles retain win loss freeze reward and original domain error text',async()=>{
 for(const row of rows){if(row.result.branch==='middleware')continue;const kind=row.op.slice('secret-realm.'.length),text=command(row);state.result=row.result;state.legacy=row.result.success?{code:'OK',data:row.result.data}:{code:'FAIL',data:{message:row.result.middleware.replies.at(-1).text}};
  const actual=await render(kind,text);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(actual.length,1);const legacy=await render('old'+kind,text);
  const frozen=row.result.data?.frozenUntil;
  const expectedFrozen=typeof frozen==='string'?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(frozen)):null;
  assert.deepEqual(actual,expectedFrozen?JSON.parse(JSON.stringify(legacy).replaceAll(frozen,expectedFrozen)):legacy);
  if(row.result.success){const data=row.result.data;if(kind==='challenge'){assert.ok(textOf(actual[0]).includes(data.won?'挑战胜利，已占领该位置。':'挑战失败。'));assert.equal(textOf(actual[0]).includes('冻结至：'),typeof data.frozenUntil==='string');assert.equal(textOf(actual[0]).includes('本周首次有效占领：贡献 +30（已到账）'),data.participationContribution===30);}else assert.ok(textOf(actual[0]).includes(`领取成功：灵晶${data.spiritCrystal} ｜ 贡献${data.contribution} ｜ 宗门声望${data.reputation}`));}
 }
});
test('secret realm action invalid DTO and transport failures finish with one request and original titled feedback',async()=>{
 for(const kind of ['challenge','claim'])for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(kind,kind==='challenge'?'/灵脉攻防战挑战 1 1':'/灵脉攻防战领取奖励');assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.ok(textOf(state.sent[0]).includes(transport?'transport failed':kind==='challenge'?'灵脉攻防战挑战响应不完整':'灵脉攻防战领奖响应不完整'));}state.transport=false;
});
test('secret realm action middleware delegates once without emitting a business bubble',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='middleware')){state.result=row.result;const kind=row.op.slice('secret-realm.'.length);await render(kind,command(row));assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
