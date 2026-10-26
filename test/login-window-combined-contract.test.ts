import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {issueBackendLoginWindow,parseBackendLoginWindow} from '../src/api/bot/account';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('login window reuses v1 credential decoder and rejects malformed or foreign credentials',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLoginWindow','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LOGIN_WINDOW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,16);
 mockBackendConfig(t,{api_url:'https://login-window.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseBackendLoginWindow);assert.equal(parsed.success,row.result.success);calls.length=0;
  if(row.status===200){const original=await issueBackendLoginWindow('player',1,{requestId:'login',idempotencyKey:'login'});if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,original);}
  else await assert.rejects(()=>issueBackendLoginWindow('player',1,{requestId:'login',idempotencyKey:'login'}));
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/auth/temporary-password');
 }
 const ready=rows.find(r=>r.result.success&&r.result.branch==='business').result.data;
 for(const value of [null,{},[],{...ready,playerId:2},{...ready,temporaryPassword:'123'},{...ready,expiresIn:0},{...ready,expiresAt:'invalid'}])assert.throws(()=>parseBackendLoginWindow(value,1));
});
