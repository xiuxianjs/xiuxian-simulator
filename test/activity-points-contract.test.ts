import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import queryApp from '../src/response-apps/activityPoints/query/app';
import { claimBackendActivityReward, claimAllBackendActivityRewards, parseBackendActivityClaim, parseBackendActivityClaimAll } from '../src/api/bot/activity-points-claim';
import { parseRobotActivityPoints } from '../src/api/bot/activity-points-robot';
import { BackendAPIError } from '../src/api/bot/client';

test('legacy v1 activity SDK paths and query App projection preserve real domain receipts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessActivityPoints','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ACTIVITY_POINTS_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 mockBackendConfig(t,{api_url:'https://activity-contract.test',robot_auth_token:'test-token'});
 let status=200;let payload:unknown;
 const calls:{url:string;method:string;data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;method:string;data?:string})=>{calls.push(call);return{status,headers:{},data:JSON.stringify(status===200?{data:payload}:{error:{code:'ACTIVITY_ALREADY_CLAIMED',message:'奖励已领取'}})}}}));
 const request={requestId:'activity-contract',idempotencyKey:'activity-contract'};
 for(const row of rows.filter(r=>r.result.success)){
  calls.length=0;payload=row.result.data;const type=row.op.endsWith('weekly')?'weekly':'daily';
  if(row.op.includes('claim-all')){
   assert.deepEqual(await claimAllBackendActivityRewards('player',1,type,request),parseBackendActivityClaimAll(payload));
   assert.deepEqual(calls.map(c=>[c.method.toUpperCase(),new URL(c.url).pathname]),[['POST',`/api/v1/players/1/activities/${type}/claim-all`]]);
  }else if(row.op.includes('claim')){
   assert.deepEqual(await claimBackendActivityReward('player',1,type,10,request),parseBackendActivityClaim(payload));
   assert.deepEqual(calls.map(c=>[c.method.toUpperCase(),new URL(c.url).pathname]),[['POST',`/api/v1/players/1/activities/${type}/claim`]]);assert.deepEqual(JSON.parse(calls[0].data!),{requiredPoints:10});
  }else{
   assert.deepEqual(await queryApp({bid:'player',uid:1,type}),{code:'OK',data:parseRobotActivityPoints(payload,type)});
   assert.deepEqual(calls.map(c=>[c.method.toUpperCase(),new URL(c.url).pathname]),[['GET',`/api/v1/players/1/activities/${type}`]]);
  }
 }
 status=409;
 await assert.rejects(()=>claimBackendActivityReward('player',1,'daily',10,request),(e:unknown)=>e instanceof BackendAPIError&&e.code==='ACTIVITY_ALREADY_CLAIMED'&&e.message==='奖励已领取');
});
