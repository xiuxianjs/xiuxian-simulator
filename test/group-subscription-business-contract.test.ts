import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { enableBackendGroupSubscription } from '../src/api/bot/group-subscription-enable';
import { disableBackendGroupSubscription } from '../src/api/bot/group-subscription-disable';
import { parseGroupSubscriptionResult } from '../src/api/bot/group-subscription-business';

test('subscription combination preserves original SDK target and flags',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGroupSubscription','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_GROUP_SUBSCRIPTION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,96);
 mockBackendConfig(t,{api_url:'https://subscription.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;data?:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted'&&r.status===200)){
  calls.length=0;const a=row.arguments;
  const old=row.action==='enable'?await enableBackendGroupSubscription('player',1,{platform:a.platform,channelId:a.channelId,botId:a.botId??undefined,targetScope:a.targetScope},{requestId:'old-sdk',idempotencyKey:'old-sdk'}):await disableBackendGroupSubscription('player',1,{requestId:'old-sdk',idempotencyKey:'old-sdk'});
  const parsed=parseGroupSubscriptionResult(row.result.data,row.action);
  if(row.action==='enable')assert.equal(parsed.switched,(old as {switched:boolean}).switched);else assert.equal(parsed.disabled,old);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/notification-subscription');assert.equal(calls[0].method.toUpperCase(),row.action==='enable'?'PUT':'DELETE');
  if(row.action==='enable')assert.deepEqual(JSON.parse(calls[0].data!),{platform:a.platform,channelId:a.channelId,botId:a.botId,targetScope:a.targetScope});
 }
 for(const action of ['enable','disable'] as const)for(const value of [null,{},[],{switched:1,disabled:1}])assert.throws(()=>parseGroupSubscriptionResult(value,action));
});
