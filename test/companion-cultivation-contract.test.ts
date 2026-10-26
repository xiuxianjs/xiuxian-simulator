import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import DualApp from '../src/response-apps/companion/dualCultivation/app';
import {checkUpgradeOath} from '../src/response-apps/companion/upgradeOath/app';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';
import {parseRobotCompanionOathUpgrade} from '../src/api/bot/companion-actions-robot';
import {parseBackendCompanionDualCultivation} from '../src/api/bot/companion-relationship-actions';

test('actual v1 cultivation SDK/App preserves rewards, raw errors and repeat without supplemental HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionCultivation','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_CULTIVATION_V1=([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({op:m[1],text:m[2],status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(rows.length,19);
 mockBackendConfig(t,{api_url:'https://companion-cultivation.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'companion-cultivation-id',idempotencyKey:'companion-cultivation-key'};
 for(const row of rows){payload=row.body;status=row.status;calls.length=0;
  const event={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event,()=>{},async()=>{
   let message:string|undefined;
   if(row.op==='companion.upgrade-oath'){
    const out=await checkUpgradeOath({bid:'player',uid:1,confirmed:true,messageText:row.text,request});assert.equal(out.code,'CONFIRM_NEEDED');if(out.code!=='CONFIRM_NEEDED')throw new Error('missing companion');const result=out.data.settledResult!;message=result.data.message;
    assert.equal(result.code,row.body.data.mutationError?'FAIL':'OK');assert.equal(message,row.body.data.mutationError??row.body.data.mutation.message);
   }else{
    const out=await DualApp({bid:'player',uid:1,messageText:row.text,request});
    if(row.status===200){assert.equal(out.code,'OK');if(out.code!=='OK')throw new Error('dual failed');assert.deepEqual(out.data,{expGained:row.body.data.experienceGained,partnerExpGained:row.body.data.experienceGained,tongxinGained:row.body.data.tongxinGained});}
    else{assert.equal(out.code,'FAIL');if(out.code!=='FAIL')throw new Error('dual succeeded');message=out.data.message;assert.equal(message,row.body.error.message);}
   }
   if(message!==undefined){const p=row.body.presentation.repeat;assert.equal(await withBackendRepeatDetection('player',1,row.text,message,request),message+(p.suffix?'\n\n'+p.suffix:''));}
  });
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,row.op==='companion.upgrade-oath'?'/api/v1/players/1/companion/confirmation/upgrade':'/api/v1/players/1/companion/dual-cultivation');
  assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'companion-cultivation-key');
 }
 const preview=JSON.parse([...output.matchAll(/ROBOT_COMPANION_OATH_PREVIEW_V1=(.+)/g)][0][1]);
 calls.length=0;status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:call.url.includes('/social/access')?{canUseFifthLayerFeature:true,realmName:'炼气'}:preview.data})}}}));
 const result=await checkUpgradeOath({bid:'player',uid:1,confirmed:false,request});assert.equal(result.code,'CONFIRM_NEEDED');assert.equal(calls.length,2);
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v1/players/1/social/access','/api/v1/players/1/companion/oath-upgrade']);
 for(const value of [null,{}, {mode:'preview',partnerName:'道友'}, {mode:'result',message:'ok',partnerName:1}])assert.throws(()=>parseRobotCompanionOathUpgrade(value));
 for(const value of [null,{}, {experienceGained:'150',tongxinGained:5}])assert.throws(()=>parseBackendCompanionDualCultivation(value));
});
