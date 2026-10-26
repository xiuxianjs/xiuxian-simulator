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
const files={shaqi:'shaQi/res',enemies:'enemy/res',ranking:'killGodList/res',claim:'killGodList/claimTitle/res'};
const decoders={shaqi:'parseRobotShaQi',ranking:'parseBackendKillGodRanking',claim:'parseRobotKillGodTitleClaim',enemies:'parseBackendEnemies'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseRobotShaQi,parseBackendKillGodRanking,parseRobotKillGodTitleClaim} from './src/api/bot/shaqi-queries.ts';export {parseBackendEnemies} from './src/api/bot/queries.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'pvp',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/pvp-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot(?:\/context)?)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/(?:shaQi|enemy|killGodList(?:\/claimTitle)?)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__pvp.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__pvp;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessPVP','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
const names={'pvp.sha-qi':'shaqi','pvp.enemies':'enemies','pvp.kill-god-ranking':'ranking','pvp.kill-god-title-claim':'claim'};
const rows=[...output.matchAll(/ROBOT_PVP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],name:names[m[1]],text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=20);
async function render(name,text,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
// Frozen layout predates the shared full game-time format. Keep all other nodes exact.
const normalizeLegacyTime=value=>JSON.parse(JSON.stringify(value).replace(/\d{4}-(\d{2}-\d{2} \d{2}:\d{2}):\d{2}/g,'$1'));
const claimCodes={'你已持有「杀神」称号。':'ALREADY_CLAIMED','杀神榜当前上榜人数不足 10 人，暂不开放领取。':'LIST_TOO_SHORT','仅杀神榜榜一可领取此称号。':'NOT_RANK1','称号尚未配置，请联系管理员。':'TITLE_NOT_FOUND'};
function original(row){const r=row.result;if(!r.success){const message=r.middleware.replies.at(-1).text;return{code:row.name==='claim'?(claimCodes[message]??'ERROR'):'LOAD_FAILED',data:{message}};}const d=h[decoders[row.name]](r.data);if(row.name==='claim')return{code:d};if(row.name==='enemies')return d.length?{code:'OK',data:{enemies:d}}:{code:'EMPTY',data:{}};return{code:'OK',data:d};}
test('PvP real Go receipts preserve native private/group bubbles, dates, names, ranking, title success and original refusals',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){state.result=row.result;state.app=original(row);const actual=await render(row.name,row.text,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,{});assert.equal(actual.length,1);if(row.name==='enemies'&&!row.result.success)continue;const walk=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?walk(n.value):[n]);const flat=walk(actual[0]);const text=flat.map(n=>typeof n.value==='string'?n.value:'').join('');const commands=flat.filter(n=>n.type==='MD.button'||n.type==='Button').map(n=>n.options.data);
 if(!row.result.success){assert.ok(text.includes(row.result.middleware.replies.at(-1).text));}
 else if(row.name==='enemies'){assert.deepEqual(normalizeLegacyTime(actual),normalizeLegacyTime(await render('old_'+row.name,row.text,isPrivate)),row.op);}
 else if(row.name==='claim'){assert.ok(text.includes('已获得称号「杀神」'));assert.ok(commands.includes('/我的称号'));}
 else if(row.name==='shaqi'){
  const d=row.result.data;assert.ok(text.includes(`煞气：${d.shaQi}`));assert.ok(text.includes(`每日消散：${d.dailyDecayAmount}`));
  assert.equal(commands.includes('/消耗 金盆 1'),d.shaQi>0);
  if(d.shaQi>0)assert.ok(text.includes(`金盆×1 · 煞气-${d.jinpenReduceAmount}`));
  assert.ok(!text.includes('消除途径'));assert.ok(!text.includes('你已上杀神榜'));
 }else{
  const d=row.result.data;if(d.shaQiInfo)assert.ok(text.includes(`煞气：${d.shaQiInfo.shaQi}`));
  for(const item of d.list){assert.ok(text.includes(`第${item.rank}名 ${item.name} · 煞气${item.shaQi}`));assert.ok(commands.includes(`/查看信息 ${item.uid}`));}
  assert.equal(commands.includes('/领取杀神称号'),d.canClaimTitle);assert.ok(!text.includes('上榜条件：'));assert.ok(!commands.includes('/消耗 金盆 1'));
 }}
});
test('PvP admission, malformed DTOs and transport failures neither execute another API nor next on failure',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const [op,name] of Object.entries(names)){
  state.result=muted;await render(name,'/测试',true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);
  for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(name,'/测试',true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
 }
});
