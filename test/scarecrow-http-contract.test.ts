import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import App from '../src/response-apps/scarecrow/app';

test('actual legacy scarecrow log failure matches the combined feedback after SDK battle normalization',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessScarecrowLogSaveFailure$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const wire=output.match(/ROBOT_SCARECROW_ERROR_V1=(.+)/);assert.ok(wire);
 const combined=[...output.matchAll(/ROBOT_SCARECROW_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>JSON.parse(m[3]).data).find(r=>!r.success);assert.ok(combined);
 mockBackendConfig(t,{api_url:'https://scarecrow-contract.test',robot_auth_token:'test-token'});let calls=0;
 t.mock.method(axios,'create',()=>({request:async()=>{calls++;return{status:503,headers:{},data:wire[1]}}}));
 assert.deepEqual(await App({bid:'player',uid:1,request:{requestId:'scarecrow-original',idempotencyKey:'scarecrow-key'}}),{code:'FAIL',data:{message:combined.middleware.replies.at(-1).text}});
 assert.equal(calls,1);assert.equal(combined.middleware.replies.at(-1).text,'服务暂时不可用，请稍后再试');
});
