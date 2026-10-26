import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import AcceptApp from '../src/response-apps/companion/accept/app';
import RejectApp from '../src/response-apps/companion/reject/app';
import {checkBreakup} from '../src/response-apps/companion/breakup/app';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';
import {parseRobotCompanionProposalAction,parseRobotCompanionRejection,parseRobotCompanionBreakup} from '../src/api/bot/companion-actions-robot';

test('actual companion v1 SDK/App and repeat presentation retain success/refusal/500/confirmation contracts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_ACTION_V1=([^|]+)\|([^|]*)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({op:m[1],name:m[2],text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,25);
 mockBackendConfig(t,{api_url:'https://companion-action.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 const request={requestId:'companion-action-id',idempotencyKey:'companion-action-key'};
 for(const row of rows){payload=row.body;status=row.status;calls.length=0;
  const event={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event,()=>{},async()=>{
   let message:string;
   if(row.op==='companion.breakup'){
    const out=await checkBreakup({bid:'player',uid:1,confirmed:true,messageText:row.text,request});assert.equal(out.code,'CONFIRM_NEEDED');if(out.code!=='CONFIRM_NEEDED')throw new Error('missing companion');const result=out.data.settledResult!;message=result.data.message;
    assert.equal(result.code,row.body.data.mutationError?'FAIL':'OK');assert.equal(message,row.body.data.mutationError??row.body.data.mutation.message);
   }else{
    const out=await(row.op==='companion.accept'?AcceptApp:RejectApp)({bid:'player',uid:1,proposerName:row.name,messageText:row.text,request});if(out.code==='LIST')throw new Error('unexpected list');message=out.data.message;
    assert.equal(message,row.status>=500?row.body.error.message:row.body.data.message);
   }
   const presentation=row.body.presentation.repeat;
   assert.equal(await withBackendRepeatDetection('player',1,row.text,message,request),message+(presentation.suffix?'\n\n'+presentation.suffix:''));
  });
  assert.equal(calls.length,1);
  assert.equal(new URL(calls[0].url).pathname,row.op==='companion.breakup'?'/api/v1/players/1/companion/confirmation/breakup':'/api/v1/players/1/companion/proposals/by-name/'+row.op.split('.').at(-1));
  assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'companion-action-key');
 }
 assert.deepEqual(parseRobotCompanionProposalAction({mode:'result',message:'成功'}),{mode:'result',message:'成功'});
 for(const value of [null,{}, {mode:'list',received:[{fromName:'道友'}]}, {mode:'result',message:1}])assert.throws(()=>parseRobotCompanionProposalAction(value));
 assert.throws(()=>parseRobotCompanionRejection({mode:'list',received:[]}));assert.throws(()=>parseRobotCompanionBreakup({mode:'result',message:'ok',narrativeText:''}));
});
