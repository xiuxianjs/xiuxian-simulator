import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/fishing/res';
import { fishingWeightGrams, parseFishingCommand } from '../../src/response/fishing/commands';
import { parseFishingView, validFishingReference, type FishingView } from '../../src/api/bot/fishing';
import { matchesGameCommand } from '../../src/router';
import { parseBackendNormalPaymentSettlement } from '../../src/api/bot/sponsor-payment';
import { businessEnvelope, gameFixture } from './fixture';

const ref = 'r1_1_y_mh9of000_0123456789abcdef01234567';
const captures: unknown[] = [];
const base = (changes: Partial<FishingView> = {}): FishingView => ({
  rulesVersion: 'fishing-v0.13', view: 'overview', title: '洞府垂钓', status: 'idle',
  sections: [{ title: '筑基水域', id: '', suffix: '', lines: ['状态：未垂钓', '等级：钓技二级 / 九级', '数量：灵鳞钱8,640'], actions: [{ label: '查看渔获', command: '/垂钓 渔获 1' }] }],
  footer: [{ label: '垂钓', command: '/垂钓' }, { label: '钓具', command: '/垂钓 钓具 1' }, { label: '渔市', command: '/垂钓 渔市 coin 1' }, { label: '帮助', command: '/垂钓 帮助' }],
  ...changes
});

function delivered(result: TestRunResult, command: string, messages = 1) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, messages);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> };
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        assert.ok([...String(node.options?.data)].length <= 80);
      }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };
  for (const message of result.messages) {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    walk(message.nodes);
  }
  const message = result.messages.at(-1)!;
  const view = inspectMessage(message.nodes);
  captures.push({ command, text: view.text, commands: view.commands, nodes: message.nodes });
  return view;
}

after(async () => {
  if (process.env.FISHING_PREVIEW_OUTPUT) {
    mkdirSync(dirname(process.env.FISHING_PREVIEW_OUTPUT), { recursive: true });
    writeFileSync(process.env.FISHING_PREVIEW_OUTPUT, JSON.stringify({ note: '真实处理器与Format离线节点；后端及平台由夹具模拟。', captures }, null, 2));
  }
  await shutdownLogger();
});

test('垂钓四入口注册，首页真实组件发送且全部蓝链只填手发', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, base()));
  for (const command of ['/垂钓', '/渔获', '/钓具', '/渔市']) assert.ok(app.run(()=>matchesGameCommand({ name: 'private.message.create', MessageText: command })));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓', platform: 'qq-bot' })), '/垂钓');
  assert.match(view.text, /洞府垂钓/);
  assert.match(view.text, /钓技二级 \/ 九级/);
  assert.deepEqual(requests[0].body.arguments, { view: 'overview' });
  assert.equal(requests[0].path, '/api/v2/robot/business/fishing.query');
});

test('鱼种聚合与单种实例独立分页，详情带原返回层级', async t => {
  const { app, requests } = await gameFixture(t, request => {
    const input = request.body.arguments as { view: string };
    if (input.view === 'species') return businessEnvelope(request.bid, base({ view: 'species', title: '储物袋 · 渔获鱼种', sections: [{ title: '金须鲤', id: 'fishing_r2_b', suffix: '', lines: ['境界：筑基', '数量：8尾'], actions: [{ label: '查看该种', command: '/垂钓 鱼种 fishing_r2_b 1 2' }] }], nav: { page: 2, totalPages: 3, total: 12, command: '/垂钓 渔获 {page}' } }));
    if (input.view === 'instances') return businessEnvelope(request.bid, base({ view: 'instances', title: '金须鲤 · 筑基', sections: [{ title: '金须鲤', id: 'F0186', suffix: '', lines: ['数量：1.840 kg', '状态：可出售'], actions: [{ label: '详情', command: '/垂钓 鱼 F0186 3 2' }] }], nav: { page: 3, totalPages: 3, total: 12, command: '/垂钓 鱼种 fishing_r2_b {page} 2' }, footer: [{ label: '返回鱼种', command: '/垂钓 渔获 2' }] }));
    return businessEnvelope(request.bid, base({ view: 'fish', title: '金须鲤', sections: [{ title: '金须鲤', id: 'F0186', suffix: '', lines: ['数量：1.840 kg', '状态：可出售'], actions: [] }], footer: [{ label: '返回该种', command: '/垂钓 鱼种 fishing_r2_b 3 2' }] }));
  });
  const first = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 渔获 2', platform: 'qq-bot' })), '/垂钓 渔获 2');
  assert.match(first.text, /第2\/3页/);
  assert.ok(first.commands.includes('/垂钓 渔获 3'));
  const second = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 鱼种 fishing_r2_b 3 2', platform: 'qq-bot' })), '/垂钓 鱼种 fishing_r2_b 3 2');
  assert.ok(second.commands.includes('/垂钓 渔获 2'));
  assert.ok(second.commands.includes('/垂钓 鱼 F0186 3 2'));
  const third = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 鱼 F0186 3 2', platform: 'qq-bot' })), '/垂钓 鱼 F0186 3 2');
  assert.ok(third.commands.includes('/垂钓 鱼种 fishing_r2_b 3 2'));
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { view: 'species', page: 2 }, { view: 'instances', speciesId: 'fishing_r2_b', page: 3, returnPage: 2 }, { view: 'fish', catchId: 'F0186', page: 3, returnPage: 2 }
  ]);
});

test('真实预览按钮可完整往返原r1_y，重复确认只请求原引用', async t => {
  let credits = 0;
  const settled = new Set<string>();
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('.preview')) return businessEnvelope(request.bid, base({ view: 'preview', title: '升竿预览', sections: [{ title: '青竹灵竿', id: 'R186', suffix: '', lines: ['等级：一阶 → 二阶', '消耗：250灵鳞钱、矿石精华2、水灵砂10'], actions: [] }], confirmationRef: ref, operationId: 'upgrade-original', expiresAt: '2026-11-03T22:00:00+08:00' }));
    assert.deepEqual(request.body.arguments, { ref });
    if (!settled.has(ref)) { settled.add(ref); credits++; }
    return businessEnvelope(request.bid, base({ view: 'receipt', title: '原升竿回执', operationId: 'upgrade-original', status: 'completed' }));
  });
  const preview = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 升竿 R186', platform: 'qq-bot' })), '/垂钓 升竿 R186');
  const command = preview.commands.find(command => command.startsWith('/垂钓 确认 '))!;
  assert.equal(command, `/垂钓 确认 ${ref}`);
  assert.ok(preview.commands.includes('/垂钓'));
  assert.deepEqual(requests[0].body.arguments, { kind: 'rod-upgrade', rodId: 'R186' });
  for (const messageId of ['confirm-original', 'confirm-original', 'confirm-new-message']) delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot', messageId })), command);
  assert.equal(credits, 1);
  assert.equal(requests.filter(request => request.path.endsWith('.preview')).length, 1);
  assert.equal(requests.filter(request => request.path.endsWith('.confirm')).length, 3);
  assert.equal(requests[1].idempotencyKey, requests[2].idempotencyKey);
});

test('开钓只提交有限已有饵窝配置，不自动购买或增加预留', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, base({ view: 'preview', confirmationRef: ref, operationId: 'start-original', expiresAt: '2026-11-03T22:00:00Z' })));
  const command = '/垂钓 开钓 2 24 R186 素灵饵 160 聚鳞散 4';
  delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  assert.deepEqual(requests[0].body.arguments, { kind: 'start', waterLevel: 2, hours: 24, rodId: 'R186', baitType: 'plain', baitCount: 160, chumType: 'basic', chumCount: 4, chumTier: 0 });
  assert.equal(requests.length, 1);
});

test('同一查询消息重投取得新观察，不沿用旧页面幂等回放', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, base()));
  const event = app.events.privateMessage({ text: '/垂钓', platform: 'qq-bot', messageId: 'same-query-message' });
  for (let i = 0; i < 2; i++) delivered(await app.runHandler(handler, event), '/垂钓');
  assert.notEqual(requests[0].idempotencyKey, requests[1].idempotencyKey);
});

for (const command of [
  '/垂钓 确认 '+ref.slice(0, -1), '/垂钓 确认 '+ref.replace('_y_', '_f_'), '/垂钓 确认 '+ref+' extra',
  '/垂钓 鱼种 fishing_r2_b 0', '/垂钓 鱼 F0186 -1', '/垂钓 渔获 9007199254740992',
  '/垂钓 开钓 2 2 R1 素灵饵 10', '/垂钓 开钓 2 6 R1 素灵饵 40 聚鳞散 1001',
  '/垂钓 购买 coin bait_plain 1.5', '/垂钓 兑换 道晶 1', '/垂钓 升塘 extra', '/垂钓 建塘 extra'
]) test(`无效垂钓指令零后端请求：${command}`, async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('invalid input must not request'); });
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  assert.match(view.text, /参数错误/);
  assert.equal(requests.length, 0);
});

test('非本包消息继续事件链而不发送或访问后端', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('unmatched must not request'); });
  for (const command of ['/垂钓别人的', '/其他插件 hello', '普通聊天']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 0);
    assert.equal(result.nextCalls.length, 1);
  }
  assert.equal(requests.length, 0);
});

test('DTO拒绝跨主体引用、超长动作、超页实例以及损坏数字', () => {
  assert.ok(validFishingReference(ref));
  assert.throws(() => parseFishingView(base({ confirmationRef: ref, operationId: 'x', expiresAt: '2026-11-03T22:00:00Z' }), 2));
  assert.throws(() => parseFishingView(base({ footer: [{ label: '坏编号', command: '/垂钓 鱼 '+ 'x'.repeat(80) }] })));
  assert.throws(() => parseFishingView(base({ view: 'instances', sections: Array.from({ length: 6 }, () => base().sections[0]) })));
  assert.throws(() => parseFishingView(base({ nav: { page: 2, totalPages: 1, total: 1, command: '/垂钓 渔获 {page}' } })));
  assert.throws(() => parseFishingView({ ...base(), sections: [{ ...base().sections[0], id: 9007199254740992 }] }));
  const maxRef = 'r1_2gosa7pa2gv_y_2gosa7pa2gv_0123456789abcdef01234567';
  assert.ok(validFishingReference(maxRef));
  assert.ok([...`/垂钓 确认 ${maxRef}`].length <= 80);
  const parsed = parseFishingCommand(`/垂钓 确认 ${maxRef}`);
  assert.ok(parsed && 'operation' in parsed);
  assert.equal(parsed.operation, 'fishing.confirm');
});

test('提交回执发送失败后只提供原引用重试，不重建新预览', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, base({ view: 'receipt', status: 'completed', operationId: 'original' })));
  let sent = 0;
  app.actions.on('message.send', () => [createResult(++sent === 1 ? ResultCode.Fail : ResultCode.Ok, 'fixture delivery', null)]);
  const command = `/垂钓 确认 ${ref}`;
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  assert.equal(result.messages.length, 2);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Fail);
  const view = inspectMessage(result.messages[1].nodes);
  assert.ok(view.commands.includes(command));
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('.confirm'));
});

test('用户指定主页保留普通概况、两组引用和3+2页脚，全部操作只填命令',async t=>{
  const sections = [
    {title:'',id:'',suffix:'',lines:['水域：筑基水域','等级：钓技 Lv.2','经验：860 / 1500','灵鳞钱：8,640'],actions:[{label:'开辟',command:'/垂钓 升塘'}]},
    {title:'',id:'',suffix:'',lines:['玄磐定波竿 · 二阶','鱼饵：素灵饵 · 余24份','窝料：聚鳞散 · 余02:00','收益周期：9分钟'],actions:[{label:'更换钓具',command:'/垂钓 钓具 1'},{label:'更换饵料',command:'/垂钓 饵料'},{label:'打窝',command:'/垂钓 打窝'}]},
    {title:'',id:'',suffix:'',lines:['本次渔获：12尾','杂获：9件','预计收竿：今日18:00'],actions:[{label:'查询',command:'/垂钓 渔获 1'},{label:'查询',command:'/垂钓 杂获 1'}]},
    {title:'',id:'',suffix:'',lines:['……持续垂钓中……'],actions:[{label:'收杆',command:'/垂钓 收竿'},{label:'使用渔具',command:'/垂钓 渔具'}]}
  ];
  const footer=[{label:'我的渔获',command:'/垂钓 渔获 1'},{label:'渔市',command:'/垂钓 渔市 灵鳞钱 1'},{label:'锦鲤赐福',command:'/垂钓 赐福 1'},{label:'设置',command:'/垂钓 设置'},{label:'帮助',command:'/垂钓 帮助'}];
  const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,base({sections,footer})));
  const run=await app.runHandler(handler,app.events.privateMessage({text:'/垂钓',platform:'qq-bot'}));
  const view=delivered(run,'首页·用户指定版');
  assert.match(view.text,/等级：钓技 Lv.2/);
  assert.match(view.text,/收益周期：9分钟/);
  assert.match(view.text,/杂获：9件/);
  assert.ok(view.commands.includes('/垂钓 赐福 1'));
  assert.ok(view.commands.includes('/垂钓 渔具'));
  const markdown=run.messages[0].nodes.find(node=>node.type==='Markdown');
  assert.ok(markdown?.type==='Markdown');
  const statusAt=markdown.value.findIndex(node=>node.type==='MD.text'&&node.value==='……持续垂钓中……');
  const stopAt=markdown.value.findIndex((node,index)=>index>statusAt&&node.type==='MD.button'&&node.options?.data==='/垂钓 收竿');
  const toolsAt=markdown.value.findIndex((node,index)=>index>stopAt&&node.type==='MD.button'&&node.options?.data==='/垂钓 渔具');
  assert.ok(statusAt>=0&&stopAt>statusAt&&toolsAt>stopAt);
  assert.ok(markdown.value.slice(statusAt+1,stopAt).some(node=>node.type==='MD.newline'));
  assert.ok(markdown.value.slice(stopAt+1,toolsAt).some(node=>node.type==='MD.newline'));
  assert.equal((JSON.stringify(run.messages[0].nodes).match(/"type":"MD.blockquote"/g)??[]).length,2);
});

test('升竿真实三组布局保留原编号与资源持有且确认按钮不改原引用',async t=>{
  const section=(lines:string[])=>({title:'',id:'',suffix:'',lines,actions:[]});
  const data=base({view:'rod-upgrade-preview',title:'升竿预览',sections:[section(['青竹灵竿 · 一阶 → 二阶','原竿编号：fr_0123456789abcdef0123456789abcdef']),section(['灵鳞钱：250 / 持有8,640','矿石精华：2 / 持有12','水灵砂：10 / 持有28']),section(['垂钓值阶数系数：1.00 → 1.15','需钓技 Lv.2  · 已满足','原竿编号保留','预览有效5分钟，确认后扣除上述资源。'])],confirmationRef:ref,operationId:'upgrade-user-layout',expiresAt:'2026-11-04T10:00:00Z',footer:[{label:'确认升阶',command:`/垂钓 确认 ${ref}`},{label:'取消',command:'/垂钓'}]});
  const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,data));
  const view=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 升竿 fr_0123456789abcdef0123456789abcdef',platform:'qq-bot'})),'升竿·用户指定版');
  assert.match(view.text,/原竿编号：fr_0123456789abcdef0123456789abcdef/);
  assert.match(view.text,/矿石精华：2 \/ 持有12/);
  assert.match(view.text,/确认升阶/);
  assert.equal(view.commands.filter(cmd=>cmd===`/垂钓 确认 ${ref}`).length,1);
});

test('渔市旧事实兼容时仅显示五分类导航且100晶仍走原兑换预览',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,base({view:'shop',title:'渔市 · 灵鳞钱',sections:[{title:'',id:'',suffix:'',lines:['余额：8,640钱'],actions:[]},{title:'',id:'',suffix:'',lines:['灵晶 ×100 · 1000钱','日限购 2 / 2'],actions:[{label:'购买',command:'/垂钓 兑换 灵晶 100'}]},{title:'',id:'',suffix:'',lines:['聚鳞散 ×1 · 1000钱','本周限购 1 / 1','周期×0.90，每份持续6小时','生效期间鱼90%、杂获10%'],actions:[{label:'购买',command:'/垂钓 购买 coin chum:basic 1'}]}],footer:[...['灵鳞钱','灵石','灵晶','道晶'].map(label=>({label,command:`/垂钓 渔市 ${label} 1`})),{label:'礼包',command:'/垂钓 礼包'},{label:'返回垂钓',command:'/垂钓'}]})));
  const view=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 渔市',platform:'qq-bot'})),'渔市·用户指定版');
  assert.match(view.text,/日限购 2 \/ 2/);
  assert.match(view.text,/聚鳞散 ×1 · 1000钱/);
  assert.match(view.text,/本周限购 1 \/ 1/);
  assert.doesNotMatch(view.text,/聚鳞散 ×1 · 3钱/);
  assert.ok(view.commands.includes('/垂钓 购买 coin chum:basic 1'));
  assert.ok(view.text.indexOf('余额：')<view.text.indexOf('灵晶 ×100'));
  assert.ok(view.commands.includes('/垂钓 兑换 灵晶 100'));
  assert.ok(view.commands.includes('/垂钓 渔市 bait 1'));
  assert.ok(view.commands.includes('/垂钓 渔市 material 1'));
  assert.ok(!view.commands.includes('/垂钓 渔市 灵鳞钱 1'));
  assert.deepEqual(parseFishingCommand('/垂钓 兑换 灵晶 100'),{operation:'fishing.preview',input:{kind:'cashout',currency:'crystal',quantity:100}});
  assert.deepEqual(requests[0].body.arguments,{view:'shop',shopCategory:'bait',page:1});
});

test('礼包支付只私聊并复用原收银台订单，不在群聊建立订单',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,{order:{orderNo:'FP20261104test',payAmount:600,status:'PENDING'},packageName:'稳如老狗',payUrl:'https://pay.example.test/fishing-original'}));
  const view=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 礼包购买 initial_steady',platform:'qq-bot'})),'礼包支付');
  assert.match(view.text,/FP20261104test/);
  assert.ok(view.commands.includes('/查询充值订单 FP20261104test'));
  assert.equal(requests[0].path,'/api/v2/robot/business/fishing.pack-checkout');
  assert.deepEqual(requests[0].body.arguments,{sku:'initial_steady'});
  await app.runHandler(handler,app.events.groupMessage({text:'/垂钓 礼包购买 initial_steady',platform:'qq-bot'}));
  assert.equal(requests.length,1);
});

test('锦鲤赐福页面保留分类和星级，默认预览仅传鱼种不自动献鱼',async t=>{
  const labels=['凡物','炼气','筑基'];
  const tabs=[0].map(from=>({title:'',id:'',suffix:'',lines:[],actions:labels.slice(from,from+4).map((label,i)=>({label,command:`/垂钓 赐福 ${from+i}`}))}));
  const fish=[['铁鳞鲫','fishing_r2_a','⭐⭐→⭐⭐⭐','主线修为 +2% → 3%','放生10条'],['金须鲤','fishing_r2_b','⭐→⭐⭐','秘境修为 +1% → 2%','放生5条'],['灵纹鳟','fishing_r2_c','未解锁→⭐','丹药修为 +0% → 1%','放生1条'],['寒玉鲈','fishing_r2_d','⭐→⭐⭐','比试、打劫修为 +1% → 2%','放生3条'],['玄甲鱼王','fishing_r2_e','⭐⭐⭐ · 已满星','全部修为 +3%','']].map(([name,id,stars,bonus,label])=>({title:name,id:'',suffix:'',lines:[stars,bonus],actions:label?[{label,command:`/垂钓 赐福预览 ${id}`}]:[]}));
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,base({view:'blessing',title:'锦鲤赐福 · 筑基',sections:[{title:'',id:'',suffix:'',lines:['放归生灵，获取修为赐福。'],actions:[]},...tabs,...fish],footer:[{label:'查看渔获',command:'/垂钓 渔获 1'},{label:'返回垂钓',command:'/垂钓'}]})));
  const view=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 赐福',platform:'qq-bot'})),'锦鲤赐福');
  assert.match(view.text,/⭐⭐→⭐⭐⭐/);
  assert.ok(view.commands.includes('/垂钓 赐福 0'));
  assert.ok(view.commands.includes('/垂钓 赐福 2'));
  assert.ok(!view.commands.includes('/垂钓 赐福 3'));
  assert.ok(!view.commands.includes('/垂钓 赐福 9'));
  assert.doesNotMatch(view.text,/金丹|元婴|化神|洞虚|合体|大乘/);
  assert.ok(view.commands.includes('/垂钓 赐福预览 fishing_r2_b'));
  assert.deepEqual(parseFishingCommand('/垂钓 赐福预览 fishing_r2_b'),{operation:'fishing.preview',input:{kind:'blessing-unlock',speciesId:'fishing_r2_b'}});
  assert.deepEqual(requests[0].body.arguments,{view:'blessing'});
  assert.deepEqual(parseFishingCommand('/垂钓 赐福 0'),{operation:'fishing.query',input:{view:'blessing',blessingRealm:0}});
  assert.deepEqual(parseFishingCommand('/垂钓 赐福 凡物'),{operation:'fishing.query',input:{view:'blessing',blessingRealm:0}});
});

test('垂钓礼包到账仅使用原回执，保留精确原竿和专属奖励',()=>{
  const raw={orderNo:'FP20261104test',packageRewards:{spiritMilk:0,spiritStone:0,spiritCrystal:0,items:[],equipments:[],skills:[]},bonusSpiritMilk:0,vipUpgrade:null,newcomerDayGranted:null,monthCardExtended:false,seclusionPassActivated:false,fishingPack:{sku:'initial_steady',name:'稳如老狗',orderNo:'FP20261104test',rodIds:['fr_original'],coinGrant:0,items:[{key:'bait:plain',itemId:9001,name:'素灵饵',quantity:20,held:20}]}};
  assert.deepEqual(parseBackendNormalPaymentSettlement(raw).fishingPack,raw.fishingPack);
  assert.throws(()=>parseBackendNormalPaymentSettlement({...raw,fishingPack:{...raw.fishingPack,orderNo:'other'}}));
});

test('设置四组展示与partial原预览确认，运行中保存仅下次生效',async t=>{
  const section=(title:string,lines:string[],actions:{label:string;command:string}[]=[])=>({title,id:'',suffix:'',lines,actions});
  const settings=base({view:'settings',title:'垂钓 · 设置',sections:[
    section('持续打窝',['状态：开启','种类：聚鳞散','所有鱼塘每份窝料固定6小时'],[{label:'改为关闭',command:'/垂钓 设置 持续打窝 关'},{label:'选择窝料',command:'/垂钓 设置 窝料'}]),
    section('饵尽切换',['状态：开启','主饵：聚灵饵','备用顺序：素灵饵 → 唤王饵'],[{label:'改为关闭',command:'/垂钓 设置 换饵 关'},{label:'选择主饵',command:'/垂钓 设置 主饵'},{label:'调整顺序',command:'/垂钓 设置 饵序'}]),
    section('消息推送',['稀有鱼：关闭（胜败均通知）','鱼王：关闭（胜败均通知）','默认关闭；确认保存后即时生效，仅影响通知。'],[{label:'稀有鱼开启',command:'/垂钓 设置 稀有通知 开'},{label:'鱼王开启',command:'/垂钓 设置 鱼王通知 开'},{label:'通知设置',command:'/通知设置'}]),
    section('生效范围',['正在垂钓：竿与饵序保持原配置，当前窝料可手动打窝。','通知设置即时生效；其他物资偏好下次生效。','常规会话只预留已有物资，最多4个6小时窝料批次、288份饵，不自动购买。'],[{label:'开钓配置',command:'/垂钓 开钓'},{label:'当前打窝',command:'/垂钓 打窝'}])
  ],footer:[{label:'返回垂钓',command:'/垂钓'}]});
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.preview')?base({view:'confirmation',title:'设置预览',sections:[section('持续打窝：开启 → 关闭',['主饵仍为聚灵饵，备用顺序素灵饵→唤王饵。','仅下次开钓生效，不扣饵窝。'])],confirmationRef:ref,operationId:'settings-original',expiresAt:'2026-11-04T14:00:00Z'}):r.path.endsWith('fishing.confirm')?base({view:'receipt',title:'垂钓设置已保存',sections:[section('',['仅下次开钓生效；当前会话未改变。'])]}):settings));
  const page=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 设置',platform:'qq-bot'})),'垂钓设置');
  assert.match(page.text,/饵尽切换/);
  assert.match(page.text,/主饵：聚灵饵/);
  assert.deepEqual(requests[0].body.arguments,{view:'settings'});
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 设置 持续打窝 关',platform:'qq-bot'})),'设置保存预览');
  assert.deepEqual(requests[1].body.arguments,{kind:'settings',settings:{autoChum:false}});
  const command=preview.commands.find(command=>command.startsWith('/垂钓 确认 '))!;
  delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),command);
  assert.deepEqual(requests[2].body.arguments,{ref});
  assert.equal(requests.length,3);
  assert.deepEqual(parseFishingCommand('/垂钓 设置 窝料 聚鳞散 自动'),{operation:'fishing.preview',input:{kind:'settings',settings:{chumType:'basic',chumTier:0}}});
  assert.deepEqual(parseFishingCommand('/垂钓 设置 饵序 聚灵饵 素灵饵 唤王饵'),{operation:'fishing.preview',input:{kind:'settings',settings:{baitOrder:['realm','plain','king']}}});
  assert.deepEqual(parseFishingCommand('/垂钓 开钓 2 6 fr_owned 聚灵饵 72'),{operation:'fishing.preview',input:{kind:'start',waterLevel:2,hours:6,rodId:'fr_owned',baitType:'realm',baitCount:72}});
});

for(const command of ['/垂钓 设置 饵序 素灵饵 素灵饵','/垂钓 设置 饵序 未知饵','/垂钓 设置 窝料 未知散 自动','/垂钓 设置 阶位 10','/垂钓 设置 持续打窝 自动']){
  test(`设置损坏参数不请求后端：${command}`,async t=>{
    const {app,requests}=await gameFixture(t,()=>{throw new Error('invalid settings must not request');});
    delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),command);
    assert.equal(requests.length,0);
  });
}

test('本次自动预算窝料及显式无窝保留零，空偏好交服务端合并校验',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,base({view:'confirmation',title:'开钓预览',confirmationRef:ref,operationId:'automatic-chum-original',expiresAt:'2026-11-04T16:00:00Z'})));
  for(const command of ['/垂钓 开钓 2 6 fr_owned 素灵饵 40 聚鳞散 0','/垂钓 开钓 2 6 fr_owned 素灵饵 40 无窝 0','/垂钓 设置 饵序 清空']){
    delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),command);
  }
  assert.deepEqual(requests[0].body.arguments,{kind:'start',waterLevel:2,hours:6,rodId:'fr_owned',baitType:'plain',baitCount:40,chumType:'basic',chumCount:0,chumTier:0});
  assert.deepEqual(requests[1].body.arguments,{kind:'start',waterLevel:2,hours:6,rodId:'fr_owned',baitType:'plain',baitCount:40,chumType:'none',chumCount:0,chumTier:0});
  assert.deepEqual(requests[2].body.arguments,{kind:'settings',settings:{baitOrder:[]}});
});

test('捕灵网仅预览默认或指定水域，原引用确认不重查新配置',async t=>{
  const sections=[{title:'捕灵网',id:'',suffix:'',lines:['可用：2张','本次水域：筑基水域','每次耗1张，直接获得两小时渔获，鱼类控鱼／战斗必成。','不看竿／饵加成，不消耗鱼饵。','仅虚拟消耗2小时窝效，不提前普通收杆时间。'],actions:[{label:'使用预览',command:'/垂钓 用网'}]}];
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.preview')?base({view:'confirmation',title:'捕灵网使用预览',sections:[{title:'捕灵网',id:'',suffix:'',lines:['水域：筑基','消耗：捕灵网1张','鱼类必得，不耗鱼饵','仅消耗两小时窝料时长，不提前普通收竿时间。'],actions:[]}],confirmationRef:ref,operationId:'net-original',expiresAt:'2026-11-04T19:00:00Z'}):r.path.endsWith('fishing.confirm')?base({view:'receipt',title:'捕灵网结算完成'}):base({view:'tools',title:'垂钓 · 使用渔具',sections,footer:[{label:'渔市',command:'/垂钓 渔市 buy net 1'},{label:'返回垂钓',command:'/垂钓'}]})));
  const page=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 渔具',platform:'qq-bot'})),'使用渔具');
  assert.match(page.text,/可用：2张/);
  assert.match(page.text,/每次耗1张，直接获得两小时渔获，鱼类控鱼／战斗必成。/);
  assert.deepEqual(page.commands,['/垂钓 用网','/垂钓 渔市 buy net 1','/垂钓']);
  assert.deepEqual(requests[0].body.arguments,{view:'tools',waterLevel:0});
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 用网',platform:'qq-bot'})),'捕灵网预览');
  assert.deepEqual(requests[1].body.arguments,{kind:'use-net',waterLevel:0,quantity:1});
  const command=preview.commands.find(command=>command.startsWith('/垂钓 确认 '))!;
  delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),command);
  assert.deepEqual(requests[2].body.arguments,{ref});
  assert.deepEqual(parseFishingCommand('/垂钓 用网 2'),{operation:'fishing.preview',input:{kind:'use-net',waterLevel:2,quantity:1}});
});

test('稀有鱼与鱼王推送独立patch即时设置，默认关闭不自动发送通知',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,base({view:'confirmation',title:'消息推送设置预览',sections:[{title:'消息推送',id:'',suffix:'',lines:['稀有鱼：开启（胜败均通知）','鱼王：关闭','确认后即时生效，仅影响推送；当前垂钓配置保持不变。'],actions:[]}],confirmationRef:ref,operationId:'notify-original',expiresAt:'2026-11-04T19:00:00Z'})));
  delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 设置 稀有通知 开',platform:'qq-bot'})),'稀有鱼推送预览');
  delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 设置 鱼王通知 关',platform:'qq-bot'})),'鱼王推送预览');
  assert.deepEqual(requests.map(r=>r.body.arguments),[{kind:'settings',settings:{pushRareFish:true}},{kind:'settings',settings:{pushFishKing:false}}]);
  assert.ok(requests.every(r=>r.path.endsWith('fishing.preview')));
});

test('通知战报完整编号进单次原结果，数字仍是历史页码',async t=>{
  const castId='fc_'+ 'a'.repeat(32);
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,base({view:'cast',title:'垂钓 · 本次战报',sections:[{title:'寒玉鲈',id:castId,suffix:'',lines:['种类：渔获','境界：筑基','重量：1.840 kg','结果：战败，未获得鱼','回合：3'],actions:[]}],footer:[{label:'查看渔获',command:'/垂钓 渔获 1'},{label:'返回垂钓',command:'/垂钓'}]})));
  const view=delivered(await app.runHandler(handler,app.events.privateMessage({text:`/垂钓 战报 ${castId}`,platform:'qq-bot'})),'通知战报详情');
  assert.match(view.text,/战败，未获得鱼/);
  assert.deepEqual(requests[0].body.arguments,{view:'cast',castId});
  assert.deepEqual(parseFishingCommand('/垂钓 战报 2'),{operation:'fishing.query',input:{view:'history',page:2}});
  const malformed=await app.runHandler(handler,app.events.privateMessage({text:`/垂钓 战报 ${castId.slice(0,-1)}`,platform:'qq-bot'}));
  delivered(malformed,'损坏战报编号');
  assert.equal(requests.length,1);
});

test('晶道页不接受直接购饵，钱石购买与礼包入口不受影响',async t=>{
  const {app,requests}=await gameFixture(t,()=>{throw new Error('forbidden bait pages must not request');});
  for(const currency of ['灵晶','道晶']){
    delivered(await app.runHandler(handler,app.events.privateMessage({text:`/垂钓 购买 ${currency} bait:plain 1`,platform:'qq-bot'})),`禁售饵·${currency}`);
  }
  assert.equal(requests.length,0);
  assert.deepEqual(parseFishingCommand('/垂钓 购买 灵石 bait:steady 1'),{operation:'fishing.preview',input:{kind:'purchase',sku:'bait:steady',quantity:1,currency:'stone'}});
});

test('当前打窝无等级按原始份数预览，同种加时异种替换仍须原引用确认',async t=>{
  const section=(title:string,lines:string[],actions:{label:string;command:string}[]=[])=>({title,id:'',suffix:'',lines,actions});
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.preview')?base({view:'confirmation',title:'手动打窝预览',sections:[section('当前窝效',['聚鳞散 · 剩余2小时','换用引珍散，旧剩余2小时效果将作废，不能混合。']),section('本次打窝',['消耗：引珍散7份','新增时长：42小时','预计到期：11-06 11:00'])],confirmationRef:ref,operationId:'manual-chum-original',expiresAt:'2026-11-04T19:00:00Z'}):r.path.endsWith('fishing.confirm')?base({view:'receipt',title:'打窝完成'}):base({view:'chum',title:'垂钓 · 当前打窝',sections:[section('',['当前窝效：聚鳞散 · 剩余2小时','所有鱼塘每份固定6小时；窝料不分等级。','同种加时，异种先预览确认替换。']),section('引珍散',['可用：12份','7份为42小时','生效期间鱼90%、杂获10%'],[{label:'打窝预览·7份',command:'/垂钓 打窝 引珍散 7'}])],footer:[{label:'持续策略',command:'/垂钓 设置'},{label:'返回垂钓',command:'/垂钓'}]})));
  const page=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 打窝',platform:'qq-bot'})),'当前打窝');
  assert.match(page.text,/每份固定6小时/);
  assert.deepEqual(requests[0].body.arguments,{view:'chum'});
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 打窝 引珍散 7',platform:'qq-bot'})),'手动打窝预览');
  assert.match(preview.text,/旧剩余2小时效果将作废/);
  assert.match(preview.text,/新增时长：42小时/);
  assert.deepEqual(requests[1].body.arguments,{kind:'use-chum',chumType:'attract',quantity:7});
  const command=preview.commands.find(value=>value.startsWith('/垂钓 确认 '))!;
  delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),command);
  assert.deepEqual(requests[2].body.arguments,{ref});
  assert.deepEqual(parseFishingCommand('/垂钓 购买 coin chum:basic 1'),{operation:'fishing.preview',input:{kind:'purchase',sku:'chum:basic',quantity:1,currency:'coin'}});
  assert.ok('error' in parseFishingCommand('/垂钓 购买 coin chum:basic:4 1')!);
  assert.ok('error' in parseFishingCommand('/垂钓 设置 窝料 聚鳞散 4')!);
});

test('三专材查询与回收走原预览确认，矿石精华不能进入回收入口',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.preview')?base({view:'confirmation',title:'材料回收预览',sections:[{title:'水灵砂',id:'',suffix:'',lines:['回收：10份 / 可用28份','单价：5灵鳞钱，不享VIP折扣','获得：50灵鳞钱'],actions:[]}],confirmationRef:ref,operationId:'material-original',expiresAt:'2026-11-04T19:00:00Z'}):r.path.endsWith('fishing.confirm')?base({view:'receipt',title:'材料回收完成'}):base({view:'materials',title:'垂钓 · 专材回收',sections:[{title:'水灵砂',id:'',suffix:'',lines:['可用：28份','系统回收：5钱/份'],actions:[{label:'选择数量',command:'/垂钓 回收材料 水灵砂'}]}]})));
  delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 材料',platform:'qq-bot'})),'专材回收列表');
  delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 回收材料 水灵砂',platform:'qq-bot'})),'专材回收数量');
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 回收材料 水灵砂 10',platform:'qq-bot'})),'专材回收预览');
  assert.match(preview.text,/获得：50灵鳞钱/);
  assert.deepEqual(requests.slice(0,3).map(r=>r.body.arguments),[{view:'materials'},{view:'materials',sku:'material:water_sand'},{kind:'sell-material',sku:'material:water_sand',quantity:10}]);
  const command=preview.commands.find(cmd=>cmd.startsWith('/垂钓 确认 '))!;
  delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),command);
  assert.deepEqual(requests[3].body.arguments,{ref});
  const before=requests.length;
  delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 回收材料 矿石精华 1',platform:'qq-bot'})),'矿石不可回收');
  assert.equal(requests.length,before);
  assert.deepEqual(parseFishingCommand('/垂钓 兑换 灵石 100'),{operation:'fishing.preview',input:{kind:'cashout',currency:'stone',quantity:100}});
});

test('渔市单排五分类合并多币按钮，分类分页及旧币页入口兼容',async t=>{
  const navRows=[['bait','chum','rod','net','material'].map((category,i)=>({label:['饵料','窝料','钓具','渔具','素材'][i],command:`/垂钓 渔市 ${category} 1`}))];
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,base({view:'shop',title:'渔市 · 窝料',navRows,sections:[{title:'',id:'',suffix:'',lines:['余额：8,640灵鳞钱','灵石200,000 · 灵晶2,000 · 道晶20'],actions:[]},{title:'聚鳞散',id:'',suffix:'',lines:['每份固定6小时，生效期间鱼90%、杂获10%。','灵鳞钱：1000 / 1份 · 本周剩余1 / 1份','灵晶：200 / 1份 · 本周剩余1 / 1份','道晶：5 / 1份 · 不限量'],actions:[{label:'灵鳞钱购买',command:'/垂钓 购买 coin chum:basic 1'},{label:'灵晶购买',command:'/垂钓 购买 crystal chum:basic 1'},{label:'道晶购买',command:'/垂钓 购买 dao chum:basic 1'}]}],nav:{page:1,totalPages:2,total:6,command:'/垂钓 渔市 chum {page}'},footer:[{label:'礼包',command:'/垂钓 礼包'},{label:'返回垂钓',command:'/垂钓'}]})));
  const page=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/渔市 窝料',platform:'qq-bot'})),'渔市单排五分类');
  assert.deepEqual(requests[0].body.arguments,{view:'shop',shopCategory:'chum',page:1});
  assert.match(page.text,/每份固定6小时/);
  for(const category of ['bait','chum','rod','net','material'])assert.ok(page.commands.includes(`/垂钓 渔市 ${category} 1`));
  for(const currency of ['coin','crystal','dao'])assert.ok(page.commands.includes(`/垂钓 购买 ${currency} chum:basic 1`));
  assert.ok(page.commands.includes('/垂钓 渔市 chum 2'));
  assert.ok(!page.commands.some(command=>/^\/垂钓 渔市 (coin|stone|crystal|dao|all)( |$)/.test(command)));
  assert.deepEqual(parseFishingCommand('/渔市 素材 2'),{operation:'fishing.query',input:{view:'shop',shopCategory:'material',page:2}});
  assert.deepEqual(parseFishingCommand('/渔市 灵石 素材 2'),{operation:'fishing.query',input:{view:'shop',currency:'stone',shopCategory:'material',page:2}});
  assert.deepEqual(parseFishingCommand('/渔市 灵晶 2'),{operation:'fishing.query',input:{view:'shop',currency:'crystal',page:2}});
});

test('渔市买卖切换到本人鱼种详情，区间kg精确转克并复用原确认',async t=>{
  const catchId='ff_'+'b'.repeat(32);
  const speciesId='fishing_r2_b';
  const section=(title:string,lines:string[],actions:{label:string;command:string}[]=[])=>({title,id:'',suffix:'',lines,actions});
  const {app,requests}=await gameFixture(t,r=>{
    const input=r.body.arguments as Record<string,unknown>;
    if(r.path.endsWith('fishing.preview'))return businessEnvelope(r.bid,base({view:'confirmation',title:'重量区间出售预览',confirmationRef:ref,operationId:'range-original',expiresAt:'2026-11-04T23:00:00+08:00',sections:[section('已选渔获',[`${catchId} · 1.840kg`,'重量区间：0.000～2.123kg（含边界）','共1尾，锁定、上架和待入袋不参与。'])],footer:[{label:'确认出售',command:`/垂钓 确认 ${ref}`},{label:'取消',command:'/垂钓 渔市 sell fish 1'}]}));
    if(r.path.endsWith('fishing.confirm'))return businessEnvelope(r.bid,base({view:'receipt',title:'鱼类出售完成',operationId:'range-original',sections:[section('已出售',[`${catchId} · 1.840kg`,'原操作已结算，不会重新选鱼。'])]}));
    if(input.view==='instances')return businessEnvelope(r.bid,base({view:'instances',title:'金须鲤 · 筑基',sections:[section('金须鲤',[`${catchId} · 1.840kg`],[{label:'详情',command:`/垂钓 鱼 ${catchId} 1 1`}])]}));
    if(input.view==='sell-range')return businessEnvelope(r.bid,base({view:'sell-range',title:'鱼类出售 · 重量区间',sections:[section('', ['请输入kg上下限，最多3位小数，包含两端。'],[{label:'填写重量区间',command:'/垂钓 区间售鱼 0.000 1.000'}])]}));
    return businessEnvelope(r.bid,base({view:'shop',title:'渔市 · 出售鱼类',navRows:[[{label:'转为购买',command:'/垂钓 渔市 buy bait 1'}],[{label:'鱼类',command:'/垂钓 渔市 sell fish 1'},{label:'素材',command:'/垂钓 渔市 sell material 1'}]],sections:[section('', ['余额：8,640灵鳞钱','灵石20,000 · 灵晶2,000 · 道晶20']),section('', ['预览本次选中鱼种数量与总价。'],[{label:'按重量区间出售',command:'/垂钓 区间售鱼'}]),section('金须鲤',['境界：筑基','持有2尾'],[{label:'查看详情',command:`/垂钓 鱼种 ${speciesId} 1 1`}])],footer:[{label:'返回垂钓',command:'/垂钓'}]}));
  });
  const sell=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/渔市 出售 鱼类',platform:'qq-bot'})),'出售鱼类');
  assert.deepEqual(requests[0].body.arguments,{view:'shop',shopMode:'sell',shopCategory:'fish',page:1});
  assert.ok(sell.text.indexOf('道晶20')<sell.text.indexOf('转为购买'));
  assert.ok(sell.commands.includes(`/垂钓 鱼种 ${speciesId} 1 1`));
  assert.ok(!sell.commands.some(command=>command.startsWith('/垂钓 售鱼')));
  const bag=delivered(await app.runHandler(handler,app.events.privateMessage({text:`/垂钓 鱼种 ${speciesId} 1 1`,platform:'qq-bot'})),'背包鱼种');
  assert.ok(bag.commands.includes(`/垂钓 鱼 ${catchId} 1 1`));
  delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 区间售鱼',platform:'qq-bot'})),'区间引导');
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 区间售鱼 0.000 2.123 fishing_r2_b',platform:'qq-bot'})),'区间预览');
  assert.deepEqual(requests.at(-1)?.body.arguments,{kind:'sell-fish-range',minWeightG:0,maxWeightG:2123,speciesId});
  assert.match(preview.text,/ff_b{32}/);
  for(let i=0;i<2;i++)delivered(await app.runHandler(handler,app.events.privateMessage({text:`/垂钓 确认 ${ref}`,platform:'qq-bot'})),'原区间确认');
  assert.deepEqual(requests.slice(-2).map(request=>request.body.arguments),[{ref},{ref}]);
  assert.deepEqual(parseFishingCommand('/渔市 购买 素材'),{operation:'fishing.query',input:{view:'shop',shopMode:'buy',shopCategory:'material',page:1}});
  assert.deepEqual(parseFishingCommand('/垂钓 区间售鱼 fishing_r2_b'),{operation:'fishing.query',input:{view:'sell-range',speciesId}});
});

test('重量区间拒绝舍入、科学计数、逆序和不安全克数',()=>{
  assert.equal(fishingWeightGrams('0.000'),0);
  assert.equal(fishingWeightGrams('1.001'),1001);
  assert.equal(fishingWeightGrams('9007199254740.991'),Number.MAX_SAFE_INTEGER);
  for(const value of ['1.0001','1e3','-1','NaN','.5','1.','01.2','9007199254740.992'])assert.equal(fishingWeightGrams(value),undefined,value);
  for(const command of ['/垂钓 区间售鱼 2 1','/垂钓 区间售鱼 1.2345 2','/垂钓 区间售鱼 1e3 2','/垂钓 区间售鱼 -1 2'])assert.ok('error' in parseFishingCommand(command)!,command);
});

for(const mode of ['buy','sell'] as const)test(`渔市余额先于买卖切换与分类：${mode}`,async t=>{
  const label=mode==='buy'?'饵料':'鱼类';
  const toggle=mode==='buy'?'转为出售':'转为购买';
  const command=mode==='buy'?'/垂钓 渔市 sell fish 1':'/垂钓 渔市 buy bait 1';
  const category=mode==='buy'?'bait':'fish';
  const dto=base({view:'shop',title:`渔市 · ${label}`,navRows:[[{label:toggle,command}],[{label,command:`/垂钓 渔市 ${mode} ${category} 1`}]],sections:[{title:'',id:'',suffix:'',lines:['余额：8,640灵鳞钱','灵石20,000 · 灵晶2,000 · 道晶20'],actions:[]},{title:'示例商品',id:'',suffix:'',lines:['原商品事实不变'],actions:[]}],footer:[{label:'返回垂钓',command:'/垂钓'}]});
  const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,dto));
  const result=delivered(await app.runHandler(handler,app.events.privateMessage({text:`/垂钓 渔市 ${mode} ${category} 1`,platform:'qq-bot'})),'渔市精确顺序');
  const positions=[result.text.indexOf(`渔市 · ${label}`),result.text.indexOf('余额：8,640灵鳞钱'),result.text.indexOf('灵石20,000'),result.text.indexOf('灵晶2,000'),result.text.indexOf('道晶20'),result.text.indexOf(toggle),result.text.lastIndexOf(label),result.text.indexOf('示例商品')];
  assert.ok(positions.every((value,index)=>value>=0&&(index===0||value>positions[index-1])),JSON.stringify({mode,positions,text:result.text}));
});

test('放生原预览显示最轻十尾的完整编号逐条重量和总重，确认不再选鱼',async t=>{
  const selected=Array.from({length:10},(_,index)=>({id:`ff_${(index+512).toString(16).padStart(32,'0')}`,weightG:450+100*index}));
  const lines=['铁鳞鲫：⭐⭐ → ⭐⭐⭐','主线修为 +2% → 3%','本次选择10条鱼，合重9.000千克','默认优先选择最轻的鱼，同重按编号排序；下列原编号和重量已固定。',...selected.map(fish=>`${fish.id} · 铁鳞鲫 · ${(fish.weightG/1000).toFixed(3)}千克`)];
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.confirm')?base({view:'receipt',title:'放生升星完成',operationId:'release-original'}):base({view:'confirmation',title:'放生预览',sections:[{title:'本次放生',id:'',suffix:'',lines,actions:[]}],confirmationRef:ref,operationId:'release-original',expiresAt:'2026-11-04T23:00:00+08:00',footer:[{label:'确认放生',command:`/垂钓 确认 ${ref}`},{label:'取消',command:'/垂钓 赐福'}]})));
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓 赐福预览 fishing_r2_a',platform:'qq-bot'})),'放生原预览');
  assert.deepEqual(requests[0].body.arguments,{kind:'blessing-unlock',speciesId:'fishing_r2_a'});
  assert.match(preview.text,/合重9\.000千克/);
  for(const fish of selected){assert.ok(preview.text.includes(fish.id));assert.ok(preview.text.includes(`${(fish.weightG/1000).toFixed(3)}千克`));}
  const command=preview.commands.find(command=>command.startsWith('/垂钓 确认 '))!;
  for(let i=0;i<2;i++)delivered(await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'})),'放生原确认');
  assert.deepEqual(requests.slice(1).map(request=>request.body.arguments),[{ref},{ref}]);
  assert.equal(requests.length,3);
  assert.ok(requests.slice(1).every(request=>request.path.endsWith('/fishing.confirm')));
});

test('首次壁后幽潭四段剧情使用通用气泡，只接原建塘预览且不自动发物',async t=>{
  const story=['洞府深处，一缕幽光从石壁裂隙中透出。你将灵力探入，轻轻一震，积尘簌簌落下，石壁竟缓缓裂开。','','壁后别有天地。寒雾缭绕，一口幽潭静卧其中，水色如墨，深不见底。潭心偶尔掠过一道银鳞，转瞬便沉入幽暗。','','潭边，一具枯骨倚石而坐，身旁斜放着一根蒙尘竹竿，膝前压着一张泛黄舆图。你拂去浮尘，图上“渔市”二字依然清晰。','','潭畔阵纹残缺，淤塞的灵脉仍有微弱灵气流转。若将此处整修，便可辟作洞府中的垂钓水域。'];
  const intro=base({view:'intro',title:'洞府奇遇 · 壁后幽潭',sections:[{title:'',id:'',suffix:'',lines:story,actions:[]},{title:'整修所需',id:'',suffix:'',lines:['需达到炼气九层及以上','灵石：10,000','整修后开放炼气水域，获得青竹灵竿×1。'],actions:[]}],footer:[{label:'整修幽潭',command:'/垂钓 建塘'},{label:'暂且离开',command:'/洞府'}]});
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.preview')?base({view:'confirmation',title:'开辟预览',sections:[{title:'费用',id:'',suffix:'',lines:['灵石：10,000','建塘成功后赠青竹灵竿1根'],actions:[]}],confirmationRef:ref,operationId:'intro-build-original',expiresAt:'2026-11-04T23:00:00+08:00'}):intro));
  const page=delivered(await app.runHandler(handler,app.events.privateMessage({text:'/垂钓',platform:'qq-bot'})),'首次洞府剧情');
  assert.match(page.text,/洞府奇遇 · 壁后幽潭/);
  for(const paragraph of story.filter(Boolean))assert.ok(page.text.includes(paragraph));
  assert.deepEqual(page.commands,['/垂钓 建塘','/洞府']);
  assert.deepEqual(requests[0].body.arguments,{view:'overview'});
  assert.equal(requests.length,1);
  assert.ok(app.run(()=>matchesGameCommand({name:'private.message.create',MessageText:'/洞府'})));
  const preview=delivered(await app.runHandler(handler,app.events.privateMessage({text:page.commands[0],platform:'qq-bot'})),'原建塘预览');
  assert.deepEqual(requests[1].body.arguments,{kind:'build'});
  assert.ok(preview.commands.includes(`/垂钓 确认 ${ref}`));
  assert.ok(requests.every(request=>!request.path.endsWith('fishing.confirm')));
});
