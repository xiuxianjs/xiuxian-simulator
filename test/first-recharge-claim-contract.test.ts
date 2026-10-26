import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {claimBackendFirstRechargeOverview,parseBackendFirstRechargeOverview} from '../src/api/bot/reward-claim-overview';
import {parseRobotFirstRechargeClaim} from '../src/api/bot/first-recharge-claim';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';

test('first recharge SDK retains Go overview and repeat metadata while combined DTO needs no supplementary request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessFirstRechargeClaim','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_FIRST_RECHARGE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,100);
 const repeats=[...output.matchAll(/ROBOT_FIRST_RECHARGE_REPEAT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.ok(repeats.length>0);
 mockBackendConfig(t,{api_url:'https://first-claim.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of [...rows,...repeats]){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotFirstRechargeClaim);assert.equal(parsed.success,row.result.success);
  if(row.status===0)continue;
  calls.length=0;
  const e={name:'message.create',UserId:'player',MessageId:'first-contract',MessageText:row.input};
  await withEventContext(e as never,()=>{},async()=>{
   const call=()=>claimBackendFirstRechargeOverview('player',1,row.yuan===null?Infinity:row.yuan*100,{requestId:'first-contract',idempotencyKey:'first-contract'});
   if(row.status===200){
    const result=await call();assert.deepEqual(result,parseBackendFirstRechargeOverview(row.v1.data));
    if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,{tierYuan:row.yuan,issued:result.result?.issued});
    if(result.claimError){const message=await withBackendRepeatDetection('player',1,'领取礼包奖励',result.claimError,{requestId:'first-contract',idempotencyKey:'first-contract'});assert.equal(message,row.message);}
   }else await assert.rejects(call);
  });
  if(row.status===-1){assert.equal(calls.length,0);continue;}
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.match(new URL(calls[0].url).pathname,/^\/api\/v1\/players\/1\/recharge\/first\/tiers\/.+\/claim-overview$/);
  assert.equal(calls[0].headers['x-repeat-command'],Buffer.from('领取礼包奖励').toString('base64'));
 }
 for(const value of [null,{},[],{tierYuan:0,issued:[]},{tierYuan:Infinity,issued:[]},{tierYuan:1,issued:[{type:'currency',name:'灵石',amount:-1}]}])assert.throws(()=>parseRobotFirstRechargeClaim(value));
});
