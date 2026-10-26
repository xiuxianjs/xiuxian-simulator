import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {previewBackendSoulArtifactWash,parseSoulArtifactWashPreview} from '../src/api/bot/soul-artifact-wash';
import {BackendAPIError} from '../src/api/bot/client';

test('original soul wash SDK verifies the fixed single preview, original random receipts and v2 receipt compatibility',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulWashPreviewV1CompatibilityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_WASH_PREVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,176);
 mockBackendConfig(t,{api_url:'https://soul-wash-preview.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 let total=0;
 for(row of rows){
  calls.length=0;if(row.status===0)continue;
  const invoke=()=>previewBackendSoulArtifactWash('player',1,1,{requestId:'sdk',idempotencyKey:'sdk'});
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(row.feedback){await assert.rejects(invoke,{message:row.feedback});assert.throws(()=>parseSoulArtifactWashPreview(row.compatibilityV1.data),{message:row.feedback});}
  else {
   assert.deepEqual(await invoke(),parseSoulArtifactWashPreview(row.v1.data));
   const compatible=parseSoulArtifactWashPreview(row.compatibilityV1.data);assert.deepEqual(compatible,parseSoulArtifactWashPreview(row.result.data));assert.equal(compatible.pending.times,1);assert.equal(compatible.pending.totalSuccess,1);
  }
  assert.equal(calls.length,1);total++;
  const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/soul-artifacts/wash');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),{times:1});
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');
 }
 assert.equal(total,88);
});
