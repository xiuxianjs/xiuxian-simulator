import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSkillBookDecomposeQuery,batchDecomposeBackendSkillBooks} from '../src/api/bot/skill-book-batch-decompose';
import {BackendAPIError} from '../src/api/bot/client';

test('batch v1 SDK query and execute preserve actual DTO validation, routes, query/body and write identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchDecomposeQueriesAndTransactions$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_BATCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,136);
 mockBackendConfig(t,{api_url:'https://equipment-batch.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;const query=row.op==='skill-books.batch-decompose-query';const grade=row.arguments.gradeId===null?undefined:Number(row.arguments.gradeId);const request={requestId:'batch-'+i,idempotencyKey:'batch-'+i};
  const invoke=()=>query?getBackendSkillBookDecomposeQuery('player',1,row.arguments.gradeName):batchDecomposeBackendSkillBooks('player',1,grade,request);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(query&&['grade-negative','unsafe-grade'].includes(row.state))await assert.rejects(invoke,/一键分解功法接口字段无效/);
  else assert.deepEqual(await invoke(),row.v1.data);
  assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/skill-books/'+(query?'batch-decompose-query':'decompose/batch'));
  assert.equal(calls[0].method.toUpperCase(),query?'GET':'POST');
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('X-Repeat-Command'),undefined);
  if(query){assert.equal(url.searchParams.get('gradeName'),row.arguments.gradeName);assert.equal(calls[0].data,undefined);assert.equal(header('Idempotency-Key'),undefined);}
  else{assert.deepEqual(JSON.parse(calls[0].data!),grade===undefined?{}:{gradeId:grade});assert.equal(header('Idempotency-Key'),request.idempotencyKey);}
 }
});
