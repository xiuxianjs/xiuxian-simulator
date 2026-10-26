import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSkillBookBatchLearnCandidates,batchLearnCurrentBackendSkillBooks} from '../src/api/bot/skill-book-batch-learn';
import {BackendAPIError} from '../src/api/bot/client';

test('batch learning original SDK validates committed selection and preserves query, confirmation and auth headers',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchLearnV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_BATCH_LEARN=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.mode!=='cancel');assert.equal(rows.length,42);
 mockBackendConfig(t,{api_url:'https://skill-batch-learn.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;const query=row.mode==='preview';const request={requestId:'batch-learn-'+i,idempotencyKey:'batch-learn-'+i};
  const invoke=()=>query?getBackendSkillBookBatchLearnCandidates('player',1):batchLearnCurrentBackendSkillBooks('player',1,request);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(['grade-zero','unsafe-instance'].includes(row.state))await assert.rejects(invoke,/一键学习功法接口字段无效/);
  else assert.deepEqual(await invoke(),row.v1.data);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/'+(query?'batch-learn/candidates':'batch-learn-current'));assert.equal(calls[0].method.toUpperCase(),query?'GET':'POST');assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('X-Repeat-Command'),undefined);assert.equal(header('Idempotency-Key'),query?undefined:request.idempotencyKey);
 }
});
