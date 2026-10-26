import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {executeProposalCommand,getEligibleFriends} from '../src/response-apps/companion/propose/app';
import {commandBackendCompanionGift} from '../src/api/bot/companion-gift-command';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';
import {parseRobotCompanionPropose} from '../src/api/bot/companion-propose-robot';
import {parseCompanionGiftCommand} from '../src/api/bot/companion-gift-command';

test('actual v1 SDK/App preserves proposal and gift commands, target priority and repeat with no supplementary HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionCommands','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_COMMAND_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.ok(rows.length>=39);
 mockBackendConfig(t,{api_url:'https://companion-commands.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'companion-command-id',idempotencyKey:'companion-command-key'};
 for(const row of rows){payload=row.body;status=row.status;calls.length=0;
  const event={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event,()=>{},async()=>{
   if(row.op==='companion.propose'){
    const out=await executeProposalCommand({bid:'player',uid:1,...row.args,request});assert.equal(out.code,row.body.data.code);assert.deepEqual(out.preflight,row.body.data.preflight);assert.equal(out.mutationError,row.body.data.mutationError??row.body.data.result?.projectionError);
    if(out.result)assert.equal(out.result.message,row.body.data.result.mutation.message);
   }else{
    const out=await commandBackendCompanionGift('player',1,row.args,request,row.text);assert.equal(out.mode,row.body.data.mode);assert.equal(out.targetId,row.body.data.targetId);assert.equal(out.giftName,row.body.data.giftName);
    if(out.mutationError){const p=row.body.presentation.repeat;assert.equal(await withBackendRepeatDetection('player',1,row.text,out.mutationError,request),out.mutationError+(p.suffix?'\n\n'+p.suffix:''));}
   }
  });
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/companion/'+(row.op==='companion.propose'?'proposals':'gifts')+'/command');assert.deepEqual(JSON.parse(calls[0].data!),row.args);assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'companion-command-key');
 }
 const lists=[...output.matchAll(/ROBOT_COMPANION_PREFLIGHT_V1=([^|]+)\|(.+)/g)];assert.equal(lists.length,3);
 for(const row of lists){payload=JSON.parse(row[2]);status=200;calls.length=0;const out=await getEligibleFriends({bid:'player',uid:1,page:Number(row[1])});assert.deepEqual(out.data,{friends:(payload as any).data.friends,currentPage:(payload as any).data.currentPage,totalPages:(payload as any).data.totalPages,totalCount:(payload as any).data.totalCount});assert.equal(calls.length,1);}
 for(const value of [null,{}, {mode:'friends',preflight:{}}, {mode:'command',command:{code:'COMPLETED'}}])assert.throws(()=>parseRobotCompanionPropose(value));
 for(const value of [null,{}, {mode:'GIFT',targetId:2,giftName:'花',options:null,targets:null,mutation:null}])assert.throws(()=>parseCompanionGiftCommand(value));
});
