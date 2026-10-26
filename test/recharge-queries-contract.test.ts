import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendFirstRechargeInfo,parseBackendFirstRechargeInfo} from '../src/api/bot/first-recharge-queries';
import {getBackendNewcomerRechargeInfo,parseBackendNewcomerRechargeInfo} from '../src/api/bot/newcomer-recharge-queries';
import {getBackendWeeklyRebate,parseBackendWeeklyRebate} from '../src/api/bot/weekly-rebate-queries';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('recharge queries share original pure SDK decoders with actual combined Go responses',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRechargeQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RECHARGE_QUERY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,36);
 const decoders:Record<string,(value:unknown)=>unknown>={first:parseBackendFirstRechargeInfo,newcomer:parseBackendNewcomerRechargeInfo,weekly:parseBackendWeeklyRebate};
 const getters:Record<string,(bid:string|undefined,uid:number)=>Promise<unknown>>={first:getBackendFirstRechargeInfo,newcomer:getBackendNewcomerRechargeInfo,weekly:getBackendWeeklyRebate};
 mockBackendConfig(t,{api_url:'https://recharge-queries.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',decoders[row.kind]);assert.equal(parsed.success,row.result.success);
  calls.length=0;const call=()=>getters[row.kind]('player',1);
  if(row.status===200){const data=await call();assert.deepEqual(data,decoders[row.kind](row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,data);}
  else await assert.rejects(call);
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/recharge/'+(row.kind==='weekly'?'weekly-rebate':row.kind));
 }
 for(const decode of Object.values(decoders))for(const value of [null,{},[],{rewards:[],tiers:[],itemNames:{},claimedDays:[]}])assert.throws(()=>decode(value));
});
