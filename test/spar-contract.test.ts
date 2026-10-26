import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {commandBackendSpar,parseBackendSparCommand,parseRobotSpar} from '../src/api/bot/spar';
import App from '../src/response-apps/spar/app';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';

test('actual spar v1 SDK/App and repeat presentation remain compatible after extracting pure v2 decoder',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSpar','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SPAR_V1=([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),body:JSON.parse(m[2])}));assert.equal(rows.length,9);
 mockBackendConfig(t,{api_url:'https://spar-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:typeof rows[number]['body'];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{assert.equal(new URL(call.url).pathname,'/api/v1/players/1/spar-command');calls.push(call);return{status:payload.error?.code==='INTERNAL'?500:payload.error?400:200,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'spar-original',idempotencyKey:'original-spar-key'};
 for(const row of rows){payload=row.body;calls.length=0;
  if(payload.error){const e={name:'message.create' as const,UserId:'player',uid:1,MessageText:'/比试 1'} as unknown as Parameters<typeof withEventContext>[0];
   await withEventContext(e,()=>{},async()=>{const result=await App({bid:'player',uid:1,targetUid:row.args.targetUid,request});assert.deepEqual(result,{code:payload.error.code==='SPAR_SELF_TARGET'?'SELF_TARGET':'LOAD_FAILED',data:{message:payload.error.code==='SPAR_SELF_TARGET'?payload.error.message:'服务暂时不可用，请稍后再试'}});
    const message=payload.presentation.repeat.message;const text=await withBackendRepeatDetection('player',1,'比试',message,request);assert.equal(text,message+(payload.presentation.repeat.suffix?'\n\n'+payload.presentation.repeat.suffix:''));});
   assert.equal(calls.length,1,'repeat presentation must prevent another legacy API');
  }else{
   assert.deepEqual(await commandBackendSpar('player',1,2,undefined,request),parseBackendSparCommand(payload.data));
   assert.deepEqual(await App({bid:'player',uid:1,targetUid:2,request}),{code:'OK',data:parseRobotSpar(payload.data)});assert.equal(calls.length,2);
  }
  for(const call of calls){assert.equal(new Headers(call.headers).get('Idempotency-Key'),'original-spar-key');assert.equal(Buffer.from(new Headers(call.headers).get('X-Repeat-Command')!,'base64').toString(),'比试');assert.deepEqual(JSON.parse(call.data!),row.args);}
 }
 const success=rows.find(r=>r.body.data)!.body.data;
 for(const invalid of [null,{}, {...success,allowed:false},{...success,targetUid:0},{...success,battle:null},{...success,battle:{...success.battle,winner:'DRAW'}},{...success,battle:{...success.battle,qiCost:-1}}])assert.throws(()=>parseRobotSpar(invalid));
 for(const partial of [{allowed:false,realmName:'炼气',targetUid:0,battle:null},{allowed:true,realmName:'筑基',targetUid:0,battle:null}]){assert.deepEqual(parseBackendSparCommand(partial),partial);assert.throws(()=>parseRobotSpar(partial));}
 const source=readFileSync(new URL('../src/response/spar/res.ts',import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.ok(!source.includes('withBackendRepeatDetection'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);
});
