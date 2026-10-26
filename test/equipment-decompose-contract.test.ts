import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {decomposeBackendEquipment} from '../src/api/bot/equipment-decompose';
import {BackendAPIError} from '../src/api/bot/client';

test('decompose v1 SDK retains numeric serialization, committed-result validation, headers and domain failures',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentDecompose(V1ParityAndReplay|OriginalNumericInputs)$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_DECOMPOSE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,187);
 mockBackendConfig(t,{api_url:'https://equipment-decompose.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;const id=parseInt(row.arguments.instanceId,10);const request={requestId:'decompose-'+i,idempotencyKey:'decompose-'+i};
  const invoke=()=>decomposeBackendEquipment('player',1,id,request,row.text);
  if(row.sdkRejected)await assert.rejects(invoke,error=>error instanceof Error&&error.message===row.sdkMessage);
  else if(row.status===200)assert.deepEqual(await invoke(),row.v1.data);
  else await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/equipment/decompose');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data),{instanceId:id});
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');
  assert.equal(header('X-Repeat-Command'),Buffer.from(row.text,'utf8').toString('base64'));assert.equal(header('Idempotency-Key'),request.idempotencyKey);
 }
 calls.length=0;
 await assert.rejects(()=>decomposeBackendEquipment('player',1,Infinity,{requestId:'nonfinite',idempotencyKey:'nonfinite'},'/分解装备 huge'),error=>error instanceof Error&&error.message==='Body is not JSON serializable');
 assert.equal(calls.length,0,'original nonfinite input failed before HTTP');
});
