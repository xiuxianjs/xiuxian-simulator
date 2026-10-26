import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {unequipBackendSkillBook} from '../src/api/bot/skill-book-unequip';
import {BackendAPIError} from '../src/api/bot/client';

test('skill unequip original SDK retains null/empty names, errors, fixed type and write/repeat identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillUnequipV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_UNEQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,144);
 mockBackendConfig(t,{api_url:'https://skill-unequip.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;const request={requestId:'unequip-'+i,idempotencyKey:'unequip-'+i};const invoke=()=>unequipBackendSkillBook('player',1,row.arguments.skillType,request,row.text);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);else assert.deepEqual(await invoke(),row.v1.data);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/unequip');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),row.arguments);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),request.idempotencyKey);assert.equal(Buffer.from(header('X-Repeat-Command')!,'base64url').toString(),row.text);
 }
});
