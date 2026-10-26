import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendStorylineRanking,parseStorylineRankingQuery} from '../src/api/bot/storyline-ranking-queries';

test('storyline ranking preserves original v1 query contract and validation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineRanking','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_RANKING=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,120);
 mockBackendConfig(t,{api_url:'https://story-ranking.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.valid&&r.state!=='muted')){
  calls.length=0;
  if(row.status===200)assert.deepEqual(await getBackendStorylineRanking('player',1,row.page),parseStorylineRankingQuery(row.v1.data));
  else await assert.rejects(()=>getBackendStorylineRanking('player',1,row.page),{message:row.result.middleware.replies.at(-1).text});
  if(row.sdkError){assert.equal(calls.length,0);continue;}
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/storyline/leaderboard');assert.equal(new URL(calls[0].url).searchParams.get('page'),String(row.page));assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 for(const data of [null,{},[],{access:{ok:false,realmName:null},leaderboard:{}},{access:{ok:true,realmName:'x'},leaderboard:{items:[],nearby:null}}])assert.throws(()=>parseStorylineRankingQuery(data));
});
