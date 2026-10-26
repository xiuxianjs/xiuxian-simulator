import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendRechargeCatalog,parseBackendRechargeCatalog} from '../src/api/bot/recharge-catalog-queries';
import {parseRobotRechargeCatalog} from '../src/api/bot/recharge-info';
import {getRechargeInfoData} from '../src/response-apps/recharge/info/app';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('catalog combined parser matches original SDK and display projection from real Go responses',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRechargeCatalog','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RECHARGE_CATALOG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,18);
 mockBackendConfig(t,{api_url:'https://catalog.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseRobotRechargeCatalog);assert.equal(parsed.success,row.result.success);
  calls.length=0;const call=()=>getBackendRechargeCatalog('player',1);
  if(row.status===200){
   const data=await call();assert.deepEqual(data,parseBackendRechargeCatalog(row.v1.data));
   if(parsed.success&&parsed.branch==='business'){
    const {showNewcomerRebate,showWeeklyRebate,activityPackages,sponsor,...display}=parsed.data;
    assert.ok(Array.isArray(activityPackages));assert.equal(typeof sponsor.hasThemePermission,'boolean');assert.equal(typeof showNewcomerRebate,'boolean');assert.equal(typeof showWeeklyRebate,'boolean');
    calls.length=0;assert.deepEqual(display,await getRechargeInfoData(1,true,'player'));
   }
  }else await assert.rejects(call);
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/recharge/catalog');
 }
 for(const value of [null,{},[],{catalog:{},showNewcomerRebate:true,showWeeklyRebate:true}])assert.throws(()=>parseRobotRechargeCatalog(value));
});
