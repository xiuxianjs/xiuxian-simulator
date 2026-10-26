import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {requestRobotBusiness} from '../src/api/bot/robot-business';
import {parseStorylineManualBattleState} from '../src/api/bot/storyline-manual-battle';
import {requestBackend} from '../src/api/bot/client';
import type {GameEvent} from '../src/types/event';

function comparable(value: unknown): unknown {
 if(Array.isArray(value))return value.map(comparable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['sessionId','logId','battleLogId','createdAt','updatedAt'].includes(key)?key:comparable(item)]));
 return value;
}

test('state observations each use one combined request with a fresh read key and unchanged platform identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineState','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_STATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,9);
 mockBackendConfig(t,{api_url:'https://story-state.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;headers:Record<string,string>;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:row.result})}}}));
 const event={name:'message.create',Platform:'qq',UserId:'player',MessageId:'original-platform-id',MessageText:'/主线挑战 1-1',isPrivate:false} as unknown as GameEvent;
 const keys=new Set<string>();
 for(row of rows)for(let i=0;i<2;i++){
  const before=calls.length;
  const result=await requestRobotBusiness(event,'storyline.state',row.arguments,parseStorylineManualBattleState);
  assert.equal(calls.length,before+1);const call=calls.at(-1)!;
  assert.equal(new URL(call.url).pathname,'/api/v2/robot/business/storyline.state');assert.deepEqual(JSON.parse(call.data).arguments,row.arguments);
  const key=new Headers(call.headers).get('Idempotency-Key');assert.ok(key);assert.equal(keys.has(key),false);keys.add(key);assert.equal(event.MessageId,'original-platform-id');
  assert.equal(result.success,row.result.success);assert.equal(result.branch,row.result.branch);
  if(result.success&&result.branch==='business'){assert.equal(result.data.sessionId,row.arguments.sessionId);assert.deepEqual(comparable(result.data),comparable(parseStorylineManualBattleState(row.v1.data)));}
 }
 // Scheduled read IDs must never replace a real message's write identity.
 const noIdentity={...event,MessageId:''};calls.length=0;
 await assert.rejects(()=>requestRobotBusiness(noIdentity,'storyline.choice',{sessionId:'s',choice:'normal'},parseStorylineManualBattleState),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});assert.equal(calls.length,0);
});

test('state read retains the configured query timeout rather than battle write budget',async t=>{
 mockBackendConfig(t,{api_url:'https://story-state.test',robot_auth_token:'local-test',api_timeout_ms:10000});t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;let signal:AbortSignal|undefined;t.mock.method(axios,'create',()=>({request(options:{signal:AbortSignal}){calls++;signal=options.signal;return new Promise((_resolve,reject)=>signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}));
 const pending=requestBackend('player','post_v2_robot_business_operation',{path:{operation:'storyline.state'},body:{platform:'qq',messageText:'/主线挑战 1-1',arguments:{sessionId:'s'}},idempotencyKey:'read-timeout'});
 t.mock.timers.tick(9000);assert.equal(signal?.aborted,false);t.mock.timers.tick(1000);await assert.rejects(pending,{code:'SDK_TIMEOUT'});assert.equal(calls,1);
});
