import { robberyBubbleSemantics } from './helpers/robbery-bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__robbery={sent:[],calls:0};
const framework = createPresentationHarness(state, { mentions: [] });
const files={robbery:'robbery',counterAttack:'counterAttack'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseBackendRobbery} from './src/api/bot/robbery.ts';export {parseBackendCounterAttack} from './src/api/bot/counter-attack.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'robbery',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/(context|identity))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/(robbery|counterAttack)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__robbery.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export const getBackendRobotIdentity=async bid=>{if(!globalThis.__robbery.old)throw new Error('unexpected identity API');return{account:bid==='unknown'?{status:'unregistered'}:{status:'registered',playerId:bid==='player'?1:2}}};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__robbery;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessRobbery','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ROBBERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=25);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.old=name.startsWith('old_');const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
function original(row){const counter=row.op==='pvp.counter-attack';if(row.result.success)return{code:'OK',data:counter?h.parseBackendCounterAttack(row.result.data):h.parseBackendRobbery(row.result.data)};const reply=row.result.middleware.replies.at(-1);return{code:counter?'FAIL':'LOAD_FAILED',data:{message:reply.text,isEnergyInsufficient:reply.buttons.length>0}};}
test('robbery/counter actual Go win/loss/refusals keep original private/group bubbles and victory broadcast',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){const name=row.op==='pvp.robbery'?'robbery':'counterAttack';state.result=row.result;state.app=original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,row.result.success&&!isPrivate&&name==='robbery'&&row.result.data.winner==='A'?2:1);assert.deepEqual(robberyBubbleSemantics(actual),robberyBubbleSemantics(await render('old_'+name,row,isPrivate)),row.text);}
});
test('admission runs even for missing/invalid input; transport/decode errors never retry or next',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const [name,op,text,args] of [['robbery','pvp.robbery','/打劫',{target:null}],['robbery','pvp.robbery','/打劫 0',{target:null}],['counterAttack','pvp.counter-attack','/回击',{logId:null}],['counterAttack','pvp.counter-attack','/回击 0',{logId:'0'}]]){state.result=muted;await render(name,{text,args},true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.op,op);assert.deepEqual(state.args,args);}
 for(const name of ['robbery','counterAttack'])for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(name,{text:name==='robbery'?'/打劫 2':'/回击 1',args:{}},true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
});

test('PK receipts use business victory and pending originals, keeping free counters separate from new loot',async()=>{
 const ordinary=rows.find(r=>r.op==='pvp.robbery'&&r.result.branch==='business'&&r.result.success&&r.result.data.winner==='A');
 assert.ok(ordinary);
 const pk={pkRulesVersion:1,pkEventId:71,actorSide:'B',counterDeadline:'2026-10-19T10:00:00+08:00',pkState:'waiting',pkDeliveryState:'pending'};
 const source={...ordinary.result.data,...pk,winner:'B',won:true,droppedItem:{name:'原装备',quantity:1,category:'equipment'}};
 state.result={...ordinary.result,data:source};
 const output=JSON.stringify(await render('robbery',ordinary,true));
 assert.ok(output.includes('打劫成功'));assert.ok(output.includes('尚未到手'));assert.ok(output.includes('对方反击截止'));
 const group=await render('robbery',ordinary,false);
 assert.equal(group.length,2);assert.ok(JSON.stringify(group[1]).includes('物品暂存待结算'));assert.ok(!JSON.stringify(group[1]).includes('原装备'));
 state.result={...ordinary.result,data:{...source,winner:'A',won:false,stoneReward:0,crystalReward:0,shaQiChange:0,droppedItem:null,pkDeliveryState:'none'}};
 const failed=await render('robbery',ordinary,false);
 assert.equal(failed.length,1);assert.ok(JSON.stringify(failed).includes('打劫失败'));
 const counter=rows.find(r=>r.op==='pvp.counter-attack'&&r.result.branch==='business'&&r.result.success);
 assert.ok(counter);
 const receipt={...counter.result.data,...pk,pkState:'counter_lost',winner:'A',won:false,qiCost:0,stoneReward:0,crystalReward:0,experience:0,shaQiChange:0,droppedItem:null};
 state.result={...counter.result,data:receipt};
 const counterText=JSON.stringify(await render('counterAttack',counter,true));
 assert.ok(counterText.includes('反击失败'));assert.ok(counterText.includes('免费反击 · 本次机会已使用'));assert.ok(counterText.includes('已确定归打劫者'));
 assert.ok(!counterText.includes('对方身无分文'));assert.ok(!counterText.includes('🎁 掉落'));
 assert.throws(()=>h.parseBackendCounterAttack({...receipt,stoneReward:1}));
 assert.equal(h.parseBackendCounterAttack({...receipt,experience:42}).expReward,42);
 for(const experience of [-1,1.5,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>h.parseBackendCounterAttack({...receipt,experience}));
 state.result={...counter.result,data:{...receipt,experience:42}};
 assert.ok(JSON.stringify(await render('counterAttack',counter,true)).includes('修为 +42'));

 assert.throws(()=>h.parseBackendRobbery({...source,actorSide:undefined}));
});
