import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {submitBackendStorylineManualChoice,readBackendStorylineManualBattle,parseStorylineManualBattleState} from '../src/api/bot/storyline-manual-battle';
import {requestBackend} from '../src/api/bot/client';
import {UNKNOWN_BATTLE_RESULT} from '../src/api/bot/battle-request';

test('manual choice uses original SDK submission and recovery projection without changing state decoder',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChoice','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CHOICE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,63);
 mockBackendConfig(t,{api_url:'https://story-choice.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data?:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);const read=call.method.toUpperCase()==='GET';const body=read?row.read:row.v1;return{status:read?row.readStatus:row.status,headers:{},data:body?.raw??JSON.stringify(body)}}}));
 for(row of rows){
  calls.length=0;
  const session=row.oldInitial?.sessionId??'missing';
  const call=()=>submitBackendStorylineManualChoice('player',1,session,row.choice,{requestId:'choice-sdk',idempotencyKey:'choice-sdk'});
  if(row.status===200){assert.deepEqual(await call(),parseStorylineManualBattleState(row.v1.data));}
  else{
   if(row.readStatus!==200)await assert.rejects(call,{message:row.message});else await assert.rejects(call);
   if(row.readStatus===200)assert.deepEqual(await readBackendStorylineManualBattle('player',1,session),parseStorylineManualBattleState(row.read.data));
   else await assert.rejects(()=>readBackendStorylineManualBattle('player',1,session));
  }
  assert.equal(calls.length,row.status===200?1:2);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/storyline/manual-battles/'+session+'/choices');assert.deepEqual(JSON.parse(calls[0].data!),{choice:row.choice});assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'choice-sdk');
  if(row.state!=='muted'&&row.expected){const actual=parseStorylineManualBattleState(row.result.data),original=parseStorylineManualBattleState(row.expected);assert.deepEqual([actual.finished,actual.choice,actual.events,actual.winner],[original.finished,original.choice,original.events,original.winner]);}
 }
});
test('combined manual choice has battle timeout budget and never supplements or retries',async t=>{
 mockBackendConfig(t,{api_url:'https://story-choice.test',robot_auth_token:'local-test',api_timeout_ms:10000});t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;let signal:AbortSignal|undefined;t.mock.method(axios,'create',()=>({request(options:{signal:AbortSignal}){calls++;signal=options.signal;return new Promise((_resolve,reject)=>signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}));
 const pending=requestBackend('player','post_v2_robot_business_operation',{path:{operation:'storyline.choice'},body:{platform:'qq',messageText:'普攻',arguments:{sessionId:'session',choice:'normal'}},idempotencyKey:'choice-timeout'});
 t.mock.timers.tick(16000);assert.equal(signal?.aborted,false);t.mock.timers.tick(44000);await assert.rejects(pending,{message:UNKNOWN_BATTLE_RESULT});assert.equal(calls,1);
});
