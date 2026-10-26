import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {claimBackendLimitedEventTask,buyBackendLimitedEventProduct,claimBackendLimitedEventRechargeTier,parseBackendLimitedEventTask,parseBackendLimitedEventProduct,parseBackendLimitedEventRechargeTier} from '../src/api/bot/limited-event-actions';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('limited event write projections and original SDK errors match real v1 and combined Go responses',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLimitedEventWrites','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LIMITED_EVENT_WRITE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
 mockBackendConfig(t,{api_url:'https://limited-write.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;data?:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 const parsers:Record<string,(v:unknown)=>unknown>={'task-claim':parseBackendLimitedEventTask,'recharge-claim':parseBackendLimitedEventRechargeTier,'shop-buy':parseBackendLimitedEventProduct};
 const request={requestId:'limited-write-contract',idempotencyKey:'limited-write-contract'};
 for(row of rows){
  const parse=parsers[row.kind];const parsed=parseRobotBusinessEnvelope(row.result,'player',parse);assert.equal(parsed.success,row.result.success);assert.equal(parsed.branch,row.result.branch);
  if(row.status===0)continue;
  calls.length=0;const id=Number(row.path.match(/\/(\d+)\/(?:claim|purchase)$/)[1]);const body=row.body?JSON.parse(row.body):{};
  const call=()=>row.kind==='task-claim'?claimBackendLimitedEventTask('player',1,id,request):row.kind==='shop-buy'?buyBackendLimitedEventProduct('player',1,id,body.buyCount,request):claimBackendLimitedEventRechargeTier('player',1,id,body.tierLevel,request);
  if(row.status===200){const result=await call();assert.deepEqual(result,parse(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,result);}
  else {await assert.rejects(call,error=>{assert.equal((error as Error).message,row.message||'服务暂时不可用，请稍后再试');return true;});}
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(new URL(calls[0].url).pathname,'/api/v1'+row.path);
 }
 for(const parse of Object.values(parsers))for(const value of [null,{},[],{issued:[{name:'bad',amount:-1}]}])assert.throws(()=>parse(value));
});
