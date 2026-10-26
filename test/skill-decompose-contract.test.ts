import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {test} from 'node:test';import axios from 'axios';import {mockBackendConfig} from './backend-config-helper';import {decomposeBackendSkillBook} from '../src/api/bot/skill-book-decompose';
test('skill decompose v1 SDK retains path parsing, return checks and headers',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillDecomposeV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_DECOMPOSE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,78);
 mockBackendConfig(t,{api_url:'https://skill-decompose.test',robot_auth_token:'local-test'});let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(c:typeof calls[number])=>{calls.push(c);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){row=rows[i];calls.length=0;const id=parseInt(row.arguments.bookId,10);const request={requestId:'skill-'+i,idempotencyKey:'skill-'+i};const invoke=()=>decomposeBackendSkillBook('player',1,id,request,row.text);
  if(row.sdkMessage||row.status!==200)await assert.rejects(invoke,e=>e instanceof Error&&e.message===(row.sdkMessage||row.v1.error.message));else assert.deepEqual(await invoke(),row.v1.data);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,`/api/v1/players/1/skill-books/${id}/decompose`);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];assert.equal(header('X-Bid'),'player');assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('Idempotency-Key'),request.idempotencyKey);assert.equal(header('X-Repeat-Command'),Buffer.from(row.text).toString('base64'));
 }
 calls.length=0;await assert.rejects(()=>decomposeBackendSkillBook('player',1,9007199254740992,{requestId:'unsafe',idempotencyKey:'unsafe'}),/Invalid parameter skillBookId/);assert.equal(calls.length,0);
});
