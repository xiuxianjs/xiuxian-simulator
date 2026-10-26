import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {batchUpgradeBackendSkillBook,parseSkillBookBatchUpgrade} from '../src/api/bot/skill-book-batch-upgrade';
import {BackendAPIError} from '../src/api/bot/client';

test('skill batch upgrade SDK keeps original count body, identity, instance and post-commit validation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchUpgradeV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_BATCH_UPGRADE=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.status!==0);assert.equal(rows.length,70);
 mockBackendConfig(t,{api_url:'https://skill-upgrade.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const invoke=()=>batchUpgradeBackendSkillBook('player',1,row.bookId,row.upgradeCount,{requestId:'sdk',idempotencyKey:'sdk'});
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(row.state==='unsafe-counter'&&row.v1.data.outcome==='ok')await assert.rejects(invoke,/连续升级功法接口字段无效: lastUpgradeCount/);
  else assert.deepEqual(await invoke(),parseSkillBookBatchUpgrade(row.v1.data));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/'+row.bookId+'/batch-upgrade');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),{upgradeCount:row.upgradeCount});
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),undefined);
 }
 calls.length=0;await assert.rejects(()=>batchUpgradeBackendSkillBook('player',1,9007199254740992,1,{requestId:'sdk',idempotencyKey:'sdk'}),error=>error instanceof BackendAPIError&&error.code==='SDK_INVALID_REQUEST'&&error.message==='Invalid parameter skillBookId');assert.equal(calls.length,0);
 calls.length=0;await assert.rejects(()=>batchUpgradeBackendSkillBook('player',1,2,Infinity,{requestId:'sdk',idempotencyKey:'sdk'}),error=>error instanceof BackendAPIError&&error.code==='SDK_INVALID_REQUEST'&&error.message==='Body is not JSON serializable');assert.equal(calls.length,0);
});
