import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSkillDetail,mapBackendSkillDetail} from '../src/api/bot/skill-detail-queries';
import {BackendAPIError} from '../src/api/bot/client';

test('skill detail original SDK preserves fixed instance route, effect validation and identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillDetailV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_DETAIL=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.status!==0);assert.equal(rows.length,80);
 mockBackendConfig(t,{api_url:'https://skill-detail.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const invoke=()=>getBackendSkillDetail('player',1,row.bookId);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(row.v1.data.book&&!row.result.success)await assert.rejects(invoke,/接口缺少数值字段/);
  else assert.deepEqual(await invoke(),mapBackendSkillDetail(row.v1.data,row.bookId));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/learned/'+row.bookId);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),undefined);assert.equal(header('X-Repeat-Command'),undefined);
 }
 calls.length=0;await assert.rejects(()=>getBackendSkillDetail('player',1,9007199254740992),/Invalid parameter bookId/);assert.equal(calls.length,0);
});
