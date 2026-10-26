import { displayCurrencyText } from '../src/constants/currency.ts';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { inspectMessage } from 'alemonjs/testing';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__worldMilestone={};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessWorldMilestones','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_WORLD_MILESTONE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,32);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/recharge/milestone/res.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/world-milestone-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/recharge/milestone')}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=()=>({});
 export const withBackendRepeatDetection=async()=>{globalThis.__worldMilestone.repeats++;return globalThis.__worldMilestone.row.message||'操作失败，请稍后再试。'};
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__worldMilestone;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport)throw new Error('query failed');if(operation==='get_robot_realm_access')return s.row.access;if(s.row.status!==200)throw new Error('query failed');return s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__worldMilestone;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(mode,row,command=row.input){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0,repeats:0});
 const e={name:'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:command,isPrivate:false};
 await framework.run(handlers[mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('world milestones preserve the original complete view, claim, realm and repeated failure bubbles with one request',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted')){
  const actual=await run('current',row);assert.deepEqual(state.calls,[{operation:'world-milestones.'+row.operation,args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  const view = inspectMessage(actual.flat());
  assert.ok(view.commands.includes('/我的权益'));
  if (row.result.success && row.operation === 'view' && !row.result.data.empty) {
    const data = row.result.data;
    assert.ok(view.text.includes(data.worldCountText));
    assert.equal(view.commands.includes('/里程碑 领取'), data.unclaimedCount > 0);
    const all = inspectMessage((await run('current', row, '/里程碑 全部')).flat());
    assert.equal(state.calls.length, 1);
    for (const item of data.milestones) for (const text of [String(item.milestoneCount), item.statusText, item.rewardText]) assert.ok(all.text.includes(text), text);
  } else if (row.result.success && row.operation === 'claim-all') {
    assert.ok(view.text.includes(`成功领取 ${row.result.data.claimed.length} 个里程碑奖励`));
    for (const claim of row.result.data.claimed) for (const reward of claim.issued) assert.ok(view.text.includes(`${displayCurrencyText(reward.name) || '物品'} ×${reward.amount}`));
  } else {
    assert.deepEqual(bubbleSemantics(actual, ['/我的权益']), bubbleSemantics(await run('old', row), ['/我的权益']));
  }
  await run('old',row);
  assert.equal(state.legacy.length,row.access.canUseMeridian?2:1);
 }
});
test('only middleware advances next; DTO and transport errors never supplement a game request',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 const ready=rows.find(r=>r.state==='ready'&&r.operation==='view');
 for(const transport of [false,true]){
  const row={...ready,transport,v1:{data:{}},result:{...ready.result,data:{}}};
  const actual=await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.repeats,0);assert.equal(state.next,0);assert.deepEqual(bubbleSemantics(actual, ['/我的权益']), bubbleSemantics(await run('old',row), ['/我的权益']));
  assert.ok(inspectMessage(actual.flat()).commands.includes('/我的权益'));
 }
});
