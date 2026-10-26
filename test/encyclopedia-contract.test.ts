import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendEncyclopedia,getBackendEncyclopediaDetail,getBackendToolCategories} from '../src/api/bot/queries';
import {parseEncyclopediaCommand,parseDetailCommand,parseRobotEncyclopediaBrowse,parseRobotEncyclopediaDetail} from '../src/api/bot/encyclopedia-robot';
import {parseEncyclopediaCommand as oldBrowse,getItemList} from '../src/response-apps/encyclopedia/app';
import {parseDetailCommand as oldDetail,getEncyclopediaDetail} from '../src/response-apps/encyclopedia/detail/app';

test('encyclopedia v1 SDK, original App projection and argument parsing retain their contracts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEncyclopedia','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ENCYCLOPEDIA_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
 const categories=JSON.parse(output.match(/ROBOT_ENCYCLOPEDIA_CATEGORIES=(.+)/)![1]);
 mockBackendConfig(t,{api_url:'https://encyclopedia-contract.test',robot_auth_token:'test-token'});
 let payload:unknown;let status=200;const calls:{url:string;method:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;method:string})=>{calls.push(call);return{status,headers:{},data:JSON.stringify(status===200?{data:payload}:{error:{code:'NOT_FOUND',message:'not found'}})}}}));
 for(const row of rows.filter(r=>r.result.success)){
  const {category,subCategory,page,targetId}=row.args;
  if(row.op==='encyclopedia.detail'){
   payload=row.result.data;calls.length=0;const legacy=await getBackendEncyclopediaDetail('player',category,targetId);assert.deepEqual({code:'OK',data:legacy},parseRobotEncyclopediaDetail(payload,category,targetId));assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,`/api/v1/encyclopedia/${encodeURIComponent(category)}/${targetId}`);
   calls.length=0;assert.deepEqual(await getEncyclopediaDetail(category,targetId,'player'),{code:'OK',data:legacy});assert.equal(calls.length,1);
  }else if(row.result.data.mode==='list'){
   payload=row.result.data.result;calls.length=0;const legacy=await getBackendEncyclopedia('player',category,subCategory||null,page);assert.deepEqual(legacy,parseRobotEncyclopediaBrowse(row.result.data,category).result);assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/encyclopedia');
   calls.length=0;assert.deepEqual(await getItemList(category,subCategory||null,page,'player'),legacy);assert.equal(calls.length,1);
  }
 }
 payload=categories;calls.length=0;assert.deepEqual(await getBackendToolCategories('player'),categories.items.find((r:any)=>r.category==='天工').subCategories);assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/encyclopedia/categories');
 for(const row of rows.filter(r=>!r.result.success&&r.op==='encyclopedia.browse'&&r.args.subCategory)){
  calls.length=0;const legacy=await getItemList(row.args.category,row.args.subCategory,row.args.page,'player');assert.equal(legacy.code,'INVALID_SUB');assert.deepEqual(legacy.data,{message:row.result.middleware.replies.at(-1).text});assert.equal(calls.length,0);
 }
 status=404;assert.deepEqual(await getEncyclopediaDetail('道具',999,'player'),{code:'NOT_FOUND',data:{message:'未找到 ID 为 999 的道具/材料'}});
 for(const text of ['/图鉴','/图鉴 本命','/图鉴 本命物 p2','/图鉴 天工 炉 p2','/图鉴 道具 p2','/图鉴 材料 草药 p0','/图鉴 装备 武器','/图鉴详情','/图鉴详情 天工 1','/图鉴详情 本命物 0001','/图鉴详情 道具 9999999999999999999999999999999']){assert.deepEqual(parseEncyclopediaCommand(text),oldBrowse(text));assert.deepEqual(parseDetailCommand(text),oldDetail(text));}
});
