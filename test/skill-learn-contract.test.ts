import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {learnBackendSkillBook} from '../src/api/bot/skill-book-learn';
import {BackendAPIError} from '../src/api/bot/client';

test('original learning SDK preserves v1 request and real success/error DTOs after pure extraction',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillLearnV1ParityReplacementAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_LEARN=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,135);
 mockBackendConfig(t,{api_url:'https://skill-learn.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;
  const invoke=()=>learnBackendSkillBook('player',1,2,row.arguments.confirm==='确认',{requestId:'learning-'+i,idempotencyKey:'learning-'+i},row.text);
  if(row.status===200)assert.deepEqual(JSON.parse(JSON.stringify(await invoke())),row.v1.data);
  else await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/2/learn');
  assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data),{forceReplace:row.arguments.confirm==='确认'});
 }
});
