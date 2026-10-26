import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import oldApp from '../src/response-apps/activity/app';
import {getBackendRealmAccess} from '../src/api/bot/realm-access-queries';
import {parseRobotActivityHub} from '../src/api/bot/activity-hub';

test('activity hub v2 composes original v1 App and menu facts without repeating their HTTP calls',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessActivityHub','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const payloads=new Map([...output.matchAll(/ROBOT_ACTIVITY_HUB_V1=([^|]+)\|(.+)/g)].map(m=>[m[1],JSON.parse(m[2]).data]));
 const receipts=[...output.matchAll(/ROBOT_ACTIVITY_HUB_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({scenario:m[1],result:JSON.parse(m[2]).data}));
 mockBackendConfig(t,{api_url:'https://activity-hub-contract.test',robot_auth_token:'test-token'});
 const calls:string[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{const path=new URL(call.url).pathname;calls.push(path);return{status:200,headers:{},data:JSON.stringify({data:payloads.get(path)})}}}));
 const legacy=await oldApp({bid:'player',uid:1});assert.equal(legacy.code,'OK');if(legacy.code!=='OK')throw new Error('missing old projection');
 const realm=await getBackendRealmAccess('player');assert.deepEqual(calls,['/api/v1/players/1/activity-hub','/api/v1/robot/realm-access']);
 const combined=parseRobotActivityHub(receipts.find(r=>r.scenario==='ready-guild')!.result.data);
 for(const key of ['limitedEvent','guildCompetition','guildSecretRealmWar'] as const)assert.deepEqual(combined[key],legacy.data[key]);
 assert.deepEqual(combined.access,{hasGuild:legacy.data.access.hasGuild,canAccessOverseasIsland:legacy.data.access.canAccessOverseasIsland});
 const visible=new Set([...realm.moreVisibleCommands,...realm.foldVisibleCommands]);assert.equal(combined.newcomerVisible,visible.has('/新人狂欢'));assert.equal(combined.giftCodesVisible,visible.has('/礼包码'));
 for(const value of [null,{}, {...combined,newcomerVisible:null}, {...combined,guildSecretRealmWar:{}}, {...combined,overseasIsland:'INVALID'}, {...combined,access:{hasGuild:false}}])assert.throws(()=>parseRobotActivityHub(value));
 const source=readFileSync(new URL('../src/response/activity/res.ts',import.meta.url),'utf8');for(const removed of ['response-apps','getBackendRealmAccess','getBackendGachaCatalog'])assert.ok(!source.includes(removed));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);
});
