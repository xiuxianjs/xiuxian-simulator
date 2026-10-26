import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseBackendEmailConfirmation} from '../src/api/bot/account';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('combined email confirmation accepts original v1 DTOs and rejects incomplete flow results',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessVerifyEmail','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_VERIFY_EMAIL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,78);
 const seen=new Set<string>();
 for(const row of rows){
  const result=parseRobotBusinessEnvelope(row.result,'player',value=>{
   const type=(value as {type:'bind'|'change'|'changeEmail'}).type;
   return parseBackendEmailConfirmation(value,type);
  });
  if(result.success&&result.branch==='business'){
   assert.deepEqual(result.data,row.sequence.at(-1).body.data);seen.add(String(result.data.type));
   const value=result.data;
   for(const invalid of [null,{},[],{...value,verified:false},{...value,type:'unknown'}])assert.throws(()=>parseBackendEmailConfirmation(invalid,value.type as 'bind'|'change'|'changeEmail'));
  }
 }
 assert.deepEqual([...seen].sort(),['bind','change','changeEmail'].sort());
 for(const type of ['bind','change','changeEmail'] as const)assert.throws(()=>parseBackendEmailConfirmation({type,verified:true},type));
});
