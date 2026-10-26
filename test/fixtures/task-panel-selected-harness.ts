import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync,readFileSync,existsSync,readdirSync } from 'node:fs';
import axios from '../../node_modules/axios/index.js';
import { getConfig,logger,withEventContext } from '../../node_modules/alemonjs/lib/index.js';
import { getDirectSend,setDirectSend } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves,actionRequestTimeouts } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import { seedEventBackendRobotIdentity } from '../../src/api/bot/identity.ts';
import { parseTabKey } from '../../src/response/taskPanel/parseTab.ts';
import current from '../../src/response/taskPanel/res.ts';

import frozen from './task-panel-selected-res-before.ts';
import { getBackendTaskPanelView as frozenHelper } from './task-panel-selected-helper-before.ts';
import { getBackendTaskPanelView } from '../../src/api/bot/task-panel-view.ts';
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
const keys=['checkin','activity','cultivation','dungeon','guild','event','auto'];
const full=()=>({defaultTabKey:'activity',tabs:keys.map((tabKey,i)=>({tabKey,tabName:['签到','活跃','修炼','副本','宗门','活动','自动'][i],visible:true,hasActionable:i===1,items:Array.from({length:5},(_,j)=>({label:`${tabKey}合成条目${j}`,statusText:'当前可执行',status:'ACTIONABLE',priority:10,visible:j!==4,command:`/合成${tabKey}${j}`}))}))});
function project(d:any,param:string){const parsed=param?parseTabKey(param):null;let key=parsed??d.defaultTabKey;const target=d.tabs.find((t:any)=>t.tabKey===key);if(!target||!target.visible)key=d.tabs.find((t:any)=>t.visible)?.tabKey??'';return{...clone(d),selection:{tabKey:key||null},tabs:d.tabs.map((t:any)=>({...clone(t),items:t.tabKey===key?t.items:[]}))};}
test('current full frozen handler accepts one selected tab with metadata retained; source proposal only',async t=>{
 t.mock.getter(getConfig(),'value',()=>({'xiuxian-game':{backend:{api_url:'https://task-panel-proposal.test',robot_auth_token:'synthetic-only'}}}));for(const m of ['info','warn','error'] as const)t.mock.method(logger,m,()=>{});
 
 let raw:any,calls=0,format:any,lastConfig:any;t.mock.method(axios,'create',()=>({request:async(c:any)=>{calls++;lastConfig=c;assert.match(new URL(c.url).pathname,/task-panel\/view$/);return{status:200,headers:{},data:JSON.stringify({data:raw})};}}));
 const prior=getDirectSend();t.after(()=>{if(prior)setDirectSend(prior)});
 setDirectSend(e=>{format=clone(e.payload.input.params.format);setImmediate(()=>{clearTimeout(actionRequestTimeouts.get(e.id));actionRequestTimeouts.delete(e.id);const done=actionRequestResolves.get(e.id);actionRequestResolves.delete(e.id);done?.([{code:2000,message:'synthetic',data:null}]);});});
 let serial=0;const event=(param:string,priv:boolean):any=>{const e={name:'message.create',Platform:'qq-bot',BotId:'synthetic',UserId:'synthetic-one',uid:1,MessageId:`synthetic-${++serial}`,MessageText:`/任务面板 ${param}`,isPrivate:priv,Target:{scope:priv?'c2c':'group',targetId:'synthetic-target'}};seedEventBackendRobotIdentity(e,{bid:e.UserId,account:{status:'registered',playerId:1}} as any);return e;};
 const run=async(h:typeof current,e:any)=>{calls=0;format=undefined;await withEventContext(e,()=>{},()=>h.current(e,()=>{}));await new Promise<void>(r=>setImmediate(r));assert.equal(calls,1);return format;};
 let cases=0;const byteCases: Array<{full_bytes:number;proposal_bytes:number;full_items:number;selected_items:number}>=[];
 for(const visibility of ['normal','event-hidden','default-hidden','all-hidden'])for(const param of ['','签到','修炼','活跃','副本','宗门','活动','自动','checkin','NO_SUCH_TAB',' 活跃 '])for(const priv of [false,true]){
  const d=full();if(visibility==='event-hidden')d.tabs[5].visible=false;if(visibility==='default-hidden')d.tabs[1].visible=false;if(visibility==='all-hidden')d.tabs.forEach(t=>t.visible=false);
  const e=event(param,priv);raw=d;const before=await run(frozen,e);raw=project(d,param);const after=await run(current,e);assert.deepEqual(after,before);cases++;
  if(visibility==='normal'&&param==='活跃'&&!priv){byteCases.push({full_bytes:Buffer.byteLength(JSON.stringify(d)),proposal_bytes:Buffer.byteLength(JSON.stringify(raw)),full_items:d.tabs.reduce((n,t)=>n+t.items.length,0),selected_items:raw.tabs.reduce((n:any,t:any)=>n+t.items.length,0)});writeFileSync('/tmp/task-panel-selected-proposal/bubble.json',JSON.stringify(after,null,2));}
 }
 // Current full parser validates even undisplayed items; selected projection would isolate their errors.
 raw=full();raw.tabs[0].items[0].priority='bad';await assert.rejects(getBackendTaskPanelView('synthetic-one',1));raw=project(raw,'活跃');await getBackendTaskPanelView('synthetic-one',1,{tabKey:'activity'});
 raw=full();raw.tabs[1].items[0].priority='bad';raw=project(raw,'活跃');await assert.rejects(getBackendTaskPanelView('synthetic-one',1));
 raw=project(full(),'活跃');raw.tabs[0].visible='bad';await assert.rejects(getBackendTaskPanelView('synthetic-one',1));

 // New selected query is actually serialized by the existing core and preserves actor headers.
 raw=project(full(),'活跃');await getBackendTaskPanelView('synthetic-one',1,{tabKey:'activity'});
 assert.equal(new URL(lastConfig.url).searchParams.get('view'),'selected');assert.equal(new URL(lastConfig.url).searchParams.get('tab'),'activity');
 assert.equal(lastConfig.headers['x-bid'],'synthetic-one');
 const rejectMutations=[
  (d:any)=>{d.selection=null;},(d:any)=>{d.selection.tabKey='auto';},
  (d:any)=>{delete d.selection.tabKey;},(d:any)=>{d.tabs[0].tabKey=d.tabs[1].tabKey;},
  (d:any)=>{d.defaultTabKey='BAD';},(d:any)=>{d.tabs[0].tabName=1;},
  (d:any)=>{d.tabs[0].hasActionable=1;},(d:any)=>{d.tabs[0].items=[full().tabs[0].items[0]];},
  (d:any)=>{d.tabs[1].items[0].command=1;},(d:any)=>{d.tabs[1].items[0].status='BAD';},
  (d:any)=>{d.tabs[1].items[0].visible='bad';},(d:any)=>{d.tabs[1].items[0].label=null;}
 ];
 for(const mutate of rejectMutations){raw=project(full(),'活跃');mutate(raw);await assert.rejects(getBackendTaskPanelView('synthetic-one',1,{tabKey:'activity'}));}
 // Default and old-service fallback preserve original per-tab metadata/item error precedence.
 for(const selected of [undefined,{tabKey:'activity'}]){
  raw=full();raw.tabs[0].items[0].priority='bad';raw.tabs[1].tabName=1;
  await assert.rejects(frozenHelper('synthetic-one',1),{message:'任务面板条目响应不完整'});
  await assert.rejects(getBackendTaskPanelView('synthetic-one',1,selected),{message:'任务面板条目响应不完整'});
 }
 // Explicit selected mode validates all navigation first; this new-mode precedence is intentional.
 raw=project(full(),'活跃');raw.tabs[1].items[0].priority='bad';raw.tabs[2].tabName=1;
 await assert.rejects(frozenHelper('synthetic-one',1),{message:'任务面板条目响应不完整'});
 await assert.rejects(getBackendTaskPanelView('synthetic-one',1,{tabKey:'activity'}),{message:'任务面板 Tab 响应不完整'});
 raw=full();raw.selection=null;raw.tabs[0].items[0].priority='bad';raw.tabs[1].tabName=1;
 await assert.rejects(getBackendTaskPanelView('synthetic-one',1),{message:'任务面板条目响应不完整'});
 // Default/full ignores unsolicited malformed metadata; old server selected fallback remains strict.
 raw=full();raw.selection={tabKey:'BAD'};await getBackendTaskPanelView('synthetic-one',1);
 raw=full();await getBackendTaskPanelView('synthetic-one',1,{tabKey:'activity'});
 raw=full();raw.tabs[0].items[0].priority='bad';await assert.rejects(getBackendTaskPanelView('synthetic-one',1,{tabKey:'activity'}));
 let oldServerCases=0;
 for(const param of ['','签到','活跃','修炼','副本','宗门','活动','自动','NO_SUCH_TAB'])for(const priv of [false,true]){
  const e=event(param,priv);raw=full();const before=await run(frozen,e);raw=full();const after=await run(current,e);assert.deepEqual(after,before);oldServerCases++;
 }
 let actualGoCases=0;const goFixtures=['/tmp/task-panel-selected-service-full.json',...readdirSync('/tmp').filter(x=>/^task-panel-selected-service-failure-\d+\.json$/.test(x)).map(x=>'/tmp/'+x)].filter(existsSync);
 for(const file of goFixtures)for(const param of ['', '签到','活跃','修炼','副本','宗门','活动','自动','NO_SUCH_TAB'])for(const priv of [false,true]){
  const d=JSON.parse(readFileSync(file,'utf8'));const e=event(param,priv);raw=d;const before=await run(frozen,e);raw=project(d,param);const after=await run(current,e);assert.deepEqual(after,before);actualGoCases++;
  if(file.endsWith('-full.json')&&param==='活跃'&&!priv)writeFileSync('/tmp/task-panel-selected-proposal/actual-service-bubble.json',JSON.stringify(after,null,2));
 }
 let actualSelectedCases=0;
 const actualSelectedPath='/tmp/task-panel-selected-service-selected.json';
 if(existsSync(actualSelectedPath))for(const priv of [false,true]){
  const d=JSON.parse(readFileSync('/tmp/task-panel-selected-service-full.json','utf8'));
  const selected=JSON.parse(readFileSync(actualSelectedPath,'utf8'));
  const e=event('活跃',priv);raw=d;const before=await run(frozen,e);raw=selected;const after=await run(current,e);assert.deepEqual(after,before);actualSelectedCases++;
  if(!priv)writeFileSync('/tmp/task-panel-selected-installed-actual-go-bubble.json',JSON.stringify(after,null,2));
 }
 writeFileSync('/tmp/task-panel-selected-installed-proof-result.json' ,JSON.stringify({complete_Format_cases:cases,handler_executions:cases*2,actual_Go_fixture_Format_cases:actualGoCases,actual_Go_selected_Format_cases:actualSelectedCases,old_server_complete_Format_cases:oldServerCases,strict_rejection_cases:rejectMutations.length,actual_Go_fixture_paths:goFixtures,business_HTTP_each:1,event_identity:'seeded from aggregate; no identity HTTP',byteCases,error_boundary:'explicit new mode may isolate nonselected bad item fields; selected items and all navigation metadata remain strict',fixture:'synthetic valid current DTO; real installed helper/App/res and SDK Format; proposed DTO only, server not implemented',SQL_Redis_runtime_not_measured:true,real_QQ:false},null,2));
});
