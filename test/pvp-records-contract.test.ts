import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {robberyRecordsView} from '../src/api/bot/market-community-views';
import {parseRobberyRecords} from '../src/api/bot/robbery-records';
import App from '../src/response-apps/robberyRecord/app';

test('actual records-view v1 SDK and App stay compatible with original non-idempotent acknowledgement request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPVPRecords','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RECORDS_V1=([^|]+)\|(.+)/g)].map(m=>({page:Number(m[1]),data:JSON.parse(m[2]).data}));assert.equal(rows.length,5);
 mockBackendConfig(t,{api_url:'https://records-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'records-original',idempotencyKey:'unused-original-key'};
 for(const row of rows){payload=row.data;calls.length=0;const expected=parseRobberyRecords(payload);
  assert.deepEqual(await robberyRecordsView('player',1,row.page,request),expected);
  assert.deepEqual(await App({bid:'player',uid:1,page:row.page,request}),{code:'OK',data:expected});
  assert.equal(calls.length,2);for(const call of calls){assert.equal(new URL(call.url).pathname,'/api/v1/players/1/robbery/records-view');assert.deepEqual(JSON.parse(call.data!),{page:row.page});assert.equal(new Headers(call.headers).get('Idempotency-Key'),null);}
 }
 const full=rows.find(r=>r.data.records.length>0)!.data;
 for(const invalid of [null,{}, {...full,total:'6'},{...full,records:[{...full.records[0],canCounterAttack:0}]},{...full,records:[{...full.records[0],stoneReward:'10'}]}])assert.throws(()=>parseRobberyRecords(invalid));
});
