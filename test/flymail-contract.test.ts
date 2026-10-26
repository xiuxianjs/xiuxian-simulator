import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendFlyMailHome,parseBackendFlyMailHome,parseRobotFlyMailHome} from '../src/api/bot/fly-mail-queries';
import {sendBackendFlyMail,parseBackendFlyMailSend} from '../src/api/bot/flymail-send';
import {commandBackendFlyMailMute,parseRobotFlyMailMute} from '../src/api/bot/flymail-mute';
import type {FlyMailScope} from '../src/api/schemas/fly-mail-query';

test('v1 flymail SDK retains its wire contract while v2 reuses the pure response decoders',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessFlyMail','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_FLYMAIL_V1=(home|send)\|([^|]+)\|(.+)/g)].map(m=>({kind:m[1],scope:m[2] as FlyMailScope,body:JSON.parse(m[3])}));assert.equal(rows.length,10);
 mockBackendConfig(t,{api_url:'https://flymail-contract.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'flymail-id',idempotencyKey:'flymail-key'};
 for(const row of rows){payload=row.body;status=row.kind==='send'?201:200;calls.length=0;
  if(row.kind==='home'){assert.deepEqual(await getBackendFlyMailHome('player',1,row.scope,1),parseBackendFlyMailHome(row.body.data,row.scope));assert.deepEqual(parseRobotFlyMailHome(row.body.data,row.scope),parseBackendFlyMailHome(row.body.data,row.scope));}
  else{assert.deepEqual(await sendBackendFlyMail({bid:'player',uid:1,scope:row.scope,content:'道友好🙂',targetUid:row.scope==='friend'?2:undefined,request}),parseBackendFlyMailSend(row.body.data));assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'flymail-key');assert.deepEqual(JSON.parse(calls[0].data!),{scope:row.scope,content:'道友好🙂',...(row.scope==='friend'?{targetUid:2}:{})});}
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/flymail');
 }
 const muteRows=[...output.matchAll(/ROBOT_FLYMAIL_MUTE_V1=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),body:JSON.parse(m[3])}));assert.equal(muteRows.length,11);
 for(const row of muteRows){payload=row.body;status=200;calls.length=0;const target=row.args.targetUid===null?0:Number(row.args.targetUid);
  assert.deepEqual(await commandBackendFlyMailMute('player',1,target,row.args.targetBid??undefined,row.op==='flymail.mute',request),row.body.data);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/flymail/mute-command');assert.deepEqual(JSON.parse(calls[0].data!),{targetUid:target,...(row.args.targetBid?{targetBid:row.args.targetBid}:{}),muted:row.op==='flymail.mute'});
  if(row.body.data.result?.outcome==='updated')assert.deepEqual(parseRobotFlyMailMute(row.body.data.result),row.body.data.result);
 }
 const failure=JSON.parse(output.match(/ROBOT_FLYMAIL_ERROR_V1=(.+)/)![1]);payload=failure;status=500;calls.length=0;
 await assert.rejects(sendBackendFlyMail({bid:'player',uid:1,scope:'friend',targetUid:2,content:'你好',request}),{message:failure.error.message});assert.equal(calls.length,1);
 const result={outcome:'updated',targetName:'道友',realmName:'炼气'};
 for(const value of [null,{}, {success:false,message:'failed'}, {success:true,message:''}])assert.throws(()=>parseBackendFlyMailSend(value));
 for(const value of [null,{}, {outcome:'self',targetName:null,realmName:'炼气'}, {...result,targetName:''}])assert.throws(()=>parseRobotFlyMailMute(value));
 const home=rows.find(r=>r.kind==='home')!.body.data;assert.throws(()=>parseRobotFlyMailHome({...home,access:{...home.access,allowed:false}},'friend'));assert.throws(()=>parseRobotFlyMailHome(home,'team'));
});
