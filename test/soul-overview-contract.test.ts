import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSoulArtifactOverview,parseSoulArtifactOverview,parseRobotSoulDetail,parseRobotSoulInfo} from '../src/api/bot/soul-artifact-overview-queries';
import {BackendAPIError} from '../src/api/bot/client';

test('original soul overview SDK verifies full/equipped query, legacy invalid fields and projected detail data',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulOverviewV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,312);
 mockBackendConfig(t,{api_url:'https://soul-overview.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 let total=0;
 for(row of rows){
  calls.length=0;
  if(row.status===0)continue;
  const view=row.operation.endsWith('.info')?'equipped':undefined;
  const invoke=()=>getBackendSoulArtifactOverview('player',1,view);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else {
   let expected:ReturnType<typeof parseSoulArtifactOverview>|undefined;let invalid='';
   try{expected=parseSoulArtifactOverview(row.v1.data,view)}catch(error){invalid=(error as Error).message}
   if(invalid){assert.equal(invalid,row.feedback);await assert.rejects(invoke,{message:invalid});}
   else {
    const facts=await invoke();assert.deepEqual(facts,expected);
    if(row.result.success && row.result.branch==='business'){
     if(!view){const item=facts.items.find(item=>item.instanceId===Number(row.arguments.instanceId));assert.ok(item);assert.deepEqual(parseRobotSoulDetail(row.result.data),{...item,maxLevel:facts.maxLevel});assert.equal(row.result.data.overview.items.length,1);}
     else {
      const decoded=parseRobotSoulInfo(row.result.data);
      const item=facts.items.find(item=>item.instanceId===facts.equippedInstanceId);
      if(!facts.hasDisplayItems)assert.deepEqual(decoded,{code:'EMPTY',data:{message:'你还没有本命物，可在 积分商店 或 珍宝楼 购买'}});
      else if(!item)assert.deepEqual(decoded,{code:'NOT_EQUIPPED',capabilities:facts.capabilities,data:{message:'当前未炼化本命物'}});
      else assert.deepEqual(decoded,{code:'EQUIPPED',capabilities:facts.capabilities,data:{artifact:item,maxLevel:facts.maxLevel}});
     }
    }
   }
  }
  assert.equal(calls.length,1);total++;
  const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/soul-artifacts/overview');assert.equal(url.searchParams.get('view'),view??null);assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(calls[0].data,undefined);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),undefined);
 }
 assert.equal(total,234);
});
