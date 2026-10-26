import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendPlayerShopVisit,parseBackendPlayerShopVisit} from '../src/api/bot/player-shop-visit-query';
import {resolveRobotTargetFromArg} from '../src/utils/targetUid';

test('visit original SDK remains compatible; v2 target extraction does not query identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPlayerShopVisit','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SHOP_VISIT_V1=([^|]+)\|(.+)/g)].map(m=>({path:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,7);
 mockBackendConfig(t,{api_url:'https://shop-visit-contract.test',robot_auth_token:'test-token'});const calls:{url:string}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 for(const row of rows){payload=row.data;calls.length=0;const u=new URL(row.path,'https://unused.test'),owner=Number(u.pathname.split('/')[5]);assert.deepEqual(await getBackendPlayerShopVisit('player',1,owner,Number(u.searchParams.get('page'))),parseBackendPlayerShopVisit(row.data));assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1'+u.pathname);}
 calls.length=0;await assert.rejects(()=>getBackendPlayerShopVisit('player',1,2,1e100),/Invalid parameter page/);assert.equal(calls.length,0);
 calls.length=0;let mentions=0;const mention={findOne:async()=>{mentions++;return{count:1,data:{UserId:'market-writer'}}}};
 assert.deepEqual(await resolveRobotTargetFromArg('0002',mention),{uid:2});assert.equal(mentions,0);
 for(const arg of ['@目标','abc','0','9007199254740992'])assert.deepEqual(await resolveRobotTargetFromArg(arg,mention),{bid:'market-writer'});
 assert.equal(calls.length,0);assert.equal(mentions,4);
 for(const bad of [null,{},'bad',{shop:null,items:[],currencies:{},pagination:{currentPage:1,totalPages:1,total:0}}])assert.throws(()=>parseBackendPlayerShopVisit(bad));
 const source=readFileSync(new URL('../src/response/shop/playerShop/visit/res.ts',import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('resolveTargetUidFromArg'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);
});
