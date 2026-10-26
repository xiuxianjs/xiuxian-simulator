import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendEventOverview,parseBackendEventOverview} from '../src/api/bot/event-overview-queries';
import {getBackendEventShop,parseBackendEventShop} from '../src/api/bot/event-shop-queries';
import {getBackendEventRecharge,parseBackendEventRecharge} from '../src/api/bot/event-recharge-queries';
import {getBackendEventTasks,parseBackendEventTasks} from '../src/api/bot/event-tasks-queries';
import {getBackendEventTokens,parseBackendEventTokens} from '../src/api/bot/event-tokens-queries';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('limited event original SDK paths and pure projections accept real combined Go results',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLimitedEventQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LIMITED_EVENT_QUERY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
 mockBackendConfig(t,{api_url:'https://limited-query.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 const parsers:Record<string,(v:unknown)=>unknown>={overview:parseBackendEventOverview,shop:parseBackendEventShop,recharge:parseBackendEventRecharge,tasks:parseBackendEventTasks,tokens:parseBackendEventTokens};
 for(row of rows){
  const parse=parsers[row.kind];const parsed=parseRobotBusinessEnvelope(row.result,'player',parse);assert.equal(parsed.success,row.result.success);assert.equal(parsed.branch,row.result.branch);
  if(row.status===0)continue;
  calls.length=0;const call=()=>({overview:()=>getBackendEventOverview('player',1),shop:()=>getBackendEventShop('player',1,row.arguments.shopType),recharge:()=>getBackendEventRecharge('player',1),tasks:()=>getBackendEventTasks('player',1),tokens:()=>getBackendEventTokens('player',1)}[row.kind as 'overview'])();
  if(row.status===200){const result=await call();assert.deepEqual(result,parse(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,result);}
  else await assert.rejects(call);
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'GET');const url=new URL(calls[0].url);assert.equal(url.pathname+url.search,'/api/v1'+row.path);
 }
 for(const parse of Object.values(parsers))for(const value of [null,{},[{}],['bad']])assert.throws(()=>parse(value));
});
