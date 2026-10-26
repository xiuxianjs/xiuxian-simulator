import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { backendTransportOperation, backendRequestTimeout, UNKNOWN_BATTLE_RESULT } from '../src/api/bot/battle-request';
import { requestBackend } from '../src/api/bot/client';

test('combined battle routes retain original single, batch and query budgets',()=>{
  for(const version of ['post_robot_business_operation','post_v2_robot_business_operation'] as const){
    for(const [operation,budget] of [['pvp.robbery',60000],['pvp.counter-attack',60000],['pvp.spar',60000],['scarecrow.challenge',60000],['bounty.accept',60000],['secret-realm.challenge',60000],['dungeon.sweep-free',120000],['demon-tower.sweep',60000],['ranking.challenge',60000],['ranking.batch-challenge',120000],['ranking.sweep',60000],['tianjiao.challenge',60000],['guild.storyline-challenge',60000],['competition.challenge',60000],['world-boss.info',10000]] as const){
      const semantic=backendTransportOperation(version,{path:{operation},body:{arguments:{}}});
      assert.equal(backendRequestTimeout(semantic,10000),budget);
    }
    for(const [mode,budget] of [['single',60000],['all',120000]] as const){
      const semantic=backendTransportOperation(version,{path:{operation:'world-boss.challenge'},body:{arguments:{mode}}});
      assert.equal(backendRequestTimeout(semantic,10000),budget);
      assert.equal(backendRequestTimeout(semantic,180000),180000);
    }
    for(const [stars,budget] of [[null,10000],[0,10000],[1,60000],[3,60000],[4,10000]] as const){
      assert.equal(backendRequestTimeout(backendTransportOperation(version,{path:{operation:'demon-tower.challenge'},body:{arguments:{stars}}}),10000),budget);
    }
    assert.equal(backendTransportOperation(version,{path:{operation:'__proto__'}}),version);
  }
});
test('combined world boss batch waits 120 seconds and reports uncertainty without retry',async t=>{
  mockBackendConfig(t,{api_url:'http://backend.test',robot_auth_token:'test-token',api_timeout_ms:10000});
  t.mock.timers.enable({apis:['setTimeout']});
  let signal:AbortSignal|undefined,calls=0;
  t.mock.method(axios,'create',()=>({request:({signal:current}: {signal:AbortSignal})=>{
    calls++;signal=current;
    return new Promise((_resolve,reject)=>current.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  }}));
  const pending=requestBackend('bid','post_v2_robot_business_operation',{path:{operation:'world-boss.challenge'},body:{messageText:'/挑战凶兽 全部',platform:'qq',arguments:{mode:'all'}},idempotencyKey:'batch'});
  t.mock.timers.tick(10000);
  assert.equal(signal?.aborted,false);
  t.mock.timers.tick(110000);
  await assert.rejects(pending,error=>{assert.equal((error as Error).message,UNKNOWN_BATTLE_RESULT);return true;});
  assert.equal(calls,1);
});
test('combined single battle network failure preserves uncertain result and makes one attempt',async t=>{
  mockBackendConfig(t,{api_url:'http://backend.test',robot_auth_token:'test-token',api_timeout_ms:10000});
  let calls=0;
  t.mock.method(axios,'create',()=>({request:async()=>{calls++;throw new Error('network unavailable');}}));
  await assert.rejects(requestBackend('bid','post_v2_robot_business_operation',{path:{operation:'world-boss.challenge'},body:{messageText:'/挑战凶兽',platform:'qq',arguments:{mode:'single'}},idempotencyKey:'single'}),error=>{
    assert.equal((error as Error).message,UNKNOWN_BATTLE_RESULT);return true;
  });
  assert.equal(calls,1);
});


test('combined demon tower battle keeps 60 second budget and unknown result without retry',async t=>{
  mockBackendConfig(t,{api_url:'http://backend.test',robot_auth_token:'test-token',api_timeout_ms:10000});
  t.mock.timers.enable({apis:['setTimeout']});
  let signal:AbortSignal|undefined,calls=0;
  t.mock.method(axios,'create',()=>({request:({signal:current}: {signal:AbortSignal})=>{
    calls++;signal=current;
    return new Promise((_resolve,reject)=>current.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  }}));
  const pending=requestBackend('bid','post_v2_robot_business_operation',{path:{operation:'demon-tower.challenge'},body:{messageText:'/妖塔挑战 3',platform:'qq',arguments:{stars:3}},idempotencyKey:'tower'});
  t.mock.timers.tick(10000);assert.equal(signal?.aborted,false);
  t.mock.timers.tick(50000);
  await assert.rejects(pending,error=>{assert.equal((error as Error).message,UNKNOWN_BATTLE_RESULT);return true;});
  assert.equal(calls,1);
});

test('combined dungeon sweep applies settlement budget only to execution mode',()=>{
  for(const version of ['post_robot_business_operation','post_v2_robot_business_operation'] as const){
    for(const [mode,budget] of [['sweep',60000],['usage',10000],['invalid-times',10000],['no_match',10000]] as const){
      assert.equal(backendRequestTimeout(backendTransportOperation(version,{path:{operation:'dungeon.sweep'},body:{arguments:{mode}}}),10000),budget);
    }
  }
});

test('combined dungeon challenge preserves execution budget and does not retry uncertainty',async t=>{
  for(const version of ['post_robot_business_operation','post_v2_robot_business_operation'] as const){
    for(const [mode,budget] of [['challenge',60000],['usage',10000],['no_match',10000]] as const){
      assert.equal(backendRequestTimeout(backendTransportOperation(version,{path:{operation:'dungeon.challenge'},body:{arguments:{mode}}}),10000),budget);
    }
  }
  mockBackendConfig(t,{api_url:'http://backend.test',robot_auth_token:'test-token',api_timeout_ms:10000});
  t.mock.timers.enable({apis:['setTimeout']});
  let calls=0;
  t.mock.method(axios,'create',()=>({request(options:{signal:AbortSignal}){
    calls++;return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  }}));
  const pending=requestBackend('bid','post_v2_robot_business_operation',{path:{operation:'dungeon.challenge'},body:{messageText:'/秘境挑战 试炼',platform:'qq',arguments:{mode:'challenge',dungeonName:'试炼'}},idempotencyKey:'dungeon'});
  t.mock.timers.tick(16000);assert.equal(calls,1);
  t.mock.timers.tick(44000);await assert.rejects(pending,error=>error instanceof Error&&error.message===UNKNOWN_BATTLE_RESULT);
  assert.equal(calls,1);
});


test('combined PvP and migrated battles keep 60 second settlement budget and never retry unknown results',async t=>{
 mockBackendConfig(t,{api_url:'http://backend.test',robot_auth_token:'test-token',api_timeout_ms:10000});
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;let signal:AbortSignal|undefined;
 t.mock.method(axios,'create',()=>({request:({signal:current}:{signal:AbortSignal})=>{calls++;signal=current;return new Promise((_resolve,reject)=>current.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}));
 for(const operation of ['pvp.robbery','pvp.counter-attack','pvp.spar','scarecrow.challenge','bounty.accept','secret-realm.challenge'] as const){
  const before=calls;const pending=requestBackend('bid','post_v2_robot_business_operation',{path:{operation},body:{messageText:'/测试',platform:'qq',arguments:{}},idempotencyKey:operation});
  t.mock.timers.tick(10000);assert.equal(signal?.aborted,false);t.mock.timers.tick(50000);
  await assert.rejects(pending,error=>error instanceof Error&&error.message===UNKNOWN_BATTLE_RESULT);assert.equal(calls,before+1);
 }
});
