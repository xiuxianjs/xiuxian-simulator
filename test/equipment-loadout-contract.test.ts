import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {unequipBackendEquipmentOne} from '../src/api/bot/equipment-unequip-one';
import {autoEquipBackendEquipment} from '../src/api/bot/equipment-auto-equip';
import {BackendAPIError} from '../src/api/bot/client';

test('loadout v1 SDKs preserve real domain DTOs, routes, repeat headers and write key differences',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipment(UnequipOne|AutoEquip)V1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_LOADOUT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,126);
 mockBackendConfig(t,{api_url:'https://equipment-loadout.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;
  const isAuto=row.op==='equipment.auto-equip';
  const ctx={requestId:'loadout-'+i,idempotencyKey:'loadout-'+i};
  const invoke=()=>isAuto?autoEquipBackendEquipment('player',1,ctx,row.text):unequipBackendEquipmentOne('player',1,row.arguments.equipmentTypeName,ctx,row.text);
  if(row.sdkRejected)await assert.rejects(invoke,/卸下装备响应不完整/);
  else if(row.status===200)assert.deepEqual(JSON.parse(JSON.stringify(await invoke())),row.v1.data);
  else await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/equipment/'+(isAuto?'auto-equip':'unequip-one'));
  assert.equal(calls[0].method.toUpperCase(),'POST');
  if(isAuto)assert.equal(calls[0].data,undefined);else assert.deepEqual(JSON.parse(calls[0].data!),row.arguments);
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('X-Repeat-Command'),Buffer.from(row.text,'utf8').toString('base64'));
  assert.equal(header('Idempotency-Key'),isAuto?ctx.idempotencyKey:undefined);
 }
 const power=rows.filter(r=>r.op==='equipment.auto-equip'&&r.v1.data?.power!==undefined);
 assert.ok(power.length>0,'at least one original real recalculation result must remain covered');
 const failedReconcile=rows.find(r=>r.state==='reconcile-fault'&&r.op==='equipment.auto-equip');
 assert.equal(failedReconcile.v1.data.success,true);assert.equal(failedReconcile.v1.data.power,undefined);
});
