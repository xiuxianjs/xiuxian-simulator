import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createTestApp } from 'alemonjs/testing';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
const state = globalThis.__customerSupportClient = { posts: [], target: true };
const channelSource = await readFile('src/notification/channel.ts', 'utf8');
const start = channelSource.indexOf('export function assertNotificationReceipt(');
const receiptSource = channelSource.slice(start, channelSource.indexOf('\n}', start) + 2).replace(': unknown', '').replace(': void', '');
const bundle = await build({
  stdin: { contents: "export * from './src/api/bot/customer-support.ts'", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'support-client-seams', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^(axios|@src\/utils\/appConfig|@src\/notification\/channel)$/ }, args => ({ path: args.path, namespace: 'business' }));
    builder.onResolve({ filter: /^\.\/config$/ }, args => args.importer.endsWith('/customer-support.ts') ? ({ path: 'config', namespace: 'business' }) : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'business' }, args => {
      if (args.path === 'config') return { contents: `export const assertChannelRobotEvent=()=>{};export const getBackendConfig=()=>({channelMode:true,channelBotId:'123',robotAuthToken:'disposable-test-token',timeoutMs:1000})` };
      if (args.path.endsWith('appConfig')) return { contents: `export const getAppConfig=()=>({support_api_origin:'http://127.0.0.1:19999'})` };
      if (args.path === 'axios') return { contents: `const state=globalThis.__customerSupportClient;export default {isAxiosError:()=>false,post:async(url,body,options)=>{state.posts.push({url,body,options});return {data:{data:body.action==='ack'?{acknowledged:true}:{conversationId:'42',deliveries:[{id:'5',platformUserId:'staff-one',content:'客服会话 #42',dispatchKey:'dispatch-1'}]}}}}};` };
      return { resolveDir: process.cwd(), loader: 'ts', contents: `import {Ok} from 'alemonjs';import {NotificationDeliveryUncertainError} from ${JSON.stringify(resolve('src/types/notification.ts'))};${receiptSource}
        export const rememberNotificationTarget=async()=>{};
        export const getNotificationPrivateTarget=async()=>globalThis.__customerSupportClient.target?({platform:'qq-bot',BotId:'123',scope:'c2c',targetId:'staff-native'}):null;` };
    });
  } }]
});
const h = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
after(shutdownLogger);
async function run(mode) {
  state.posts = []; state.target = mode !== 'missing';
  const app = createTestApp();
  app.actions.on('message.send.target', () => mode === 'uncertain' ? [] : [createResult(ResultCode.Ok, 'Delivered', { id: 'proactive-receipt' })]);
  try {
    return await app.runHandler(async () => await h.customerSupportCommand({name:'private.message.create',Platform:'qq-bot',BotId:'123',UserId:'player',MessageId:'event-12345',Target:{scope:'c2c',BotId:'123',targetId:'player-native'}}, {action:'call',content:'求助'}), {name:'private.message.create',Platform:'qq-bot',BotId:'123',UserId:'player',MessageId:'event-12345',Target:{scope:'c2c',BotId:'123',targetId:'player-native'}});
  } finally { await app.dispose(); }
}
test('proactively sends to the staff private target and acknowledges only a confirmed receipt', async () => {
  const result = await run('sent'); assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 1);
  assert.match(JSON.stringify(result.messages[0].nodes), /客服会话 #42/);
  assert.equal(result.messages[0].target.targetId, 'staff-native');
  assert.equal(result.messages[0].target.scope, 'c2c');
  const ack = state.posts.find(post => post.body.action === 'ack'); assert.equal(ack.body.deliveryStatus, 'sent'); assert.equal(ack.body.deliveryKey, 'dispatch-1');
  assert.equal(state.posts[0].options.maxRedirects, 0); assert.equal(state.posts[0].body.appId, '123');
});
test('missing private target stays pending and ambiguous receipts stay unknown', async () => {
  for (const [mode, status] of [['missing','pending'],['uncertain','unknown']]) {
    const result = await run(mode); assert.deepEqual(result.errors, []);
    assert.equal(state.posts.find(post => post.body.action === 'ack').body.deliveryStatus, status);
  }
});
test('HTTP polling proactively sends without a player event and stops cleanly', async t => {
  state.posts = []; state.target = true;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const app = createTestApp();
  let delivered = 0;
  app.actions.on('message.send.target', () => { delivered++; return [createResult(ResultCode.Ok, 'Delivered', { id: 'poll-receipt' })]; });
  try {
    await app.run(async () => {
      h.startCustomerSupportPolling();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(state.posts.filter(post => post.body.action === 'poll').length, 1);
      t.mock.timers.tick(2000);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(state.posts.filter(post => post.body.action === 'poll').length, 2);
      await h.stopCustomerSupportPolling();
      t.mock.timers.tick(2000);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(state.posts.filter(post => post.body.action === 'poll').length, 2);
    });
    assert.equal(delivered, 2);
    assert.ok(state.posts.filter(post => post.body.action === 'poll').every(post => post.body.userId === 'support-poller'));
    assert.equal(state.posts.filter(post => post.body.action === 'ack' && post.body.deliveryStatus === 'sent').length, 2);
  } finally { await h.stopCustomerSupportPolling(); await app.dispose(); t.mock.timers.reset(); }
});
