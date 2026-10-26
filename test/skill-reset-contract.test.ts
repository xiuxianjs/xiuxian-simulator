import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {previewBackendSkillBookReset,confirmBackendSkillBookReset,cancelBackendSkillBookReset,parseSkillBookResetPreview,parseSkillBookResetConfirm,parseSkillBookResetCancel} from '../src/api/bot/skill-book-reset-reroll';
import {BackendAPIError} from '../src/api/bot/client';

test('skill reset SDK preserves original preview/confirm/cancel transport and refund validation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillResetV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_RESET=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.status!==0);assert.equal(rows.length,91);
 mockBackendConfig(t,{api_url:'https://skill-reset.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const mode=row.arguments.mode;const request={requestId:'sdk',idempotencyKey:'sdk'};
  const invoke=()=>mode==='preview'?previewBackendSkillBookReset('player',1,row.bookId,request):mode==='confirm'?confirmBackendSkillBookReset('player',1,undefined,request):cancelBackendSkillBookReset('player',1,request);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(!row.result.success)await assert.rejects(invoke,/重制响应的残页数量无效/);
  else assert.deepEqual(await invoke(),mode==='preview'?parseSkillBookResetPreview(row.v1.data):mode==='confirm'?parseSkillBookResetConfirm(row.v1.data):parseSkillBookResetCancel(row.v1.data));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,mode==='preview'?'/api/v1/players/1/skill-books/'+row.bookId+'/reset':'/api/v1/players/1/skill-books/reset/'+mode);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(calls[0].data,mode==='confirm'?'{}':undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),undefined);
 }
 for(const id of [2.5,9007199254740992]){calls.length=0;await assert.rejects(()=>previewBackendSkillBookReset('player',1,id,{requestId:'sdk',idempotencyKey:'sdk'}),error=>error instanceof BackendAPIError&&error.code==='SDK_INVALID_REQUEST'&&error.message==='Invalid parameter skillBookId');assert.equal(calls.length,0);}
});
