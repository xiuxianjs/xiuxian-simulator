import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { joinMarkdownParts, renderMarkdownBlockquote } from 'alemonjs/markdown';
const state = globalThis.__skillEquipmentUX = { sent: [], writes: 0 };
const sdk = pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href;
const seam = `const s=globalThis.__skillEquipmentUX;
export const selects=[]; export const useMessage=()=>[{send:m=>s.sent.push(m.format.value)}];
export const createBackendRequestContext=()=>({});
export const getRobotHomeOverview=async()=>({success:true,branch:'business',middleware:{identity:{account:{playerId:1}},replies:[],contextWarnings:[]},data:{}});
export const sendMiddlewareReply=()=>{throw new Error('unexpected middleware reply');};
export const withBackendRepeatDetection=async(...a)=>a[3];
export const getBackendSkillBookDecomposeQuery=async()=>s.query;
export const getBackendEquipmentDecomposeQuery=async()=>s.query;
export const fetchGradeOptions=async()=>({code:'OK',data:{totalCount:650,grades:[{id:1,name:'下品',count:650}]}});
export const fetchGradeOptionsApp=fetchGradeOptions;
export const previewDecompose=async()=>({code:'OK',data:s.query.preview});
export const previewApp=previewDecompose;
export const executeDecompose=async()=>{s.writes++;return {code:'OK',data:s.result};};
export default async p=>{s.lastParams=p;if(s.batch){s.writes++;return {code:'OK',data:s.result};} return {code:'OK',data:s.data};};`;
const mocks = new Set(['@src/api/bot/robot-business','@src/response/mwBan','@src/response/mwFeatureTrack','@src/response/middlewareReply','@src/utils/useMessage','@src/response/config','@src/api/bot/context','@src/utils/backendRepeatDetector','@src/api/bot/skill-book-batch-decompose','@src/api/bot/equipment-batch-decompose','@src/response-apps/storage/newBag/skillBooks/app','@src/response-apps/storage/newBag/equipments/app','@src/response-apps/skillBook/mySkillBooks/app','@src/response-apps/message/me/app','@src/response-apps/skillBook/batchDecompose/app','@src/response-apps/equipment/batchDecompose/app']);
const built = await build({stdin:{contents:`export {default as home} from './src/response/message/me/res.ts';export {default as learned} from './src/response/skillBook/mySkillBooks/res.ts';export {default as books} from './src/response/storage/newBag/skillBooks/res.ts';export {default as equipment} from './src/response/storage/newBag/equipments/res.ts';export {default as bookBatch} from './src/response/skillBook/batchDecompose/res.ts';export {default as equipmentBatch} from './src/response/equipment/batchDecompose/res.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'business-seams',setup(b){b.onResolve({filter:/^file:\/\//},a=>({path:a.path,external:true}));b.onResolve({filter:/^alemonjs$/},()=>({path:'sdk',namespace:'seam'}));b.onResolve({filter:/.*/},a=>mocks.has(a.path)?{path:a.path,namespace:'seam'}:undefined);b.onLoad({filter:/.*/,namespace:'seam'},a=>({contents:a.path==='sdk'?`export * from ${JSON.stringify(sdk)};export const useEvent=()=>[{},()=>{throw new Error('unexpected parent next');}];export const useSubscribe=()=>[{mount:cb=>{globalThis.__skillEquipmentUX.confirm=cb;return 1;},cancel:()=>{}}];`:a.path==='@src/response/mwBan'||a.path==='@src/response/mwFeatureTrack'?'export default ()=>true;':a.path==='@src/response-apps/message/me/app'?'export default ()=>({code: "OK",data:globalThis.__skillEquipmentUX.data});':seam}));}}]});
const handlers = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const nodes=p=>p.find(x=>x.type==='Markdown').value;
const flatten=n=>n.flatMap(x=>x.type==='MD.blockquote'?flatten(x.value):[x]);
const commands=p=>flatten(nodes(p)).filter(n=>n.type==='MD.button').map(n=>n.options.data);
const render=n=>joinMarkdownParts(n,n.map(x=>x.type==='MD.blockquote'?renderMarkdownBlockquote(x.value,render):x.type==='MD.newline'?'\n':x.type==='MD.bold'?`**${x.value}**`:String(x.value??'')));
const samples=[];
async function run(handler,text,name){state.sent=[];await handler.current({UserId:'fixture',uid:7,isPrivate:true,MessageText:text});assert.equal(state.sent.length,1);const p=state.sent[0];samples.push({name,p});return p;}
const book={id:117433,skillBookId:1,displayName:'雷球术',name:'雷球术',grade:'二品',skillType:'战技',displayGrade:'二品',displaySkillType:'战技',isLocked:true,status:1,quantity:1,attributeParts:['物攻%(0.63%/3.48%)','法攻%(1.08%/4%)','暴击率(0.95%/3.7%)'],capabilities:[{kind:'unlock'},{kind:'viewDetail'}]};
test('bag keeps instance IDs, every term and only permitted local actions; bulk menu retains scope',async()=>{
 state.data={total:1,totalPages:1,items:[book],capabilities:[{kind:'lockAll',skillType:'战技'},{kind:'decomposeAll'}]};
 const p=await run(handlers.books,'/储物袋 功法 战技','储物袋 · 功法');
 for(const term of book.attributeParts)assert.ok(render(nodes(p)).includes(term));
 assert.ok(!commands(p).some(c=>c.includes('鉴定')));
 assert.doesNotMatch(render(nodes(p)), /未鉴定/);
 assert.ok(commands(p).includes('/解锁 功法 117433'));assert.match(render(nodes(p)), /【117433】 \[解锁\] \[详情\]\n「雷球术」 二品 · 战技\n\n> 物攻%/);assert.ok(!commands(p).includes('/学习功法 117433'));
 assert.ok(commands(p).includes('/储物袋 功法 战技 操作'));
 const m=await run(handlers.books,'/储物袋 功法 战技 操作','功法 · 批量处理');
 assert.ok(commands(m).includes('/锁定 功法 战技'));assert.ok(commands(m).includes('/一键分解功法'));
 state.data={total:1,totalPages:1,activeType:'武器',types:['武器'],items:[{...book,displayName:'青铜剑',equipmentId:2,displayEquipmentType:'武器',capabilities:[{kind:'unlock'},{kind:'viewDetail'}]}],capabilities:[{kind:'decomposeAll'}]};
 const e=await run(handlers.equipment,'/储物袋 装备 武器','储物袋 · 装备');assert.ok(commands(e).includes('/解锁 装备 117433'));assert.ok(!commands(e).includes('/分解装备 117433'));
});
test('both batch previews are capped; confirmation writes once and reports remainder without auto-draining',async()=>{
 for(const [handler,label,unit] of [[handlers.bookBatch,'功法','本'],[handlers.equipmentBatch,'装备','件']]){
  state.batch=true;state.writes=0;state.query={options:{},preview:{totalCount:650,processCount:300,remainingCount:350,gradeBreakdown:[{gradeName:'下品',count:650}],totalExp:600000,estimatedItems:[{name:'功法残页',amount:600}],totalYield:900}};
  state.result={decomposedCount:300,remainingCount:350,totalExp:600000,items:[{name:'功法残页',amount:600}],totalYield:900,details:[{name:'灵剑',grade:'三品',yield:3}]};
  const p=await run(handler,`/一键分解${label} 下品`,`${label} · 分解预览`);
  assert.equal(state.writes,0);assert.match(render(nodes(p)),/本次分解：300/);
  state.sent=[];await state.confirm({UserId:'fixture',uid:7,isPrivate:true,MessageText:'确认分解'},()=>{});
  assert.equal(state.writes,1);assert.equal(state.sent.length,1);const r=state.sent[0];samples.push({name:`${label} · 分解结果`,p:r});
  assert.ok(render(nodes(r)).includes(`已分解300${unit}，剩余350${unit}`));assert.ok(commands(r).includes(`/一键分解${label} 下品`));
 }
 state.batch=false;
 writeFileSync('/tmp/xiuxian-skill-equipment-panels.md',samples.map(({name,p})=>`## ${name}\n\n${render(nodes(p))}\n`).join('\n'));
});


test('learned home contains only slots; screen page two maps to data page one without repeated slots',async()=>{
 const learnedBook={id:117433,skillType:'战技',slotText:'雷球术',listText:'【117433】雷球术 · 二品 · 战技',attributeSummary:'物攻%(0.63%/3.48%)'};
 state.data={inUseBooks:[learnedBook],items:[learnedBook],total:6,totalPages:2,currentPage:1,proficiencyPoints:50,canUseFifthLayerFeature:true};
 const home=await run(handlers.learned,'/我的功法','我的功法 · 首页');
 assert.equal(state.lastParams.page,1);
 assert.ok(commands(home).includes('/切换战技'));
 assert.ok(commands(home).includes('/我的功法 2'));
 assert.ok(!commands(home).includes('/升级功法 117433 选择'));
 assert.ok(!render(nodes(home)).includes(learnedBook.attributeSummary));
 const first=await run(handlers.learned,'/我的功法 2','我的功法 · 列表第1页');
 assert.equal(state.lastParams.page,1);
 assert.ok(commands(first).includes('/升级功法 117433 选择'));
 assert.ok(commands(first).includes('/我的功法'));
 assert.ok(!commands(first).includes('/切换战技'));
 assert.match(render(nodes(first)),/列表第1\/2页/);
 state.data={...state.data,currentPage:2};
 await run(handlers.learned,'/我的功法 3','我的功法 · 列表第2页');
 assert.equal(state.lastParams.page,2);
 state.data={...state.data,inUseBooks:[],items:[],total:0,totalPages:0,currentPage:1};
 const empty=await run(handlers.learned,'/我的功法','我的功法 · 空列表');
 assert.ok(!commands(empty).includes('/我的功法 2'));
 writeFileSync('/tmp/xiuxian-skill-equipment-panels.md',samples.map(({name,p})=>`## ${name}\n\n${render(nodes(p))}\n`).join('\n'));
});


test('home notification bar contains pending actions only, never permanent history',async()=>{
 state.data={notifications:[],absenceDays:null,atmosphere:{text:null,kind:'none'},profile:{uid:7,name:'道友',title:'无',genderText:'男',nextGenderText:'女',signature:''},stats:{combatPower:100,realmName:'炼气',experienceText:'10/100',qi:{current:1,cap:10,recoverText:''},mental:{current:1,cap:10,recoverText:''}},actions:{isEarlyStarter:true,socialTargetUid:7,renameValue:'道友'}};
 const quiet=await run(handlers.home,'/我','主页 · 无待处理通知');
 assert.ok(!commands(quiet).includes('/我的通知'));
 assert.ok(!render(nodes(quiet)).includes('通知记录'));
 assert.match(render(nodes(quiet)), /\[宗门\] \[洞府\] \[师门\] \[道侣\]\n\[背包\] \[组队\] \[帮助\] \[更多\]/);
 state.data={...state.data,notifications:[{type:'UNREAD_EMAIL',count:2}]};
 const pending=await run(handlers.home,'/我','主页 · 待处理邮件');
 assert.ok(commands(pending).includes('/我的邮件'));
 assert.ok(!commands(pending).includes('/我的通知'));
 state.data={...state.data,notifications:[{type:'UNREAD_EMAIL',count:0}]};
 const none=await run(handlers.home,'/我','主页 · 已处理通知');
 assert.ok(!commands(none).includes('/我的邮件'));
 writeFileSync('/tmp/xiuxian-skill-equipment-panels.md',samples.map(({name,p})=>`## ${name}\n\n${render(nodes(p))}\n`).join('\n'));
});
