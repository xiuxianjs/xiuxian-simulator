import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {challengeBackendSecretRealm,claimBackendSecretRealm,parseBackendSecretRealmChallenge,parseBackendSecretRealmClaim} from '../src/api/bot/guild-secret-realm-war';
import oldChallenge from '../src/response-apps/guildSecretRealmWar/challenge/app';
import oldClaim from '../src/response-apps/guildSecretRealmWar/claim/app';

test('secret realm actions retain original v1 write SDK and App contracts while v2 omits unused battle payload',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSecretRealmActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SECRET_REALM_ACTION_V1=([^|]+)\|(.+)/g)].map(m=>({kind:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,2);
 mockBackendConfig(t,{api_url:'https://srw-actions-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;headers:Record<string,string>})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'original-request',idempotencyKey:'original-event'};
 for(const row of rows){payload=row.data;calls.length=0;
  if(row.kind==='challenge'){const expected=parseBackendSecretRealmChallenge(payload);assert.deepEqual(await challengeBackendSecretRealm('player',1,1,1,request),expected);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v1/players/1/secret-realms/1/positions/1/challenge']);assert.deepEqual(await oldChallenge({bid:'player',uid:1,realmNo:1,positionNo:1,request}),{code:'OK',data:expected});assert.ok(row.data.battle);assert.ok(row.data.lineup);}
  else{const expected=parseBackendSecretRealmClaim(payload);assert.deepEqual(await claimBackendSecretRealm('player',1,request),expected);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v1/players/1/secret-realms/claim']);assert.deepEqual(await oldClaim({bid:'player',uid:1,request}),{code:'OK',data:expected});}
  for(const call of calls)assert.equal(new Headers(call.headers).get('Idempotency-Key'),'original-event');
 }
 const receipts=[...output.matchAll(/ROBOT_SECRET_REALM_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 for(const row of receipts.filter(r=>r.op.endsWith('challenge')&&r.result.success&&r.result.branch==='business')){assert.equal(row.result.data.battle,undefined);assert.equal(row.result.data.lineup,undefined);parseBackendSecretRealmChallenge(row.result.data);}
 for(const bad of [null,{}, {won:true,realmNo:1,positionNo:1,frozenUntil:'invalid'}, {won:'yes',realmNo:1,positionNo:1}])assert.throws(()=>parseBackendSecretRealmChallenge(bad));
 for(const bad of [null,{}, {spiritCrystal:0,contribution:0,reputation:0,ownedRealms:0,reputationAlreadyClaimed:false}])assert.throws(()=>parseBackendSecretRealmClaim(bad));
 for(const kind of ['challenge','claim']){const source=readFileSync(new URL(`../src/response/guildSecretRealmWar/${kind}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
