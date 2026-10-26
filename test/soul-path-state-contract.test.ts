import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSoulPathState,parseSoulPathState} from '../src/api/bot/soul-path';

test('soul state shares original SDK parser and keeps v1 GET contract',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulPathState','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_STATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,110);
 mockBackendConfig(t,{api_url:'https://soul.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  calls.length=0;
  if(row.status===200)assert.deepEqual(await getBackendSoulPathState('player',1),parseSoulPathState(row.result.data));
  else await assert.rejects(()=>getBackendSoulPathState('player',1),{message:row.result.middleware.replies.at(-1).text});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-path');assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 const valid=rows[0].result.data;
 for(const data of [null,{},[],{...valid,stability:NaN},{...valid,insight:1.5},{...valid,pathKey:'wrong'},{...valid,panel:{...valid.panel,materials:[{}]}},{...valid,paths:[{}]},{...valid,effectsMaintenance:'true'}])assert.throws(()=>parseSoulPathState(data));
 await assert.rejects(()=>getBackendSoulPathState(undefined,1),{message:'操作缺少平台身份'});
});
