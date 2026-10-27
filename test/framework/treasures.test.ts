import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Router, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import weeklyHandler from '../../src/response/activityPoints/weekly/res';
import claimWeeklyHandler from '../../src/response/activityPoints/claimWeekly/res';
import responseRouter, { matchesGameCommand } from '../../src/router';
import { parseTreasureConfirmation, validTreasureConfirmationRef } from '../../src/api/bot/treasures';
import { parseBackendNormalPaymentSettlement } from '../../src/api/bot/sponsor-payment';
import { buildRechargeSuccessContent } from '../../src/response/recharge/paymentView';
import { businessEnvelope, gameFixture } from './fixture';

const previews = new Map<string, ReturnType<typeof inspectMessage>>();
after(async () => {
  const output = process.env.TREASURE_BOT_PREVIEW_OUTPUT;
  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    const sections = [...previews].map(
      ([title, view]) =>
        `## ${title}\n\n${view.text}\n\n按钮均为手动发送（autoEnter:false）：\n\n${view.commands.map(command => `- \`${command}\``).join('\n')}\n`
    );
    writeFileSync(
      output,
      `# 宝物系统 QQ 消息预览\n\n这是离线 createTestApp 运行真实路由、处理器、Hook 与 Format 后的发送节点导出。平台投递和后端响应由夹具模拟，不代表生产 QQ 实机投递。预览文案按服务端 treasure_confirmation.go 当前模板构造；确认短引用仅为测试值。\n\n${sections.join('\n')}`.trimEnd() + '\n',
      'utf8'
    );
  }
  await shutdownLogger();
});
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const operationId = 'treasure-original-operation';
const stats = { physicalAttack: 0, magicAttack: 0, physicalDefense: 0, magicDefense: 0, hp: 0 };
const overview = {
  experience: 100,
  xianYun: 5,
  levelCap: 10,
  version: 1,
  decompositionValues: [10,20,40,100,220,500].map((bodyXianYun,index)=>({rarity:index+1,bodyXianYun,fragmentXianYun:bodyXianYun/10})),
  records: [],
  fortune: { score: 1, level: 1, maxLevel: 20, nextThreshold: 3, bonus: { critRate: 1, hitRate: 1, dodgeRate: 1, critDamage: 5 } },
  items: [401, 504, 601, 602, 603, 604].map(id => ({
    definition: {
      id,
      name: ({ 401: '采薇竹篮', 504: '神农鼎', 601: '九天息壤', 602: '玉净瓶', 603: '乾坤鼎', 604: '掌天瓶' } as Record<number, string>)[id],
      rarity: Math.floor(id / 100),
      rarityName: id >= 600 ? '神话' : id >= 500 ? '史诗' : '稀有',
      baseAttributes: stats,
      perLevelAttributes: stats,
      basePercentAttributes: stats,
      effectDescription: id === 504 ? '正常原炉成功失败均可，命中返还本炉整份实际消耗药材' : '测试图鉴条目',
      stageValues: ['5%', '10%', '15%', '20%'],
      maxGrade: 24,
      weight: 1
    },
    owned: id === 504,
    grade: id === 504 ? 1 : 0,
    gradeName: id === 504 ? '星尘1' : '',
    level: id === 504 ? 1 : 0,
    fragments: 2,
    duplicates: 1,
    attributes: { ...stats, hp: 600 },
    percentAttributes: { ...stats, hp: 2 },
    currentEffect: '5%',
    nextLevelCost: 100,
    promotion: { duplicates: 1, xianYun: 0, requirements: [] },
    canUpgrade: id === 504,
    canPromote: id === 504
  }))
};
const relics = {
  serverDate: '2026-10-27',
  balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 9 },
  freeAvailable: true,
  spiritTenDiscountAvailable: true,
  totalExplorations: 300,
  milestoneProgress: 0,
  pendingSelections: 1,
  shapeRates: {singleComplete:.12,tenExpectedComplete:1.478500976009402,tenAverageComplete:.1478500976009402},
  pity: [{ rarity: 6, name: '神话', counter: 119, hardPity: 120, nextProbability: 1 }],
  wholeRates: [{ rarity: 6, name: '神话', probability: 0.0098 }],
  rules: ['保底分别计数', '随机碎片1-3'],
  records: []
};
const lease = {
  active: true,
  canPurchase:true,
  startDate: '2026-10-01',
  endDate: '2026-10-30',
  remainingDays: 4,
  claimableDays: 2,
  claimableCrystal: 4000,
  maxDays: 180,
  packageId: 27,
  priceAmount: 3000,
  dailyCrystal: 2000,
  immediateDaoCrystal: 300
};
const preview = (kind = 'explore', input: Record<string, unknown> = {}) => {
  const count = Number(input.count ?? 10);
  const amount =
    input.source === 'free' ? 0 : input.source === 'treasure_map' ? count : input.source === 'spirit_crystal' ? (count === 10 ? 10800 : 1200) : 108;
  const unit = input.source === 'free' ? '免费次数' : input.source === 'treasure_map' ? '张藏宝图' : input.source === 'spirit_crystal' ? '灵晶' : '道晶';
  const summaries: Record<string, string[]> = {
    explore: [`上古遗珍：探索${count}次；消耗${amount}${unit}。`, '完整结果推进20／50／120门槛，高档覆盖；每300探索另获神话自选。'],
    decompose: ['消耗「神农鼎」重复本体1件；获得220仙蕴。', '分解不能撤销，主件与气运不降低。'],
    synthesize: ['消耗「掌天瓶」碎片10片，合成1本体；已拥有时计为重复本体。'],
    upgrade: ['「神农鼎」等级1 → 2；消耗宝物经验100。', '升级提升战斗数值，生活特效保持当前品级。'],
    promote: ['「神农鼎」星尘1 → 星尘2；消耗重复本体1、仙蕴0。'],
    'select-mythic': ['消耗累计探索神话自选次数1次，领取「掌天瓶」1本体；允许重复。', '自选不增加探索次数，不重置保底。'],
    claimLease: ['领取已到期收益2日，共4000灵晶。']
  };
  return {
    kind,
    summary: [...summaries[kind], '确认凭据24小时有效；状态变化时请重新预览。网络结果不明时请重试原确认。'],
    confirmationRef,
    expiresAt: '2026-10-28T10:00:00+08:00',
    operationId
  };
};
const receipt = (kind = 'explore', input:Record<string,unknown> = {}) => ({
  kind,
  operationId,
  result: {
    operationId,
    rulesVersion:'treasure-v3-complete-20261027',
    message: '原操作已结算',
    count: Number(input.count ?? 10),
    source: input.source ?? 'dao_crystal',
    paidAmount: input.source === 'free' ? 0 : input.source === 'treasure_map' ? Number(input.count) : input.source === 'spirit_crystal' ? 10800 : 108,
    experienceGranted: Number(input.count ?? 10)*100,
    rewards: Array.from({length:Number(input.count ?? 10)},(_,index)=>index===0 ? { treasureId: 603, name: '乾坤鼎', rarity: 6, kind: 'body', quantity: 1, newlyOwned: true } : { treasureId:101,name:'锈剑残片',rarity:1,kind:'fragment',quantity:1,newlyOwned:false }),
    days: 2,
    spiritCrystal: 4000
  }
});
function facts(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const buttons: Array<Record<string, unknown>> = [];
  const walk = (nodes: unknown[]) => {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const item = n as Record<string, unknown>;
      if (item.type === 'MD.button') buttons.push(item);
      if (Array.isArray(item.value)) walk(item.value);
    }
  };
  walk(message.nodes);
  for (const button of buttons) {
    assert.equal((button.options as Record<string, unknown> | undefined)?.autoEnter, false, JSON.stringify(button));
  }
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  assert.ok(!JSON.stringify(message.nodes).includes('show='));
  return view;
}
async function mount(app: Awaited<ReturnType<typeof gameFixture>>['app']) {
  const router = Router.create({ events: ['message.create', 'private.message.create'] });
  router.use(['宝物', '上古遗珍', '灵脉租契', '确认宝物'], async () => ({ default: handler }));
  await app.mount({ responseRouter: router.define });
}

test('项目正式路由可到达宝物/上古遗珍/租契和确认入口', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, r.path.endsWith('/treasures.overview') ? overview : r.path.endsWith('/ancient-relics.overview') ? relics : r.path.endsWith('/spirit-vein.overview') ? lease : receipt()));
  await app.mount({ responseRouter });
  for (const text of ['/宝物', '/上古遗珍', '/灵脉租契', `/确认宝物 ${confirmationRef}`]) {
    assert.ok(matchesGameCommand({ name: 'message.create', MessageText: text }));
    const view = facts(await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' })));
    assert.ok(view.text.includes(text.includes('确认') ? '原操作已结算' : text.slice(1)));
  }
  assert.equal(requests.length, 4);
});

for (const privateChat of [false, true]) {
  test(`真实宝物处理器展示气运、持有、图鉴和培养 private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, overview));
    for (const command of ['/宝物', '/宝物 图鉴', '/宝物 气运', '/宝物 详情 504']) {
      const event = privateChat
        ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: command, platform: 'qq-bot' });
      const view = facts(await app.runHandler(handler, event));
      if (privateChat) previews.set(command, view);
      assert.match(view.text, command.includes('详情') ? /神农鼎/ : /鸿蒙气运 1\/20级/);
      assert.ok(!view.text.includes('undefined'));
      if (command.includes('详情')) for (const button of ['/宝物 升级 504', '/宝物 升品 504']) assert.ok(view.commands.includes(button));
    }
    assert.equal(requests.length, 4);
    assert.ok(requests.every(r => r.path.endsWith('/treasures.overview')));
  });
  test(`探索主页和概率使用服务端信息 private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, relics));
    for (const command of ['/上古遗珍', '/上古遗珍 概率', '/上古遗珍 记录']) {
      const event = privateChat
        ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: command, platform: 'qq-bot' });
      const view = facts(await app.runHandler(handler, event));
      if (privateChat) previews.set(command, view);
      if (command.endsWith('概率')) {
        assert.match(view.text, /119\/120/);
        assert.match(view.text, /0.98%/);
      } else if (command.endsWith('记录')) assert.match(view.text, /暂无探索记录/);
      else {
        assert.match(view.text, /邮件、每日礼包与周活跃/);
        assert.ok(view.commands.includes('/上古遗珍 免费探索'));
        assert.ok(view.commands.includes('/上古遗珍 十连探索 道晶'));
        assert.ok(!view.commands.includes('/上古遗珍 探索 道晶'));
      }
    }
    assert.equal(requests.length, 3);
  });
}

for (const [command, kind, input] of [
  ['/上古遗珍 免费探索', 'explore', { source: 'free', count: 1 }],
  ['/上古遗珍 十连探索 道晶', 'explore', { source: 'dao_crystal', count: 10 }],
  ['/上古遗珍 探索 藏宝图', 'explore', { source: 'treasure_map', count: 1 }],
  ['/上古遗珍 十连探索 灵晶', 'explore', { source: 'spirit_crystal', count: 10 }],
  ['/宝物 升级 504', 'upgrade', { treasureId: 504 }],
  ['/宝物 升品 504', 'promote', { treasureId: 504 }],
  ['/宝物 分解 本体 504 1', 'decompose', { items: [{treasureId:504,kind:'body',quantity:1}] }],
  ['/宝物 分解 碎片 604 2', 'decompose', { items: [{treasureId:604,kind:'fragment',quantity:2}] }],
  ['/宝物 一键分解', 'decompose', { allMaxed:true }],
  ['/上古遗珍 自选 604', 'select-mythic', { treasureId: 604 }],
  ['/灵脉租契 领取', 'claimLease', {}]
] as const) {
  test(`真实按钮预览到确认与重复回执 ${command}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, r.path.endsWith('/treasures.preview') ? preview(kind, input) : receipt(kind,input)));
    await mount(app);
    const initial = facts(await app.dispatch(app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    const confirm = initial.commands.find(c => c.startsWith('/确认宝物 '));
    assert.equal(confirm, `/确认宝物 ${confirmationRef}`);
    previews.set(`${command}（确认预览）`, initial);
    assert.match(initial.text, /24小时有效/);
    assert.match(initial.text, /有效至/);
    assert.ok(initial.commands.some(c => ['/宝物', '/上古遗珍', '/灵脉租契'].includes(c)));
    assert.deepEqual(requests[0].body.arguments, { kind, ...input });
    for (let i = 0; i < 2; i++) {
      const done = facts(await app.dispatch(app.events.privateMessage({ text: confirm!, platform: 'qq-bot' })));
      if (command === '/上古遗珍 十连探索 道晶') previews.set('十连探索成功回执', done);
      assert.match(done.text, /原操作已结算/);
      if (kind === 'explore') assert.match(done.text, /乾坤鼎/);
    }
    assert.equal(requests.length, 3);
    for (const request of requests.slice(1)) {
      assert.equal(request.path, '/api/v2/robot/business/treasures.confirm');
      assert.deepEqual(request.body.arguments, { confirmationRef });
      assert.ok(request.idempotencyKey);
    }
  });
}
test('未知结算结果用同一服务端短引用核对重试', async t => {
  let fail = true;
  const { app, requests } = await gameFixture(t, r => {
    if (fail) throw new Error('simulate committed but lost response');
    return businessEnvelope(r.bid, receipt());
  });
  await mount(app);
  const unknown = facts(await app.dispatch(app.events.groupMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' })));
  assert.match(unknown.text, /操作结果尚未获完整确认/);
  previews.set('未知结果恢复', unknown);
  const retry = unknown.commands.find(c => c.startsWith('/确认宝物 '));
  assert.equal(retry, `/确认宝物 ${confirmationRef}`);
  fail = false;
  assert.match(facts(await app.dispatch(app.events.groupMessage({ text: retry!, platform: 'qq-bot' }))).text, /原操作已结算/);
  assert.deepEqual(
    requests.map(r => r.body.arguments),
    [{ confirmationRef }, { confirmationRef }]
  );
});
test('灵脉租契复用充值订单入口，过期仍能领已产生收益', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { ...lease, active: false, remainingDays: 0 }));
  const view = facts(await app.runHandler(handler, app.events.privateMessage({ text: '/灵脉租契', platform: 'qq-bot' })));
  previews.set('灵脉租契（已过期但仍有已产生收益）', view);
  assert.match(view.text, /当前未生效/);
  assert.match(view.text, /4000灵晶/);
  assert.ok(view.commands.includes('/灵脉租契 领取'));
  assert.ok(view.commands.includes('/充值购买 27'));
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/spirit-vein.overview'));
});
for (const command of [
  '/宝物 升品 604 extra',
  '/宝物 升级 9007199254740993',
  '/上古遗珍 十连探索',
  '/上古遗珍 自选 504',
  `/确认宝物 ${confirmationRef.slice(0, -1)}`,
  `/确认宝物 ${confirmationRef} extra`,
  `/确认宝物 ${'x'.repeat(100)}`,
  `/确认宝物 ${confirmationRef.replace('_b_', '_a_')}`
]) {
  test(`无效或截断指令不提交 ${command}`, async t => {
    const { app, requests } = await gameFixture(t, () => {
      throw new Error('must not call');
    });
    const view = facts(await app.runHandler(handler, app.events.groupMessage({ text: command, platform: 'qq-bot' })));
    assert.match(view.text, /参数错误|凭据不完整/);
    assert.equal(requests.length, 0);
  });
}
test('最大合法UID/时间戳短引用完整指令低于80字符，超长不截断', () => {
  const maxRef = `r1_3w5e11264sgsf_b_3w5e11264sgsf_${'f'.repeat(24)}`;
  assert.ok(validTreasureConfirmationRef(maxRef));
  assert.ok([...`/确认宝物 ${maxRef}`].length <= 80);
  assert.ok(Buffer.byteLength(`/确认宝物 ${maxRef}`, 'utf8') > [...`/确认宝物 ${maxRef}`].length);
  assert.ok(!validTreasureConfirmationRef(`${maxRef}x`));
  assert.throws(() => parseTreasureConfirmation({ ...preview(), confirmationRef: `r1_${'x'.repeat(60)}_b_1_${'f'.repeat(24)}` }));
});
for (const error of ['确认引用不属于当前玩家', '预览已过期，请重新预览', '宝物状态已变化，请重新预览']) {
  test(`越权/过期/状态变化只展示业务拒绝 ${error}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'TREASURE_STATE_CHANGED', message: error }), 409);
    const view = facts(await app.runHandler(handler, app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' })));
    assert.match(view.text, new RegExp(error));
    assert.ok(!view.commands.some(c => c.startsWith('/确认宝物 ')));
    assert.equal(requests.length, 1);
  });
}
test('支付成功回执展示本订单租契快照，旧订单保持兼容', () => {
  const data = {
    orderNo: 'N-test',
    packageRewards: { spiritMilk: 300, spiritStone: 0, spiritCrystal: 0, items: [], equipments: [], skills: [] },
    bonusSpiritMilk: 0,
    vipUpgrade: null,
    newcomerDayGranted: null,
    monthCardExtended: false,
    seclusionPassActivated: false
  };
  assert.equal(parseBackendNormalPaymentSettlement(data).spiritVein, undefined);
  const parsed = parseBackendNormalPaymentSettlement({ ...data, spiritVein: { days: 30, dailyCrystal: 2000, startDate: '2026-10-27', endDate: '2026-11-25' } });
  const view = inspectMessage([{ type: 'Markdown', value: buildRechargeSuccessContent(parsed).value.value }]);
  assert.match(view.text, /道晶 \+300/);
  assert.match(view.text, /延长 30收益日，每日 2000灵晶/);
  assert.ok(view.commands.includes('/灵脉租契'));
  assert.throws(() => parseBackendNormalPaymentSettlement({ ...data, spiritVein: { days: 30, dailyCrystal: '2000', startDate: 'x', endDate: 'x' } }));
});

test('每日礼包入口展示服务端配额，已单购的全包没有购买按钮', async t => {
  const data={serverDate:'2026-10-27',unresolvedOrderNo:'N-pending',quotas:[{sku:'small',limit:3,successful:1,pending:0,remaining:2}],products:[
    {sku:'small',name:'1元礼包',packageId:31,priceAmount:100,limit:3,remaining:2,available:true,unavailableReason:'',label:'超值300%',rewardParts:[{kind:'fragment',name:'随机稀有碎片',quantity:2,independentRolls:1,perRoll:2}]},
    {sku:'all',name:'全包',packageId:34,priceAmount:3000,limit:1,remaining:0,available:false,unavailableReason:'当日已有单购，不支持补差全包',label:'单买33元，全包30元',rewardParts:[]}
  ]};
  for(const product of data.products) Object.assign(product,{promotionTexts:['不参加首充返利','不参加新人返利','不参加限时累计返利','不参加周返利','实付计充值及VIP']});
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,data));
  const view=facts(await app.runHandler(handler,app.events.privateMessage({text:'/上古遗珍 礼包',platform:'qq-bot'})));
  assert.ok(view.commands.includes('/充值购买 31'));assert.ok(!view.commands.includes('/充值购买 34'));assert.match(view.text,/不支持补差全包/);assert.match(view.text,/N-pending/);assert.equal(requests[0].path,'/api/v2/robot/business/treasures.daily-packs');previews.set('每日礼包与共享配额',view);
});
test('已领原周活宝箱能补图，多行原奖励保留且图与按钮各只展示一次',async t=>{
  const weekly={rewardType:'weekly',cyclePeriod:'2026-10-26',currentPoints:10,taskRewardsCanClaim:false,tasks:[],rewards:['灵石','灵肥'].map((name,index)=>({requiredPoints:10,name,category:'item',currencyCode:'',itemId:index+1,quantity:index?1:10,claimed:true,canClaim:false,treasureMapQuantity:2,treasureMapGranted:false,treasureMapClaimable:true,treasureMapBackfillOnly:true}))};
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('activity-points.weekly')?weekly:{userName:'道友',requiredPoints:10,issued:[{type:'item',name:'藏宝图',amount:2}],treasureMapBackfillOnly:true}));
  const view=facts(await app.runHandler(weeklyHandler,app.events.privateMessage({text:'/周常活跃',platform:'qq-bot'})));
  assert.match(view.text,/灵石 x10、灵肥 x1/);assert.equal(view.text.match(/额外藏宝图 ×2/g)?.length,1);assert.equal(view.commands.filter(c=>c==='/领取周常活跃奖励 10').length,1);
  const done=facts(await app.runHandler(claimWeeklyHandler,app.events.privateMessage({text:'/领取周常活跃奖励 10',platform:'qq-bot'})));
  assert.match(done.text,/补领藏宝图成功，原宝箱奖励不重复发放/);assert.match(done.text,/藏宝图×2/);assert.doesNotMatch(done.text,/灵石×10/);assert.equal(requests[1].path,'/api/v2/robot/business/activity-points.claim-weekly');previews.set('周活藏宝图补领',view);
});
test('200回执串单时确认结果继续保留原引用，旧手动合成按钮不再提交',async t=>{
 const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,{...receipt(),operationId:'other-operation'}));
 const view=facts(await app.runHandler(handler,app.events.privateMessage({text:`/确认宝物 ${confirmationRef}`,platform:'qq-bot'})));
 assert.match(view.text,/结果尚未获完整确认/);assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
 const auto=facts(await app.runHandler(handler,app.events.privateMessage({text:'/宝物 合成 604',platform:'qq-bot'})));assert.match(auto.text,/满10枚自动合成/);assert.equal(requests.length,1);
});
test('每日礼包成功回执不把固定货币与特殊赠片重复展示',()=>{
 const parsed=parseBackendNormalPaymentSettlement({orderNo:'N-pack',packageRewards:{spiritMilk:10,spiritStone:0,spiritCrystal:1500,items:[],equipments:[],skills:[]},bonusSpiritMilk:0,vipUpgrade:null,newcomerDayGranted:null,monthCardExtended:false,seclusionPassActivated:false,dailyTreasurePack:{sku:'small',businessDate:'2026-10-27',treasureMaps:0,fragments:[{treasureId:401,name:'采薇竹篮',rarity:4,quantity:2}]}});
 const view=inspectMessage([{type:'Markdown',value:buildRechargeSuccessContent(parsed).value.value}]);assert.equal(view.text.match(/道晶 \+10/g)?.length,1);assert.equal(view.text.match(/灵晶 \+1500/g)?.length,1);assert.match(view.text,/采薇竹篮碎片 ×2/);
});
test('碎片9+2自动合成1余1并激活，回执不冒充直接完整出货',async t=>{
 const result=receipt('explore',{source:'free',count:1});result.result.rewards=[{treasureId:603,name:'乾坤鼎',rarity:6,kind:'fragment',quantity:2,newlyOwned:true,autoSynthesized:1,fragmentsRemaining:1} as typeof result.result.rewards[number]];
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,result));const view=facts(await app.runHandler(handler,app.events.privateMessage({text:`/确认宝物 ${confirmationRef}`,platform:'qq-bot'})));
 assert.match(view.text,/乾坤鼎 · 碎片 ×2 · 已激活/);assert.match(view.text,/自动合成1本体，余片1/);assert.doesNotMatch(view.text,/直接完整本体/);previews.set('碎片自动合成与首次激活',view);
});
test('租契未来额度含预留不足30日时隐藏新购买，但已产生收益仍可领',async t=>{
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,{...lease,canPurchase:false,remainingDays:170,futureDays:169,reservedDays:0,purchaseUnavailableReason:'未来收益日剩余额度不足30日'}));
 const view=facts(await app.runHandler(handler,app.events.privateMessage({text:'/灵脉租契',platform:'qq-bot'})));assert.match(view.text,/未来收益日剩余额度不足30日/);assert.ok(!view.commands.includes('/充值购买 27'));assert.ok(view.commands.includes('/灵脉租契 领取'));
});
for (const mode of ['extra-reward','wrong-xp','unknown-version'] as const) test(`v3异常回执${mode}保留原引用`,async t=>{
 const data=receipt('explore',{source:'free',count:1});if(mode==='extra-reward')data.result.rewards.push({...data.result.rewards[0]});if(mode==='wrong-xp')data.result.experienceGranted=0;if(mode==='unknown-version')data.result.rulesVersion='treasure-future-unknown';
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,data));const view=facts(await app.runHandler(handler,app.events.privateMessage({text:`/确认宝物 ${confirmationRef}`,platform:'qq-bot'})));
 assert.match(view.text,/结果尚未获完整确认/);assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
});
for(const rulesVersion of ['treasure-v1-20261027','treasure-v2-20261027-first-drop'])test(`旧版${rulesVersion}藏宝图0经验多奖励回执继续恢复`,async t=>{
 const data=receipt('explore',{source:'treasure_map',count:1});data.result.rulesVersion=rulesVersion;data.result.experienceGranted=0;data.result.rewards.push({...data.result.rewards[0],treasureId:401,name:'采薇竹篮',rarity:4});
 const {app}=await gameFixture(t,r=>businessEnvelope(r.bid,data));const view=facts(await app.runHandler(handler,app.events.privateMessage({text:`/确认宝物 ${confirmationRef}`,platform:'qq-bot'})));
 assert.match(view.text,/原操作已结算/);assert.match(view.text,/宝物经验 \+0/);assert.ok(!view.commands.some(command=>command.startsWith('/确认宝物 ')));
});
