import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendCompanionInfo,parseCompanionInfo} from '../src/api/bot/companion-info-queries';
import {getBackendCompanionTasks,parseCompanionTasks} from '../src/api/bot/companion-tasks-queries';
import {getBackendGiftRecords,parseBackendGiftRecords} from '../src/api/bot/queries';
import {parseRobotCompanionInfo,parseRobotCompanionTasks,parseRobotGiftRecords} from '../src/api/bot/companion-robot-query';
import {presentCompanionInfo,presentCompanionTasks} from '../src/utils/companionQueryPresentation';
import InfoApp from '../src/response-apps/companion/info/app';
import TasksApp from '../src/response-apps/companion/dailyTask/app';
import GiftsApp from '../src/response-apps/companion/giftRecords/app';

test('actual v1 companion SDK/App contracts match extracted pure v2 presentation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_QUERY_V1=([^|]+)\|(.+)/g)].map(m=>({op:m[1],body:JSON.parse(m[2])}));assert.equal(rows.length,12);
 mockBackendConfig(t,{api_url:'https://companion-query.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify(payload)}}}));
 for(const row of rows){payload=row.body;calls.length=0;
  if(row.op==='companion.info'){assert.deepEqual(await getBackendCompanionInfo('player',1),parseCompanionInfo(row.body.data));assert.deepEqual(await InfoApp({bid:'player',uid:1}),presentCompanionInfo(parseCompanionInfo(row.body.data)));assert.deepEqual(parseRobotCompanionInfo(row.body.data),(await InfoApp({bid:'player',uid:1})).data);assert.equal(calls.length,3);}
  else if(row.op==='companion.tasks'){assert.deepEqual(await getBackendCompanionTasks('player',1),parseCompanionTasks(row.body.data));assert.deepEqual(await TasksApp({bid:'player',uid:1,args:''}),presentCompanionTasks(parseCompanionTasks(row.body.data),''));assert.deepEqual(parseRobotCompanionTasks({...row.body.data,mode:'tasks'}),await TasksApp({bid:'player',uid:1,args:''}));assert.equal(calls.length,3);}
  else{assert.deepEqual(await getBackendGiftRecords('player',1,'all',1,5),parseBackendGiftRecords(row.body.data));assert.deepEqual(await GiftsApp({bid:'player',uid:1,mode:'all',page:1}),{code:'OK',data:parseRobotGiftRecords(row.body.data,'all')});assert.equal(calls.length,2);}
  for(const call of calls)assert.equal(new URL(call.url).pathname,'/api/v1/players/1/'+(row.op==='companion.info'?'companion':row.op==='companion.tasks'?'companion/tasks':'companion/gifts'));
 }
 for(const value of [null,{}, {mode:'tasks'}, {mode:'auto-claim-hint',message:''}])assert.throws(()=>parseRobotCompanionTasks(value));
 const info=rows.find(r=>r.op==='companion.info')!.body.data;
 assert.throws(()=>parseRobotCompanionInfo({...info,access:{...info.access,canUseFifthLayerFeature:false}}));
 assert.throws(()=>parseRobotCompanionInfo({...info,companion:null,noCompanionMessage:'你当前没有道侣'}));
 assert.deepEqual(parseRobotCompanionTasks({mode:'auto-claim-hint',message:'道侣任务奖励已改为自动发放，完成活动即可获得同心值'}),{code:'AUTO_CLAIM_HINT',data:{message:'道侣任务奖励已改为自动发放，完成活动即可获得同心值'}});
});
