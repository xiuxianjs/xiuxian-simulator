import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendNewcomerLogin,parseBackendNewcomerLogin,parseBackendNewcomerLoginView} from '../src/api/bot/newcomer-login-queries';
import {claimBackendNewcomerTask} from '../src/api/bot/newcomer-login-actions';
import {parseRobotNewcomerTaskReward} from '../src/api/bot/newcomer-activity';
import oldOverview from '../src/response-apps/activity/newcomerLogin/app';
import oldClaim from '../src/response-apps/activity/newcomerTaskClaim/app';

test('newcomer v1 raw SDK and App stay compatible while v2 returns only rendered view and explicit rewards',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNewcomerActivity','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const original=JSON.parse(output.match(/ROBOT_NEWCOMER_ACTIVITY_V1_QUERY=(.+)/)![1]).data;
 const rows=[...output.matchAll(/ROBOT_NEWCOMER_ACTIVITY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
 mockBackendConfig(t,{api_url:'https://newcomer-contract.test',robot_auth_token:'test-token'});
 const calls:{url:string;method:string}[]=[];let payload:unknown=original;const request={requestId:'newcomer-contract',idempotencyKey:'newcomer-contract'};
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;method:string})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 assert.deepEqual(await getBackendNewcomerLogin('player',1),parseBackendNewcomerLogin(original));assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/activities/newcomer-login');
 assert.deepEqual(await oldOverview({bid:'player',uid:1}),{code:'OK',data:original.view});
 const first=rows.find(r=>r.op==='newcomer-activity.overview'&&r.result.success&&r.result.branch==='business')!;
 assert.deepEqual(parseBackendNewcomerLoginView(first.result.data),original.view);assert.equal(first.result.data.dayConfigs,undefined);assert.equal(first.result.data.taskProgress,undefined);
 for(const row of rows.filter(r=>r.op==='newcomer-activity.claim-task'&&r.result.success&&r.result.branch==='business')){
  payload={code:'OK',...row.result.data};calls.length=0;
  const legacy=await claimBackendNewcomerTask('player',1,row.args.taskConfigId,request);assert.deepEqual({spiritCrystal:legacy.spiritCrystal,vipExpYuan:legacy.vipExpYuan},parseRobotNewcomerTaskReward(row.result.data));assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,`/api/v1/players/1/activities/newcomer-login/tasks/${row.args.taskConfigId}/claim`);
  assert.deepEqual(await oldClaim({bid:'player',uid:1,taskConfigId:row.args.taskConfigId,request}),{code:'OK',data:row.result.data});
 }
 payload=JSON.parse(output.match(/ROBOT_NEWCOMER_ACTIVITY_V1_ZERO=(.+)/)![1]).data;
 assert.deepEqual(await claimBackendNewcomerTask('player',1,27,request),{code:'OK'});
 assert.deepEqual(await oldClaim({bid:'player',uid:1,taskConfigId:27,request}),{code:'CLAIM_FAILED'});
 assert.deepEqual(parseRobotNewcomerTaskReward({spiritCrystal:0,vipExpYuan:0}),{spiritCrystal:0,vipExpYuan:0});
 for(const bad of [null,{}, {...original.view,overviewDays:[]}, {...original.view,detailDays:[{}]}])assert.throws(()=>parseBackendNewcomerLoginView(bad));
 for(const bad of [null,{}, {spiritCrystal:1}, {spiritCrystal:1,vipExpYuan:'0'}])assert.throws(()=>parseRobotNewcomerTaskReward(bad));
 for(const file of ['newcomerLogin','newcomerTaskClaim']){const source=readFileSync(new URL(`../src/response/activity/${file}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('withBackendRepeatDetection'));assert.ok(source.includes('runRobotBusiness'));}
});
