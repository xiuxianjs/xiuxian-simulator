import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendLearnedBooks} from '../src/api/bot/learned-books-queries';
import {BackendAPIError} from '../src/api/bot/client';

test('original learned-books SDK keeps fixed visibility, page size, safe numbers and identity query contract',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLearnedBooksV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LEARNED_BOOKS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,252);
 mockBackendConfig(t,{api_url:'https://learned-books.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows){
  calls.length=0;const visibility=row.op==='skill-books.learned'?'visible':'hidden';
  const invoke=()=>getBackendLearnedBooks('player',1,row.queryPage,visibility);
  if(row.queryPage>Number.MAX_SAFE_INTEGER){await assert.rejects(invoke,/Invalid parameter page/);assert.equal(calls.length,0);continue;}
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else if(!row.result.success)await assert.rejects(invoke,/已学功法接口缺少数值字段/);
  else{const {pageSize,...facts}=row.v1.data;assert.equal(pageSize,5);assert.deepEqual(await invoke(),facts);}
  assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/skill-books/learned');assert.equal(url.searchParams.get('page'),String(row.queryPage));assert.equal(url.searchParams.get('pageSize'),'5');assert.equal(url.searchParams.get('visibility'),visibility);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('X-Repeat-Command'),undefined);assert.equal(header('Idempotency-Key'),undefined);
 }
});
