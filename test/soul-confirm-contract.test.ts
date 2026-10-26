import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {confirmBackendSoulPathChoose} from '../src/api/bot/soul-path-choose';
import {confirmBackendSoulPathAction} from '../src/api/bot/soul-path-action';
import {parseSoulConfirm} from '../src/api/bot/soul-confirm-business';

test('soul confirmation retains original v1 SDK and shares its receipt validators',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulConfirm','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_CONFIRM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,28);
 mockBackendConfig(t,{api_url:'https://confirm.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  calls.length=0;
  const token=row.arguments.token.replace(/^choose:/,'');
  const confirm=row.kind==='choose'?confirmBackendSoulPathChoose:confirmBackendSoulPathAction;
  const call=()=>confirm('player',1,token,{requestId:'confirm-sdk',idempotencyKey:'confirm-sdk'});
  if(row.status===200)assert.deepEqual(await call(),parseSoulConfirm({mode:row.kind==='choose'?'choose':'action',result:row.v1.data}).result);
  else await assert.rejects(call,{message:row.result.middleware.replies.at(-1).text});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-path/'+(row.kind==='choose'?'choose':'action')+'-confirm');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data),{token});
 }
 for(const data of [null,{},[],{mode:'bad',result:{}},{mode:'choose',result:{}},{mode:'action',result:{}}])assert.throws(()=>parseSoulConfirm(data));
 await assert.rejects(()=>confirmBackendSoulPathChoose('player',1,'token'),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});
