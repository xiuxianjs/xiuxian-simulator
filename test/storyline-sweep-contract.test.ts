import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {sweepBackendStoryline,parseStorylineSweep,parseStorylineSweepBusiness} from '../src/api/bot/storyline-sweep';
import {requestBackend} from '../src/api/bot/client';
import {UNKNOWN_BATTLE_RESULT} from '../src/api/bot/battle-request';

test('storyline sweep preserves actual v1 SDK identity, errors, repeat header and receipt validator',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineSweep','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_SWEEP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,630);
 mockBackendConfig(t,{api_url:'https://story-sweep.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.callSDK&&r.state!=='muted')){
  // Independently recover Number values from the original JavaScript command syntax.
  const match=row.text.trim().replace(/^(!|！|\/|#|＃)?\s*/,'').match(/^主线扫荡\s+(\d+)\s*[-－]\s*(\d+)(?:\s+(\d+))?$/)!;
  const chapter=Number(match[1]),stage=Number(match[2]),times=match[3]?Number(match[3]):1;
  calls.length=0;
  const call=()=>sweepBackendStoryline('player',1,chapter,stage,times,{requestId:'sweep-sdk',idempotencyKey:'sweep-sdk'},row.text);
  if(row.status===200){const data=await call();assert.deepEqual(data,parseStorylineSweep(row.v1.data));assert.deepEqual(parseStorylineSweepBusiness(row.result.data),{ignored:false,chapterNumber:chapter,stageNumber:stage,result:data});}
  else await assert.rejects(call,{message:row.v1.presentation?.repeat?.message??'服务暂时不可用，请稍后再试'});
  if(row.sdkError){assert.equal(calls.length,0);continue;}
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/storyline/sweep');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data),{chapterNumber:chapter,stageNumber:stage,times});
  const headers=new Headers(calls[0].headers);assert.equal(headers.get('X-Repeat-Command'),Buffer.from(row.text).toString('base64'));assert.equal(headers.get('Idempotency-Key'),'sweep-sdk');
 }
 for(const data of [null,{},[],{stageLabel:'1-1',times:1,totalSpiritCost:3,totalExp:10,totalSpiritStone:7,totalBonusExp:-11,expBonusText:'',allItemsGained:[]}])assert.throws(()=>parseStorylineSweep(data));
 for(const data of [{},{chapterNumber:1,stageNumber:5,result:{}},{chapterNumber:1,stageNumber:1,result:{}}])assert.throws(()=>parseStorylineSweepBusiness(data));
 await assert.rejects(()=>sweepBackendStoryline('player',1,1,1,1),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});

test('combined storyline sweep retains 60 second budget and uncertain settlement without retry',async t=>{
 mockBackendConfig(t,{api_url:'https://story-sweep.test',robot_auth_token:'local-test',api_timeout_ms:10000});
 t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;let signal:AbortSignal|undefined;
 t.mock.method(axios,'create',()=>({request(options:{signal:AbortSignal;headers:Record<string,string>}){
  calls++;signal=options.signal;assert.equal(new Headers(options.headers).get('Idempotency-Key'),'sweep-timeout');
  return new Promise((_resolve,reject)=>signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
 }}));
 const pending=requestBackend('player','post_v2_robot_business_operation',{path:{operation:'storyline.sweep'},body:{platform:'qq',messageText:'/主线扫荡 1-1',arguments:{input:'/主线扫荡 1-1'}},idempotencyKey:'sweep-timeout'});
 t.mock.timers.tick(16000);assert.equal(signal?.aborted,false);
 t.mock.timers.tick(44000);await assert.rejects(pending,{message:UNKNOWN_BATTLE_RESULT});assert.equal(calls,1);
});
