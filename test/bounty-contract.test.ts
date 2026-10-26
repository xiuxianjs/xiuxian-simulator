import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendBounties,parseBackendBounties,parseRobotBountyList} from '../src/api/bot/bounty-queries';
import {getBackendPendingBountyRewards,claimBackendBounty,acceptBackendBounty,parseBackendPendingBountyRewards,parseBackendBountyAccept,parseRobotBountyClaim} from '../src/api/bot/bounty-actions';
import ListApp from '../src/response-apps/bounty/list/app';
import AcceptApp from '../src/response-apps/bounty/accept/app';
import ClaimApp from '../src/response-apps/bounty/claim/app';

test('original bounty v1 SDK and App contracts remain compatible with direct v2 DTO decoders',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBounty','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BOUNTY_V1=([^|]+)\|(.+)/g)].map(m=>({path:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,10);
 mockBackendConfig(t,{api_url:'https://bounty-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'bounty-original',idempotencyKey:'bounty-original-key'};
 for(const row of rows){payload=row.data;calls.length=0;const u=new URL(row.path,'https://unused.test');
 if(u.pathname==='/bounties'){const page=Number(u.searchParams.get('page'));assert.deepEqual(await getBackendBounties('player',page),parseBackendBounties(row.data,page));assert.deepEqual(await ListApp({bid:'player',page}),{code:'OK',data:parseRobotBountyList(row.data)});for(const call of calls)assert.equal(new URL(call.url).searchParams.get('pageSize'),'5');}
 else if(u.pathname.endsWith('pending-rewards')){const pending=parseBackendPendingBountyRewards(row.data);assert.deepEqual(await getBackendPendingBountyRewards('player',1),pending);assert.deepEqual(await ClaimApp({bid:'player',uid:1,bountyId:null,request}),{code:'LIST',data:{pending}});}
 else if(u.pathname.endsWith('claim')){assert.deepEqual(await claimBackendBounty('player',2,request),{rewardAmount:row.data.changeAmount});assert.deepEqual(await ClaimApp({bid:'player',uid:1,bountyId:2,request}),{code:'OK',data:{rewardAmount:row.data.changeAmount}});}
 else{const expected=parseBackendBountyAccept(row.data);assert.deepEqual(await acceptBackendBounty('player',1,request),expected);assert.deepEqual(await AcceptApp({bid:'player',bountyId:1,request}),{code:'OK',data:expected});}
 assert.equal(calls.length,2);for(const call of calls){assert.equal(new URL(call.url).pathname,'/api/v1'+u.pathname);if(!u.pathname.endsWith('pending-rewards')&&u.pathname!=='/bounties')assert.equal(new Headers(call.headers).get('Idempotency-Key'),'bounty-original-key');}
 }
 calls.length=0;assert.deepEqual(await AcceptApp({bid:'player',bountyId:1e100,request}),{code:'INVALID_ID'});assert.deepEqual(await ClaimApp({bid:'player',uid:1,bountyId:0,request}),{code:'INVALID_ID'});await assert.rejects(()=>getBackendBounties('player',1e100),/Invalid parameter page/);assert.equal(calls.length,0);
 for(const decode of [parseRobotBountyList,parseBackendBountyAccept,parseRobotBountyClaim])for(const bad of [null,{},'bad'])assert.throws(()=>decode(bad));
 for(const name of ['list','accept','claim']){const source=readFileSync(new URL(`../src/response/bounty/${name}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
