import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const state = globalThis.__businessFallbackPresentation = { sent: [] };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as fallback} from './src/response/mwBusinessFallback.ts';export {finishRobotBusiness} from './src/response/robotBusiness.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'fallback-message-seam', setup(builder) {
    builder.onResolve({filter:/^@alemonjs\/qq-bot$/},()=>({path:import.meta.resolve('@alemonjs/qq-bot'),external:true}));
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/mwFeatureTrack|response\/mwBan|api\/bot\/identity|api\/bot\/robot-business)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/(mwFeatureTrack|mwBan)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export default ()=>true;export const seedEventBackendRobotIdentity=()=>{};export const isRobotPublicEntry=()=>false;export const requestRobotBusiness=()=>{throw new Error("feedback requested API");};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';` }));
  }}]
});
const { fallback, finishRobotBusiness } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => node.type === 'MD.blockquote' ? flatten(node.value) : [node]);
const nodes = payload => flatten(payload.filter(part => part.type === 'Markdown').flatMap(part => part.value));
const text = payload => nodes(payload).map(node => String(node.value ?? '')).join('');
const allNodes = payload => payload.flatMap(node => Array.isArray(node.value) ? allNodes(node.value) : [node]);
const commands = payload => allNodes(payload).filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);
const notice = { title: '维护预告', heading: '', text: '稍后维护', buttons: [], advice: [] };
async function render(middleware, success = true) {
  state.sent = [];
  const event = { name: 'message.create', UserId: 'player', UserName: '青云', uid: 1, isPrivate: true,
    __res: { success, branch: 'middleware', middleware } };
  state.next = 0;
  await framework.run(fallback, event, () => { state.next++; });
  assert.equal(event.__res, undefined);
  return state.sent;
}

test('mute fallback retains the backend notice quota and the original message', async () => {
  const middleware = { reason: 'MUTED', replies: [], mute: { muted: true, claimed: true, muteUnlockTime: '明日' } };
  const sent = await render(middleware);
  assert.equal(sent.length, 1);
  assert.match(text(sent[0]), /你的修仙功能已被禁言，限制将于明日解除/);
  assert.equal((await render({ ...middleware, mute: { ...middleware.mute, claimed: false } })).length, 0);
});

test('guide fallback keeps advice and continue/skip buttons, and sends each notice once', async () => {
  const sent = await render({ reason: 'GUIDE', replies: [notice, { ...notice, text: '引导正文' }],
    guide: { action: 'step-3', presentation: { title: '新手指引', heading: '第一步', text: '引导正文',
      showActionBar: true, advice: [{ command: '/我', description: '查看自己' }] } } });
  assert.equal(sent.length, 2);
  assert.match(text(sent[0]), /稍后维护/);
  assert.match(text(sent[1]), /引导正文/);
  for (const command of ['/我', '/继续', '/跳过引导']) assert.ok(commands(sent[1]).includes(command));
});

test('unregistered fallback forwards supplied notices and stays silent without notices', async () => {
  for (const replies of [[], [notice]]) {
    const sent = await render({ reason: 'UNREGISTERED', replies });
    assert.equal(sent.length, replies.length);
    if (replies.length) assert.match(text(sent[0]), /稍后维护/);
    assert.equal(state.next, 0);
  }
});

test('entry fallback retains maintenance details and realm restriction navigation', async () => {
  const sent = await render({ reason: 'COMMAND_MAINTENANCE', replies: [notice, notice],
    entry: { maintenance: { disabled: true, reason: '修复中', endTime: '2030-01-02T03:04:05+08:00' } } });
  assert.equal(sent.length, 2);
  assert.match(text(sent[1]), /维护原因：修复中/);
  assert.match(text(sent[1]), /预计恢复：2030-01-02 03:04:05/);
  const guarded = await render({ reason: 'ENTRY_FAILED', replies: [], entry: {
    maintenance: { disabled: false }, featureGuard: { blocked: true, reason: '境界不足', realmName: '炼气' }
  } });
  assert.equal(guarded.length, 1);
  assert.match(text(guarded[0]), /境界不足；当前境界：炼气/);
  assert.ok(commands(guarded[0]).includes('/我的境界'));
});

test('explicit false never executes local fallback handling', async () => {
  assert.equal((await render({ reason: 'UNREGISTERED', replies: [] }, false)).length, 0);
});


test('false/business feedback retains original navigation, sends once and never advances to fallback', async () => {
  state.sent = [];
  let advanced = 0;
  const event = { name: 'message.create', UserId: 'player', isPrivate: true };
  const result = await framework.invoke(event, () => finishRobotBusiness(event, { success: false, branch: 'business', middleware: {
    identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, contextWarnings: [],
    replies: [notice, { title: '', heading: '', text: '改名失败：数量不足\n\n道友，你是来找我玩的吗？😄', quote:'附加引用内容', blocks:[{text:'状态标题',quoted:false},{text:'逐日奖励',quoted:true}], buttons: [], advice: [] }]
  } }, () => { advanced++; }));
  assert.deepEqual(result, { handled: true });
  assert.equal(advanced, 0);
  assert.equal(event.__res, undefined);
  assert.equal(state.sent.length, 2);
  assert.equal(commands(state.sent[0]).length, 0);
  assert.match(text(state.sent[1]), /改名失败：数量不足/);
  assert.match(text(state.sent[1]), /附加引用内容/);
  assert.match(text(state.sent[1]), /状态标题/);
  assert.match(text(state.sent[1]), /逐日奖励/);
  assert.match(text(state.sent[1]), /道友，你是来找我玩的吗/);
  assert.deepEqual(commands(state.sent[1]), ['/我', '/属性面板', '/查看主线', '/我的活动', '/商店']);
});


test('custom business failure rendering affects only the final reply and never advances',async()=>{
 state.sent=[];const feedback=[];let advanced=0;
 const event={name:'message.create',UserId:'player',isPrivate:true};
 const result=await framework.invoke(event, () => finishRobotBusiness(event,{success:false,branch:'business',middleware:{identity:{bid:'player',account:{status:'registered',playerId:1}},contextWarnings:[],replies:[notice,{...notice,text:'请等待回应'}]}},()=>{advanced++;},async reply=>{feedback.push(reply.text);}));
 assert.deepEqual(result,{handled:true});assert.equal(advanced,0);assert.equal(event.__res,undefined);
 assert.deepEqual(feedback,['请等待回应']);assert.equal(state.sent.length,1);assert.match(text(state.sent[0]),/稍后维护/);
});


test('realm restriction retains pre-notices once and replaces the generic terminal reply', async () => {
  const terminal = { ...notice, title: '操作未完成', text: '玩家入口处理未完成，请稍后再试。' };
  const entry = { maintenance: { disabled: false }, featureGuard: { blocked: true, reason: '境界不足', realmName: '炼气' } };
  const sent = await render({ reason: 'ENTRY_FAILED', replies: [notice, terminal], entry });
  assert.equal(sent.length, 2);
  assert.match(text(sent[0]), /稍后维护/);
  assert.match(text(sent[1]), /境界不足；当前境界：炼气/);
  assert.ok(commands(sent[1]).includes('/我的境界'));
  assert.equal(sent.filter(payload => text(payload).includes('稍后维护')).length, 1);
  assert.ok(sent.every(payload => !text(payload).includes(terminal.text)));
  const withoutNotice = await render({ reason: 'ENTRY_FAILED', replies: [terminal], entry });
  assert.equal(withoutNotice.length, 1);
  assert.match(text(withoutNotice[0]), /境界不足/);
});
