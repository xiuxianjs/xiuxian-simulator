import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {claimBackendWeeklyRebate,parseBackendWeeklyRebateIssued,parseRobotWeeklyRebateClaim} from '../src/api/bot/weekly-rebate-claim';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('weekly claim original SDK errors and issued projection match real Go responses',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessWeeklyRebateClaim','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_WEEKLY_REBATE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,154);
 mockBackendConfig(t,{api_url:'https://weekly-claim.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotWeeklyRebateClaim);assert.equal(parsed.success,row.result.success);
  if(row.status===0)continue;
  calls.length=0;const call=()=>claimBackendWeeklyRebate('player',1,row.day,{requestId:'weekly-contract',idempotencyKey:'weekly-contract'});
  if(row.status===200){const issued=await call();assert.deepEqual(issued,parseBackendWeeklyRebateIssued(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data.issued,issued);}
  else await assert.rejects(call,error=>{assert.equal((error as Error).message,row.message);return true;});
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(new URL(calls[0].url).pathname,`/api/v1/players/1/recharge/weekly-rebate/${row.day}/claim`);
 }
 for(const value of [null,{},[],{dayIndex:0,issued:[]},{dayIndex:9,issued:[]},{dayIndex:1,issued:[{amount:-1}]}])assert.throws(()=>parseRobotWeeklyRebateClaim(value));
});
