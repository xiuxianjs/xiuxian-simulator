import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import replaceEquip from '../src/response-apps/profession/replaceEquip/app';
import {parseProfessionRobotTools,parseProfessionToolCommand} from '../src/api/bot/profession-robot-tools';

test('actual v1 tool bag/replacement App preserves payload and refusal semantics',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessProfessionTools','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const old=[...output.matchAll(/ROBOT_PROFESSION_TOOL_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(old.length,72);
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));
 mockBackendConfig(t,{api_url:'https://profession-tools.test',robot_auth_token:'test-token'});
 let current:typeof old[number];const calls:{url:string;data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(let i=0;i<old.length;i++){
  current=old[i];const row=rows[i];assert.equal(row.text,current.text);calls.length=0;
  const e={name:'message.create',UserId:'player',uid:1,MessageText:current.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{
   const result=await replaceEquip({bid:'player',uid:1,messageText:current.text,request:{requestId:'tool-id',idempotencyKey:'tool-key'}});
   if(row.result.success)assert.deepEqual(result,parseProfessionRobotTools(row.result.data));else{assert.equal(result.code,'FAILED');if(result.code==='FAILED')assert.equal(row.result.middleware.replies.at(-1).text,'❤ '+result.message);}
  });
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,current.args.identifier?'/api/v1/players/1/profession-tools/replace':'/api/v1/players/1/profession-tools/bag');
  if(current.args.identifier)assert.deepEqual(JSON.parse(calls[0].data!),{identifier:current.args.identifier});
 }
 for(const value of [null,{}, {mode:'list',bag:{}},{mode:'replace',result:{}}])assert.throws(()=>parseProfessionRobotTools(value));
});
test('profession tool command keeps original prefixes, full name and list fallback',()=>{
 for(const prefix of ['','/','!','！','#','＃'])assert.equal(parseProfessionToolCommand(prefix+'切换 新 丹炉'),'新 丹炉');
 for(const text of ['/切换','/替换','/切换天工','/切换  '])assert.equal(parseProfessionToolCommand(text),undefined);
 assert.equal(parseProfessionToolCommand('/替换 0002'),'0002');
});
