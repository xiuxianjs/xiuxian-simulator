import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {previewBackendSoulPathChoose,parseSoulChoosePreview} from '../src/api/bot/soul-path-choose';
import {previewBackendSoulPathAction,parseSoulActionPreview} from '../src/api/bot/soul-path-action';

test('soul previews retain v1 write contract and share original DTO validation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulPreview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_PREVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
 mockBackendConfig(t,{api_url:'https://preview.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.valid&&r.state!=='muted')){
  calls.length=0;
  const context={requestId:'preview-sdk',idempotencyKey:'preview-sdk'};
  const call=()=>row.action==='choose'?previewBackendSoulPathChoose('player',1,row.target,context):previewBackendSoulPathAction('player',1,row.action,row.target,context);
  const parse=row.action==='choose'?parseSoulChoosePreview:parseSoulActionPreview;
  if(row.status===200)assert.deepEqual(await call(),parse(row.v1.data));
  else await assert.rejects(call,{message:row.result.middleware.replies.at(-1).text});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-path/'+(row.action==='choose'?'choose':'action')+'-preview');assert.equal(calls[0].method.toUpperCase(),'POST');
  assert.deepEqual(JSON.parse(calls[0].data),row.action==='choose'?{pathKey:row.target}:{action:row.action,...(row.action==='switch'?{pathKey:row.target}:{})});
 }
 for(const parse of [parseSoulChoosePreview,parseSoulActionPreview])for(const data of [null,{},[],{token:'bad',message:'x'},{token:'00000000-0000-0000-0000-000000000000',message:1}])assert.throws(()=>parse(data));
 await assert.rejects(()=>previewBackendSoulPathChoose('player',1,'yu_qi'),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});
