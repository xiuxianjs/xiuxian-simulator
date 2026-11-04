import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createTestApp } from 'alemonjs/testing';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
const state = globalThis.__customerSupportTest = { calls: [] };
const bundle = await build({
  stdin: { contents: "export {default} from './src/response/customerSupport/res.ts';export {default as plain} from './src/response/customerSupport/plain.ts'", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'support-business-seams', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(api\/bot\/customer-support|utils\/(useMessage|appConfig|commandPrefix)|api\/bot\/config|response\/config)$/ }, args => ({ path: args.path, namespace: 'business' }));
    builder.onLoad({ filter: /.*/, namespace: 'business' }, args => ({ contents: args.path.endsWith('customer-support')
      ? `export async function rememberCustomerSupportIdentity(){};export async function customerSupportCommand(event,input){globalThis.__customerSupportTest.calls.push(input);return {handled:globalThis.__customerSupportTest.handled!==false,conversationId:'42',conversations:[]}}`
      : args.path.endsWith('appConfig') ? `export const getAppConfig=()=>({support_api_origin:'http://127.0.0.1:19999'})` : args.path.endsWith('commandPrefix') ? `export const hasCommandPrefix=value=>value.startsWith('/')` : args.path.endsWith('/config') && args.path.includes('api/bot') ? `export const getBackendConfig=()=>({channelMode:true})` : args.path.endsWith('useMessage') ? `export {useMessage} from 'alemonjs'` : `export const selects=['message.create','private.message.create'];` }));
  } }]
});
const { default: handler, plain } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
after(shutdownLogger);
async function run(text, privateEvent = true) {
  state.calls = [];
  const app = createTestApp();
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, 'Delivered', { id: 'support-receipt' })]);
  try {
    const result = await app.runHandler(handler, { name: privateEvent ? 'private.message.create' : 'message.create', Platform: 'qq-bot', BotId: '123', UserId: 'player', MessageId: 'message-1', MessageText: text, isPrivate: privateEvent });
    assert.deepEqual(result.errors, []);
    for (const sent of result.messages) assert.equal(result.actions[sent.actionIndex].results[0].data.id, 'support-receipt');
    return result;
  } finally { await app.dispose(); }
}
test('support calls and agent replies use ordinary private messages', async () => {
  let result = await run('/呼叫客服 帮我查看');
  assert.deepEqual(state.calls, [{ action: 'call', content: '帮我查看' }]);
  assert.match(JSON.stringify(result.messages[0].nodes), /消息已登记/);
  await run('/接待 42'); assert.equal(state.calls[0].action, 'claim'); assert.equal(state.calls[0].conversationId, '42');
  await run('/回复 42 已处理'); assert.deepEqual(state.calls[0], { action: 'reply', conversationId: '42', content: '已处理' });
});
test('identity enrollment needs no game login; group and unrelated commands do not call support service', async () => {
  const result = await run('/客服身份'); assert.match(JSON.stringify(result.messages[0].nodes), /player/); assert.equal(state.calls.length, 0);
  await run('/呼叫客服', false); assert.equal(state.calls.length, 0);
  const unrelated = await run('/背包'); assert.equal(unrelated.nextCalls.length, 1); assert.equal(unrelated.messages.length, 0);
});
test('malformed reception command cannot acquire a conversation', async () => {
  const result = await run('/接待 abc'); assert.equal(state.calls.length, 0); assert.match(JSON.stringify(result.messages[0].nodes), /格式/);
});

test('plain private messages route only through a server-confirmed support session',async()=>{
 for(const handled of [true,false]){
  state.handled=handled;state.calls=[];const app=createTestApp();
  try {const result=await app.runHandler(plain,{name:'private.message.create',Platform:'qq-bot',BotId:'123',UserId:'player',MessageId:'plain-1',MessageText:'直接输入内容',isPrivate:true});
   assert.deepEqual(result.errors,[]);assert.deepEqual(state.calls,[{action:'message',content:'直接输入内容'}]);assert.equal(result.nextCalls.length,handled?0:1);
  }finally{await app.dispose();}
 }
 state.handled=true;
 const app=createTestApp();try{state.calls=[];const result=await app.runHandler(plain,{name:'private.message.create',Platform:'qq-bot',BotId:'123',UserId:'player',MessageId:'command-1',MessageText:'/背包',isPrivate:true});assert.equal(result.nextCalls.length,1);assert.equal(state.calls.length,0);}finally{await app.dispose();}
 assert.equal(plain.customerSupportPlain,true);
});
test('continue-waiting is an explicit user decision',async()=>{await run('/继续等待');assert.equal(state.calls[0].action,'continue');});
