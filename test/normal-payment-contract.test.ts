import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {createBackendNormalPayment,getBackendNormalPaymentSettlement,parseBackendNormalCheckout,parseBackendNormalPaymentSettlement} from '../src/api/bot/sponsor-payment';
import {getBackendRechargeNormalPackages,parseBackendRechargeNormalPackages} from '../src/api/bot/recharge-normal-package-queries';
import {parseRobotNormalPaymentCreate,parseRobotNormalPaymentState} from '../src/api/bot/normal-payment';
import {parseRobotBusinessEnvelope,requestRobotBusiness} from '../src/api/bot/robot-business';
import {createBackendRequestContext} from '../src/api/bot/context';
import type {GameEvent} from '../src/types/event';

test('normal payment combined DTOs and read/timeout keys match original SDK and real Go results',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNormalPayment','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const creates=[...output.matchAll(/ROBOT_NORMAL_PAYMENT_CREATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(creates.length,126);
 const observations=[...output.matchAll(/ROBOT_NORMAL_PAYMENT_OBSERVE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(observations.length,22);
 mockBackendConfig(t,{api_url:'https://normal-payment.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string;headers:Record<string,string>;data?:string}>=[];let status=200;let answer:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:typeof answer==='string'?answer:JSON.stringify(answer)}}}));
 for(const row of creates){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotNormalPaymentCreate);assert.equal(parsed.success,row.result.success);
  if(row.status===0)continue;
  status=row.status;answer=row.v1?.raw??row.v1;calls.length=0;
  if(row.kind==='packages'){
   const call=()=>getBackendRechargeNormalPackages('player',1);
   if(status===200){const data=await call();assert.deepEqual(data,parseBackendRechargeNormalPackages(row.v1.data));if(parsed.success&&parsed.branch==='business'&&parsed.data.kind==='packages')assert.deepEqual(parsed.data.packages,data.packages);}
   else await assert.rejects(call);
   assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/recharge/normal-packages');
  }else {
   const id=parseInt(row.input.match(/充值购买\s+(\d+)/)[1],10);
   const call=()=>createBackendNormalPayment('player',1,id,{requestId:'normal-contract',idempotencyKey:'normal-contract'});
   if(status===201){assert.deepEqual(await call(),parseBackendNormalCheckout(row.v1.data));}
   else await assert.rejects(call,error=>{assert.equal((error as Error).message,row.message.replace(/^❌ /,''));return true;});
   assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/payments/orders');assert.deepEqual(JSON.parse(calls[0].data!),{kind:'package',packageId:id});
  }
 }
 for(const row of observations){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotNormalPaymentState);assert.equal(parsed.success,row.result.success);
  if(row.receiptStatus===200){status=200;answer=row.receipt;calls.length=0;assert.deepEqual(await getBackendNormalPaymentSettlement('player',1,'N-observe'),parseBackendNormalPaymentSettlement(row.receipt.data));assert.equal(calls.length,1);}
 }
 const e={name:'private.message.create',Platform:'qq',UserId:'player',MessageId:'normal-start',MessageText:'/充值购买 1',isPrivate:true} as unknown as GameEvent;
 status=200;answer={data:observations.find(r=>r.state==='PENDING'&&r.operation==='state').result};calls.length=0;
 await requestRobotBusiness(e,'normal.payment-state',{orderNo:'N-observe'},parseRobotNormalPaymentState);
 await requestRobotBusiness(e,'normal.payment-state',{orderNo:'N-observe'},parseRobotNormalPaymentState);
 assert.equal(calls.length,2);assert.notEqual(new Headers(calls[0].headers).get('Idempotency-Key'),new Headers(calls[1].headers).get('Idempotency-Key'));
 answer={data:observations.find(r=>r.state==='PENDING'&&r.operation==='timeout').result};calls.length=0;
 await requestRobotBusiness(e,'normal.payment-timeout',{orderNo:'N-observe'},parseRobotNormalPaymentState);
 await requestRobotBusiness(e,'normal.payment-timeout',{orderNo:'N-observe'},parseRobotNormalPaymentState);
 assert.equal(calls.length,2);assert.notEqual(new Headers(calls[0].headers).get('Idempotency-Key'),createBackendRequestContext(e).idempotencyKey);assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),new Headers(calls[1].headers).get('Idempotency-Key'));
 for(const parse of [parseRobotNormalPaymentCreate,parseRobotNormalPaymentState])for(const value of [null,{},[],{order:{}}])assert.throws(()=>parse(value));
});
