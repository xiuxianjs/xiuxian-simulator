import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {commandBackendSoulArtifactUnequip} from '../src/api/bot/soul-artifact-commands';
import {parseSoulArtifactUnequipResult} from '../src/api/bot/soul-artifact-unequip';
import {BackendAPIError} from '../src/api/bot/client';

test('original soul separation SDK preserves confirmation flag, repeat header and committed-but-invalid receipt failures',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulUnequipV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_UNEQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,128);
 mockBackendConfig(t,{api_url:'https://soul-unequip.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const invoke=()=>commandBackendSoulArtifactUnequip('player',1,row.arguments.confirmed,{requestId:'sdk',idempotencyKey:'sdk'},row.text);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(row.v1.data.artifact&&['previousLevel','totalCost','refundQuantity'].some(k=>!Number.isSafeInteger(row.v1.data.artifact[k])||row.v1.data.artifact[k]<0))await assert.rejects(invoke,{message:'分离本命物响应不完整'});
  else assert.deepEqual(await invoke(),parseSoulArtifactUnequipResult(row.v1.data));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-artifacts/unequip-command');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),{confirmed:row.arguments.confirmed});
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),Buffer.from(row.text).toString('base64'));
 }
});
