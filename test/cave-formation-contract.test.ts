import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {activateBackendCaveFormation,removeBackendCaveFormation,parseBackendCaveFormationActivation,parseBackendCaveFormationRemoval,caveFormationKeyword} from '../src/api/bot/cave-formation-actions';
import {getBackendCaveFormations,parseBackendCaveFormations} from '../src/api/bot/cave-formation-queries';

test('actual original formation SDK preserves paths, command bodies, DTOs and keyword parsing',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveFormationsV1LifecycleAndReadOnly$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_FORMATION_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,196);
 mockBackendConfig(t,{api_url:'https://formation.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:{url:string,data?:string,method:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string,data?:string,method:string})=>{calls.push(call);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const [n,row] of rows.entries()){
  current=row;calls.length=0;
  const op=row.text.includes('激活阵盘')?'activate':row.text.includes('移除阵法')?'remove':'list';
  if(op!=='list')assert.equal(caveFormationKeyword(row.text,op),row.args.keyword);
  if(row.args.keyword==='')continue;
  const request={requestId:'test',idempotencyKey:row.state+'-'+n};
  const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{
   const call=()=>op==='list'?getBackendCaveFormations('player',1):op==='activate'?activateBackendCaveFormation('player',1,row.args.keyword,request):removeBackendCaveFormation('player',1,row.args.keyword,request);
   if(row.status===200)assert.deepEqual(await call(),op==='list'?parseBackendCaveFormations(row.body.data):op==='activate'?parseBackendCaveFormationActivation(row.body.data):parseBackendCaveFormationRemoval(row.body.data));else await assert.rejects(call);
  });
  assert.equal(calls.length,1,row.text);
  const path='/api/v1/players/1/cave/formations'+(op==='activate'?'/activate':op==='remove'?'/'+row.args.keyword:'');
  assert.equal(decodeURIComponent(new URL(calls[0].url).pathname),path);assert.equal(calls[0].method.toUpperCase(),op==='list'?'GET':op==='activate'?'POST':'DELETE');
  if(op==='activate')assert.deepEqual(JSON.parse(calls[0].data!),{keyword:row.args.keyword});
 }
 for(const prefix of ['/','#','＃','!','！',''])for(const keyword of ['', '  隐息阵盘  ',' 20',' 9007199254740993']){
  assert.equal(caveFormationKeyword(prefix+'激活阵盘'+keyword,'activate'),(prefix+'激活阵盘'+keyword).replace(/^(!|！|\/|#|＃)?激活阵盘\s*/,'').trim());
  assert.equal(caveFormationKeyword(prefix+'移除阵法'+keyword,'remove'),(prefix+'移除阵法'+keyword).replace(/^(!|！|\/|#|＃)?移除阵法\s*/,'').trim());
 }
});
