import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendEquipped} from '../src/api/bot/equipped-queries';
import {getBackendEquipmentDetail} from '../src/api/bot/equipment-detail-queries';
import {BackendAPIError} from '../src/api/bot/client';

test('equipment query v1 SDKs retain actual DTO checks and GET routes including resolved aliases',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentQueriesV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_QUERIES=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,171);
 mockBackendConfig(t,{api_url:'https://equipment-queries.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 const alias:Record<string,string>={饰品:'头饰',法袍:'衣服',鞋:'鞋子'};
 for(const r of rows){
  row=r;calls.length=0;const detail=row.op==='equipment.detail';const name=alias[row.arguments.typeName]??row.arguments.typeName;
  const invoke=()=>detail?getBackendEquipmentDetail('player',1,name):getBackendEquipped('player',1);
  if(row.sdkRejected)await assert.rejects(invoke);
  else if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else {
   const actual=await invoke();assert.equal(actual.playerName,row.v1.data.playerName);
   if(detail){const d=actual as Awaited<ReturnType<typeof getBackendEquipmentDetail>>;assert.deepEqual(d.item,row.v1.data.item===null?null:{...row.v1.data.item,recoveryEffects:[]});}
   else {const d=actual as Awaited<ReturnType<typeof getBackendEquipped>>;assert.deepEqual(d.items,row.v1.data.items);assert.deepEqual(d.slots,row.v1.data.slots);assert.deepEqual(d.types,row.v1.data.types);assert.equal(d.sets.length,row.v1.data.sets.length);assert.equal(d.canUseFifthLayerFeature,row.v1.data.canUseFifthLayerFeature);for(const set of d.sets)assert.deepEqual(set.recoveryEffects,[]);}
  }
  assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/equipment/'+(detail?'detail':'equipped'));
  assert.equal(calls[0].method.toUpperCase(),'GET');assert.equal(calls[0].data,undefined);if(detail)assert.equal(url.searchParams.get('typeName'),name);
 }
});
