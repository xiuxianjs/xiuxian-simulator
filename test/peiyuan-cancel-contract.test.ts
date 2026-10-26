import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {cancelBackendPeiyuan,parseBackendPeiyuanCancel} from '../src/api/bot/peiyuan-cancel';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('peiyuan cancel shares original decoder with combined response',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPeiyuanCancel','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PEIYUAN_CANCEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,14);
 mockBackendConfig(t,{api_url:'https://peiyuan-cancel.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const parsed=parseRobotBusinessEnvelope(row.result,'player',parseBackendPeiyuanCancel);assert.equal(parsed.success,row.result.success);calls.length=0;
  if(row.status===200){const data=await cancelBackendPeiyuan('player',1,{requestId:'cancel',idempotencyKey:'cancel'});assert.deepEqual(data,parseBackendPeiyuanCancel(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,data);}
  else await assert.rejects(()=>cancelBackendPeiyuan('player',1,{requestId:'cancel',idempotencyKey:'cancel'}));
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/peiyuan-dan/cancel');
 }
 for(const value of [null,{},[],{outcome:'cancelled',pendingJson:null,message:'x'},{outcome:'not_pending',pendingJson:'{}',message:'x'},{outcome:'cancelled',pendingJson:'{}',message:' '}])assert.throws(()=>parseBackendPeiyuanCancel(value));
});
