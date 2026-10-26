import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {parseStorylineListArgs} from '../src/api/bot/catalog-query-reuse';
import {getBackendStorylineCatalog,decodeStorylineCatalog,projectStorylineCatalog} from '../src/api/bot/storyline-catalog-queries';

test('storyline catalog preserves original parser, v1 query contract and pure projection',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineCatalog','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CATALOG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,160);
 mockBackendConfig(t,{api_url:'https://story-catalog.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  const {chapterArg,pageArg}=parseStorylineListArgs(row.text);const page=Math.max(1,pageArg??1);
  assert.equal(row.detail,chapterArg!==null);assert.equal(row.sdkError,!Number.isSafeInteger(page)||(chapterArg!==null&&!Number.isSafeInteger(chapterArg)));
  calls.length=0;
  const call=()=>getBackendStorylineCatalog('player',1,chapterArg,page);
  if(row.status===200){
   const data=await call();assert.deepEqual(data,decodeStorylineCatalog(row.v1.data,chapterArg));
   if(row.result.success){const result=projectStorylineCatalog(row.result.data);assert.equal(result.code,chapterArg===null?'OVERVIEW':'DETAIL');assert.equal(result.access.canUseMeridian,data.canUseMeridian);assert.equal(result.data.mentalValue,data.mentalValue);}
  }else await assert.rejects(call);
  if(row.sdkError){assert.equal(calls.length,0);continue;}
  assert.equal(calls.length,1);const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/players/1/storyline/catalog');assert.equal(url.searchParams.get('page'),String(page));assert.equal(url.searchParams.get('chapterNumber'),chapterArg===null?null:String(chapterArg));assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 for(const data of [null,{},[],{overview:null,detail:null},{mentalValue:10,canUseMeridian:false,canUseSecondLayerFeature:false,inTeam:false,overview:null,detail:{chapterNumber:-1}},{mentalValue:10,canUseMeridian:false,canUseSecondLayerFeature:false,inTeam:false,overview:{},detail:null}])assert.throws(()=>projectStorylineCatalog(data));
 const success=rows.find(r=>r.state==='ready'&&r.text==='/副本列表').result.data;
 for(const corrupt of [{...success,mentalValue:'10'},{...success,overview:{...success.overview,chapters:[{}]}}])assert.throws(()=>projectStorylineCatalog(corrupt));
 const refused=rows.find(r=>r.state==='locked'&&r.text==='＃查看主线 2').v1.data;assert.throws(()=>projectStorylineCatalog(refused));
});
