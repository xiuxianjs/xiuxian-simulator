import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendCaveLogs,parseBackendCaveLogs} from '../src/api/bot/cave-queries';

test('actual original cave logs SDK preserves payload and page normalization',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveLogsV1AndReadOnly$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_LOGS_V1=([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],page:Number(m[2]),status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(rows.length,36);
 mockBackendConfig(t,{api_url:'https://cave-logs.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:string[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(call.url);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 const e={name:'message.create',UserId:'player',uid:1} as unknown as Parameters<typeof withEventContext>[0];
 for(const row of rows){current=row;calls.length=0;await withEventContext(e,()=>{},async()=>{if(row.status===200)assert.deepEqual(await getBackendCaveLogs('player',1,row.page),parseBackendCaveLogs(row.body.data));else await assert.rejects(()=>getBackendCaveLogs('player',1,row.page));});assert.equal(calls.length,1);const url=new URL(calls[0]);assert.equal(url.pathname,'/api/v1/players/1/cave/logs');assert.equal(url.searchParams.get('page'),String(row.page));assert.equal(url.searchParams.get('pageSize'),'5');}
 current=rows[0];for(const page of [0,-2,1.5,NaN,Infinity]){calls.length=0;await withEventContext(e,()=>{},()=>getBackendCaveLogs('player',1,page));assert.equal(new URL(calls[0]).searchParams.get('page'),String(Math.min(Number.MAX_SAFE_INTEGER,Math.max(1,Math.floor(page)||1))));}
});
