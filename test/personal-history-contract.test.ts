import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendStory,getBackendMemories,parseBackendStory,parseBackendMemories} from '../src/api/bot/queries';
import oldStory from '../src/response-apps/story/app';
import oldMemory from '../src/response-apps/memory/app';

test('personal history v1 SDK and App keep original projections while v2 omits raw facts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPersonalHistory','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const payloads=new Map([...output.matchAll(/ROBOT_PERSONAL_HISTORY_V1=([^|]+)\|(.+)/g)].map(m=>[m[1],JSON.parse(m[2]).data]));
 const receipts=[...output.matchAll(/ROBOT_PERSONAL_HISTORY_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 mockBackendConfig(t,{api_url:'https://history-contract.test',robot_auth_token:'test-token'});const calls:string[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(new URL(call.url).pathname);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 for(const [kind,folder,sdk,decode,app] of [['story','story',getBackendStory,parseBackendStory,oldStory],['memories','memory',getBackendMemories,parseBackendMemories,oldMemory]] as const){
  payload=payloads.get(kind);calls.length=0;const legacy=await sdk('player',1);assert.deepEqual(legacy,decode(payload));assert.deepEqual(calls,[`/api/v1/players/1/${kind}`]);assert.deepEqual(await app({bid:'player',uid:1}),{code:'OK',data:legacy});
  const combined=receipts.find(r=>r.op===`personal-history.${kind}`&&r.result.success&&r.result.branch==='business')!;assert.deepEqual(decode(combined.result.data),legacy);
  for(const raw of ['stats','first','realmStageLevel','asOf','createdAt'])assert.equal(combined.result.data[raw],undefined);
  for(const bad of [null,{}, {...combined.result.data,items:[{}]}, {...combined.result.data,[kind==='story'?'canShowMemoryButton':'canShowStoryButton']:undefined}])assert.throws(()=>decode(bad));
  const source=readFileSync(new URL(`../src/response/${folder}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);
 }
});
