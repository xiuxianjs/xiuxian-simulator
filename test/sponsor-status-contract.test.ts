import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSponsorStatus,parseBackendSponsorStatus} from '../src/api/bot/sponsor-status-queries';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('sponsor status shares the original decoder with combined responses',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSponsorStatus','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SPONSOR_STATUS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,20);
 mockBackendConfig(t,{api_url:'https://sponsor-status.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseBackendSponsorStatus);assert.equal(parsed.success,row.result.success);
  calls.length=0;
  if(row.status===200){const data=await getBackendSponsorStatus('player',1);assert.deepEqual(data,parseBackendSponsorStatus(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,data);}
  else await assert.rejects(()=>getBackendSponsorStatus('player',1));
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/payments/sponsor-status');
 }
 for(const value of [null,{},[],{hasThemePermission:true},{hasThemePermission:true,totalFen:Infinity}])assert.throws(()=>parseBackendSponsorStatus(value));
});
