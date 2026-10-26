import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {executeBackendCaveCommand,parseBackendCaveCommand} from '../src/api/bot/cave-command';
import {caveCultivateArguments} from '../src/api/bot/cave-robot-command';

test('actual original cultivate SDK retains command, committed receipt and number parsing',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveCultivateV1TransactionAndReceipt$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_CULTIVATE_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,90);
 mockBackendConfig(t,{api_url:'https://cave-cultivate.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:{url:string,data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string,data?:string})=>{calls.push(call);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const row of rows){current=row;calls.length=0;const index=row.args.plotIndex===null?undefined:Number(row.args.plotIndex);const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];await withEventContext(e,()=>{},async()=>{const call=()=>executeBackendCaveCommand('player',1,{action:'cultivate',plotIndex:index},{requestId:'test',idempotencyKey:row.state+'-'+String(index??0)});if(row.status===200)assert.deepEqual(await call(),parseBackendCaveCommand(row.body.data));else await assert.rejects(call);});assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/cave/command');assert.deepEqual(JSON.parse(calls[0].data!),JSON.parse(JSON.stringify({action:'cultivate',plotIndex:index})));assert.deepEqual(caveCultivateArguments(row.text),row.args);}
 for(const text of ['/开垦','/开垦 0','/开垦 0002','/开垦 2 ','/开垦 9007199254740993','/开垦 '+ '9'.repeat(400)]){const match=text.match(/开垦(?:\s+(\d+))?$/);const n=match?.[1]?Number(match[1]):undefined;assert.deepEqual(caveCultivateArguments(text),{plotIndex:n!==undefined?String(n):null});}
 calls.length=0;await assert.rejects(()=>executeBackendCaveCommand('player',1,{action:'cultivate',plotIndex:Infinity},{requestId:'infinite-test',idempotencyKey:'infinite-test'}));assert.equal(calls.length,0);
 for(const value of [null,{}, {message:1}])assert.throws(()=>parseBackendCaveCommand(value));
});


test('cultivate all shortcuts pass an explicit batch flag while single commands keep their shape',()=>{
 for(const command of ['/开垦所有','/一键开垦','开垦所有','＃开垦所有 ']) assert.deepEqual(caveCultivateArguments(command),{plotIndex:null,all:true});
 assert.deepEqual(caveCultivateArguments('/开垦 4'),{plotIndex:'4'});
});
