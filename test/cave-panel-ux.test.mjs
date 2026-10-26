import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';

import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {joinMarkdownParts,renderMarkdownBlockquote} from 'alemonjs/markdown';
const state=globalThis.__cavePanelUX={sent:[],preview:{found:true,message:'尚余60分钟',plotIndex:1,lingfeiCount:0,greenBottleCount:3,maxLingfei:0,maxGreenBottle:2}};
const framework = createPresentationHarness(state);
const seam=`const s=globalThis.__cavePanelUX;
export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';
export const createBackendRequestContext=()=>({});
export const parseProfessionDashboard=v=>v;
export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{s.calls?.push({op,args});if(s.response)return {handled:false,data:s.response};if(s.feedback){await feedback({text:'需要选择',title:'选择',buttons:[]});return{handled:true}}return {handled:false,data:op==='cave.accelerate'?{mode:'preview',preview:s.preview}:{access:{canUseProfessionAndCave:true},lingzhi:{unlocked:true,title:'初阶',level:1,exp:10,nextExpRequired:100,dailyExpGained:2,dailyExpCap:50,maxPlots:2,maxFieldGradeLabel:'凡阶',yieldBonus:0}}}};
export const getBackendCaveAccelerationPreview=async()=>s.preview;
export const executeBackendCaveCommand=async()=>{throw Error('preview wrote gameplay');};
export const parseBackendCavePlantQuery=v=>v;export const parseBackendCaveVisit=v=>v;export const parseBackendCaveNearby=v=>v;export const sendCaveCommandFallback=()=>{};export const presentBackendCavePlots=p=>p;
export default async()=>({code:'OK',data:{access:{canUseProfessionAndCave:true},lingzhi:{unlocked:true,title:'初阶',level:1,exp:10,nextExpRequired:100,dailyExpGained:2,dailyExpCap:50,maxPlots:2,maxFieldGradeLabel:'凡阶',yieldBonus:0}}});`;
const mocks=new Set(['@src/api/bot/cave-visit-queries','@src/api/bot/cave-nearby-queries','@src/response/robotBusiness','@src/api/bot/profession-dashboard-query','@src/utils/useMessage','@src/response/config','@src/api/bot/context','@src/api/bot/cave-plot-actions','@src/api/bot/cave-command','@src/response/cavePlot/info/res','@src/response-apps/profession/myProfession/app']);
const built=await build({stdin:{contents:"export * from './src/response/cavePlot/pagination.ts';export {cavePlantArguments} from './src/api/bot/cave-robot-command.ts';export {resolveRobotTarget} from './src/utils/targetUid.ts';export {default as plant} from './src/response/cavePlot/plant/res.ts';export {default as visit} from './src/response/cavePlot/visit/res.ts';export {default as nearby} from './src/response/cavePlot/nearby/res.ts';export * from './src/response/cavePlot/render.ts';export {default as action} from './src/response/cavePlot/action/res.ts';export {default as profession} from './src/response/profession/myProfession/res.ts';export {default as activate} from './src/response/caveFormation/activate/res.ts';export {default as remove} from './src/response/caveFormation/remove/res.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'business-seams',setup(b){b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));b.onResolve({filter:/.*/},a=>mocks.has(a.path)?{path:a.path,namespace:'seam'}:undefined);b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:seam}));}}]});
const {sendSelfCavePlotPage,sendPlantSeedPromptPage,sendVisitedCavePlotPage,action,profession,activate,remove,parseCavePage,paginateCaveItems,cavePageForPlot,cavePlantArguments,resolveRobotTarget,plant,visit,nearby}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const nodes=p=>p.find(x=>x.type==='Markdown').value;
const flatten=n=>n.flatMap(x=>x.type==='MD.blockquote'?flatten(x.value):[x]);
const commands=p=>flatten(nodes(p)).filter(n=>n.type==='MD.button').map(n=>n.options.data);
const render=n=>joinMarkdownParts(n,n.map(x=>x.type==='MD.blockquote'?renderMarkdownBlockquote(x.value,render):x.type==='MD.newline'?'\n':x.type==='MD.bold'?`**${x.value}**`:String(x.value??'')));
const samples=[];
function capture(name,fn){state.sent=[];fn();assert.equal(state.sent.length,1);const p=state.sent[0];samples.push({name,p});return p;}
const plots=[{plotIndex:1,plotState:'cultivated',title:'聚灵草',detail:'缺水，尚余1小时\n升级至2阶需消耗【灵土】x10。',actions:[{label:'浇灌',command:'/浇灌 1'},{label:'加速',command:'/灵田加速 1'},{label:'升级',command:'/升级灵田 1'}]},{plotIndex:2,plotState:'cultivated',title:'空闲灵田',detail:'可播种',actions:[{label:'播种',command:'/播种 2'}]},{plotIndex:3,plotState:'unlockable',title:'未开垦灵田',detail:'灵锄×1、灵土×5',actions:[{label:'开垦',command:'/开垦 3'}]},{plotIndex:4,plotState:'locked',title:'未解锁灵田',detail:'',actions:[]}];
const options={bid:'fixture',isPrivate:true,title:'洞府灵田',plots,message:{send:m=>state.sent.push(m.format.value)}};
test('daily home exposes new land, local care and batch planting without advanced action clutter',()=>{const p=capture('洞府灵田',()=>sendSelfCavePlotPage(options));const c=commands(p);for(const cmd of ['/开垦所有','/开垦 3','/浇灌 1','/一键浇灌','/播种','/我的职业 灵药师','/我的灵田 经营'])assert.ok(c.includes(cmd));assert.ok(!c.includes('/灵田加速 1'));assert.ok(!c.includes('/升级灵田 1'));assert.match(render(nodes(p)),/待照料1块 · 空闲1块 · 可开垦1块/);assert.doesNotMatch(render(nodes(p)),/未解锁灵田/);});
test('plot detail retains exact server actions and cost text; management retains history and formations',()=>{const p=capture('地块详情',()=>sendSelfCavePlotPage({...options,selectedPlotIndex:1}));assert.ok(commands(p).includes('/升级灵田 1'));assert.match(render(nodes(p)),/升级至2阶需消耗【灵土】x10。/);assert.ok(commands(p).includes('/灵田加速 1'));const m=capture('药圃经营',()=>sendSelfCavePlotPage({...options,showManagement:true}));for(const cmd of ['/洞府阵法','/附近灵田','/灵田记录','/我的灵田 操作'])assert.ok(commands(m).includes(cmd));});
test('seed selection is focused, carries exact target, and offers inventory recovery when empty',()=>{const p=capture('播种灵种',()=>sendPlantSeedPromptPage({...options,targetLabel:'全部空闲灵田',remainingPlots:2,commandPrefix:'/播种',options:[{seedName:'聚灵草种',cropName:'聚灵草',quantity:3,matureHours:12}]}));assert.ok(commands(p).includes('/播种 聚灵草种'));assert.doesNotMatch(render(nodes(p)),/指令：|缺水/);const empty=capture('无灵种',()=>sendPlantSeedPromptPage({...options,targetLabel:'第2块灵田',remainingPlots:1,commandPrefix:'/播种 2',options:[]}));assert.ok(commands(empty).includes('/储物袋'));assert.ok(commands(empty).includes('/我的灵田 页 1'));});
test('acceleration preview offers exact bounded quantities and never advertises unavailable items',async()=>{state.sent=[];const e={name:'message.create',UserId:'fixture',uid:1,isPrivate:true,MessageText:'/灵田加速 1'};await framework.run(action, e, ()=>{});const p=state.sent[0];samples.push({name:'灵田加速',p});assert.ok(commands(p).includes('/灵田加速 1 小绿瓶 1'));assert.ok(commands(p).includes('/灵田加速 1 小绿瓶 2'));assert.ok(!commands(p).some(c=>c.includes(' 灵肥')));});
test('dedicated lingzhi page shows growth, automatic leveling and accurate cap scope without alchemy',async()=>{state.sent=[];const e={name:'message.create',UserId:'fixture',uid:1,isPrivate:true,MessageText:'/我的职业 灵药师'};await framework.run(profession, e, ()=>{});const p=state.sent[0];samples.push({name:'草木之道',p});assert.match(render(nodes(p)),/成长经验：10 \/ 100/);assert.doesNotMatch(render(nodes(p)),/自动提升/);assert.match(render(nodes(p)),/收获经验不受此额度限制/);assert.doesNotMatch(render(nodes(p)),/炼丹师/);writeFileSync('/tmp/xiuxian-cave-panels.md',samples.map(({name,p})=>`## ${name}\n\n${render(nodes(p))}\n\n[我] [战] [本] [动] [店]\n`).join('\n'));});


test('visiting retains every permitted local action in its quote block', () => {
  const p = capture('访友灵田', () => sendVisitedCavePlotPage({ ...options, title: '访友灵田', overview: {
    ownerUid: 2, ownerName: '道友', relationLabel: '好友', auraText: '充盈', stolenStatusText: '无人光顾', canViewPlots: true,
    plots: [{ ...plots[0], actions: [{ label: '协作浇灌', command: '/协作灵田 2 浇灌 1' }, { label: '协作除虫', command: '/协作灵田 2 除虫 1' }] }], recentLogs: []
  }, footer: [{ label: '返回灵田', command: '/我的灵田' }] }));
  assert.ok(commands(p).includes('/协作灵田 2 浇灌 1'));
  assert.ok(commands(p).includes('/协作灵田 2 除虫 1'));
  writeFileSync('/tmp/xiuxian-cave-panels.md', samples.map(({ name, p }) => `## ${name}\n\n${render(nodes(p))}\n\n[我] [战] [本] [动] [店]\n`).join('\n'));
});


test('batch cultivate appears on operations only while server supplies cultivate actions',()=>{
 const p=capture('灵田操作',()=>sendSelfCavePlotPage({...options,showOperations:true}));
 assert.ok(commands(p).includes('/开垦所有'));
 const full=capture('无地可开垦',()=>sendSelfCavePlotPage({...options,plots:plots.filter(p=>p.plotState==='cultivated')}));
 assert.ok(!commands(full).includes('/开垦所有'));
});

test('daily overview omits repeated upgrade instructions but detail keeps costs and every other state',()=>{
 const extra={...plots[0],detail:plots[0].detail+'\n灵气充盈'};
 const home=capture('首页精简',()=>sendSelfCavePlotPage({...options,plots:[extra]}));
 assert.doesNotMatch(render(nodes(home)),/升级至|可收获0块|空闲0块|可开垦0块/);
 assert.match(render(nodes(home)),/缺水，尚余1小时/);assert.match(render(nodes(home)),/灵气充盈/);
 const detail=capture('完整消耗',()=>sendSelfCavePlotPage({...options,plots:[extra],selectedPlotIndex:1}));
 assert.match(render(nodes(detail)),/升级至2阶需消耗【灵土】x10/);assert.ok(commands(detail).includes('/升级灵田 1'));
 const operations=capture('操作页',()=>sendSelfCavePlotPage({...options,showOperations:true}));
 assert.doesNotMatch(render(nodes(operations)),/仅展示当前可执行/);
});
test('seed choice keeps quantities, maturity and exact plot command without repeated instructions',()=>{
 const p=capture('简洁选种',()=>sendPlantSeedPromptPage({...options,targetLabel:'第2块灵田',remainingPlots:1,commandPrefix:'/播种 2',options:[{seedName:'聚灵草种',cropName:'聚灵草',quantity:3,matureHours:12}]}));
 assert.match(render(nodes(p)),/库存3颗 · 12小时成熟/);assert.ok(commands(p).includes('/播种 2 聚灵草种'));
 assert.doesNotMatch(render(nodes(p)),/请选择|可选灵种/);
 const empty=capture('选种为空',()=>sendPlantSeedPromptPage({...options,targetLabel:'第2块灵田',remainingPlots:1,commandPrefix:'/播种 2',options:[]}));
 assert.ok(commands(empty).includes('/商店 万宝楼'));assert.ok(commands(empty).includes('/储物袋'));
});
test('stone acceleration preserves exact quoted costs, mutation risk and cooldown time',async()=>{
 const saved=state.preview;
 state.preview={...saved,spiritStoneEnabled:true,spiritStone:100,maxSpiritStone:1,stoneCost:7,ripenCost:25,canRipen:true,ripenNextAt:'2026-10-20T10:00:00+08:00',stoneReason:''};
 state.sent=[];
 await framework.run(action, {name:'message.create',UserId:'fixture',uid:1,isPrivate:true,MessageText:'/灵田加速 1'}, ()=>{});
 const p=state.sent[0];const text=render(nodes(p));
 assert.match(text,/7灵石/);assert.match(text,/25灵石/);assert.match(text,/本轮不触发变异/);assert.match(text,/下次催熟：2026-10-20 10:00:00/);
 assert.ok(commands(p).includes('/灵田加速 1 灵石 1'));assert.ok(commands(p).includes('/灵田加速 1 催熟 1'));assert.doesNotMatch(text,/旧道具|上方灵石方案|每块田24小时/);
 state.preview=saved;
});

test('formation empty arguments lead to existing inventory/list buttons rather than command examples',async()=>{
 state.feedback=true;
 for(const [handler,command,target] of [[activate,'/激活阵盘','/储物袋 道具 其它 洞府阵法'],[remove,'/移除阵法','/洞府阵法']]){
  state.sent=[];const e={name:'message.create',UserId:'fixture',uid:1,isPrivate:true,MessageText:command};
  await framework.run(handler, e, ()=>{});
  assert.equal(state.sent.length,1);assert.ok(commands(state.sent[0]).includes(target));assert.doesNotMatch(render(nodes(state.sent[0])),/用法：|示例：/);
 }
 state.feedback=false;
});


const manyPlots = Array.from({length:12},(_,i)=>({...plots[0],plotIndex:(i+1)*3,title:`灵草${i+1}`,actions:[{label:'浇灌',command:`/浇灌 ${(i+1)*3}`}]}));
const manySeeds = Array.from({length:12},(_,i)=>({seedName:`灵种${i+1}`,quantity:20,matureHours:12}));
const visitOverview={ownerUid:987,ownerName:'道友',relationLabel:'好友',auraText:'充盈',stolenStatusText:'无人光顾',canViewPlots:true,plots:manyPlots,recentLogs:[]};
test('field pagination keeps original plot targets, total count, full-scope batch actions and detail return page',()=>{
 const p=capture('灵田第2页',()=>sendSelfCavePlotPage({...options,plots:manyPlots,page:2}));
 assert.match(render(nodes(p)),/第2\/3页，共12条/);
 assert.deepEqual(commands(p).filter(c=>/^\/浇灌 /.test(c)),manyPlots.slice(5,10).map(p=>`/浇灌 ${p.plotIndex}`));
 for(const c of ['/我的灵田 页 1','/我的灵田 页 3','/一键浇灌'])assert.ok(commands(p).includes(c));
 const last=capture('灵田末页',()=>sendSelfCavePlotPage({...options,plots:manyPlots,page:99}));
 assert.match(render(nodes(last)),/第3\/3页/);assert.equal(commands(last).filter(c=>/^\/浇灌 /.test(c)).length,2);
 const detail=capture('跨页详情',()=>sendSelfCavePlotPage({...options,plots:manyPlots,selectedPlotIndex:24}));
 assert.ok(commands(detail).includes('/我的灵田 页 2'));assert.equal(cavePageForPlot(manyPlots,24),2);
 const operations=capture('操作第2页',()=>sendSelfCavePlotPage({...options,plots:[...manyPlots,{...plots[2],plotIndex:99}],showOperations:true,page:2}));
 assert.equal(commands(operations).filter(c=>/^\/浇灌 /.test(c)).length,5);
 assert.ok(commands(operations).includes('/我的灵田 操作 页 3'));assert.ok(commands(operations).includes('/开垦所有'));
});
test('visiting paginates visible cultivated plots only and never leaks hidden page counts',()=>{
 const p=capture('访友第2页',()=>sendVisitedCavePlotPage({...options,overview:{...visitOverview,plots:[plots[3],...manyPlots,plots[2]]},page:2}));
 assert.match(render(nodes(p)),/第2\/3页，共12条/);assert.ok(commands(p).includes('/查看灵田 987 页 3'));
 const hidden=capture('隐藏灵田',()=>sendVisitedCavePlotPage({...options,overview:{...visitOverview,canViewPlots:false,summary:'未开放'},page:2}));
 assert.doesNotMatch(render(nodes(hidden)),/第.*页|灵草|共12条/);assert.ok(!commands(hidden).some(c=>c.includes(' 页 ')));
});
test('seed pages preserve selected plot and never use a seed in navigation commands',()=>{
 const p=capture('灵种第2页',()=>sendPlantSeedPromptPage({...options,targetLabel:'第24块灵田',remainingPlots:1,commandPrefix:'/播种 24',options:manySeeds,page:2}));
 assert.deepEqual(commands(p).filter(c=>/^\/播种 24 灵种/.test(c)),manySeeds.slice(5,10).map(s=>`/播种 24 ${s.seedName}`));
 assert.ok(commands(p).includes('/播种 24 页 1'));assert.ok(commands(p).includes('/播种 24 页 3'));
 for(const text of ['/播种 页 2','/播种 24 页 2']){
  const parsed=parseCavePage(text);assert.equal(parsed.page,2);assert.equal(cavePlantArguments(parsed.text).seedName,null);
 }
 assert.equal(cavePlantArguments(parseCavePage('/播种 24 页 2').text).plotIndex,'24');
 for(const text of ['/我的灵田 页 -4','/我的灵田 页 无效','/我的灵田 页'])assert.equal(parseCavePage(text).page,1);
 assert.equal(paginateCaveItems([],99,'/灵田 页 {page}').nav,undefined);
});
test('page requests make exactly one read or selection request with no seed or UID confusion',async()=>{
 try {
  state.calls=[];
  state.response={mode:'select',options:{plotIndex:24,remainingPlots:1,options:manySeeds},overview:{plots:manyPlots}};
  let e={name:'message.create',UserId:'fixture',isPrivate:true,MessageText:'/播种 24 页 2'};
  state.sent=[];await framework.run(plant, e, ()=>{});
  assert.deepEqual(state.calls,[{op:'cave.plant',args:{plotIndex:'24',seedName:null}}]);
  assert.match(render(nodes(state.sent[0])),/第2\/3页/);
  state.calls=[];state.sent=[];state.response=visitOverview;e={...e,MessageText:'/查看灵田 987 页 2'};
  await framework.run(visit, e, ()=>{});
  assert.deepEqual(state.calls,[{op:'cave.visit',args:{target:{uid:987}}}]);assert.match(render(nodes(state.sent[0])),/第2\/3页/);
  assert.deepEqual(await resolveRobotTarget(parseCavePage('/查看灵田 页 2').text,{findOne:async()=>({count:1,data:{UserId:'friend-bid'}})}),{bid:'friend-bid'});
  state.calls=[];state.sent=[];state.response={players:Array.from({length:12},(_,i)=>({ownerId:i+20,ownerName:`道友${i}`,relationLabel:'好友',auraText:'充盈',stolenStatusText:'无人光顾',canSteal:false}))};
  e={...e,MessageText:'/附近灵田 页 2'};await framework.run(nearby, e, ()=>{});
  assert.deepEqual(state.calls,[{op:'cave.nearby',args:{}}]);assert.match(render(nodes(state.sent[0])),/第2\/3页，共12条/);
  assert.deepEqual(commands(state.sent[0]).filter(c=>c.startsWith('/查看灵田 ')),[25,26,27,28,29].map(id=>`/查看灵田 ${id}`));
 } finally {delete state.calls;delete state.response;}
});

test('single-plot mutation returns to the page containing its original plot',async()=>{
 try {
  state.calls=[];state.sent=[];state.response={mode:'result',result:{message:'浇灌成功',overview:{plots:manyPlots}}};
  const e={name:'message.create',UserId:'fixture',isPrivate:true,MessageText:'/浇灌 24'};
  await framework.run(action, e, ()=>{});
  assert.equal(state.calls.length,1);assert.equal(state.calls[0].args.plotIndex,'24');
  assert.match(render(nodes(state.sent[0])),/第2\/3页/);assert.ok(commands(state.sent[0]).includes('/浇灌 24'));
 } finally {delete state.calls;delete state.response;}
});
