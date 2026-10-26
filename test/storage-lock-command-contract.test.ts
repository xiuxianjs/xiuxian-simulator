import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {setBackendStorageLock,parseStorageLockResult} from '../src/api/bot/storage-lock';
import {BackendAPIError} from '../src/api/bot/client';

test('original storage SDK accepts actual v1 receipts and preserves selector, unsafe body integer, identity and post-commit errors',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageLockV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_LOCK=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.status!==0);assert.equal(rows.length,340);
 mockBackendConfig(t,{api_url:'https://storage-lock.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const body={locked:row.operation==='storage.lock',selector:row.selector};
  const invoke=()=>setBackendStorageLock('player',1,body,{requestId:'sdk',idempotencyKey:'sdk'});
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(row.state==='unsafe-name'&&row.selector.kind==='name'&&row.selector.name==='灵草')await assert.rejects(invoke,{message:'锁定接口数量无效'});
  else assert.deepEqual(await invoke(),parseStorageLockResult(row.v1.data,row.selector.kind,row.selector.asset));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/storage/lock-state');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),body);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),'sdk');assert.equal(header('X-Repeat-Command'),undefined);
 }
 calls.length=0;await assert.rejects(()=>setBackendStorageLock('player',1,{locked:true,selector:{kind:'instance',asset:'item',instanceId:Infinity}},{requestId:'sdk',idempotencyKey:'sdk'}),error=>error instanceof BackendAPIError&&error.message==='Body is not JSON serializable');assert.equal(calls.length,0);
});
