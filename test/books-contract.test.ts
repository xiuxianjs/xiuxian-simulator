import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendTianshuContent,parseBackendTianshuContent} from '../src/api/bot/tianshu-content';
import {getBackendTianshiBaoluPanel,parseBackendTianshiBaoluPanel} from '../src/api/bot/tianshi-baolu-panel';
import {parseTianshiBaoluCommand} from '../src/api/bot/tianshi-baolu-command';
import oldApp,{parseTianshiBaoluCommand as oldParser} from '../src/response-apps/tianshiBaolu/app';

test('books v1 SDK remains compatible and new pure parsers preserve command and payload validation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBooks','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const payloads=new Map([...output.matchAll(/ROBOT_BOOKS_V1=([^|]+)\|(.+)/g)].map(m=>[m[1],JSON.parse(m[2]).data]));
 mockBackendConfig(t,{api_url:'https://books-contract.test',robot_auth_token:'test-token'});const calls:string[]=[];let payload:unknown;
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(new URL(call.url).pathname);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 payload=payloads.get('tianshu');assert.ok(payload);assert.deepEqual(await getBackendTianshuContent('player'),parseBackendTianshuContent(payload));assert.deepEqual(calls,['/api/v1/content/tianshu']);
 calls.length=0;payload=payloads.get('baolu');assert.ok(payload);const expected=parseBackendTianshiBaoluPanel(payload);assert.deepEqual(await getBackendTianshiBaoluPanel('player',1,'all',1),expected);assert.deepEqual(calls,['/api/v1/players/1/tianshi-baolu/panel-query']);assert.deepEqual(await oldApp({bid:'player',uid:1,category:'all',page:1}),{code:'OK',data:expected});
 for(const text of ['/天师宝录','天师宝录 p0','！天师宝录 装备 p2','#天师宝录 功法 p99','/天师宝录 本命','/天师宝录 错误 p2','/天师宝录 p999999999999999999999999999999999999999999'])assert.deepEqual(parseTianshiBaoluCommand(text),oldParser(text));
 for(const bad of [null,{}, {...expected,page:0},{...expected,rows:[{}]},{...expected,totalCount:0,unlockedCount:1}])assert.throws(()=>parseBackendTianshiBaoluPanel(bad));
 for(const bad of [null,{}, {intro:'',realmUnlocks:[],notes:[],nextStage:{stageLevel:1,stageName:'炼气',unlocks:[{}]}}])assert.throws(()=>parseBackendTianshuContent(bad));
 for(const folder of ['tianshu','tianshiBaolu']){const source=readFileSync(new URL(`../src/response/${folder}/res.ts`,import.meta.url),'utf8');assert.ok(!source.includes('response-apps'));assert.equal((source.match(/runRobotBusiness\(/g)||[]).length,1);}
});
