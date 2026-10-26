import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {claimBackendNewcomerRechargeDay,parseBackendNewcomerRechargeClaim} from '../src/api/bot/newcomer-recharge-claim';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';

test('newcomer claim SDK preserves real Go DTO, errors and repeat presentation without supplementary HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNewcomerRechargeClaim','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_NEWCOMER_RECHARGE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,200);
 mockBackendConfig(t,{api_url:'https://newcomer-claim.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseBackendNewcomerRechargeClaim);assert.equal(parsed.success,row.result.success);
  if(row.status===0)continue;
  calls.length=0;
  const e={name:'message.create',UserId:'player',MessageId:'newcomer-contract',MessageText:row.input};
  await withEventContext(e as never,()=>{},async()=>{
   const call=()=>claimBackendNewcomerRechargeDay('player',1,row.day,{requestId:'newcomer-contract',idempotencyKey:'newcomer-contract'},row.input);
   if(row.status===200){const result=await call();assert.deepEqual(result,parseBackendNewcomerRechargeClaim(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,result);}
   else {
    await assert.rejects(call,error=>{assert.equal((error as Error).message,row.v1?.error?.message??`HTTP ${row.status}`);return true;});
    if(row.state==='expired'){
     const message=await withBackendRepeatDetection('player',1,row.input,'您已过新人期，无法领取新人狂欢奖励。',{requestId:'newcomer-contract',idempotencyKey:'newcomer-contract'});
     assert.equal(message,row.message);
    }
   }
  });
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/recharge/newcomer/claim');
  assert.equal(calls[0].headers['x-repeat-command'],Buffer.from(row.input).toString('base64'));
 }
 for(const value of [null,{},[],{dayIndex:0},{dayIndex:15},{dayIndex:1,reward:{},itemNames:{},rewardText:'无'}])assert.throws(()=>parseBackendNewcomerRechargeClaim(value));
});
