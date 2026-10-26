import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {confirmBackendSoulArtifactWash,parseSoulArtifactWashConfirm} from '../src/api/bot/soul-artifact-wash';
import {cancelBackendSoulWash,parseSoulWashCancel} from '../src/api/bot/soul-wash-cancel';
import {BackendAPIError} from '../src/api/bot/client';

test('original soul wash SDK preserves bodyless confirm/cancel, identity and errors after committed SQL/Redis changes',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulWashDecisionV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_WASH_DECISION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,104);
 mockBackendConfig(t,{api_url:'https://soul-wash.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const confirm=row.operation==='soul-artifacts.wash-confirm';const request={requestId:'sdk',idempotencyKey:'sdk'};
  const invoke=()=>confirm?confirmBackendSoulArtifactWash('player',1,request):cancelBackendSoulWash('player',1,request);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(confirm&&['zero-success','unsafe-success','unsafe-times','unsafe-created','unsafe-artifact','unsafe-instance','bad-action','false-step','mismatch','empty-results'].includes(row.state))await assert.rejects(invoke,{message:'本命物洗涤响应不完整'});
  else if(!confirm&&row.state==='unsafe-success'&&row.v1.data.status==='cancelled')await assert.rejects(invoke,{message:'本命物洗涤取消接口数据不完整'});
  else assert.deepEqual(await invoke(),confirm?parseSoulArtifactWashConfirm(row.v1.data):parseSoulWashCancel(row.v1.data));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-artifacts/wash/'+(confirm?'confirm':'cancel'));assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),undefined);
 }
});
