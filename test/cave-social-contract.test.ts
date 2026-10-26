import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {executeBackendCaveCommand,parseBackendCaveCommand,type CaveCommandInput} from '../src/api/bot/cave-command';
import {caveSocialCommand} from '../src/api/bot/cave-robot-command';

test('actual original social SDK preserves target precedence, command bodies and receipts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveSocialV1TargetsAndTransactions$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_SOCIAL_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,204);
 mockBackendConfig(t,{api_url:'https://cave-social.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:{url:string,data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string,data?:string})=>{calls.push(call);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const [n,row] of rows.entries()){
  current=row;calls.length=0;const selected=await caveSocialCommand(row.text,{findOne:async()=>({count:1,data:{UserId:row.args.ownerBid??'owner2'}})});assert.deepEqual(selected.args,row.args);
  if(row.args.mode==='usage')continue;
  const a=selected.args;
  const body:CaveCommandInput={action:selected.operation==='cave.steal'?'steal':'collaborate',ownerId:a.ownerUid===null?undefined:Number(a.ownerUid),ownerBid:a.ownerBid??undefined,plotIndex:a.plotIndex===null?undefined:Number(a.plotIndex),...(selected.operation==='cave.collaborate'?{careAction:a.careAction??undefined}:{})};
  const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{
   const call=()=>executeBackendCaveCommand('player',1,body,{requestId:'test',idempotencyKey:row.state+'-'+n});
   if(row.status===200)assert.deepEqual(await call(),parseBackendCaveCommand(row.body.data));else await assert.rejects(call);
  });
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/cave/command');assert.deepEqual(JSON.parse(calls[0].data!),JSON.parse(JSON.stringify(body)));
 }
 let mentions=0;const mention={findOne:async()=>{mentions++;return{count:1,data:{UserId:'owner2'}}}};
 for(const text of ['/偷药 0','/协作灵田 0 浇灌']){assert.equal((await caveSocialCommand(text,mention)).args.mode,'usage');}assert.equal(mentions,0);
 for(const text of ['/偷药 0002 0001','/协作灵田 0002 除虫 0002']){const a=(await caveSocialCommand(text,mention)).args;assert.equal(a.ownerUid,'2');assert.equal(a.ownerBid,null);}assert.equal(mentions,0);
 assert.equal((await caveSocialCommand('/偷药 @道友',mention)).args.ownerBid,'owner2');assert.equal(mentions,1);
 for(const text of ['/偷药 9007199254740993','/偷药 '+ '9'.repeat(400),'/协作灵田 2 浇灌 '+ '9'.repeat(400)]){const a=(await caveSocialCommand(text,mention)).args;assert.equal(a.mode,'command');assert.ok(a.ownerUid!==null);if(text.startsWith('/偷药'))assert.equal(a.ownerUid,String(Number(text.slice(4))));else assert.equal(a.plotIndex,'Infinity');}
 assert.equal((await caveSocialCommand('/偷药 @道友')).args.mode,'usage');assert.equal((await caveSocialCommand('/协作灵田 2 未知动作',mention)).args.mode,'usage');
 calls.length=0;await assert.rejects(()=>executeBackendCaveCommand('player',1,{action:'steal',ownerId:Infinity},{requestId:'infinite',idempotencyKey:'infinite'}));assert.equal(calls.length,0);
});
