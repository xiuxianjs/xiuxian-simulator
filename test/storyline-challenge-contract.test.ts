import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {startBackendStorylineChallenge,parseStorylineManualBattleState,parseStorylineChallengeBusiness} from '../src/api/bot/storyline-manual-battle';
import {requestBackend} from '../src/api/bot/client';
import {UNKNOWN_BATTLE_RESULT} from '../src/api/bot/battle-request';

test('storyline challenge retains original SDK grammar, write context and battle state decoder',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChallenge','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CHALLENGE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,144);
 mockBackendConfig(t,{api_url:'https://story-challenge.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const match=row.text.trim().replace(/^(!|！|\/|#|＃)?\s*/,'').match(/^主线挑战\s+(\d+)\s*[-－]\s*(\d+)$/);
  const valid=!!match&&Number.isSafeInteger(Number(match[1]))&&Number.isSafeInteger(Number(match[2]));assert.equal(row.valid,valid);
  if(!valid||row.state==='muted')continue;
  const chapter=Number(match![1]),stage=Number(match![2]);assert.equal(row.chapter,chapter);assert.equal(row.stage,stage);calls.length=0;
  const call=()=>startBackendStorylineChallenge('player',1,chapter,stage,{requestId:'challenge-sdk',idempotencyKey:'challenge-sdk'});
  if(row.status===200){const data=await call();assert.deepEqual(data,parseStorylineManualBattleState(row.v1.data));assert.deepEqual(parseStorylineChallengeBusiness(row.result.data),{ignored:false,state:parseStorylineManualBattleState(row.result.data)});}
  else await assert.rejects(call,{message:row.expected});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/storyline/challenge-command');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data),{chapterNumber:chapter,stageNumber:stage});assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'challenge-sdk');
 }
 for(const data of [null,{},[],{sessionId:'s',finished:false,events:[],choice:{unitId:'p',unitName:'p',side:'C',round:1,availableSkills:[]}}])assert.throws(()=>parseStorylineChallengeBusiness(data));
 await assert.rejects(()=>startBackendStorylineChallenge('player',1,1,1,{requestId:'missing-key'}),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});

test('combined storyline challenge preserves uncertain timeout and never retries start',async t=>{
 mockBackendConfig(t,{api_url:'https://story-challenge.test',robot_auth_token:'local-test',api_timeout_ms:10000});t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;let signal:AbortSignal|undefined;t.mock.method(axios,'create',()=>({request(options:{signal:AbortSignal}){calls++;signal=options.signal;return new Promise((_resolve,reject)=>signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}));
 const pending=requestBackend('player','post_v2_robot_business_operation',{path:{operation:'storyline.challenge'},body:{platform:'qq',messageText:'/主线挑战 1-1',arguments:{input:'/主线挑战 1-1'}},idempotencyKey:'challenge-timeout'});
 t.mock.timers.tick(16000);assert.equal(signal?.aborted,false);t.mock.timers.tick(44000);await assert.rejects(pending,{message:UNKNOWN_BATTLE_RESULT});assert.equal(calls,1);
});
