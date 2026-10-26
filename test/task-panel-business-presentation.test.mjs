import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__taskPanel={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/taskPanel/res.ts';export {default as old} from 'old-panel';export {parseRobotTaskPanel as decode} from './src/api/bot/task-panel-view.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'task-panel',setup(b){
 b.onResolve({filter:/^\.\/subscriptionReminder$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^old-panel$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/task-panel-before-v2.ts.txt',import.meta.url),'utf8').replace("import { TAB_REGISTRY } from '@src/response/taskPanel/constants';", "import { TAB_REGISTRY as CURRENT_REGISTRY } from '@src/response/taskPanel/constants'; const TAB_REGISTRY = CURRENT_REGISTRY.filter(tab => !['master', 'companion'].includes(tab.key));"),resolveDir:resolve('src/response/taskPanel')}));
 b.onResolve({filter:/^@src\/api\/bot$/},()=>({path:resolve('src/api/bot/queries.ts')}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const sendTaskPanelSubscriptionReminder=async()=>{};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const getBackendRobotIdentity=async()=>({account:{status:'registered',playerId:1}});
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__taskPanel;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query=args.query;if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'query failed');return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__taskPanel;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessTaskPanel','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_TASK_PANEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,66);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('task panel retains selected original tabs and item bubbles',async()=>{
 for(const row of rows.filter(r=>r.state==='ready'&&!['master','companion'].includes(r.tab)))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'task-panel.view',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const original=await run('old',row,isPrivate);
  const oldNodes=original[0].find(node=>node.type==='Markdown').value;
  const heading=oldNodes.find(node=>node.type==='MD.bold'&&node.value!=='任务面板');
  assert.ok(heading,'selected category heading missing');
  heading.type='MD.text';
  assert.deepEqual(actual,original,row.state+' '+row.text);
  assert.equal(state.query.view,'selected');assert.equal(state.query.tab??'',row.tab==='auto'?'':row.tab);
  assert.ok(!JSON.stringify(actual).includes('/任务面板 自动'));
  assert.ok(!JSON.stringify(actual).includes('配置自动任务'));
 }
});
test('task panel middleware calls parent next; transport or invalid receipt ends with original failure bubble',async()=>{
 await run('current',rows.find(r=>r.state==='muted'),false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/任务面板',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('任务面板')); }state.transport=false;
});
test('task panel service refusal sends feedback and ends',async()=>{
 await run('current',rows.find(r=>r.state==='no-service'),false);
 assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);
 assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('任务面板服务尚未配置'));
});

const dailyRows=[...output.matchAll(/ROBOT_TASK_PANEL_DAILY=(.+)/g)].map(m=>JSON.parse(m[1]));
assert.equal(dailyRows.length,3);
test('daily social categories render server progress and target buttons in the same quote',async()=>{
 for(const row of dailyRows)for(const isPrivate of [false,true]){
  const sent=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.equal(state.legacyCalls,0);
  const md=sent[0].find(node=>node.type==='Markdown').value;
  const quotes=md.filter(node=>node.type==='MD.blockquote');
  const flat=JSON.stringify(sent);
  assert.ok(!flat.includes('/任务面板 自动'));
  if(row.state==='师门'){
   assert.ok(flat.includes('向阿月传功 — 1/3'));
   const gift=quotes.find(node=>JSON.stringify(node).includes('向阿月赐丹'));
   assert.ok(gift);assert.ok(JSON.stringify(gift).includes('/赐丹 2 培元丹'));assert.ok(JSON.stringify(gift).includes('/赐丹 2 筑基丹'));
   assert.ok(flat.includes('元力丹×1'));
  } else if(row.state==='道侣'){
   assert.ok(flat.includes('协作道侣灵田 — 2/5'));
   assert.ok(flat.includes('/查看灵田 2'));assert.ok(flat.includes('/赠送 2'));
   assert.ok(!flat.includes('/查看灵田 1'));assert.ok(!flat.includes('领取同心'));
  } else {
   assert.ok(flat.includes('暂未读到进度'));assert.ok(flat.includes('重试'));assert.ok(flat.includes('/任务面板 师门'));
  }
 }
});
test('hidden social aliases fall back to a populated visible category',async()=>{
 for(const row of rows.filter(r=>r.state==='ready'&&['master','companion'].includes(r.tab))){
  const sent=await run('current',row,false);
  const flat=JSON.stringify(sent);
  assert.ok(flat.includes('日常签到'));assert.ok(!flat.includes('/任务面板 师门'));assert.ok(!flat.includes('/任务面板 道侣'));
 }
});

test('daily task receipt validates both seven and nine category contracts',()=>{
 const row=dailyRows.find(r=>r.state==='师门');
 assert.equal(handlers.decode(row.result.data).tabs.length,9);
 const old=rows.find(r=>r.state==='ready'&&!r.tab);
 assert.equal(handlers.decode({view:old.v1.data,requestedTab:''}).tabs.length,7);
 for(const mutate of [
  d=>{d.view.tabs.pop()},
  d=>{d.view.tabs[0].tabKey='master'},
  d=>{d.view.tabs.find(t=>t.tabKey==='master').items[0].actionLabel=1},
  d=>{d.view.tabs.find(t=>t.tabKey==='master').items.find(i=>i.options).options[0].command=1},
  d=>{d.view.tabs.find(t=>t.tabKey==='master').items[0].priority=30},
  d=>{d.view.selection.tabKey='companion'}
 ]){
  const data=structuredClone(row.result.data);mutate(data);assert.throws(()=>handlers.decode(data));
 }
});
