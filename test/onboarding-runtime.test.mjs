import assert from 'node:assert/strict';
import { beforeEach, after, test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Router, getCurrentEvent, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { clearContexts, expendContext } from '../node_modules/alemonjs/lib/application/context.js';
import { GROUP_AT_MESSAGE_CREATE, C2C_MESSAGE_CREATE } from '../node_modules/@alemonjs/qq-bot/lib/sends.js';

// Use the installed framework, Context registry/queue and real FormatGui.
// Only HTTP and platform delivery are replaced; no account or QQ write occurs.
const state = globalThis.__onboardingRuntime = {};
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `export {onboardingContent,showOnboarding} from './src/response/onboarding/context.ts';export {default as resGuide} from './src/response/resGuide.ts';export {configureOnboardingCommandMatcher} from './src/response/onboarding/policy.ts';export {matchesGameCommand as actualMatch, default as actualRoutes} from './src/router.ts';export {handleOnboardingResponse} from './src/response/onboarding/res.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'runtime-transport', setup(b) {
    b.onResolve({ filter: /.*/ }, a => a.kind === 'dynamic-import' ? {path:a.path,external:true} : undefined);
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    b.onResolve({ filter: /^@src\/api\/bot\/robot-business$|^@src\/utils\/useMessage$|^\.\/useMessage$|^\.\.\/robotBusiness$/ }, a => ({ path: a.path, namespace: 'transport' }));
    b.onLoad({ filter: /.*/, namespace: 'transport' }, () => ({ contents: `
      export const requestRobotBusiness = async (event, operation, args, decode) => {
        const state = globalThis.__onboardingRuntime;
        state.calls.push({ user: event.UserId, operation, args: structuredClone(args) });
        const data = await state.respond(event, operation, args);
        if (data.__result) return data.__result;
        return { success: true, branch: 'business', middleware: { replies: [] }, data: decode(data, 1) };
      };
      export const runRobotBusiness = async(event,operation,args,decode) => {
        const result=await requestRobotBusiness(event,operation,args,decode);
        return result.success && result.branch==='business' ? {handled:false,data:result.data} : {handled:true};
      };
      export { useMessage } from 'alemonjs';
    ` }));
  } }]
});
const { onboardingContent, showOnboarding, resGuide, configureOnboardingCommandMatcher, actualMatch, actualRoutes, handleOnboardingResponse } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const appName = 'onboarding-real-runtime';
let app;
after(async () => { await app?.dispose(); await shutdownLogger(); delete globalThis.__onboardingRuntime; });

const view = (phase = 'profile', version = 1, status = 'active') => ({
  status, phase, version, title: '宋玉 · 新手教学', lines: ['测试状态'], feedback: [],
  actions: [{ label: phase === 'profile' ? '查看角色 · /我' : '查看教学目标 · /任务面板', command: phase === 'profile' ? '/我' : '/任务面板' }]
});
let eventId = 0;
const event = (text, changes = {}) => ({
  name: 'message.create', Platform: 'qq', BotId: 'bot', UserId: 'newcomer', ChannelId: 'group',
  MessageId: String(++eventId), MessageText: text, ...changes
});
const scoped = async (e, callback) => (await app.invoke(e, callback, appName)).value;
const open = async (e, data) => scoped(e, () => showOnboarding(e, data));
const deliver = async e => {
  let next = 0;
  const claimed = await scoped(e, () => expendContext(e, e.name, () => next++, 'response'));
  return { claimed, next };
};
beforeEach(async () => {
  await app?.dispose();
  app = createTestApp({ config: { processor: { repeated_user_time: 0 } } });
  await app.mount({ responseContent: onboardingContent }, undefined, appName);
  app.actions.on('message.send', request => {
    const e = getCurrentEvent();
    const value = { format: { value: structuredClone(request.payload.params.format) } };
    state.sent.push({ event: e, value });
    return state.send ? state.send(e, value) : [{ code: 2000, message: 'OK', data: {} }];
  });
  configureOnboardingCommandMatcher(actualMatch);
  Object.assign(state, { calls: [], sent: [], send: undefined, respond: async () => view('panel', 2) });
});

test('registered real Context claims a command and sends real formatted buttons', async () => {
  await open(event('/继续引导'), view());
  const result = await deliver(event('/我'));
  assert.deepEqual(result, { claimed: true, next: 0 });
  assert.deepEqual(state.calls.map(c => [c.operation, c.args]), [['onboarding.action', { version: 1, command: '/我' }]]);
  const output = JSON.stringify(state.sent.at(-1).value.format.value);
  assert.ok(output.includes('/任务面板'));
  assert.ok(output.includes('/退出引导'));
  assert.ok(output.includes('宋玉'));
});

test('real scope isolates users, allows group conversation and keeps help non-consuming', async () => {
  await open(event('/继续引导'), view());
  assert.deepEqual(await deliver(event('/我', { UserId: 'another' })), { claimed: false, next: 1 });
  assert.deepEqual(await deliver(event('路过聊天')), { claimed: true, next: 1 });
  assert.deepEqual(await deliver(event('/帮助')), { claimed: true, next: 1 });
  assert.equal(state.calls.length, 0);
  assert.deepEqual(await deliver(event('/我')), { claimed: true, next: 0 });
  assert.equal(state.calls[0].args.version, 1);
});

test('group/private message and interaction event kinds share the intended user scope', async () => {
  for (const name of ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create']) {
    app.run(() => clearContexts()); state.calls = []; state.sent = [];
    await open(event('/继续引导'), view());
    await deliver(event('/我', { name, IsPrivate: name.startsWith('private.') }));
    assert.equal(state.calls.length, 1, name);
    const rendered = JSON.stringify(state.sent.at(-1).value.format.value);
    assert.equal(rendered.includes('MD.mention'), !name.startsWith('private.'), rendered);
  }
});

test('real queue uses the next server version after a context replacement', async () => {
  await open(event('/继续引导'), view());
  state.respond = async (_e, _op, args) => view('panel', args.version + 1);
  await Promise.all([deliver(event('/我')), deliver(event('/任务面板'))]);
  assert.deepEqual(state.calls.map(c => c.args), [{ version: 1, command: '/我' }, { version: 2, command: '/任务面板' }]);
});

test('queued old choice cannot repeat a completed step', async () => {
  await open(event('/继续引导'), view());
  await Promise.all([deliver(event('/我')), deliver(event('/我'))]);
  assert.deepEqual(state.calls.map(c => c.operation), ['onboarding.action', 'onboarding.view']);
});

test('a real expiration/unload releases messages and explicit view can reopen', async () => {
  await open(event('/继续引导'), view());
  await app.clock.advance(31 * 60_000);
  assert.deepEqual(await deliver(event('/我')), { claimed: false, next: 1 });
  assert.equal(state.calls.length, 0);
  await open(event('/继续引导'), view('panel', 9));
  await deliver(event('/任务面板'));
  assert.equal(state.calls[0].args.version, 9);
  await app.unmount(appName);
  assert.deepEqual(await deliver(event('/任务面板')), { claimed: false, next: 1 });
  await app.mount({ responseContent: onboardingContent }, undefined, appName);
});

const prologue = () => ({ reason: 'GUIDE', replies: [{}], guide: { action: 'completed', presentation: {
  title: '序章', heading: '', text: '已结算的序章资源', showActionBar: false,
  advice: [{command:'/商店',description:'普通菜单'}]
} } });
const finishPrologue = async () => {
  const e=event('/继续');
  return scoped(e,()=>resGuide(e,prologue()));
};
test('actual prologue renderer opens its registered real Context after the committed reward', async () => {
  state.respond=async()=>view();
  assert.equal(await finishPrologue(),false);
  assert.equal(state.sent.length,1);
  const output=JSON.stringify(state.sent[0].value.format.value);
  assert.ok(output.includes('已结算的序章资源'));
  assert.ok(output.includes('/我'));
  assert.ok(!output.includes('/商店'));
  await deliver(event('/我'));
  assert.equal(state.calls.at(-1).operation,'onboarding.action');
});
test('prologue handoff failure preserves the reward receipt and offers recovery without a menu or award retry',async()=>{
  state.respond=async()=>{throw new Error('HTTP outage')};
  assert.equal(await finishPrologue(),false);
  assert.equal(state.calls.length,1);
  const output=JSON.stringify(state.sent[0].value.format.value);
  for(const text of ['已结算的序章资源','/继续引导','/退出引导'])assert.ok(output.includes(text),output);
  assert.ok(!output.includes('/商店'));
});
test('prologue handoff preserves native middleware instructions and its silent refusal policy',async()=>{
  state.respond=async()=>({__result:{success:true,branch:'middleware',middleware:{replies:[{title:'系统提示',heading:'',text:'请先完成验证',buttons:[],advice:[]}]}}});
  assert.equal(await finishPrologue(),false);
  assert.equal(state.sent.length,2);
  assert.ok(JSON.stringify(state.sent[0].value.format.value).includes('已结算的序章资源'));
  assert.ok(JSON.stringify(state.sent[1].value.format.value).includes('请先完成验证'));
  state.sent=[];
  state.respond=async()=>({__result:{success:true,branch:'middleware',middleware:{replies:[]}}});
  await finishPrologue();
  assert.equal(state.sent.length,0);
});

test('bare current choices are taught, and recognized bare game commands cannot fall through to legacy writes',async()=>{
 const router=Router.create();
 router.group({events:['message.create'],routeText:{prefixes:['/','#','＃'],stripPrefix:true,allowBare:true}}).use('灵田收获',async()=>{throw new Error('matching must not execute a gameplay importer')});
 configureOnboardingCommandMatcher(e=>router.match(e).matched);
 state.respond=async(_e,operation)=>operation==='onboarding.view'?view():view('panel',2);
 await open(event('/继续引导'),view());
 assert.deepEqual(await deliver(event('灵田收获')),{claimed:true,next:0});
 assert.equal(state.calls[0].operation,'onboarding.view');
 state.calls=[];
 assert.deepEqual(await deliver(event('我')),{claimed:true,next:0});
 assert.equal(state.calls[0].operation,'onboarding.action');
 assert.deepEqual(await deliver(event('普通聊天')),{claimed:true,next:1});
});
test('legacy exclamation commands pass unchanged for every actual framework event kind',async()=>{
 for(const name of ['message.create','private.message.create','interaction.create','private.interaction.create']){
  app.run(() => clearContexts());state.calls=[];
  await open(event('/继续引导'),view());
  for(const text of ['!我','！我'])assert.deepEqual(await deliver(event(text,{name})),{claimed:true,next:1});
  assert.equal(state.calls.length,0,name);
 }
});

test('production router matcher recognizes real bare commands without running any lazy handlers',async()=>{
 for(const command of ['我','突破','主线挑战 1-1','收割'])assert.equal(actualMatch(event(command)),true,command);
 assert.equal(actualMatch(event('普通聊天，不是在发游戏指令')),false);
 configureOnboardingCommandMatcher(actualMatch);
 state.respond=async()=>view();
 await open(event('/继续引导'),view());
 for(const command of ['突破','收割']){
  state.calls=[];
  assert.deepEqual(await deliver(event(command)),{claimed:true,next:0});
  assert.equal(state.calls[0].operation,'onboarding.view');
 }
});

test('a completed prologue does not enroll an old account without a teaching cursor',async()=>{
 state.respond=async()=>({...view(),status:'absent',phase:'',version:0,actions:[]});
 await finishPrologue();
 assert.equal(state.sent.length,1);
 assert.ok(JSON.stringify(state.sent[0].value.format.value).includes('/商店'));
 assert.deepEqual(await deliver(event('/我')),{claimed:false,next:1});
 assert.equal(state.calls.length,1);
});
test('a cross-client graduated account receives optional guidance and keeps ordinary commands free',async()=>{
 state.respond=async()=>({...view(),status:'soft',phase:'graduate',version:3,actions:[{label:'认识今日补给',command:'/任务面板 签到'}]});
 await finishPrologue();
 assert.ok(JSON.stringify(state.sent[0].value.format.value).includes('/任务面板 签到'));
 assert.deepEqual(await deliver(event('/商店')),{claimed:true,next:1});
 assert.equal(state.calls.length,1);
});


test('production control routes accept the whitespace already accepted by Context', () => {
  const route = actualRoutes.current.find(route => route.regular?.test('/继续引导'));
  assert.ok(route, 'production onboarding route missing');
  for (const text of ['/继续引导', '  /继续引导  ', '/ 继续引导', '# 退出引导 ', '＃退出引导', ' 继续引导 ']) {
    assert.equal(route.regular.test(text), true, text);
  }
  for (const text of ['!继续引导', '！退出引导', '/继续引导 突破', '/退出引导abc', '/继续 引导', '//继续引导']) {
    assert.equal(route.regular.test(text), false, text);
  }
});

test('spaced control commands pass Context and reach the registered control route', async () => {
  await open(event('/继续引导'), view());
  const route = actualRoutes.current.find(route => route.regular?.test('/继续引导'));
  for (const text of ['  /继续引导  ', '/ 继续引导', '# 退出引导 ', ' 退出引导 ']) {
    assert.deepEqual(await deliver(event(text)), { claimed: true, next: 1 });
    assert.equal(route.regular.test(text), true, text);
  }
  assert.equal(state.calls.length, 0, 'control must not become a gameplay action');
});

test('completed teaching cancels Context and leaves exit-meditation and task commands free', async () => {
  await open(event('/继续引导'), view());
  await open(event('/闭关'), { ...view('completed', 9, 'completed'), actions: [] });
  const output = JSON.stringify(state.sent.at(-1).value.format.value);
  assert.ok(output.includes('出关结算'));
  assert.ok(!output.includes('/继续引导'));
  assert.deepEqual(await deliver(event('/出关')), { claimed: false, next: 1 });
  assert.deepEqual(await deliver(event('/任务面板')), { claimed: false, next: 1 });
  assert.equal(state.calls.length, 0);
});

test('one real Context queue carries the latest version from group to private chat', async () => {
  await open(event('/继续引导'), view());
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  state.respond = async (_e, _op, args) => {
    if (args.version === 1) { started(); await gate; }
    return view(args.version === 1 ? 'panel' : 'chapter', args.version + 1);
  };
  const group = deliver(event('/我', { ChannelId: 'group-a' }));
  await entered;
  const privateChat = deliver(event('/任务面板', { name: 'private.message.create', IsPrivate: true, ChannelId: undefined }));
  release();
  await Promise.all([group, privateChat]);
  assert.deepEqual(state.calls.map(call => call.args), [{ version: 1, command: '/我' }, { version: 2, command: '/任务面板' }]);
  assert.equal(state.sent.at(-2).event.ChannelId, 'group-a');
  assert.equal(state.sent.at(-1).event.name, 'private.message.create');
  assert.equal(state.sent.at(-1).event.ChannelId, undefined);
});


test('a non-throwing failed delivery receipt falls back to plain text without replaying an action', async () => {
  await open(event('/继续引导',{Platform:'qq-bot'}), view());
  state.sent = [];
  state.respond = async () => ({...view('panel', 2),feedback:['实际到账回执']});
  state.send = async () => [{code: state.sent.length === 1 ? 4000 : 2000, message:'test receipt',data:{}}];
  await deliver(event('/我',{Platform:'qq-bot'}));
  assert.equal(state.calls.length,1);
  assert.equal(state.sent.length,2,'must try one plain-text fallback');
  const plain=JSON.stringify(state.sent[1].value.format.value);
  assert.ok(plain.includes('实际到账回执'));
  assert.ok(plain.includes('/任务面板'));
  assert.ok(plain.includes('/退出引导'));
  assert.ok(!plain.includes('MD.'),'fallback must use native text');
  state.send=undefined;
  await deliver(event('/任务面板',{Platform:'qq-bot'}));
  assert.equal(state.calls.at(-1).args.version,2,'delivery failure must retain latest server view');
});

test('empty, partial and throwing send outcomes each get one presentation-only fallback', async () => {
  for (const mode of ['empty','partial','throw']) {
    app.run(() => clearContexts()); state.send=undefined; state.calls=[]; state.sent=[];
    await open(event('/继续引导'),view());
    state.sent=[];
    state.send=async()=>{
      if(state.sent.length>1)return[{code:2000,message:'OK',data:{}}];
      if(mode==='throw')throw new Error('delivery outage');
      return mode==='empty'?[]:[{code:2000,message:'partial',data:{}},{code:4000,message:'buttons rejected',data:{}}];
    };
    await deliver(event('/我'));
    assert.equal(state.calls.length,1,mode);
    assert.equal(state.sent.length,2,mode);
    assert.ok(JSON.stringify(state.sent[1].value.format.value).includes('/任务面板'),mode);
  }
});

test('failure of both formats is bounded and retains the latest committed teaching view', async()=>{
  await open(event('/继续引导'),view());
  state.sent=[];
  state.send=async()=>[{code:4000,message:'offline',data:{}}];
  await deliver(event('/我'));
  assert.equal(state.calls.length,1);
  assert.equal(state.sent.length,2,'no recursive recovery sends');
  state.send=undefined;
  await deliver(event('/任务面板'));
  assert.equal(state.calls.length,2);
  assert.equal(state.calls[1].args.version,2);
});

test('a failed prologue bubble keeps its committed reward receipt in native text',async()=>{
  state.respond=async()=>view();
  state.send=async()=>[{code:state.sent.length===1?4000:2000,message:'delivery',data:{}}];
  await finishPrologue();
  assert.equal(state.calls.length,1,'do not re-run registration or prologue awards');
  assert.equal(state.sent.length,2);
  const plain=JSON.stringify(state.sent[1].value.format.value);
  assert.ok(plain.includes('已结算的序章资源'));
  assert.ok(plain.includes('/我'));
});

test('an uncertain HTTP action falls back with recovery commands rather than gameplay choices',async()=>{
  await open(event('/继续引导'),view());
  state.sent=[];
  state.respond=async()=>{throw new Error('HTTP result unknown')};
  state.send=async()=>[{code:state.sent.length===1?4000:2000,message:'delivery',data:{}}];
  await deliver(event('/我'));
  assert.equal(state.calls.length,1);
  assert.equal(state.sent.length,2);
  const plain=JSON.stringify(state.sent[1].value.format.value);
  assert.ok(plain.includes('/继续引导'));
  assert.ok(plain.includes('/退出引导'));
  assert.ok(!plain.includes('查看角色'));
});

test('an older same-command button keeps its own screen version across successive battle turns',async()=>{
  const battleView=version=>({...view('battle',version),actions:[{label:'普通攻击 · /普攻',command:'/普攻'},{label:'本场自动 · /自动',command:'/自动'}]});
  await open(event('/继续引导',{Platform:'qq-bot'}),battleView(1));
  let current=1;
  let advances=0;
  state.respond=async(_e,op,args)=>{
    if(op==='onboarding.action' && args.version===current){current++;advances++;}
    return battleView(current);
  };
  const old=()=>event('/普攻',{Platform:'qq-bot',name:'interaction.create',InteractionData:JSON.stringify({button_id:'ob1.0',button_data:'/普攻'})});
  await deliver(old());
  await deliver(old());
  assert.deepEqual(state.calls.map(call=>call.args.version),[1,1]);
  assert.equal(advances,1,'old screen must not become another attack in the new turn');
  assert.ok(JSON.stringify(state.sent.at(-1).value.format.value).includes('你选择了：/普攻'));
  await deliver(event('/普攻',{Platform:'qq-bot',name:'interaction.create',InteractionData:JSON.stringify({button_id:'ob2.0',button_data:'/普攻'})}));
  await deliver(event('/普攻',{Platform:'qq-bot'}));
  assert.deepEqual(state.calls.map(call=>call.args.version),[1,1,2,3]);
  assert.equal(advances,3,'fresh button and deliberate manual command remain available');
});


test('new QQ teaching keyboards fill in the actual command without callbacks',async()=>{
  await open(event('/继续引导',{Platform:'qq-bot'}),view('panel',36));
  const keyboard=state.sent[0].value.format.value.find(item=>item.type==='BT.group');
  assert.ok(keyboard,'native keyboard missing');
  assert.deepEqual(keyboard.value.map(row=>row.value.length),[1,1]);
  const button=keyboard.value[0].value[0];
  assert.equal(button.options.rawData?.id,undefined);
  assert.equal(button.options.data,'/任务面板');
  assert.equal(button.options.type,'command');
  assert.deepEqual(button.options.permission,{type:0,userIds:['newcomer']});
});

test('expired Context callbacks use the original button version and unrelated callbacks pass',async()=>{
  const e=event('/普攻',{Platform:'qq-bot',name:'private.interaction.create',IsPrivate:true,InteractionData:JSON.stringify({button_id:'ob1.0',button_data:'/普攻'})});
  state.respond=async()=>({...view('battle',7),actions:[{label:'普攻',command:'/普攻'}]});
  let passed=0;
  await scoped(e,()=>handleOnboardingResponse(e,async()=>{passed++}));
  assert.deepEqual(state.calls.map(call=>call.args),[{version:1,command:'/普攻'}]);
  assert.equal(passed,0);
  assert.ok(!JSON.stringify(state.sent[0].value.format.value).includes('ob7.0'));
  const unrelated=event('/普攻',{name:'interaction.create',InteractionData:'{"button_id":"ordinary","button_data":"/普攻"}'});
  await handleOnboardingResponse(unrelated,async()=>{passed++});
  assert.equal(passed,1);
  assert.equal(state.calls.length,1);
});

test('invalid owned callback metadata refreshes without an action, and legacy prefix remains free',async()=>{
  for(const active of [true,false]){
    app.run(() => clearContexts());state.calls=[];state.sent=[];
    if(active)await open(event('/继续引导',{Platform:'qq-bot'}),view());
    const e=event('/我',{Platform:'qq-bot',name:'interaction.create',InteractionData:JSON.stringify({button_id:'ob0.0',button_data:'/我'})});
    if(active)await deliver(e);
    else await scoped(e,()=>handleOnboardingResponse(e,async()=>{}));
    assert.deepEqual(state.calls.map(call=>call.operation),['onboarding.view']);
  }
  let passed=0;
  await handleOnboardingResponse(event('!普攻',{name:'interaction.create',InteractionData:'{"button_id":"ob1.0","button_data":"!普攻"}'}),async()=>{passed++});
  assert.equal(passed,1);
});


test('the installed QQ adapter sends input commands and owner permissions in both wire payloads',async()=>{
  await open(event('/继续引导',{Platform:'qq-bot'}),view('panel',36));
  const format=state.sent[0].value.format.value;
  for(const [send,tag] of [[GROUP_AT_MESSAGE_CREATE,'GROUP_AT_MESSAGE_CREATE'],[C2C_MESSAGE_CREATE,'C2C_MESSAGE_CREATE']]){
    let payload;
    const capture=async(_target,data)=>{payload=data;return{id:'test-message'}};
    const client={groupOpenMessages:capture,usersOpenMessages:capture};
    const receipts=await app.run(()=>send(client,{UserId:'newcomer',ChannelId:'group',MessageId:'trigger',_tag:tag},format));
    assert.equal(receipts[0].code,2000);
    const button=payload.keyboard.content.rows[0].buttons[0];
    assert.ok(button.id);
    assert.equal(button.action.type,2);
    assert.equal(button.action.enter,false);
    assert.equal(button.action.data,'/任务面板');
    assert.ok(button.action.unsupport_tips.includes('手动发送'));
    assert.deepEqual(button.action.permission.specify_user_ids,['newcomer']);
    assert.equal(payload.keyboard.content.rows.length,2);
  }
});

test('teaching facts and receipt facts render on separate lines inside the real quote', async () => {
  const e = event('/继续引导', { Platform: 'qq-bot' });
  const data = {
    ...view('farm', 4),
    lines: ['境界：炼气一层\n修为：25/200\n精力：90', '扫荡次数：7次\n消耗精力：70\n预计入账修为：175'],
    feedback: ['挑战结果：胜利\n通关星数：3星\n获得灵石：10']
  };
  const result = await app.invoke(e, () => showOnboarding(e, data), appName);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results[0].code, 2000);
  const quote = message.nodes.find(node => node.type === 'Markdown').value.find(node => node.type === 'MD.blockquote');
  assert.ok(quote, 'actual receipt remains in its quote');
  const text = JSON.stringify(message.nodes);
  for (const line of ['境界：炼气一层', '修为：25/200', '精力：90', '扫荡次数：7次', '消耗精力：70', '预计入账修为：175', '通关星数：3星']) {
    assert.ok(text.includes(line), line);
  }
  const walk = nodes => nodes.flatMap(node => [node, ...(Array.isArray(node.value) ? walk(node.value) : [])]);
  const nodes = walk(message.nodes);
  assert.ok(!nodes.some(node => node.type === 'MD.text' && typeof node.value === 'string' && node.value.includes('\n')), 'line breaks must be explicit Markdown nodes');
  assert.equal(state.calls.length, 0, 'presentation must not issue a gameplay request');
});


test('a realm lesson passes an explicit pending settlement without consuming a lesson choice', async () => {
  await open(event('/继续引导'), {...view(),phase:'milestone.master',actions:[{label:'查看开放说明 · /天书',command:'/天书'}]});
  assert.deepEqual(await deliver(event('/出关')), {claimed:true,next:1});
  assert.equal(state.calls.length,0);
  assert.deepEqual(await deliver(event('/我的师门')), {claimed:false,next:1});
  await open(event('/继续引导'),view());
  assert.deepEqual(await deliver(event('/出关')), {claimed:true,next:0});
  assert.equal(state.calls.at(-1).operation,'onboarding.view','original core lesson still controls its choices');
});


test('milestone guidance follows the same retired-entry filter as Tianshu without losing actual receipts', async () => {
  const data={...view(),phase:'milestone.graduate',lines:['本节点的天书功能：','师门·出师','海外仙岛','本命物·升级与升品'],feedback:['已获得：海外仙岛历史补发材料 ×1']};
  const e=event('/继续引导',{Platform:'qq-bot'});
  const rich=await app.invoke(e,()=>showOnboarding(e,data),appName);
  assert.equal(rich.messages.length,1);
  const md=rich.messages[0].nodes.find(node=>node.type==='Markdown').value;
  assert.ok(md.some(node=>node.type==='MD.blockquote' && JSON.stringify(node).includes('海外仙岛历史补发材料')));
  assert.ok(!md.some(node=>node.type==='MD.text' && node.value==='海外仙岛'));
  state.sent=[];
  state.send=async()=>[{code:state.sent.length===1?4000:2000,message:'test',data:{}}];
  const fallback=await app.invoke(e,()=>showOnboarding(e,data),appName);
  assert.equal(fallback.messages.length,2);
  const text=fallback.messages[1].text;
  assert.ok(text.includes('海外仙岛历史补发材料 ×1'));
  assert.ok(!text.split('\n').includes('海外仙岛'));
  assert.ok(text.includes('师门·出师'));
});


test('a realm lesson leaves existing manual battle controls to their original subscription', async () => {
  const lesson={...view(),phase:'milestone.friends',actions:[{label:'查看本段天书 · /天书',command:'/天书'}]};
  for(const command of ['/普攻','/普通攻击','/战技','/神通','/自动','/切换自动','/逃跑']){
    await open(event('/继续引导'),lesson);
    assert.deepEqual(await deliver(event(command)),{claimed:true,next:1},command);
    assert.equal(state.calls.length,0,'teaching must not issue or repeat a battle command');
  }
});
