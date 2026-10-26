import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {parseRobotMiddlewareResult} from '../src/api/bot/middleware-entry';
import {mockBackendConfig} from './backend-config-helper';
import {claimBackendStorylineChest,claimAllBackendChapterChests,parseStorylineChapterChestClaim} from '../src/api/bot/storyline-chest-claim';

test('chapter and single chests retain v1 write identity, repeat header and receipt validator',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChapterChests','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CHAPTER_CHESTS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,420);
 mockBackendConfig(t,{api_url:'https://all-chests.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:row.v1?.raw??JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.callSDK&&r.state!=='muted')){
  calls.length=0;
  const context={requestId:'chapter-chests-sdk',idempotencyKey:'chapter-chests-sdk'};
  const call=()=>row.single?claimBackendStorylineChest('player',1,row.chapter,row.chest,context):claimAllBackendChapterChests('player',1,row.chapter,context);
  if(row.status===200)assert.deepEqual(await call(),parseStorylineChapterChestClaim(row.v1.data));
  else await assert.rejects(call);
  if(row.sdkError){assert.equal(calls.length,0);continue;}
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,row.single?`/api/v1/players/1/storyline/chapters/${row.chapter}/chests/${row.chest}/claim`:`/api/v1/players/1/storyline/chapters/${row.chapter}/chests/claim-all`);assert.equal(calls[0].method.toUpperCase(),'POST');
  const headers=new Headers(calls[0].headers);assert.equal(headers.get('X-Repeat-Command'),Buffer.from('领取宝箱').toString('base64'));assert.equal(headers.get('Idempotency-Key'),'chapter-chests-sdk');
 }
 for(const data of [null,{},[],{success:false,message:'x',totalReward:0,claimedCount:1,details:[]},{success:true,message:'x',totalReward:1,claimedCount:1,details:[{chapterNumber:1,chapterName:'x',reward:1,claimed:['1']}]}])assert.throws(()=>parseStorylineChapterChestClaim(data));
 await assert.rejects(()=>claimAllBackendChapterChests('player',1,1),{message:'当前平台消息缺少唯一标识，无法安全提交写操作'});
});

test('chapter claim feedback validates optional inline buttons and newline before rendering',()=>{
 const base={outcome:'reject',reason:'ENTRY_FAILED',identity:{bid:'player',account:{status:'registered',playerId:1}},contextWarnings:[],replies:[{title:'宝箱',heading:'',text:'x',buttons:[],advice:[],blocks:[{text:'x',quoted:false,newline:false,inlineButtons:[{label:'领取',command:'/领取宝箱 1 1'}]}]}]};
 assert.deepEqual(parseRobotMiddlewareResult(base,'player'),base);
 for(const invalid of [{newline:'yes'},{inlineButtons:{}},{inlineButtons:[{label:'领取'}]}]){
  const copy=structuredClone(base);Object.assign(copy.replies[0].blocks[0],invalid);assert.throws(()=>parseRobotMiddlewareResult(copy,'player'));
 }
});
