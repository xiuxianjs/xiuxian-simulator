import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendRealmRanking,parseBackendRealmRanking,parseRobotRealmRanking,parseRobotRegionalRealmRanking} from '../src/api/bot/realm-ranking-queries';
import {getBackendPopularity,parseBackendPopularity,parseRobotPopularity} from '../src/api/bot/popularity-queries';
import {likeBackendPopularity,parseBackendPopularityLike,parseRobotPopularityLike} from '../src/api/bot/popularity-like';
import RealmApp from '../src/response-apps/leaderboard/realm/app';
import RegionApp from '../src/response-apps/leaderboard/realm/regionApp';
import PopularityApp from '../src/response-apps/leaderboard/popularity/app';
import LikeApp from '../src/response-apps/leaderboard/popularity/like/app';
import {withBackendRepeatDetection} from '../src/utils/backendRepeatDetector';

test('actual v1 realm/popularity SDK and like App/presentation remain compatible with direct v2 pure decoders',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessOtherBoards','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_OTHER_BOARD_V1=([^|]+)\|(.+)/g)].map(m=>({op:m[1],body:JSON.parse(m[2])}));assert.equal(rows.length,3);
 const likes=[...output.matchAll(/ROBOT_POPULARITY_LIKE_V1=(\d+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({target:Number(m[1]),board:m[2],status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(likes.length,16);
 mockBackendConfig(t,{api_url:'https://other-board-contract.test',robot_auth_token:'test-token'});
 const calls:{url:string;headers:Record<string,string>;data?:string}[]=[];let payload:unknown,status=200;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status,headers:{},data:JSON.stringify(payload)}}}));
 for(const row of rows){payload=row.body;status=200;calls.length=0;
  if(row.op==='leaderboard.popularity'){
   assert.deepEqual(await getBackendPopularity('player',1),parseBackendPopularity(row.body.data));assert.deepEqual(await PopularityApp({bid:'player',uid:1}),{code:'OK',data:parseRobotPopularity(row.body.data)});
  }else{
   const regional=row.op==='leaderboard.realm-region';assert.deepEqual(await getBackendRealmRanking('player',1,regional),parseBackendRealmRanking(row.body.data));
   assert.deepEqual(await (regional?RegionApp:RealmApp)({bid:'player',uid:1}),{code:'OK',data:parseRobotRealmRanking(row.body.data)});
  }
  assert.equal(calls.length,2);
  for(const call of calls)assert.equal(new URL(call.url).pathname,row.op==='leaderboard.realm'?'/api/v1/players/1/realm/leaderboard':row.op==='leaderboard.realm-region'?'/api/v1/players/1/realm/region-leaderboard':'/api/v1/players/1/popularity/leaderboard');
 }
 const request={requestId:'like-original',idempotencyKey:'like-original-key'};
 for(const row of likes){payload=row.body;status=row.status;calls.length=0;const command=`/点赞人气 ${row.target} ${row.board}`;
  // Go wire tests use the mention form for the self/first success cases.
  const messageText=row.board==='realm'&&row.target===1?'/点赞人气 @自己 realm':row.status===200&&row.board==='battle'?'/点赞人气 @目标 battle':command;
  const event={name:'message.create',UserId:'player',uid:1,MessageText:messageText} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(event,()=>{},async()=>{
   const result=await LikeApp({bid:'player',uid:1,targetUid:row.target,boardType:row.board,messageText,request});
   if(row.status>=500)assert.deepEqual(result,{code:'LOAD_FAILED',data:{message:'人气点赞失败，请稍后再试'}});
   else{
    const message=row.status===200?row.body.data.message:row.body.error.message;
    assert.deepEqual(result,row.status===200?{code:'OK',data:{success:true,message,currentPopularity:row.body.data.currentPopularity,remainingLikes:row.body.data.remainingLikes,boardLabel:row.body.data.boardLabel}}:{code:'OK',data:{success:false,message}});
    const repeat=row.body.presentation.repeat;
    assert.equal(await withBackendRepeatDetection('player',1,messageText,message,request),message+(repeat.suffix?'\n\n'+repeat.suffix:''));
   }
  });
  assert.equal(calls.length,1,'repeat presentation must prevent a second HTTP');
  assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/popularity-likes');assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'like-original-key');assert.deepEqual(JSON.parse(calls[0].data!),{targetUserId:row.target,boardType:row.board});
  if(row.status===200){assert.deepEqual(await likeBackendPopularity('player',1,row.target,row.board,request,messageText),parseBackendPopularityLike(row.body.data));assert.deepEqual(parseRobotPopularityLike({outcome:'liked',...row.body.data}),{outcome:'liked',...parseBackendPopularityLike(row.body.data)});}
 }
 const realm=rows[0].body.data;
 assert.throws(()=>parseRobotRealmRanking({...realm,canUseFifthLayerFeature:false}));assert.throws(()=>parseRobotRegionalRealmRanking({...realm,region:null}));
 assert.deepEqual(parseRobotPopularityLike({outcome:'ignored'}),{outcome:'ignored'});
 for(const value of [null,{}, {outcome:'liked'},{outcome:'invalid'}])assert.throws(()=>parseRobotPopularityLike(value));
});
