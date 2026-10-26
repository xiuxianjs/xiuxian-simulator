import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendShaQi,getBackendKillGodRanking,claimBackendKillGodTitle,parseBackendShaQi,parseRobotShaQi,parseBackendKillGodRanking,parseBackendKillGodTitleClaim,parseRobotKillGodTitleClaim} from '../src/api/bot/shaqi-queries';
import {getBackendEnemies,parseBackendEnemies} from '../src/api/bot/queries';

test('PvP pure parsers preserve actual v1 SDK contracts and reject malformed server receipts without follow-up requests',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPVP','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PVP_V1=([^|]+)\|(.+)/g)].map(m=>({path:m[1],data:JSON.parse(m[2]).data}));assert.ok(rows.length>=11);
 mockBackendConfig(t,{api_url:'https://pvp-query-contract.test',robot_auth_token:'test-token'});const calls:{url:string;headers:Record<string,string>}[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 const request={requestId:'pvp-original',idempotencyKey:'original-claim-key'};
 for(const row of rows){payload=row.data;calls.length=0;
  if(row.path.endsWith('/sha-qi'))assert.deepEqual(await getBackendShaQi('player',1),parseBackendShaQi(payload));
  else if(row.path.endsWith('/kill-god-ranking'))assert.deepEqual(await getBackendKillGodRanking('player',1),parseBackendKillGodRanking(payload));
  else if(row.path.endsWith('/enemies'))assert.deepEqual(await getBackendEnemies('player',1),parseBackendEnemies(payload));
  else{assert.equal(await claimBackendKillGodTitle('player',1,request),parseBackendKillGodTitleClaim(payload));assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'),'original-claim-key');}
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1'+row.path);
 }
 assert.equal(parseBackendShaQi(null),null);assert.throws(()=>parseRobotShaQi(null));
 const sha=rows.find(r=>r.path.endsWith('/sha-qi'))!.data;
 for(const field of ['shaQi','killGodThreshold','dailyDecayAmount','jinpenReduceAmount'])for(const invalid of [null,'1',Infinity])assert.throws(()=>parseRobotShaQi({...sha,[field]:invalid}));
 // Preserve the v1 finite-number contract rather than introducing integer restrictions here.
 assert.equal(parseRobotShaQi({...sha,shaQi:1.5}).shaQi,1.5);
 const ranking=rows.find(r=>r.path.endsWith('/kill-god-ranking')&&r.data.list.length>0)!.data;
 for(const invalid of [{...ranking,list:null},{...ranking,list:[{rank:1,uid:1,shaQi:30,name:null}]},{...ranking,hasKillGodTitle:0},{...ranking,shaQiInfo:{}}])assert.throws(()=>parseBackendKillGodRanking(invalid));
 const enemies=rows.find(r=>r.path.endsWith('/enemies')&&r.data.length>0)!.data;
 assert.equal(parseBackendEnemies(enemies).find(e=>e.uid===999)!.name,'玩家999');
 for(const invalid of [{},null,[{...enemies[0],lastAttackTime:'bad-date'}],[{...enemies[0],uid:'2'}]])assert.throws(()=>parseBackendEnemies(invalid));
 for(const code of ['TITLE_NOT_FOUND','NOT_RANK1','LIST_TOO_SHORT','ALREADY_CLAIMED']){assert.equal(parseBackendKillGodTitleClaim({code}),code);assert.throws(()=>parseRobotKillGodTitleClaim({code}));}
 for(const bad of [null,{},'OK',{code:'LOCK_FAIL'}])assert.throws(()=>parseBackendKillGodTitleClaim(bad));
 for(const path of ['shaQi/res.ts','enemy/res.ts','killGodList/res.ts','killGodList/claimTitle/res.ts']){const source=readFileSync(new URL('../src/response/'+path,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
