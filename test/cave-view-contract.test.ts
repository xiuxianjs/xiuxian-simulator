import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendCaveView,parseBackendCaveView} from '../src/api/bot/cave-command';

test('actual original cave view SDK retains eligibility, overview and error parsing',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveViewV1AndReadOnly$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_VIEW_V1=([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],text:m[2],status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(rows.length,75);
 mockBackendConfig(t,{api_url:'https://cave-view.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:string[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(call.url);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const row of rows){current=row;calls.length=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];await withEventContext(e,()=>{},async()=>{if(row.status===200)assert.deepEqual(await getBackendCaveView('player',1),parseBackendCaveView(row.body.data));else await assert.rejects(()=>getBackendCaveView('player',1));});assert.equal(calls.length,1);assert.equal(new URL(calls[0]).pathname,'/api/v1/players/1/cave/view');}
 for(const value of [null,{}, {access:{}},{access:{realmName:null,canUseCave:false,hasCavePlot:false,lockedMessage:''}}])assert.throws(()=>parseBackendCaveView(value));
});
