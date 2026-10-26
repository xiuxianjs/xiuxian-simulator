import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendShopList,getBackendShopRanking,parseBackendShopList,parseBackendShopRanking} from '../src/api/bot/shop-queries';
import {getBackendOwnPlayerShop,parseBackendOwnPlayerShop} from '../src/api/bot/player-shop-own';
import {renameBackendPlayerShop} from '../src/api/bot/player-shop-rename';
import {updateBackendPlayerShopDescription} from '../src/api/bot/player-shop-description';

test('shop v1 SDK paths, pagination and mutation contracts stay compatible',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPlayerShop','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PLAYER_SHOP_V1=([^|]+)\|(.+)/g)].map(m=>({op:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,10);
 mockBackendConfig(t,{api_url:'https://player-shop-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'shop-v1',idempotencyKey:'shop-original-event'};
 for(const row of rows){payload=row.data;calls.length=0;let path:string;
 switch(row.op){case 'player-shop.list':assert.deepEqual(await getBackendShopList('player',row.data.currentPage),parseBackendShopList(row.data));assert.equal(new URL(calls[0].url).searchParams.get('pageSize'),'5');path='/market/shops';break;
 case 'player-shop.ranking':assert.deepEqual(await getBackendShopRanking('player',20),parseBackendShopRanking(row.data));assert.equal(new URL(calls[0].url).searchParams.get('topN'),'20');path='/market/shops/ranking';break;
 case 'player-shop.mine':assert.deepEqual(await getBackendOwnPlayerShop('player',1,request),parseBackendOwnPlayerShop(row.data));path='/players/1/market/shop/overview/ensure';break;
 case 'player-shop.rename':assert.deepEqual(await renameBackendPlayerShop('player',1,'流云小筑',request),row.data);path='/players/1/market/shop/name';break;
 default:assert.deepEqual(await updateBackendPlayerShopDescription('player',1,'云中小店',request),row.data);path='/players/1/market/shop/description';}
 assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1'+path);
 }
 payload=rows.find(r=>r.op==='player-shop.list')!.data;calls.length=0;
 await assert.rejects(()=>getBackendShopList('player',1e100),/Invalid parameter page/);assert.equal(calls.length,0);
 for(const name of ['list','mine','ranking','rename','description']){const source=readFileSync(new URL(`../src/response/shop/playerShop/${name}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('withBackendRepeatDetection'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
 for(const decode of [parseBackendShopList,parseBackendShopRanking,parseBackendOwnPlayerShop])for(const bad of [null,{},'bad'])assert.throws(()=>decode(bad));
});
