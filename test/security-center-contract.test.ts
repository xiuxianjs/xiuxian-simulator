import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSecurityProfile} from '../src/api/bot/account';
import {parseRobotSecurityCenter} from '../src/api/bot/security-center';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('security center projects original v1 profile into its four display fields',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSecurityCenter','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SECURITY_CENTER=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,18);
 mockBackendConfig(t,{api_url:'https://security-center.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotSecurityCenter);assert.equal(parsed.success,row.result.success);calls.length=0;
  if(row.status===200){const original=await getBackendSecurityProfile('player');if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,{name:original.name,id:original.playerId,email:original.email||null,hasPassword:original.hasPassword});}
  else await assert.rejects(()=>getBackendSecurityProfile('player'));
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(new URL(calls[0].url).pathname,'/api/v1/auth/profile');
 }
 for(const value of [null,{},[],{playerId:2,name:'other',email:'',hasPassword:false},{playerId:1,name:'x',email:null,hasPassword:false}])assert.throws(()=>parseRobotSecurityCenter(value,1));
});
