import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import catalog from '../../src/response/recharge/info/res';
import first from '../../src/response/recharge/firstRechargeInfo/res';
import newcomer from '../../src/response/recharge/newcomerInfo/res';
import weekly from '../../src/response/recharge/weeklyRebateInfo/res';
import claimFirst from '../../src/response/recharge/firstRechargeClaim/res';
import claimNewcomer from '../../src/response/recharge/newcomerClaim/res';
import claimWeekly from '../../src/response/recharge/weeklyRebateClaim/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const names = { items: {}, equipments: {}, skills: {} };
const reward = { spiritStone: 10, spiritCrystal: 0, spiritMilk: 0, items: [], rewardText: '灵石 +10' };
const issued = [{ type: 'currency', name: '灵石', amount: 10 }];
const packages = ['normal', 'month_card', 'seclusion_pass', 'first_charge'].map((packageType, index) => ({
  id: index + 1, name: ['灵石礼包', '月卡', '金手指', '优惠礼包'][index], packageType,
  priceAmount: 650, priceYuan: 6.5, grantSpiritStone: 10, grantSpiritCrystal: 0, grantSpiritMilk: 0, boughtCount: 0,
  grantItemsJson: '[]', grantEquipmentsJson: '[]', grantSkillsJson: '[]', description: '实际套餐描述',
  resolvedLimitPeriod: 'lifetime', doubleAvailable: index === 0, limitText: ' · 限购1次', doubleText: index === 0 ? ' · 首充双倍' : '', rewardParts: ['灵石 +10']
}));
const catalogData = { catalog: { packages, rewardNames: names, sponsor: { totalYuan: 0, thresholdYuan: 648, remainingYuan: 648, hasThemePermission: false }, activityPackages: [], benefitView: { sponsorIntro: '后端兼容权益说明', monthCardPrivilegeLines: ['月卡实际权益'], seclusionPassPrivilegeLines: ['金手指实际权益'], seclusionPassFallbackLine: '金手指暂未开放' } }, showNewcomerRebate: true, showWeeklyRebate: false };
function quotes(nodes: NonNullable<Parameters<typeof inspectMessage>[0]>) {
  return nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []).map(quote => {
    assert.equal(quote.type, 'MD.blockquote');
    if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw Error('Expected structured quote');
    return inspectMessage([{ type: 'Markdown', value: quote.value }]);
  });
}
for (const privateChat of [false, true]) {
  test(`充值套餐的价格、权益、奖励与购买按钮同块（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, catalogData));
    for (const [i, category] of ['道晶套餐', '月卡', '金手指', '优惠礼包'].entries()) {
      const event = privateChat ? app.events.privateMessage({ text: `/充值 ${category}`, platform: 'qq-bot' }) : app.events.groupMessage({ text: `/充值 ${category}`, platform: 'qq-bot' });
      const result = await app.runHandler(catalog, event);
      assert.equal(requests.length, i + 1); assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const cards = quotes(message.nodes); assert.equal(cards.length, 1);
      const pkg = packages[i]; const card = cards[0];
      assert.match(card.text, /¥6.5/); assert.ok(card.text.includes(pkg.name));
      assert.ok(card.text.includes(pkg.description)); assert.ok(card.text.includes('灵石 +10'));
      assert.ok(card.text.includes('限购1次')); assert.deepEqual(card.commands, [`/充值购买 ${pkg.id}`]);
      if (i === 0) assert.match(card.text, /首充双倍/);
      if (i === 1) assert.match(card.text, /月卡实际权益/);
      if (i === 2) assert.match(card.text, /金手指实际权益/);
      const view = inspectMessage(message.nodes); assert.ok(view.commands.includes('/新人返利')); assert.ok(!view.commands.includes('/周周返利'));
      assert.ok(view.commands.includes('/我的权益'));
    }
  });
}
test('首充各档位保持资格，只有可领取档位显示动作',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,{names,tiers:['claimable','claimed','locked'].map((status,i)=>({tierAmountYuan:[6,18,30][i],status,rewards:[],rewardText:`灵石 +${10+i}`}))}));
  const result=await app.runHandler(first,app.events.privateMessage({text:'/礼包奖励',platform:'qq-bot'}));
  assert.equal(requests.length,1);assert.equal(result.messages.length,1);const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
  const cards=quotes(m.nodes);assert.equal(cards.length,3);assert.deepEqual(cards.map(c=>c.commands),[['/领取礼包奖励 6'],[],[]]);
  for(const [i,status]of ['可领取','已领取','未解锁'].entries()){assert.ok(cards[i].text.includes(status));assert.ok(cards[i].text.includes(`灵石 +${10+i}`));}
  assert.doesNotMatch(inspectMessage(m.nodes).text,/首次充值30元|【奖励档位】/);assert.ok(inspectMessage(m.nodes).commands.includes('/充值'));
});
test('新人返利保留分币精度，领取动作跟随服务端资格',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,{contentDays:14,isInPeriod:true,daysSinceRegistration:0,currentDay:1,todayRechargedAmount:1250,thresholdAmount:3000,claimedDays:[],todayRewardClaimed:false,maxClaimableDay:1,itemNames:{},rewards:[{...reward,day:1,claimed:false,canClaim:true,statusTag:'可领取'}]}));
  const result=await app.runHandler(newcomer,app.events.privateMessage({text:'/新人返利',platform:'qq-bot'}));
  assert.equal(requests.length,1);assert.equal(result.messages.length,1);const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
  assert.match(inspectMessage(m.nodes).text,/12.50元\/30元/);assert.deepEqual(quotes(m.nodes)[0].commands,['/新人返利领取 1']);
});
test('周返利保留实际周次、金额与奖品',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,{eligible:true,minAccountDays:14,dailyThresholdAmount:3000,daysSinceRegistration:15,todayDayOfWeek:1,todayLabel:'周一',weekStart:'2026-10-19',todayRechargedAmount:1250,todayRechargedYuan:12.5,todayRechargeText:'12.50',thresholdYuan:30,claimedDays:[],canClaimToday:true,canClaimBonus:false,rewards:[{...reward,day:1,label:'周一',statusTag:'可领取',canClaim:true}]}));
  const result=await app.runHandler(weekly,app.events.privateMessage({text:'/周周返利',platform:'qq-bot'}));
  assert.equal(requests.length,1);assert.equal(result.messages.length,1);const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
  assert.match(inspectMessage(m.nodes).text,/12.50元\/30元/);const card=quotes(m.nodes)[0];assert.match(card.text,/周一 · 可领取/);assert.deepEqual(card.commands,['/周周返利领取 1']);
});
for (const [handler, command, data, label, back] of [
  [claimFirst, '/领取礼包奖励 6', {tierYuan:6,issued}, '6元档', '/充值'],
  [claimNewcomer, '/新人返利领取 1', {dayIndex:1,reward:{spiritStone:10,spiritCrystal:0,spiritMilk:0,itemIds:'[]'},itemNames:{},rewardText:'灵石 +10'}, '第1天', '/新人返利'],
  [claimWeekly, '/周周返利领取 1', {dayIndex:1,issued}, '周一', '/周周返利']
] as const) {
  test(`${command}的到账结果和返回入口风格一致`,async t=>{
    const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,data));
    const result=await app.runHandler(handler,app.events.privateMessage({text:command,platform:'qq-bot'}));
    assert.equal(requests.length,1);assert.equal(result.messages.length,1);const m=result.messages[0];assert.equal(result.actions[m.actionIndex].results?.[0].code,ResultCode.Ok);
    const cards=quotes(m.nodes);assert.equal(cards.length,1);assert.ok(cards[0].text.includes(`${label} · 已领取`));assert.ok(cards[0].text.includes('灵石'));assert.ok(cards[0].text.includes('10'));
    assert.ok(inspectMessage(m.nodes).commands.includes(back));
  });
}

test('充值首页精简双卡说明，价格实时合计，查看与购买直达对应商品', async t => {
  const data = structuredClone(catalogData);
  data.catalog.packages = data.catalog.packages.filter(p => p.packageType !== 'first_charge');
  data.catalog.packages[1].priceYuan = 30;
  data.catalog.packages[1].priceAmount = 3000;
  data.catalog.packages[2].priceYuan = 9.9;
  data.catalog.packages[2].priceAmount = 990;
  data.showWeeklyRebate = true;
  const { app, requests } = await gameFixture(t, r => r.path.endsWith('/recharge/first') ? { names, tiers: [] } : businessEnvelope(r.bid, data));
  const result = await app.runHandler(catalog, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const cards = quotes(message.nodes);
  assert.equal(cards.length, 4);
  assert.match(cards[0].text, /双卡合计 ¥39.90/);
  assert.match(cards[0].text, /双卡权益可叠加/);
  assert.deepEqual(cards[0].commands, []);
  assert.deepEqual(cards[1].commands, ['/充值 道晶套餐']);
  assert.match(cards[2].text, /月卡 · ¥30/);
  assert.deepEqual(cards[2].commands, ['/充值 月卡', '/充值购买 2']);
  assert.match(cards[3].text, /金手指 · ¥9.9/);
  assert.deepEqual(cards[3].commands, ['/充值 金手指', '/充值购买 3']);
  const view = inspectMessage(message.nodes);
  assert.deepEqual(view.commands.filter(command => !['/我', '/属性面板', '/查看主线', '/我的活动', '/商店'].includes(command)), ['/我的权益', '/充值 道晶套餐', '/充值 月卡', '/充值购买 2', '/充值 金手指', '/充值购买 3', '/灵脉租契', '/新人返利', '/周周返利']);
  assert.doesNotMatch(view.text, /低保|叠乘|分别购买|独立计时|点击购买|查看套餐|查看详情/);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].path, '/api/v2/robot/business/recharge.catalog');
  assert.equal(requests[1].path, '/api/v1/players/1/recharge/first');
});

test('双卡价格跟随配置，缺卡时不展示合计或缺失商品购买按钮', async t => {
  const data = structuredClone(catalogData);
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, data));
  let result = await app.runHandler(catalog, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(inspectMessage(result.messages[0].nodes).text, /双卡合计 ¥13.00/);
  data.catalog.packages = data.catalog.packages.filter(p => p.packageType !== 'month_card');
  result = await app.runHandler(catalog, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.doesNotMatch(view.text, /双卡合计/);
  assert.match(view.text, /月卡 · 暂未开放/);
  assert.ok(!view.commands.includes('/充值购买 2'));
  assert.ok(view.commands.includes('/充值购买 3'));
});

for (const [handler, command, data] of [
  [claimFirst, '/领取礼包奖励 1', { tierYuan: 1, issued: [{ type: 'equipment', name: '铁剑', amount: 1 }, { type: 'item', name: '精力丹', amount: 5 }] }],
  [claimWeekly, '/周周返利领取 1', { dayIndex: 1, issued: [{ type: 'item', name: '精力丹', amount: 5 }, { type: 'item', name: '元力丹', amount: 3 }] }]
] as const) {
  test(`${command}的领取回执保留完整物品名称，旧空名称回执不变成裸数量`, async t => {
    let missing = false;
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, missing ? { ...data, issued: data.issued.map(item => ({ ...item, name: ' ' })) } : data));
    for (const blank of [false, true]) {
      missing = blank;
      const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(result.messages[0].nodes);
      assert.match(view.text, /已领取/);
      if (blank) {
        assert.match(view.text, /名称暂缺/);
        assert.doesNotMatch(view.text, /获得：x|、x/);
      } else {
        for (const item of data.issued) assert.ok(view.text.includes(`${item.name}x${item.amount}`));
      }
      assert.equal(requests.length, blank ? 2 : 1);
    }
  });
}


test('充值首页直接展示首充赠礼，奖励、条件、领取动作同块，付费礼包保持独立', async t => {
  const tiers = ['claimable', 'claimed', 'locked'].map((status, i) => ({
    tierAmountYuan: [1, 6, 30][i], status, rewards: [], rewardText: ['铁剑x1、精力丹x5', '灵晶x500', '元力丹x3'][i]
  }));
  const { app, requests } = await gameFixture(t, r => r.path.endsWith('/recharge/first') ? { names, tiers } : businessEnvelope(r.bid, catalogData));
  const result = await app.runHandler(catalog, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const cards = quotes(result.messages[0].nodes);
  assert.match(cards[0].text, /首充礼包.*1元档.*可领取/);
  assert.match(cards[0].text, /铁剑x1、精力丹x5/);
  assert.deepEqual(cards[0].commands, ['/领取礼包奖励 1']);
  assert.match(cards[1].text, /已领取/);
  assert.deepEqual(cards[1].commands, []);
  assert.match(cards[2].text, /首次充值满 ¥30 解锁/);
  assert.match(cards[2].text, /元力丹x3/);
  assert.deepEqual(cards[2].commands, []);
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.commands.includes('/充值购买 4'));
  assert.ok(!view.commands.includes('/充值 优惠礼包'));
  assert.ok(!view.commands.includes('/礼包奖励'));
  assert.equal(requests.length, 2);
  assert.ok(!requests.some(r => /claim|payment-create/.test(r.path)));
});

test('首充礼包五档分页，保留可领取状态且不混入购买卡片', async t => {
  const tiers = Array.from({ length: 6 }, (_, i) => ({ tierAmountYuan: i + 1, status: 'claimable', rewards: [], rewardText: `奖励${i + 1}` }));
  const { app } = await gameFixture(t, r => r.path.endsWith('/recharge/first') ? { names, tiers } : businessEnvelope(r.bid, catalogData));
  for (const page of [1, 2]) {
    const result = await app.runHandler(catalog, app.events.privateMessage({ text: `/充值 首充礼包 ${page}`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const cards = quotes(result.messages[0].nodes);
    assert.equal(cards.length, page === 1 ? 5 : 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(view.commands.includes('/领取礼包奖励 6'), page === 2);
    assert.ok(view.commands.includes(`/充值 首充礼包 ${page === 1 ? 2 : 1}`));
    assert.ok(!view.commands.some(c => c.startsWith('/充值购买')));
  }
});

test('首充信息读取失败仍能展示充值商品，保留刷新入口', async t => {
  const { app } = await gameFixture(t, r => r.path.endsWith('/recharge/first') ? {} : businessEnvelope(r.bid, catalogData));
  const result = await app.runHandler(catalog, app.events.privateMessage({ text: '/充值', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /首充礼包 · 暂未获取/);
  assert.ok(view.commands.includes('/充值'));
  assert.ok(view.commands.includes('/充值购买 2'));
  assert.ok(!view.commands.some(c => c.startsWith('/领取礼包奖励')));
});
