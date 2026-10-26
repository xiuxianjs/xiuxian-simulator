import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {executeBackendCaveCommand,getBackendCavePlantQuery,parseBackendCaveCommand,parseBackendCavePlantQuery} from '../src/api/bot/cave-command';
import {cavePlantArguments,parseRobotCavePlant} from '../src/api/bot/cave-robot-command';

test('actual original plant SDK preserves selection, committed receipt and number boundaries',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCavePlantV1TransactionsAndSelection$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_PLANT_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,135);
 mockBackendConfig(t,{api_url:'https://cave-plant.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:{url:string,data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string,data?:string})=>{calls.push(call);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const [n,row] of rows.entries()){
  current=row;calls.length=0;const index=row.args.plotIndex===null?undefined:Number(row.args.plotIndex);const seed=row.args.seedName;
  const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{
   const call=()=>seed===null?getBackendCavePlantQuery('player',1,index):executeBackendCaveCommand('player',1,{action:'plant',plotIndex:index,seedName:seed},{requestId:'test',idempotencyKey:row.state+'-'+n});
   if(row.status===200){const data=await call();assert.deepEqual(data,seed===null?parseBackendCavePlantQuery(row.body.data):parseBackendCaveCommand(row.body.data));assert.deepEqual(parseRobotCavePlant(seed===null?{mode:'select',query:row.body.data}:{mode:'plant',result:row.body.data}),seed===null?{mode:'select',...data}:{mode:'plant',result:data});}else await assert.rejects(call);
  });
  const unsafeQuery=seed===null&&index!==undefined&&!Number.isSafeInteger(index);
  assert.equal(calls.length,unsafeQuery?0:1,row.text);
  if(!unsafeQuery){const url=new URL(calls[0].url);assert.equal(url.pathname,seed===null?'/api/v1/players/1/cave/plant-query':'/api/v1/players/1/cave/command');if(seed===null)assert.equal(url.searchParams.get('plotIndex'),String(index??0));else assert.deepEqual(JSON.parse(calls[0].data!),JSON.parse(JSON.stringify({action:'plant',plotIndex:index,seedName:seed})));}
  assert.deepEqual(cavePlantArguments(row.text),row.args);
 }
 for(const text of ['/播种','/播种 0002',' /播种 2 聚灵草种 ','/播种 -1','/播种 9007199254740993 聚灵草种','/播种 '+ '9'.repeat(400)]){const match=text.trim().match(/播种(?:\s+(\d+))?(?:\s+(.+))?$/);const n=match?.[1]?Number(match[1]):undefined;assert.deepEqual(cavePlantArguments(text),{plotIndex:n!==undefined?String(n):null,seedName:match?.[2]?.trim()||null});}
 calls.length=0;await assert.rejects(()=>executeBackendCaveCommand('player',1,{action:'plant',plotIndex:Infinity,seedName:'聚灵草种'},{requestId:'infinite-test',idempotencyKey:'infinite-test'}));await assert.rejects(()=>getBackendCavePlantQuery('player',1,Infinity));assert.equal(calls.length,0);
});
