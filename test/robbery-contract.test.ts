import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {robBackend,parseBackendRobbery} from '../src/api/bot/robbery';
import {counterAttackBackend,parseBackendCounterAttack} from '../src/api/bot/counter-attack';
import RobberyApp from '../src/response-apps/robbery/app';
import CounterApp from '../src/response-apps/counterAttack/app';

test('original robbery/counter SDK/App retain success decoders and real safe error/qi-button contracts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRobbery','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const successes=[...output.matchAll(/ROBOT_ROBBERY_V1=([^|]+)\|(.+)/g)].map(m=>({op:m[1],body:JSON.parse(m[2])}));assert.equal(successes.length,4);
 const errors=[...output.matchAll(/ROBOT_ROBBERY_ERROR_V1=([^|]+)\|(\d+)\|(.+)/g)].map(m=>({op:m[1],status:Number(m[2]),body:JSON.parse(m[3])}));assert.equal(errors.length,4);
 mockBackendConfig(t,{api_url:'https://robbery-contract.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'rob-original',idempotencyKey:'rob-original-key'};
 for(const row of successes){payload=row.body;status=200;calls.length=0;
  if(row.op==='pvp.robbery'){
   assert.deepEqual(await robBackend('player',1,2,request),parseBackendRobbery(row.body.data));
   assert.deepEqual(await RobberyApp({bid:'player',uid:1,targetUid:2,request}),{code:'OK',data:parseBackendRobbery(row.body.data)});
  }else{
   assert.deepEqual(await counterAttackBackend('player',1,1,request),parseBackendCounterAttack(row.body.data));
   assert.deepEqual(await CounterApp({bid:'player',uid:1,robberyLogId:1,request}),{code:'OK',data:parseBackendCounterAttack(row.body.data)});
  }
  assert.equal(calls.length,2);
  for(const call of calls){assert.equal(new URL(call.url).pathname,row.op==='pvp.robbery'?'/api/v1/robbery/1/2':'/api/v1/counter-attacks/1/1');assert.equal(new Headers(call.headers).get('Idempotency-Key'),'rob-original-key');}
 }
 for(const row of errors){payload=row.body;status=row.status;calls.length=0;const message=row.status===500?'服务暂时不可用，请稍后再试':row.body.error.message;
  if(row.op==='pvp.robbery')assert.deepEqual(await RobberyApp({bid:'player',uid:1,targetUid:2,request}),{code:'LOAD_FAILED',data:{message}});
  else assert.deepEqual(await CounterApp({bid:'player',uid:1,robberyLogId:1,request}),{code:'FAIL',data:{message,isEnergyInsufficient:row.body.error.code==='COUNTER_ATTACK_INSUFFICIENT_QI'}});
  assert.equal(calls.length,1);
 }
 for(const name of ['robbery','counterAttack']){const source=readFileSync(new URL(`../src/response/${name}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
 assert.throws(()=>parseBackendCounterAttack({}));assert.throws(()=>parseBackendRobbery({}));
});
