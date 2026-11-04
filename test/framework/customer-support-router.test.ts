import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'node:http';
import { Router, Format, useMessage, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';

after(shutdownLogger);
test('real router forwards active-session private text and passes unrelated private text to the next plugin',async t=>{
 const calls: Record<string,unknown>[]=[];let handled=true;
 const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/channel/v1/robot/support'){calls.push(body);res.end(JSON.stringify({data:{handled,conversationId:'42',deliveries:[]}}));}
  else res.end(JSON.stringify({data:null}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
 const address=server.address();if(!address||typeof address==='string')throw Error('missing address');const origin=`http://127.0.0.1:${address.port}`;
 const app=createTestApp({config:{processor:{repeated_user_time:0},'qq-bot':{app_id:'123'},'xiuxian-game':{support_api_origin:origin,backend:{channel_mode:true,api_url:origin,robot_auth_token:'cb1_'+ 'a'.repeat(43)}}}});
 t.after(()=>app.dispose());
 await app.mount({responseRouter:app.run(createGameRouter).router});
 const downstream=Router.create();downstream.res({events:['private.message.create']},()=>Promise.resolve(async()=>{const [message]=useMessage();await message.send({format:Format.create().addText('下游插件收到')});}));
 await app.mount({responseRouter:downstream.define},undefined,'other-plugin');
 const event=(text:string,id:string)=>({name:'private.message.create' as const,Platform:'qq-bot',BotId:'123',UserId:'player',MessageId:id,MessageText:text,isPrivate:true,Target:{BotId:'123',scope:'c2c' as const,targetId:'native-player'}});
 let result=await app.dispatch(event('直接输入问题','raw-active'));assert.deepEqual(result.errors,[]);assert.equal(calls.length,1);assert.equal(calls[0].action,'message');assert.equal(result.messages.length,0);
 handled=false;result=await app.dispatch(event('其他插件消息','raw-idle'));assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);assert.equal(result.messages[0].text,'下游插件收到');
 assert.equal(app.run(createGameRouter).matchesGameCommand(event('/不存在的命令','unknown')),false);
});
