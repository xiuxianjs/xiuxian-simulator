import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendAttributePanel, parseAttributePanel } from '../src/api/bot/attribute-panel';

test('attribute panel reuses original SDK validation and v1 contract',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAttributePanel','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ATTRIBUTE_PANEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,21);
 mockBackendConfig(t,{api_url:'https://attribute.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.status===200&&r.state!=='muted')){
  calls.length=0;
  assert.deepEqual(await getBackendAttributePanel('player',1),parseAttributePanel(row.result.data,1));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/attribute-panel');assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 const valid=rows[0].result.data;
 for(const data of [null,{},[],{...valid,uid:2},{...valid,hp:NaN},{...valid,strength:1.5},{...valid,theme:[]},{...valid,access:{}},{...valid,mentalRecoveryEfficiency:-1}])assert.throws(()=>parseAttributePanel(data,1));
 await assert.rejects(()=>getBackendAttributePanel(undefined,1));
});
