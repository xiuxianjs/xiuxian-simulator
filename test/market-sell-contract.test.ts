import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendMarketSellable,parseBackendMarketSellable} from '../src/api/bot/market-trade';
import {parseRobotMarketSell,presentMarketSellable} from '../src/api/bot/market-sell-query';
import {marketWorkflow} from '../src/api/bot/market-community-views';
import {fetchSellableList,fetchPriceRange} from '../src/response-apps/market/sell/app';

test('market sell original v1 read/write SDK and App contracts stay compatible with direct v2',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMarketSell','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_MARKET_SELL_V1=([^|]+)\|(.+)/g)].map(m=>({path:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,12);
 mockBackendConfig(t,{api_url:'https://market-sell-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;headers:Record<string,string>})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'original-request',idempotencyKey:'original-event'};
 for(const row of rows){payload=row.data;calls.length=0;if(row.path.includes('/sellable')){const u=new URL(row.path,'https://unused.test');const category=u.searchParams.get('category')!,subtype=u.searchParams.get('subtype')||undefined,page=Number(u.searchParams.get('page'));const expected=parseBackendMarketSellable(row.data);assert.deepEqual(await getBackendMarketSellable('player',1,{category,subtype,page,pageSize:10}),expected);assert.deepEqual(await fetchSellableList({bid:'player',uid:1,categoryKey:{type:category as 'prop',subtype},page}),{code:'OK',data:presentMarketSellable(expected,category)});}
 else{assert.deepEqual(await marketWorkflow('player',1,{action:'sell',category:'item',userItemId:2,firstNumber:2,secondNumber:20},request),row.data);const range=row.data.range;const app=await fetchPriceRange({bid:'player',uid:1,userItemId:2,categoryKey:{type:'prop'},firstNumber:2,secondNumber:20,request});assert.equal(app.code,'OK');if(app.code==='OK'){assert.deepEqual(app.data,{minPrice:range.minPrice,maxPrice:range.maxPrice,refPrice:range.referencePrice,source:range.source,isAboveThreshold:range.credibilityReady,maxListingQuantity:range.maxListingQuantity,fixedQuantity:range.fixedQuantity});assert.deepEqual(app.submission,row.data.receipt?{code:'OK',data:{message:row.data.receipt.message,listingId:row.data.receipt.listingId}}:undefined);}}
 for(const call of calls){assert.equal(new URL(call.url).pathname,'/api/v1'+row.path.split('?')[0]);if(row.path.endsWith('workflow'))assert.equal(new Headers(call.headers).get('Idempotency-Key'),'original-event');}}
 const receipts=[...output.matchAll(/ROBOT_MARKET_SELL_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),result:JSON.parse(m[3]).data}));
 for(const row of receipts.filter(r=>r.result.success&&r.result.branch==='business'))parseRobotMarketSell(row.result.data,row.args.mode,row.args.category??'');
 for(const bad of [null,{}, {mode:'choose'},{mode:'start',range:{}},{mode:'list',items:[]}])assert.throws(()=>parseRobotMarketSell(bad,'start','prop'));
 const source=readFileSync(new URL('../src/response/market/sell/res.ts',import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('withBackendRepeatDetection'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);
});
