import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendCaveVisit,parseBackendCaveVisit} from '../src/api/bot/cave-visit-queries';
import {resolveRobotTarget} from '../src/utils/targetUid';

test('actual original visit SDK retains target privacy, capabilities and errors',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveVisitV1TargetsAndPrivacy$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_VISIT_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,90);
 mockBackendConfig(t,{api_url:'https://cave-visit.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:string[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(call.url);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const row of rows.filter(r=>r.status!==0)){current=row;calls.length=0;const target=row.args.target.uid??2;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];await withEventContext(e,()=>{},async()=>{if(row.status===200)assert.deepEqual(await getBackendCaveVisit('player',1,target),parseBackendCaveVisit(row.body.data));else await assert.rejects(()=>getBackendCaveVisit('player',1,target));});assert.equal(calls.length,1);assert.equal(new URL(calls[0]).pathname,'/api/v1/players/1/cave/visit/'+target);}
 for(const value of [null,{}, {ownerUid:1}])assert.throws(()=>parseBackendCaveVisit(value));
 calls.length=0;let mentions=0;const mention={findOne:async()=>{mentions++;return{count:1,data:{UserId:'nearby2'}}}};
 for(const text of ['/查看灵田 0002','/查看灵田 @目标 2','/查看灵田 abc2xyz'])assert.deepEqual(await resolveRobotTarget(text,mention),{uid:2});assert.equal(mentions,0);
 for(const text of ['/查看灵田 0','/查看灵田 9007199254740992'])assert.equal(await resolveRobotTarget(text,mention),null);assert.equal(mentions,0);
 assert.deepEqual(await resolveRobotTarget('/查看灵田 @道友',mention),{bid:'nearby2'});assert.equal(mentions,1);assert.equal(calls.length,0);
});
