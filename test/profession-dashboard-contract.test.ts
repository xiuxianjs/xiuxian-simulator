import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import myProfession from '../src/response-apps/profession/myProfession/app';
import {parseProfessionDashboard} from '../src/api/bot/profession-dashboard-query';

test('actual v1 profession dashboard SDK/App preserves query-only payload and failure',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessProfessionDashboard','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PROFESSION_DASHBOARD_V1=([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],text:m[2],status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(rows.length,32);
 mockBackendConfig(t,{api_url:'https://profession-dashboard.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:string[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(new URL(call.url).pathname);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const row of rows){current=row;calls.length=0;
  const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{const result=await myProfession({bid:'player',uid:1});assert.deepEqual(result,row.status===200?{code:'OK',data:parseProfessionDashboard(row.body.data)}:{code:'LOAD_FAILED'});});
  assert.deepEqual(calls,['/api/v1/players/1/professions/dashboard']);
 }
 for(const value of [null,{}, {access:{}},{access:{canUseProfessionAndCave:true},alchemy:{},lingzhi:{}}])assert.throws(()=>parseProfessionDashboard(value));
});
