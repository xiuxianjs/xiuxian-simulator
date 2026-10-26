import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {marketWorkflow} from '../src/api/bot/market-community-views';
import {cancelBackendMarketListing} from '../src/api/bot/market-cancel';
import {parseRobotMarketMessage,parseRobotMarketPurchase} from '../src/api/bot/market-robot-query';
import oldPurchase from '../src/response-apps/market/confirmBuy/app';
import oldCancel from '../src/response-apps/market/cancel/app';

test('market write v1 SDK and original Apps remain compatible while v2 only returns bubble fields',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMarketActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_MARKET_ACTION_V1=([^|]+)\|(.+)/g)].map(m=>({path:m[1],data:JSON.parse(m[2]).data}));assert.equal(rows.length,4);
 mockBackendConfig(t,{api_url:'https://market-action-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;headers:Record<string,string>})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'original-request',idempotencyKey:'original-event'};
 for(const row of rows){payload=row.data;calls.length=0;if(row.path.endsWith('workflow')){assert.deepEqual(await marketWorkflow('player',1,{action:'purchase',listingId:11,quantity:7,confirmed:false},request),row.data);const data=row.data.preview??{message:row.data.receipt.message};assert.deepEqual(await oldPurchase({bid:'player',uid:1,listingId:11,quantity:7,isConfirmed:false,request}),{code:row.data.preview?'NEED_CONFIRM':'OK',data});if(row.data.receipt)assert.ok(row.data.receipt.lines.length>0);}
 else{const id=Number(row.path.split('/').at(-2));const value=await cancelBackendMarketListing('player',1,id,request);assert.equal(value.feeAmount,row.data.feeAmount??0);const message=value.message+'：'+value.itemName+(value.feeAmount>0?`，返还手续费${value.feeAmount}灵晶`:'');assert.deepEqual(await oldCancel({bid:'player',uid:1,listingId:id,request}),{code:'OK',data:{message}});}
 for(const call of calls){assert.equal(new URL(call.url).pathname,'/api/v1'+row.path);assert.equal(new Headers(call.headers).get('Idempotency-Key'),'original-event');}}
 const results=[...output.matchAll(/ROBOT_MARKET_ACTION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[4]).data}));
 for(const row of results.filter(r=>r.result.success&&r.result.branch==='business')){const value=row.op==='market.purchase'?parseRobotMarketPurchase(row.result.data):parseRobotMarketMessage(row.result.data);assert.deepEqual(value,row.result.data);assert.equal(row.result.data.receipt,undefined);}
 for(const value of [null,{}, {message:12},{preview:null},{preview:{}}])assert.throws(()=>parseRobotMarketPurchase(value));
 for(const folder of ['confirmBuy','cancel']){const source=readFileSync(new URL(`../src/response/market/${folder}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('withBackendRepeatDetection'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
