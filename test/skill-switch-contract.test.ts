import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {switchBackendSkillBook,parseSkillBookSwitchResponse} from '../src/api/bot/skill-book-switch';
import {getBackendSkillBookSwitchOptions} from '../src/api/bot/skill-book-switch-options';
import {BackendAPIError} from '../src/api/bot/client';

test('skill switching original SDK preserves instance/option routes and preflight refusal',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillSwitchV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_SWITCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,120);
 mockBackendConfig(t,{api_url:'https://skill-switch.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);const options=new URL(call.url).pathname.endsWith('switch-options');return{status:options?row.optionsStatus:row.status,headers:{},data:JSON.stringify(options?row.optionsV1:row.v1)}}}));
 for(row of rows){
  const kind=row.arguments.skillType;
  if(row.status!==0){
   calls.length=0;const id=parseInt(row.arguments.bookId,10);
   const invoke=()=>switchBackendSkillBook('player',1,id,kind,row.arguments.confirm==='确认',{requestId:'sdk',idempotencyKey:'sdk'},row.text);
   if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message&&error.code===row.v1.error.code);
   else assert.deepEqual(await invoke(),parseSkillBookSwitchResponse(row.v1.data));
   assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/'+id+'/switch');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),{skillType:kind,force:row.arguments.confirm==='确认'});
   const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
   assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(Buffer.from(header('X-Repeat-Command')!,'base64').toString('utf8'),row.text);
  }
  if(row.optionsStatus!==0){
   calls.length=0;const invoke=()=>getBackendSkillBookSwitchOptions('player',1,kind);
   if(row.optionsStatus!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.optionsV1.error.message);
   else assert.deepEqual(await invoke(),row.optionsV1.data);
   assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/skill-books/switch-options');assert.equal(url.searchParams.get('skillType'),kind);assert.equal(calls[0].method.toUpperCase(),'GET');
  }
 }
 calls.length=0;await assert.rejects(()=>switchBackendSkillBook('player',1,9007199254740992,'战技',false,{requestId:'sdk',idempotencyKey:'sdk'}),error=>error instanceof BackendAPIError&&error.code==='SDK_INVALID_REQUEST'&&error.message==='Invalid parameter skillBookId');assert.equal(calls.length,0);
});
