import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__flymail={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['home','send','mute'].map(n=>`export {default as ${n}} from './src/response/flyMail/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {default as subscription} from './src/response/flyMail/guildSubscription/res.ts';export {parseBackendFlyMailHome} from './src/api/bot/fly-mail-queries.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'flymail',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/flymail-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/(?:fifthLayer|secondLayer)$/},a=>({path:resolve(a.path.replace('@src/','src/').replace('fifthLayer','fifthLayerView')+'.ts')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/(?:context|identity))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/flyMail\/(home|send|mute)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export * from './src/utils/flyMailCommand.ts';export default async()=>{if(globalThis.__flymail.error)throw new Error(globalThis.__flymail.error);return globalThis.__flymail.app};export const sendFlyMailThroughBackend=async()=>{if(globalThis.__flymail.error)throw new Error(globalThis.__flymail.error);return globalThis.__flymail.app};`,resolveDir:process.cwd()}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const getBackendRobotIdentity=async bid=>{if(!globalThis.__flymail.old)throw new Error('unexpected identity HTTP');return{account:bid==='unknown'?{status:'unregistered'}:{status:'registered',playerId:2}}};
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__flymail;if(!s.old)throw new Error('unexpected supplementary HTTP');return s.app};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__flymail;s.calls++;s.op=op;s.args=args;if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessFlyMail','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_FLYMAIL_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.old=name.startsWith('old_');const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};if(row.op?.endsWith('-subscription')&&row.args.target){e.Target=row.args.target;e.Platform=row.args.target.platform;e.BotId=row.args.target.BotId;}const bid=row.args.target?.bid??row.args.targetBid;e.MessageMentions=bid?[{UserId:bid,UserKey:bid,IsMaster:false,IsBot:false}]:[];await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.error=null;
 if(row.op==='flymail.home'){
  if(row.result.success)return{code:'OK',data:h.parseBackendFlyMailHome(row.result.data,row.args.scope)};
  const reply=row.result.middleware.replies.at(-1);if(reply.buttons.length)return{code:'OK',data:{access:{allowed:false,realmName:reply.text.split('：').at(-1)}}};state.error='飞信暂不可用';return null;
 }
 if(row.op==='flymail.send')return row.result.success?row.result.data:{message:row.result.middleware.replies.at(-1).text};
 if(row.result.success)return{access:{allowed:true,realmName:'炼气',targetUid:null},result:row.result.data};
 const reply=row.result.middleware.replies.at(-1),text=reply.text;
 if(reply.buttons[0]?.command==='/我的境界')return{access:{allowed:false,realmName:'炼气',targetUid:null},result:null};
 return{access:{allowed:true,realmName:'炼气',targetUid:null},result:text.startsWith('用法')?null:{outcome:text.startsWith('不能')?'self':'not_found',targetName:null,realmName:'炼气'}};
}
test('flymail scopes use top options and sender actions while send and mute retain their behavior',async()=>{
 // Legacy friend HomeQuery parity remains covered by Go/V1 tests; robot bubbles use the explicit inbox fixtures below.
 for(const source of rows.filter(r=>r.op!=='flymail.reply'&&r.result.branch==='business'&&!r.text.includes('Infinity')&&!(r.op==='flymail.home'&&r.args.scope==='friend'&&!r.args.view&&r.result.success))){
 const row=structuredClone(source);
 if(row.op==='flymail.home'&&row.args.scope==='friend'&&!row.args.view)row.args.view='conversations';
 for(const isPrivate of row.op.endsWith('-subscription')?[!row.args.target]:[true,false]){
  const name=row.op==='flymail.home'?'home':row.op==='flymail.send'?'send':row.op.endsWith('-subscription')?'subscription':'mute';state.result=row.result;state.app=original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1,`${row.op}: ${row.text}`);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.op.endsWith('-subscription')?{target:null,...row.args}:row.args,row.text);assert.equal(actual.length,1);
  if(name==='send'&&row.result.success&&row.result.data.chat){
   const chat=row.result.data.chat;
   const nodes=actual[0].filter(n=>n.type==='Markdown').flatMap(n=>n.value);
   const quotes=nodes.filter(n=>n.type==='MD.blockquote');
   const chronological=[...chat.history.list].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id-b.id);
   assert.equal(quotes.length,chronological.length);
   chronological.forEach((item,index)=>{assert.ok(quotes[index].value.some(n=>n.type==='MD.text'&&n.value.startsWith((item.senderUid===1?'我':item.senderName)+' · ')));assert.ok(quotes[index].value.some(n=>n.type==='MD.text'&&n.value===item.content));});
   assert.deepEqual(nodes.filter(n=>n.type==='MD.button').map(n=>n.options.data),['/飞信',`/发飞信 ${chat.targetUid} `]);
   assert.ok(!nodes.some(n=>n.type==='MD.text'&&n.value===row.result.data.message));
   continue;
  }
  if(name!=='home') {
   const flatten=nodes=>nodes.flatMap(node=>Array.isArray(node.value)?flatten(node.value):[node]);
   const nodes=flatten(actual[0]);const text=nodes.filter(n=>n.type==='MD.text').map(n=>n.value).join('');
   if(name==='subscription'&&row.result.success)assert.ok(text.includes(row.result.data.message));
   else if(name==='send'&&row.result.success)assert.ok(text.includes('飞信已发送。'));
   else if(name==='mute'&&row.result.success){const target=row.result.data.targetName;assert.ok(text.includes(row.text.includes('解除')?`已解除对${target}的飞信屏蔽。`:`已屏蔽${target}的飞信。`));}
   else {const feedback=row.result.middleware.replies.at(-1).text;assert.ok(text.includes(feedback.replace('对方已禁言你的飞信','对方已屏蔽你的飞信。')));}
   continue;
  }
  const nodes=actual[0].find(node=>node.type==='Markdown').value;
  const scopeLabels={friend:'好友飞信',master:'师门飞信',guild:'宗门飞信',companion:'道侣飞信',team:'队伍飞信'};
  const labelIndex=nodes.findIndex(node=>node.type==='MD.text'&&node.value.trim()===scopeLabels[row.args.scope]);
  const firstTab=nodes.findIndex(node=>node.type==='MD.button'&&node.options.data==='/飞信');
  assert.ok(firstTab>=0&&firstTab<labelIndex,'scope options must precede section title');
  const uiText=nodes.filter(node=>node.type==='MD.text').map(node=>node.value).join('');
  assert.ok(!/当前频道|已禁言|发送：|禁言：|解除：|UID/.test(uiText));
  if(row.result.success){
   const sendCommands={friend:'/我的好友',master:'/发师门飞信 ',guild:'/发宗门飞信 ',companion:'/发道侣飞信 ',team:'/发队伍飞信 '};
   const write=nodes.find(node=>node.type==='MD.button'&&['[写信]','[继续写信]'].includes(node.value));
   assert.equal(write.options.data,row.result.data.view==='messages'?`/发飞信 ${row.result.data.conversation.targetUid} `:row.args.scope==='friend'?sendCommands.friend:sendCommands[row.args.scope]);
   for(const item of row.result.data.list){
    const quoted=nodes.filter(node=>node.type==='MD.blockquote').find(node=>node.value.some(child=>child.type==='MD.text'&&child.value===item.content));
    assert.ok(quoted,'message content lost');
    assert.ok(quoted.value.some(node=>node.type==='MD.text'&&node.value.startsWith((item.senderUid===1?'我':item.senderName)+' · ')));
    assert.ok(!quoted.value.some(node=>node.type==='MD.text'&&node.value.includes(`(${item.senderUid})`)));
    const reply=quoted.value.find(node=>node.type==='MD.button'&&node.value.startsWith('[回复'));
    if(row.args.scope==='friend'){
     if(item.senderUid>0&&item.senderUid!==1) assert.equal(reply.options.data,`/发飞信 ${item.senderUid} `);
     else assert.equal(reply,undefined);
    }else if(item.senderUid===1)assert.equal(reply,undefined);else assert.equal(reply.options.data,sendCommands[row.args.scope]);
   }
   if(row.result.data.view==='conversations'){
    assert.equal(row.result.data.list.length,0);
    for(const conversation of row.result.data.conversations){
     const quoted=nodes.filter(n=>n.type==='MD.blockquote').find(n=>n.value.some(child=>child.type==='MD.text'&&child.value===conversation.preview));
     assert.ok(quoted,'conversation preview lost');
     assert.ok(quoted.value.some(n=>n.type==='MD.text'&&n.value===conversation.targetName));
     assert.ok(quoted.value.some(n=>n.type==='MD.button'&&n.options.data===`/飞信 会话 ${conversation.id}`));
    }
    if(row.result.data.conversations.length===0)assert.ok(uiText.includes('暂无会话'));
   }else if(row.result.data.list.length===0)assert.ok(uiText.includes(row.result.data.view==='messages'?'暂无消息记录':'暂无飞信'));
  }else assert.ok(uiText.includes(row.result.middleware.replies.at(-1).text));
 }}
});
test('flymail admission delegates parent next without supplementary requests',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const [name,text,args]of [['home','/飞信',{scope:'friend',page:'1',view:'conversations'}],['send','/发飞信',{scope:'friend',target:null,content:''}],['mute','/飞信解除',{targetUid:'0',targetBid:null}]]){state.result=result;await render(name,{text,args},false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.deepEqual(state.args,args);}
});

test('flymail keeps exact page scope and supplies targets without requiring visible UID input',async()=>{
 const base=rows.find(row=>row.op==='flymail.home'&&row.result.success&&row.args.view==='messages');
 const row=structuredClone(base);
 row.result.data.page=2;row.result.data.totalPage=3;row.result.data.total=21;
 row.result.data.conversation.targetUid=27;row.result.data.conversation.targetName='清霜';
 const conversationId=row.result.data.conversation.id;
 row.result.data.list=[
  {kind:'message',id:1,scope:'friend',senderUid:27,senderName:'清霜',createdAt:'2026-10-18T12:00:00+08:00',content:'道友，秘境入口见。',conversationId,title:''},
  {kind:'message',id:2,scope:'friend',senderUid:1,senderName:'我',createdAt:'2026-10-18T12:01:00+08:00',content:'即刻启程。',conversationId,title:''}
 ];
 state.result=row.result;
 const [blocks]=await render('home',row,true);
 const nodes=blocks.find(node=>node.type==='Markdown').value;
 const flatten=nodes=>nodes.flatMap(node=>Array.isArray(node.value)?flatten(node.value):[node]);
 const buttons=flatten(nodes).filter(node=>node.type==='MD.button');
 assert.ok(buttons.some(node=>node.options.data===`/飞信 会话 ${conversationId} 1`));assert.ok(buttons.some(node=>node.options.data===`/飞信 会话 ${conversationId} 3`));
 assert.ok(buttons.some(node=>node.options.data==='/发飞信 27 '));assert.ok(!buttons.some(node=>node.options.data==='/发飞信 1 '));
 assert.equal(state.calls,1);
});
