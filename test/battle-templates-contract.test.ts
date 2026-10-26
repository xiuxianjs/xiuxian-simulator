import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendBattleTemplateAccess,getBackendBattleTemplates,parseBattleTemplates} from '../src/api/bot/battle-templates-query';
import {saveBackendBattleTemplate,parseBattleTemplateSave} from '../src/api/bot/battle-template-save';
import {applyBackendBattleTemplate,parseBattleTemplateApply} from '../src/api/bot/battle-template-apply';
import {deleteBackendBattleTemplate,parseBattleTemplateDelete} from '../src/api/bot/battle-template-delete';

test('battle template v2 decoders preserve original SDK and v1 contracts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBattleTemplates','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BATTLE_TEMPLATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,121);
 mockBackendConfig(t,{api_url:'https://templates.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>;data?:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);const access=new URL(call.url).pathname.endsWith('/social/access');return{status:access?200:row.status,headers:{},data:JSON.stringify(access?{data:row.access}:row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  calls.length=0;
  const access=await getBackendBattleTemplateAccess('player',1);
  assert.deepEqual(access,{ok:row.access.canUseFifthLayerFeature,realmName:row.access.realmNameValue??'未知'});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/social/access');
  if(!access.ok)continue;
  calls.length=0;
  const slot=Number(row.arguments.slotText);
  const call=()=>row.op.endsWith('.list')?getBackendBattleTemplates('player',1):row.op.endsWith('.save')?saveBackendBattleTemplate('player',1,slot,row.arguments.name??undefined,{requestId:'template-sdk',idempotencyKey:'template-sdk'}):row.op.endsWith('.apply')?applyBackendBattleTemplate('player',1,slot,{requestId:'template-sdk',idempotencyKey:'template-sdk'}):deleteBackendBattleTemplate('player',1,slot,{requestId:'template-sdk',idempotencyKey:'template-sdk'});
  if(row.status!==200){await assert.rejects(call);assert.equal(calls.length,row.status===0?0:1);continue;}
  const old=await call();
  const parsed=row.op.endsWith('.list')?parseBattleTemplates(row.result.data):row.op.endsWith('.save')?parseBattleTemplateSave(row.result.data,slot):row.op.endsWith('.apply')?parseBattleTemplateApply(row.result.data,slot):parseBattleTemplateDelete(row.result.data);
  assert.deepEqual(old,parsed);assert.equal(calls.length,1);
  const prefix='/api/v1/players/1/battle-templates';
  const path=row.op.endsWith('.list')?prefix:prefix+'/'+slot+(row.op.endsWith('.save')?'/snapshot':row.op.endsWith('.apply')?'/apply':'');
  assert.equal(new URL(calls[0].url).pathname,path);
  assert.equal(calls[0].method.toUpperCase(),row.op.endsWith('.list')?'GET':row.op.endsWith('.delete')?'DELETE':'POST');
  if(row.op.endsWith('.save'))assert.deepEqual(JSON.parse(calls[0].data!),row.arguments.name===null?{}:{name:row.arguments.name});
 }
 const valid=rows.find(r=>r.op==='battle-templates.save'&&r.result.success&&r.result.branch==='business').result.data;
 for(const data of [null,{},[],{...valid,slot:1.5},{...valid,equipmentCount:-1},{...valid,equipmentNames:[1]},{...valid,skillNames:{战技:1}}])assert.throws(()=>parseBattleTemplateSave(data,1));
 assert.throws(()=>parseBattleTemplateSave({...valid,slot:2},1));
 assert.throws(()=>parseBattleTemplateApply({...valid,cacheInvalidated:'yes'},1));
 assert.throws(()=>parseBattleTemplateDelete({deleted:1}));
 assert.throws(()=>parseBattleTemplates({templates:[],current:{}}));
});
