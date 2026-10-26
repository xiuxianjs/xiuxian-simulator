import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {claimAllBackendStorylineChests,parseStorylineAllChestClaim} from '../src/api/bot/storyline-chest-claim';

test('all chapter chests retain v1 write identity, repeat header and receipt validator',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineAllChests','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_ALL_CHESTS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,60);
 mockBackendConfig(t,{api_url:'https://all-chests.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  calls.length=0;
  const call=()=>claimAllBackendStorylineChests('player',1,{requestId:'all-chests-sdk',idempotencyKey:'all-chests-sdk'});
  if(row.status===200)assert.deepEqual(await call(),parseStorylineAllChestClaim(row.v1.data));
  else await assert.rejects(call);
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/storyline/chests/claim-all');assert.equal(calls[0].method.toUpperCase(),'POST');
  const headers=new Headers(calls[0].headers);assert.equal(headers.get('X-Repeat-Command'),Buffer.from('一键领取宝箱').toString('base64'));assert.equal(headers.get('Idempotency-Key'),'all-chests-sdk');
 }
 for(const data of [null,{},[],{success:false,message:'x',totalReward:0,claimedCount:1,details:[]},{success:true,message:'x',totalReward:1,claimedCount:1,details:[{chapterNumber:1,chapterName:'x',reward:1,claimed:['1']}]}])assert.throws(()=>parseStorylineAllChestClaim(data));
 await assert.rejects(()=>claimAllBackendStorylineChests('player',1),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});
