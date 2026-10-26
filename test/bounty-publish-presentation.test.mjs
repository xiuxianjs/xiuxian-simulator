import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__bountyPublish={sent:[],calls:0,mention:null,targetUid:null};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as publish} from './src/response/bounty/publish/res.ts';export {default as old} from 'old-publish';export {parseBackendPublishedBounty} from './src/api/bot/bounty-actions.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'bounty-publish',setup(b){
 b.onResolve({filter:/^old-publish$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/bounty-publish-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:'alemon',namespace:'framework'}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
 b.onLoad({filter:/.*/,namespace:'framework'},()=>({contents:`export * from '${pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href}';export const useMention=()=>[{findOne:async()=>({count:globalThis.__bountyPublish.mention?1:0,data:{UserId:globalThis.__bountyPublish.mention}})}];`}));
 b.onResolve({filter:/^@src\/api\/bot\/bounty-actions$/},()=>({path:'policy',namespace:'policy'}));
 b.onLoad({filter:/.*/,namespace:'policy'},()=>({resolveDir:process.cwd(),contents:`export {parseRobotBountyPublish} from '${resolve('src/api/bot/bounty-actions.ts')}';export const getBackendBountyPublishPolicy=async()=>{if(globalThis.__bountyPublish.kind==='publish')throw new Error('unexpected policy request');return globalThis.__bountyPublish.policy};`}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot|response-apps\/bounty\/publish\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'identity'}));
 b.onLoad({filter:/.*/,namespace:'identity'},()=>({contents:`export const getBackendRobotIdentity=async()=>{if(globalThis.__bountyPublish.kind==='publish')throw new Error('unexpected identity request');return{account:{status:globalThis.__bountyPublish.targetUid?'registered':'unknown',playerId:globalThis.__bountyPublish.targetUid}};};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export default async()=>globalThis.__bountyPublish.app;export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__bountyPublish;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessBountyPublish','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_BOUNTY_PUBLISH_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=24);
async function render(kind,text,isPrivate){state.kind=kind;state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate};await framework.run(h[kind], e, ()=>{state.next++});return state.sent;}
test('publish preserves original policy, success, failures and group-only broadcast from actual Go results',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business')){state.result=row.result;state.mention=row.args.target?.bid??null;state.targetUid=state.mention==='player'?1:state.mention==='not-registered'?null:2;if(row.result.data?.outcome==='policy')state.policy=row.result.data.policy;state.app=row.result.data?.outcome==='published'?{code:'OK',data:h.parseBackendPublishedBounty(row.result.data.data)}:{code:'FAIL',data:{message:row.result.middleware.replies.at(-1)?.text}};
 for(const isPrivate of [true,false]){const actual=await render('publish',row.text,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,row.result.data?.outcome==='published'&&!isPrivate&&row.result.data.data.targetName?2:1);const flat=actual.flatMap(format=>format.flatMap(function walk(n){return Array.isArray(n.value)?n.value.flatMap(walk):[n]}));
 const text=flat.map(n=>typeof n.value==='string'?n.value:'').join('');
 assert.ok(!flat.some(n=>n.options?.data==='/消耗 金盆 1'));
 if(row.result.data?.outcome==='policy'){
  const policy=row.result.data.policy;
  for(const value of [`${policy.maxAmount}灵晶`,`${policy.minPerPerson}灵晶`,`${policy.feePercent}%（不退还）`,`${policy.validHours}小时`,`${policy.minCompletions}~${policy.maxCompletions}人`,`默认${policy.defaultCompletions}人`])assert.ok(text.includes(value),value);
  assert.ok(!text.includes('示例：'));assert.ok(!text.includes('123 1000 2'));
 }else if(row.result.data?.outcome==='published'){
  const data=h.parseBackendPublishedBounty(row.result.data.data);
  for(const value of [`支付灵晶：${data.totalCost}`,`手续费：${data.fee}`,`每人赏金：${data.rewardPerPerson}`,`赏金池：${data.rewardPool}`])assert.ok(text.includes(value),value);
  if(!isPrivate&&data.targetName)assert.deepEqual(actual[1],(await render('old',row.text,isPrivate))[1]);
 }else{assert.ok(text.includes(row.result.middleware.replies.at(-1).text));}}}
});
test('publish policy and mutation admission delegates; malformed and transport results never retry or next',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const text of ['/悬赏','/悬赏 abc 1000','/悬赏 2 1000','/悬赏 @目标 1000 3']){state.mention='market-writer';state.result=muted;await render('publish',text,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('publish',text,false);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;}
});
