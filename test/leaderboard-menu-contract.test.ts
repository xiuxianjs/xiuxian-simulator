import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendLeaderboardMenu, parseLeaderboardMenu } from '../src/api/bot/leaderboard-catalog';

test('leaderboard menu reuses original catalog parser and v1 contract', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLeaderboardMenu','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LEADERBOARD_MENU=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,12);
 mockBackendConfig(t,{api_url:'https://leaderboard.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted')){
  calls.length=0;
  assert.deepEqual(await getBackendLeaderboardMenu('player'),parseLeaderboardMenu(row.result.data));
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/leaderboards');assert.equal(calls[0].method.toUpperCase(),'GET');
 }
 for(const data of [null,{},[],[{}],[{menuHint:'x',menu:null}],[{menuHint:1}],[{menu:{group:'x',label:'y',command:'/z',description:'q'}}]])assert.throws(()=>parseLeaderboardMenu(data));
 await assert.rejects(()=>getBackendLeaderboardMenu(undefined),{message:'排行榜查询缺少平台身份'});
});
