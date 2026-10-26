import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendRealmOverview, parseRobotRealmOverview } from '../src/api/bot/realm-overview';
import App from '../src/response-apps/realms/myRealm/app';

test('realm original SDK and formatter match v2 display while preserving authenticated v1', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRealmOverview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_REALM_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,15);
 mockBackendConfig(t,{api_url:'https://realm.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  calls.length=0;
  const result=await App({bid:'player',uid:1});
  assert.equal(calls.length,1);
  assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/realm/overview');assert.equal(calls[0].method.toUpperCase(),'GET');
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');
  if(row.status===200){assert.equal(result.code,'OK');assert.deepEqual(parseRobotRealmOverview(row.result.data),result.data)}
  else {assert.equal(result.code,'LOAD_FAILED');assert.equal(row.result.success,false)}
 }
 calls.length=0;await assert.rejects(()=>getBackendRealmOverview(undefined,1),{message:'境界查询缺少平台身份'});assert.equal(calls.length,0);
});
