import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendWudaoOptions,commandBackendWudao,parseWudaoOptions,parseWudaoResult} from '../src/api/bot/skill-book-wudao';
import {BackendAPIError} from '../src/api/bot/client';

test('wudao original SDK accepts actual v1 options/command receipts and preserves path, body and identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillWudaoV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_WUDAO=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.status!==0);assert.equal(rows.length,98);
 mockBackendConfig(t,{api_url:'https://skill-wudao.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const label=row.arguments.label;const id=parseInt(row.arguments.bookId,10);
  const invoke=()=>label?commandBackendWudao('player',1,id,label,{requestId:'sdk',idempotencyKey:'sdk'}):getBackendWudaoOptions('player',1,id);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else assert.deepEqual(await invoke(),label?{options:parseWudaoOptions(row.v1.data.options),result:row.v1.data.result===null?null:parseWudaoResult(row.v1.data.result),failure:row.v1.data.failure}:parseWudaoOptions(row.v1.data));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/'+id+(label?'/wudao-command':'/wudao-options'));assert.equal(calls[0].method.toUpperCase(),label?'POST':'GET');
  if(label)assert.deepEqual(JSON.parse(calls[0].data!),{label});else assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');if(label)assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),undefined);
 }
 for(const id of [0,2.5,Infinity,9007199254740992]){calls.length=0;await assert.rejects(()=>getBackendWudaoOptions('player',1,id),{message:'悟道参数无效'});await assert.rejects(()=>commandBackendWudao('player',1,id,'物理攻击'),{message:'悟道参数无效'});assert.equal(calls.length,0);}
});
