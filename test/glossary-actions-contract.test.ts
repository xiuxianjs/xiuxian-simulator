import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {applyBackendGlossaryEdit} from '../src/api/bot/glossary-apply';
import {upsertBackendGlossary} from '../src/api/bot/glossary-upsert';
import {deleteBackendGlossary} from '../src/api/bot/glossary-delete';
import {glossaryEditContextCommand} from '../src/api/bot/market-community-views';
import {parseApplyParams,parseCreateParams,parseDeleteParams,parseRobotGlossaryApply,parseRobotGlossaryUpsert,parseRobotGlossaryDelete} from '../src/api/bot/glossary-actions-robot';
import {parseApplyParams as oldApply,applyGlossaryEditPermission} from '../src/response-apps/glossary/apply/app';
import {parseCreateParams as oldCreate} from '../src/response-apps/glossary/create/app';
import {parseDeleteParams as oldDelete} from '../src/response-apps/glossary/delete/app';

test('glossary writes retain v1 SDK paths, original argument parsers and application reasons',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_GLOSSARY_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
 mockBackendConfig(t,{api_url:'https://glossary-actions-contract.test',robot_auth_token:'test-token'});
 let payload:unknown;const calls:{url:string;method:string;data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;method:string;data?:string})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const context={requestId:'glossary-write',idempotencyKey:'glossary-write'};
 for(const row of rows.filter(r=>r.result.success)){
  calls.length=0;let method:string,path:string;
  if(row.op==='glossary.apply'){
   payload=row.result.data;assert.equal((await applyBackendGlossaryEdit('player',row.args.reason,context)).outcome,'submitted');assert.deepEqual(parseRobotGlossaryApply(payload),{success:true});method='POST';path='/api/v1/glossary/edit-applications';
  }else if(row.op==='glossary.delete'){
   payload=row.result.data;assert.equal((await deleteBackendGlossary('player',row.args.keyword,context)).outcome,'deleted');assert.equal(parseRobotGlossaryDelete(payload).success,true);method='DELETE';path='/api/v1/glossary/'+encodeURIComponent(row.args.keyword);
  }else if(row.result.data.mode==='help'){
   payload=row.result.data.view;assert.deepEqual(await glossaryEditContextCommand('player',1,context),parseRobotGlossaryUpsert(row.result.data).view);method='POST';path='/api/v1/players/1/glossary/edit-context';
  }else{
   payload=row.result.data.result;const legacy=await upsertBackendGlossary('player',row.args.keyword,row.args.content,context);assert.deepEqual({...legacy,success:true},parseRobotGlossaryUpsert(row.result.data).result);assert.deepEqual(JSON.parse(calls[0].data!),{content:row.args.content,commandContent:true});method='PUT';path='/api/v1/glossary/'+encodeURIComponent(row.args.keyword);
  }
  assert.equal(calls.length,1);assert.equal(calls[0].method.toUpperCase(),method);assert.equal(new URL(calls[0].url).pathname,path);
 }
 for(const text of ['/申请词典编辑权限','/申请词典编辑权限  理由 ','/录入词典','/录入词典 灵石','/录入词典 灵石 道具 内容','/录入词典 灵石\n多行内容','/删除词典 灵石','/删除词典  ','#录入词典 😀 内容']){assert.deepEqual(parseApplyParams(text),oldApply(text));assert.deepEqual(parseCreateParams(text),oldCreate(text));assert.deepEqual(parseDeleteParams(text),oldDelete(text));}
 for(const outcome of ['reason_too_long','already_allowed','pending','player_missing','realm_missing','realm_locked'] as const){payload={outcome};const legacy=await applyGlossaryEditPermission('player','理由',context);assert.equal(legacy.success,false);assert.equal(typeof legacy.reason,'string');}
});
