import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {setBackendSoulSupplyDirection,parseSoulSupplyDirection} from '../src/api/bot/soul-path';

test('soul supply shares original SDK parser and v1 write contract',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulSupply','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_SUPPLY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,81);
 mockBackendConfig(t,{api_url:'https://supply.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.valid&&r.state!=='muted')){
  calls.length=0;
  const call=()=>setBackendSoulSupplyDirection('player',1,row.direction,{requestId:'supply-sdk',idempotencyKey:'supply-sdk'});
  if(row.status===200)assert.deepEqual(await call(),parseSoulSupplyDirection(row.result.data));
  else await assert.rejects(call,{message:row.result.middleware.replies.at(-1).text});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/soul-path/supply-direction');assert.equal(calls[0].method.toUpperCase(),'PUT');assert.deepEqual(JSON.parse(calls[0].data),{direction:row.direction});
 }
 for(const data of [null,{},[],{direction:'wrong',directionName:'x',message:'x'},{direction:null,directionName:1,message:'x'},{direction:null,directionName:'x',message:1}])assert.throws(()=>parseSoulSupplyDirection(data));
 await assert.rejects(()=>setBackendSoulSupplyDirection('player',1,null),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});
