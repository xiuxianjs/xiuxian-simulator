import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendBattleLeaderboard,parseBackendBattleLeaderboard,parseRobotBattleLeaderboard} from '../src/api/bot/battle-leaderboard-queries';
import {queryBackendBattleLog,parseBackendBattleLog,parseRobotBattleLog} from '../src/api/bot/battle-log-query';
import BoardApp from '../src/response-apps/battle/leaderboard/app';
import LogApp from '../src/response-apps/battle/viewLog/app';

test('actual v1 board/log SDK and Apps preserve DTO, gates, repeats and memory-only with pure v2 decoders',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBattleQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const boards=[...output.matchAll(/ROBOT_BATTLE_QUERY_V1=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),body:JSON.parse(m[3])}));assert.equal(boards.length,9);
 const logs=[...output.matchAll(/ROBOT_BATTLE_LOG_V1=([^|]+)\|(\d+)\|(.+)/g)].map(m=>({id:m[1],status:Number(m[2]),body:JSON.parse(m[3])}));assert.equal(logs.length,10);
 mockBackendConfig(t,{api_url:'https://battle-query-contract.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 for(const row of boards){payload=row.body;status=200;calls.length=0;const regional=row.op.endsWith('-region'),page=Number(row.args.page);
  assert.deepEqual(await getBackendBattleLeaderboard('player',1,page,regional),parseBackendBattleLeaderboard(row.body.data));
  if(row.body.data.access.ok)assert.deepEqual(await BoardApp({bid:'player',uid:1,page,regional}),{code:'OK',data:parseRobotBattleLeaderboard(row.body.data)});
  else{assert.deepEqual(await BoardApp({bid:'player',uid:1,page,regional}),{code:'LOCKED',data:{realmName:'未知'}});assert.throws(()=>parseRobotBattleLeaderboard(row.body.data));}
  assert.equal(calls.length,2);for(const call of calls){assert.equal(new URL(call.url).pathname,regional?'/api/v1/players/1/leaderboards/battle/region':'/api/v1/players/1/leaderboards/battle');assert.equal(new URL(call.url).searchParams.get('page'),String(page));}
 }
 for(const page of [0,9007199254740992,Infinity,1e100]){calls.length=0;assert.deepEqual(await BoardApp({bid:'player',uid:1,page}),{code:'LOAD_FAILED',data:{message:'查看战力排行榜失败，请稍后再试'}});assert.equal(calls.length,0);}
 const bad=output.match(/ROBOT_BATTLE_BOARD_ERROR_V1=(\d+)\|(.+)/)!;status=Number(bad[1]);payload=JSON.parse(bad[2]);calls.length=0;
 assert.deepEqual(await BoardApp({bid:'player',uid:1,page:1,regional:true}),{code:'LOAD_FAILED',data:{message:'查看战力排行榜失败，请稍后再试'}});assert.equal(calls.length,1);
 for(const row of logs){payload=row.body;status=row.status;calls.length=0;const messageText='/查看战斗过程 '+row.id;
  const event={name:'message.create',UserId:'player',uid:1,MessageText:messageText} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event,()=>{},async()=>{
   const result=await LogApp({bid:'player',uid:1,logId:row.id,messageText});
   const data=row.body.data;
   if(data.readFailed)assert.deepEqual(result,{code:'FAIL',data:{message:'查看战斗过程失败：战斗日志服务暂不可用'}});
   else if(!data.text&&data.memoryShare)assert.deepEqual(result,{code:'MEMORY_ONLY'});
   else if(!data.text){const repeat=row.body.presentation.repeat;assert.deepEqual(result,{code:'NOT_FOUND',data:{message:repeat.message+(repeat.suffix?'\n\n'+repeat.suffix:'')}});}
   else assert.deepEqual(result,{code:'OK',data:{log:data.text}});
  });
  assert.equal(calls.length,1,'existing presentation must avoid a repeat API');
  assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/battle-log-query');assert.deepEqual(JSON.parse(calls[0].data!),{logId:row.id});
  assert.equal(Buffer.from(new Headers(calls[0].headers).get('X-Repeat-Command')!,'base64').toString(),messageText);
  assert.deepEqual(await queryBackendBattleLog('player',1,row.id,messageText),parseBackendBattleLog(row.body.data,row.id));
  if(row.body.data.readFailed||(!row.body.data.text&&!row.body.data.memoryShare))assert.throws(()=>parseRobotBattleLog(row.body.data,row.id));
  else assert.deepEqual(parseRobotBattleLog(row.body.data,row.id),parseBackendBattleLog(row.body.data,row.id));
 }
 for(const name of ['battle/leaderboard/res','battle/leaderboard/regionRes','battle/viewLog/res']){const source=readFileSync(new URL(`../src/response/${name}.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
 for(const bad of [null,{}, {logId:'other',text:'x',readFailed:false},{logId:'id',text:'x',readFailed:true}])assert.throws(()=>parseRobotBattleLog(bad,'id'));
});
