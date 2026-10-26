import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {glossaryView,parseGlossaryView} from '../src/api/bot/market-community-views';
import {parseQueryParams,parseCategoryParams,parseRobotGlossaryView} from '../src/api/bot/glossary-robot-query';
import {parseQueryParams as oldQuery} from '../src/response-apps/glossary/query/app';
import {parseCategoryParams as oldCategory} from '../src/response-apps/glossary/category/app';

test('glossary v1 view and pure original parsers retain their contracts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_GLOSSARY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
 mockBackendConfig(t,{api_url:'https://glossary-contract.test',robot_auth_token:'test-token'});
 let payload:unknown;const calls:{url:string;method:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;method:string})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 for(const row of rows){
  payload=row.result.data;calls.length=0;const {keyword,category,page}=row.args;const action=row.op==='glossary.category'?'category':keyword?'search':'browse';
  const result=await glossaryView('player',action,page,keyword,category);assert.deepEqual(result,parseRobotGlossaryView(payload,action));assert.deepEqual(result,parseGlossaryView(payload as any,action));
  assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/glossary/view');assert.equal(url.searchParams.get('action'),action);assert.equal(url.searchParams.get('page'),String(page));assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 for(const text of ['/词典','/词典 p2','/词典 灵石 p2','/词典分类','/词典分类 道具 p2','/词典分类 错误分类','/词典 灵石%','/词典 p0','/词典 p999999999999999999999999999999999999999999']){assert.deepEqual(parseQueryParams(text),oldQuery(text));assert.deepEqual(parseCategoryParams(text),oldCategory(text));}
});
