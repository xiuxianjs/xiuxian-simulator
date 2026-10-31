import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {checkShopBuy} from '../src/response-apps/companion/shopBuy/app';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';
import {parseRobotCompanionShopPurchase} from '../src/api/bot/companion-shop-robot';

test('actual v1 shop SDK/App keeps preview, settlement, raw errors and repeat in one HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionShop','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_SHOP_V1=([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({confirmed:m[1]==='true',product:JSON.parse(m[2]),count:JSON.parse(m[3]),text:m[4],status:Number(m[5]),body:JSON.parse(m[6])}));assert.equal(rows.length,30);
 mockBackendConfig(t,{api_url:'https://companion-shop.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'companion-shop-id',idempotencyKey:'companion-shop-key'};
 for(const row of rows){payload=row.body;status=row.status;calls.length=0;
  const unsafe=[row.product,row.count].some(value=>typeof value==='number' && Number.isInteger(value) && !Number.isSafeInteger(value));
  const event={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event,()=>{},async()=>{
   const out=await checkShopBuy({bid:'player',uid:1,productId:row.product,count:row.count,confirmed:row.confirmed,messageText:row.text,request});
   if(unsafe){assert.equal(out.code,'FAIL');assert.match((out.data as {message:string}).message,/Body is not JSON serializable/);return;}
   if(row.status!==200){assert.equal(out.code,'FAIL');assert.equal((out.data as {message:string}).message,row.body.error.message);return;}
   assert.equal(out.code,'CONFIRM_NEEDED');if(out.code!=='CONFIRM_NEEDED')throw new Error('shop refused');
   if(!row.confirmed){assert.deepEqual(out.data,row.body.data);return;}
   const result=out.data.settledResult!;
   assert.equal(result.code,row.body.data.purchaseError?'FAIL':'OK');
   if(result.code==='FAIL'){const message=row.body.data.purchaseError;assert.equal(result.data.message,message);const p=row.body.presentation.repeat;assert.equal(await withBackendRepeatDetection('player',1,row.text,message,request),message+(p.suffix?'\n\n'+p.suffix:''));}
   else{const d=row.body.data.result;assert.deepEqual(result.data,{name:d.name,paid:d.paid,granted:d.granted});}
  });
  if(unsafe){assert.equal(calls.length,0);continue;}
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/companion/shop/purchases/'+(row.confirmed?'overview':'preview'));
  assert.deepEqual(JSON.parse(calls[0].data!),{productId:row.product,count:row.count});
  if(row.confirmed)assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'companion-shop-key');
 }
 for(const value of [null,{}, {mode:'preview',name:'同心礼'}, {mode:'result',name:'同心礼',paid:'3 TONGXIN',granted:'2',buyCount:1}])assert.throws(()=>parseRobotCompanionShopPurchase(value));
});
