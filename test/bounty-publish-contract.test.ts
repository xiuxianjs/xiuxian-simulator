import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendBountyPublishPolicy,publishBackendBounty,parseBackendBountyPublishPolicy,parseBackendPublishedBounty,parseRobotBountyPublish} from '../src/api/bot/bounty-actions';
import PublishApp from '../src/response-apps/bounty/publish/app';

test('bounty policy and publish v1 SDK/App contracts remain compatible and preserve optional/default numeric arguments',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBountyPublish','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BOUNTY_PUBLISH_V1=([^|]+)\|(.+)/g)].map(m=>({path:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,2);
 mockBackendConfig(t,{api_url:'https://bounty-publish-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'bounty-publish-original',idempotencyKey:'original-publish-key'};
 payload=rows[0].data;assert.deepEqual(await getBackendBountyPublishPolicy('player'),parseBackendBountyPublishPolicy(payload));assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/bounties/publish-policy');
 payload=rows[1].data;calls.length=0;const expected=parseBackendPublishedBounty(payload);assert.deepEqual(await publishBackendBounty('player',1,2,1000,3,request),expected);assert.deepEqual(await PublishApp({bid:'player',uid:1,targetUid:2,amount:1000,maxCompletions:3,request}),{code:'OK',data:expected});
 for(const call of calls){assert.equal(new URL(call.url).pathname,'/api/v1/players/1/bounties');assert.equal(new Headers(call.headers).get('Idempotency-Key'),'original-publish-key');assert.deepEqual(JSON.parse(call.data!),{targetId:2,amount:1000,maxCompletions:3});}
 calls.length=0;await publishBackendBounty('player',1,2,1000,undefined,request);assert.deepEqual(JSON.parse(calls[0].data!),{targetId:2,amount:1000});
 // The original client validates safe integers; domain amount/count bounds are left to v1.
 for(const maxCompletions of [0,6]){calls.length=0;await publishBackendBounty('player',1,2,1000,maxCompletions,request);assert.equal(calls.length,1);assert.equal(JSON.parse(calls[0].data!).maxCompletions,maxCompletions);}
 calls.length=0;assert.deepEqual(await PublishApp({bid:'player',uid:1,targetUid:2,amount:1e100,request}),{code:'INVALID_PARAMS'});assert.deepEqual(await PublishApp({bid:'player',uid:1,targetUid:2,amount:1000,maxCompletions:1e100,request}),{code:'INVALID_PARAMS'});assert.equal(calls.length,0);
 for(const bad of [null,{},'bad',{outcome:'policy',policy:{}},{outcome:'published',data:{}}])assert.throws(()=>parseRobotBountyPublish(bad));
 const source=readFileSync(new URL('../src/response/bounty/publish/res.ts',import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('getBackendBountyPublishPolicy'));assert.ok(!source.includes('resolveTargetUidFromArg'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);
});
