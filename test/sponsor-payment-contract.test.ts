import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {createBackendSponsorPayment,parseBackendSponsorCheckout,parseRobotSponsorPaymentState} from '../src/api/bot/sponsor-payment';
import {parseRobotBusinessEnvelope,requestRobotBusiness} from '../src/api/bot/robot-business';
import {createBackendRequestContext} from '../src/api/bot/context';
import type {GameEvent} from '../src/types/event';

test('sponsor payment original SDK, DTOs and scheduled read keys match the real Go contract',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSponsorPayment','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const creates=[...output.matchAll(/ROBOT_SPONSOR_PAYMENT_CREATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(creates.length,60);
 const observations=[...output.matchAll(/ROBOT_SPONSOR_PAYMENT_OBSERVE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(observations.length,18);
 mockBackendConfig(t,{api_url:'https://event-payment.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string;headers:Record<string,string>;data?:string}>=[];let status=200;let answer:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:typeof answer==='string'?answer:JSON.stringify(answer)}}}));
 for(const row of creates){
  if(row.result.success&&row.result.branch==='business'&&!Number.isSafeInteger(row.result.data.order.payAmount))assert.throws(()=>parseRobotBusinessEnvelope(row.result,'player',parseBackendSponsorCheckout));else {const parsed=parseRobotBusinessEnvelope(row.result,'player',parseBackendSponsorCheckout);assert.equal(parsed.success,row.result.success);}
  if(row.status===0)continue;
  status=row.status;answer=row.v1?.raw??row.v1;calls.length=0;
  const match=row.input.match(/赞助购买\s+(\d+)/);const amount=parseInt(match[1],10);
  const call=()=>createBackendSponsorPayment('player',1,amount,{requestId:'payment-contract',idempotencyKey:'payment-contract'});
  if(status===201){if(Number.isSafeInteger(row.v1.data.order.payAmount))assert.deepEqual(await call(),parseBackendSponsorCheckout(row.v1.data));else await assert.rejects(call);}
  else await assert.rejects(call,error=>{assert.equal((error as Error).message,row.message.replace(/^❌ /,''));return true;});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/payments/orders');assert.deepEqual(JSON.parse(calls[0].data!),{kind:'sponsor',amountYuan:amount});
 }
 for(const row of observations){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotSponsorPaymentState);assert.equal(parsed.success,row.result.success);

 }
 const e={name:'private.message.create',Platform:'qq',UserId:'player',MessageId:'payment-start',MessageText:'/赞助购买 30',isPrivate:true} as unknown as GameEvent;
 const pending=observations.find(r=>r.state==='PENDING'&&r.operation==='state');status=200;answer={data:pending.result};calls.length=0;
 await requestRobotBusiness(e,'sponsor.payment-state',{orderNo:'SP-observe'},parseRobotSponsorPaymentState);
 await requestRobotBusiness(e,'sponsor.payment-state',{orderNo:'SP-observe'},parseRobotSponsorPaymentState);
 assert.equal(calls.length,2);assert.notEqual(new Headers(calls[0].headers).get('Idempotency-Key'),new Headers(calls[1].headers).get('Idempotency-Key'));assert.equal(e.MessageId,'payment-start');
 answer={data:observations.find(r=>r.state==='PENDING'&&r.operation==='timeout').result};calls.length=0;
 await requestRobotBusiness(e,'sponsor.payment-timeout',{orderNo:'SP-observe'},parseRobotSponsorPaymentState);
 await requestRobotBusiness(e,'sponsor.payment-timeout',{orderNo:'SP-observe'},parseRobotSponsorPaymentState);
 assert.equal(calls.length,2);assert.ok(new Headers(calls[0].headers).get('Idempotency-Key'));assert.notEqual(new Headers(calls[0].headers).get('Idempotency-Key'),createBackendRequestContext(e).idempotencyKey);assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),new Headers(calls[1].headers).get('Idempotency-Key'));
 for(const parse of [parseBackendSponsorCheckout,parseRobotSponsorPaymentState])for(const value of [null,{},[],{order:{}}])assert.throws(()=>parse(value));
});
