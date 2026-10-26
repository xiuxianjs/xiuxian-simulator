import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendMarketBrowse,parseBackendMarketBrowse} from '../src/api/bot/market-browse-query';
import {parseRobotMarketBrowse} from '../src/api/bot/market-robot-query';
import {marketListingsView,marketCredibilityView} from '../src/api/bot/market-community-views';
import {parseMyMarketListings} from '../src/api/bot/my-market-listings';
import {parseMarketCredibility} from '../src/api/bot/market-credibility';
import {getBackendMarketTrades,parseBackendMarketTrades} from '../src/api/bot/queries';
import myApp from '../src/response-apps/market/my/app';
import credibilityApp from '../src/response-apps/market/credibility/app';

test('market keeps original v1 SDK and App payload contracts while res directly calls combined business',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMarketQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_MARKET_V1=([^|]+)\|(.+)/g)].map(m=>({op:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,11);
 mockBackendConfig(t,{api_url:'https://market-contract.test',robot_auth_token:'test-token'});const calls:string[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(new URL(call.url).pathname);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 for(const row of rows){payload=row.data;calls.length=0;
  if(row.op==='market.browse'){assert.deepEqual(await getBackendMarketBrowse('player',1,{page:1}),parseBackendMarketBrowse(payload));assert.deepEqual(calls,['/api/v1/players/1/market/browse']);assert.deepEqual(parseRobotMarketBrowse({...row.data,view:'browse'},'browse'),{...row.data,view:'browse'});}
  else if(row.op==='market.records'){assert.deepEqual(await getBackendMarketTrades('player',1,'all',1,5),parseBackendMarketTrades(payload));assert.deepEqual(calls,['/api/v1/players/1/market/trades']);}
  else if(row.op==='market.my-listings'){const expected=parseMyMarketListings(row.data.listings);assert.deepEqual(await marketListingsView('player',1,1),expected);assert.deepEqual(calls,['/api/v1/players/1/market/workflow']);assert.deepEqual(await myApp({bid:'player',uid:1,page:1}),{code:'OK',data:expected});}
  else {const expected=parseMarketCredibility(row.data.credibility);assert.deepEqual(await marketCredibilityView('player',1),expected);assert.deepEqual(calls,['/api/v1/players/1/market/workflow']);assert.deepEqual(await credibilityApp({bid:'player',uid:1}),{code:'OK',data:expected});}
 }
 assert.deepEqual(parseRobotMarketBrowse({view:'guide',spiritsCrystal:null},'guide'),{view:'guide',spiritsCrystal:null});
 for(const bad of [null,{}, {view:'guide',spiritsCrystal:'123'},{view:'browse',spiritsCrystal:123}])assert.throws(()=>parseRobotMarketBrowse(bad,'guide'));
 for(const kind of ['list','my','records','credibility']){const source=readFileSync(new URL(`../src/response/market/${kind}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
