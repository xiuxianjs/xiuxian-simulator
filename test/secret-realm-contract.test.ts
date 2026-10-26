import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSecretRealmHome,getBackendSecretRealms,getBackendSecretRealm,parseBackendSecretRealmHome,parseBackendSecretRealmList,parseBackendSecretRealmView} from '../src/api/bot/guild-secret-realm-war';
import oldHome from '../src/response-apps/guildSecretRealmWar/home/app';
import oldList from '../src/response-apps/guildSecretRealmWar/list/app';
import oldView from '../src/response-apps/guildSecretRealmWar/view/app';

test('secret realm read v1 SDK and Apps retain original contracts without new forwarding in v2 res',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSecretRealmQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SECRET_REALM_V1=([^|]+)\|(.+)/g)].map(m=>({op:m[1],data:JSON.parse(m[2]).data}));assert.ok(rows.length>=10);
 mockBackendConfig(t,{api_url:'https://srw-contract.test',robot_auth_token:'test-token'});const calls:string[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(new URL(call.url).pathname);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 for(const row of rows){payload=row.data;calls.length=0;
  if(row.op.endsWith('home')){const expected=parseBackendSecretRealmHome(payload);assert.deepEqual(await getBackendSecretRealmHome('player',1),expected);assert.deepEqual(calls,['/api/v1/players/1/secret-realms/home']);assert.deepEqual(await oldHome({bid:'player',uid:1}),{code:'OK',data:expected});}
  else if(row.op.endsWith('list')){const expected=parseBackendSecretRealmList(payload);assert.deepEqual(await getBackendSecretRealms('player',1),expected);assert.deepEqual(calls,['/api/v1/secret-realms']);assert.deepEqual(await oldList({bid:'player',page:1}),{code:'OK',data:expected});}
  else{const expected=parseBackendSecretRealmView(payload);assert.deepEqual(await getBackendSecretRealm('player',1,1),expected);assert.deepEqual(calls,['/api/v1/secret-realms/1']);assert.deepEqual(await oldView({bid:'player',realmNo:1,page:1}),{code:'OK',data:expected});}
 }
 calls.length=0;assert.deepEqual(await oldView({bid:'player',realmNo:null,page:1}),{code:'NEED_REALM_NO'});assert.equal(calls.length,0);
 for(const parser of [parseBackendSecretRealmHome,parseBackendSecretRealmList,parseBackendSecretRealmView])for(const bad of [null,{},'invalid'])assert.throws(()=>parser(bad));
 for(const folder of ['home','list','view']){const source=readFileSync(new URL(`../src/response/guildSecretRealmWar/${folder}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
