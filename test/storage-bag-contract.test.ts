import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendInventory, parseBackendInventory, parseRobotStorageBag } from '../src/api/bot/inventory';

test('storage original SDK verifies bag query, owner identity and original field rejection', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageBag','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_BAG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,495);
 mockBackendConfig(t,{api_url:'https://storage.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted'&&r.query)){
  calls.length=0;const invoke=()=>getBackendInventory('player',1,row.query);
  if(row.status!==200){await assert.rejects(invoke);assert.equal(row.result.success,false)}
  else{
   let error:Error|undefined;
   try{parseBackendInventory(row.v1.data)}catch(e){error=e as Error}
   if(error){await assert.rejects(invoke,{message:error.message});assert.equal(row.result.success,false)}
   else{const old=await invoke();assert.deepEqual(parseRobotStorageBag(row.result.data),parseRobotStorageBag(old));assert.deepEqual(row.result.data,old)}
  }
  assert.equal(calls.length,1);const call=calls[0],url=new URL(call.url);
  assert.equal(url.pathname,'/api/v1/players/1/inventory');assert.equal(call.method.toUpperCase(),'GET');assert.equal(url.searchParams.get('view'),'bag');assert.equal(url.searchParams.get('category'),row.query.category);assert.equal(url.searchParams.get('subtype'),row.query.subtype??null);assert.equal(url.searchParams.get('page'),String(row.query.page));
  const header=(name:string)=>Object.entries(call.headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');
 }
});
