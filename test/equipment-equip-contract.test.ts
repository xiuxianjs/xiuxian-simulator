import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {equipBackendEquipment} from '../src/api/bot/equipment-equip';
import {BackendAPIError} from '../src/api/bot/client';

test('equipment v1 SDK request and original success/error results remain after parser extraction',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentEquipV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_EQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,108);
 mockBackendConfig(t,{api_url:'https://equipment-equip.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;
  const invoke=()=>equipBackendEquipment('player',1,row.arguments.identifier,{requestId:'equipment-'+i,idempotencyKey:'equipment-'+i},row.text);
  if(row.sdkRejected)await assert.rejects(invoke,/装备接口数值无效/);
  else if(row.status===200)assert.deepEqual(JSON.parse(JSON.stringify(await invoke())),row.v1.data);
  else await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/equipment/equip');
  assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data),row.arguments);
 }
});
