import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendWorldMilestoneView,parseBackendWorldMilestoneView} from '../src/api/bot/world-milestone-queries';
import {claimBackendWorldMilestones,parseBackendWorldMilestoneClaim} from '../src/api/bot/world-milestone-actions';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('world milestones share original v1 decoders with actual combined responses',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessWorldMilestones','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_WORLD_MILESTONE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,32);
 mockBackendConfig(t,{api_url:'https://world-milestone.test',robot_auth_token:'local-test'});
 const calls:Array<{url:string;method:string}>=[];let row=rows[0];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows){
  const decode:(value:unknown)=>unknown=row.operation==='view'?parseBackendWorldMilestoneView:parseBackendWorldMilestoneClaim;
  const parsed=parseRobotBusinessEnvelope(row.result,'player',decode);assert.equal(parsed.success,row.result.success);
  if(!row.status)continue;
  calls.length=0;
  const request={requestId:'legacy-read',idempotencyKey:'legacy-read'};
  const getter=()=>row.operation==='view'?getBackendWorldMilestoneView('player',1,request):claimBackendWorldMilestones('player',1,request);
  if(row.status===200){const data=await getter();assert.deepEqual(data,decode(row.v1.data));if(parsed.success&&parsed.branch==='business')assert.deepEqual(parsed.data,data);}
  else await assert.rejects(getter);
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),'POST');assert.equal(new URL(calls[0].url).pathname,row.operation==='view'?'/api/v1/players/1/query-presentations':'/api/v1/players/1/recharge/world-milestones/claim-all');
 }
 for(const value of [null,{},[],{empty:false,milestones:[]},{partial:false,claimed:[]},{partial:false,claimed:[{milestoneOrder:0}]}]){
  assert.throws(()=>parseBackendWorldMilestoneClaim(value));assert.throws(()=>parseBackendWorldMilestoneView(value));
 }
});
