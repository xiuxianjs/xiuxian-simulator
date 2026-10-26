import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendSoulPathComparison,parseSoulPathComparison} from '../src/api/bot/battle-attributes';

test('soul comparison shares v1 validator and transports only bubble fields',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulCompare','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_COMPARE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,13);
 mockBackendConfig(t,{api_url:'https://compare.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.status>0&&r.state!=='muted')){
  calls.length=0;
  if(row.status===200){assert.deepEqual(await getBackendSoulPathComparison('player',1),parseSoulPathComparison(row.result.data));assert.deepEqual(Object.keys(row.result.data).sort(),['changes','emptyMessage','quote']);}
  else await assert.rejects(()=>getBackendSoulPathComparison('player',1));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/battle-attributes');assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 for(const data of [null,{},[],{changes:[],emptyMessage:1,quote:''},{changes:[{}],emptyMessage:'',quote:''},{changes:[{label:'法攻',before:1.5,after:2,deltaText:'+1'}],emptyMessage:'',quote:''}])assert.throws(()=>parseSoulPathComparison(data));
 await assert.rejects(()=>getBackendSoulPathComparison(undefined,1),{message:'战斗属性查询参数无效'});
});
