import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendProfessionToolBag, parseProfessionToolBag } from '../src/api/bot/queries';

test('profession tool original SDK preserves raw type/page queries and safe integer rejection', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageProfession','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_PROFESSION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,180);
 mockBackendConfig(t,{api_url:'https://lootbox.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted'&&r.status)){
  calls.length=0;const page=Number(row.pageText);const invoke=()=>getBackendProfessionToolBag('player',1,row.typeName||undefined,page);
  if(row.status!==200){await assert.rejects(invoke);assert.equal(row.result.success,false)}
  else{
   let error:Error|undefined;
   try{parseProfessionToolBag(row.v1.data)}catch(e){error=e as Error}
   if(error){await assert.rejects(invoke,{message:error.message});assert.equal(row.result.success,false)}
   else{const old=await invoke();assert.deepEqual(parseProfessionToolBag(row.result.data),old);assert.equal(row.result.success,true)}
  }
  assert.equal(calls.length,1);const call=calls[0],url=new URL(call.url);
  assert.equal(url.pathname,'/api/v1/players/1/profession-tools/bag');assert.equal(url.searchParams.get('page'),String(page));assert.equal(url.searchParams.get('typeName')??'',row.typeName);assert.equal(call.method.toUpperCase(),'GET');
  const header=(name:string)=>Object.entries(call.headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');
 }
});
