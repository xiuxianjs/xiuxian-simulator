import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { upgradeBackendSoulArtifactGrade, parseSoulArtifactGradeUpgrade } from '../src/api/bot/soul-artifact-grade-upgrade';
import { BackendAPIError } from '../src/api/bot/client';

test('original soul grade SDK verifies exact inputs and committed receipt validation', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulGradeV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_GRADE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
 mockBackendConfig(t,{api_url:'https://soul-grade.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const id=row.arguments.instanceId===null?undefined:Number(row.arguments.instanceId);
  const invoke=()=>upgradeBackendSoulArtifactGrade('player',1,id,{requestId:'sdk',idempotencyKey:'sdk'});
  if(row.status===0)await assert.rejects(invoke,{message:row.feedback});
  else if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(row.feedback)await assert.rejects(invoke,{message:row.feedback});
  else assert.deepEqual(await invoke(),parseSoulArtifactGradeUpgrade(row.v1.data));
  assert.equal(calls.length,row.status===0?0:1);
  if(!calls.length)continue;
  assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-artifacts/grade-upgrade');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),id===undefined?{}:{artifactId:id});
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),undefined);
 }
});
