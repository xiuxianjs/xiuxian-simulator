import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { after, before, mock, test } from 'node:test';
import { Format, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import caveAction from '../../src/response/cavePlot/action/res';
import caveSocial from '../../src/response/cavePlot/social/res';
import caveTend from '../../src/response/cavePlot/tendAll/res';
import alchemy from '../../src/response/alchemy/v2/res';
import dungeonChallenge from '../../src/response/dungeon/enter/res';
import dungeonSweep from '../../src/response/dungeon/sweep/res';
import storylineChallenge from '../../src/response/storyline/challenge/res';
import storylineSweep from '../../src/response/storyline/sweep/res';
import seclusionEnd from '../../src/response/seclusion/end/res';
import robbery from '../../src/response/robbery/res';
import robberyTriple from '../../src/response/robbery/triple/res';
import counterAttack from '../../src/response/counterAttack/res';
import spar from '../../src/response/spar/res';
import bountyAccept from '../../src/response/bounty/accept/res';
import bountyChallenge from '../../src/response/bounty/challenge/res';
import towerChallenge from '../../src/response/ranking/challengeRank/res';
import towerSweep from '../../src/response/ranking/sweepLower/res';
import towerBatch from '../../src/response/ranking/batchChallenge/res';
import meditationEnd from '../../src/response/meditation/end/res';
import consume from '../../src/response/consume/res';
import dualCultivate from '../../src/response/companion/dualCultivation/res';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from '../../src/api/bot/treasure-effects';
import { parseBackendCaveCommand } from '../../src/api/bot/cave-command';
import { parseMasterAction } from '../../src/api/bot/master-actions';
import { parseAlchemyV2Reply } from '../../src/api/bot/alchemy-v2';
import { parseDungeonChallenge } from '../../src/api/bot/dungeon-challenge';
import { parseDungeonSweep, parseDungeonFreeSweep } from '../../src/api/bot/dungeon-sweep';
import { parseStorylineSweep } from '../../src/api/bot/storyline-sweep';
import { parseStorylineManualBattleState } from '../../src/api/bot/storyline-manual-battle';
import { parseSeclusionEnd } from '../../src/api/bot/seclusion-end';
import { parseBackendRobbery } from '../../src/api/bot/robbery';
import { parseBackendCounterAttack } from '../../src/api/bot/counter-attack';
import { parseRobotSpar } from '../../src/api/bot/spar';
import { parseBackendBountyAccept, parseRobotBountyChallenge } from '../../src/api/bot/bounty-actions';
import { parseTongtianChallenge, parseTongtianSweep, parseTongtianBatch } from '../../src/api/bot/tongtian-tower';
import { parseMeditationEnd } from '../../src/api/bot/meditation';
import { parseConsumeResult } from '../../src/api/bot/consume';
import { parseBackendCompanionDualCultivation } from '../../src/api/bot/companion-relationship-actions';
import { emptyRealmAccess } from '../../src/api/bot/realm-access-queries';
import { businessEnvelope, gameFixture } from './fixture';
import { selects } from '../../src/response/config';
import { useMessage } from '../../src/utils/useMessage';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
const previews: unknown[] = [];
after(async () => {
  const output = process.env.TREASURE_EFFECT_PREVIEW_OUTPUT;
  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify({
      note: '离线 createTestApp 运行真实 HTTP、解析器、处理器与 Format；设置 TREASURE_ITEM_NOTICE_FIXTURE 时，灵田/偷药/炼丹的实际增益取自隔离 SQLite Go 结算；其余为正收益合同夹具。未向 QQ 发送，不代表真实账号结算。',
      previews
    }, null, 2) + '\n');
  }
  mock.timers.reset();
  await shutdownLogger();
});

const notice = (treasureId: number, name: string, prose: string, ...benefits: string[]): TreasureEffectNotice =>
  ({ treasureId, name, description: `宝物「${name}」${prose}`, benefits });
const palm = notice(604, '掌天瓶', '漾起幽碧灵光，灵药枝叶舒展，生机愈盛。', '额外获得 培元草×11');
const compass = notice(405, '寻幽罗盘', '灵针轻颤，引你寻得秘境深处的遗珍。', '额外获得 赤灵果×1');
const bag = notice(605, '万宝乾坤袋', '袋口流转玄光，将更多机缘收入囊中。', '额外获得 赤灵果×2');
const shennong = notice(504, '神农鼎', '升起温润药雾，将散逸的药性重新凝作灵材。', '额外获得 凝气草×2');
const cauldron = notice(603, '乾坤鼎', '内阴阳交融，炉中又添一缕饱满丹香。', '额外获得 聚灵丹×1');
const jade = notice(602, '玉净瓶', '洒落清润灵露，点点灵光融入你的修行。', '额外获得 修为×20');
const wind = notice(506, '御风仙履', '踏风无痕，护你行过此途而不损精力。', '精力免耗+10');
const pearl = notice(606, '太初归元珠', '流转混元清辉，替你化去了此番消耗。', '元力免耗+15');
const mentalPearl = { ...pearl, benefits: ['精力免耗+10'] };
const ordinaryText = '已结算（普通照料说明保留）';
const overview = { plots: [], maxPlots: 4, cultivatedCount: 1, plantedCount: 0, matureCount: 0, abnormalCount: 0, auraScore: 0, auraLevel: '普通', auraLabel: '清静', activeFormations: [] };
const visit = { ownerId: 9, ownerName: '道侣', relation: 'companion', relationLabel: '道侣', canViewPlots: false, canCollaborate: false, canSteal: false, auraText: '清静', summaryText: '地块状态已更新', stolenStatusText: '', recentLogs: [], capabilities: [] };
const caveReceipt = { message: ordinaryText, overview };
const unit = { id: 'a', name: '道友', hp: 10, maxHp: 10, isDead: false, position: 1 };
const rawUnit = { Name: '道友', HP: 10, MaxHP: 10, Dead: false };
const battle = { Winner: 'B', Rounds: 1, SideA: [rawUnit], SideB: [rawUnit] };
const member = { userId: 1, eligible: false, noRewardReason: 'LOST', spiritCostPaid: 0, experienceGained: 0, currency: [], items: [] };
const dungeon = { dungeonId: 1, won: false, experienceGained: 0, spiritStoneGained: 0, battle, drops: [], rewardsByUser: [member] };
const sweep = { dungeonName: '青云秘境', times: 1, totalSpiritCost: 0, totalExp: 12, currency: [],
  items: [{ category: '道具', name: '赤灵果', amount: 4 }], normalItems: [{ category: '道具', name: '赤灵果', amount: 1 }] };
const storySweep = { stageLabel: '第一关', times: 1, totalSpiritCost: 0, totalExp: 12, totalSpiritStone: 2, totalBonusExp: 0, expBonusText: '', allItemsGained: [] };
const manual = { sessionId: 'notice-session', finished: true, winner: 'B', events: [], settlement: { monsterName: '山妖', stageLabel: '第一关', chapterNumber: 1, stageNumber: 1, spiritCostPaid: 0, battle } };
const exploration = {
  interrupted: false, spiritRefunded: false, penaltyApplied: false, settledHours: 1, refundedSpirit: 10, creditedExperience: 120, normalExperienceGained: 100,
  view: { kind: 'completed', title: '秘境返程', introText: '你从秘境归来。', penaltyText: '', expBonusText: '', pillCount: 0, rareDropTypeCount: 1, rareDropTotalCount: 4, showHuanHunDan: false, showYangShenDan: false, showRareDrops: true },
  rewards: { experience: 120, spiritStone: 3, huanHunDan: 0, yangShenDan: 0, soulDew: 0, rareDrops: [{ name: '赤灵果', quantity: 4 }] }
};
const robbed = { targetName: '道友', winner: 'B', battleView: { totalRounds: 1, finalState: { sideA: [unit], sideB: [unit] } }, qiCost: 0, remaining: 13, dailyMax: 14, bonusText: '', losingStreakText: '', experience: 10 };
const countered = { targetName: '道友', winner: 'B', battle, battleLogId: 'counter-notice', qiCost: 0, stoneReward: 0, crystalReward: 0, shaQiBonus: 0, bonusText: '', experience: 20, normalExperienceGained: 0 };
const sparred = { battleView: robbed.battleView, battleLogId: 'spar-notice', winner: 'B', baseExperience: 10, experience: 10, expBonusText: '', qiCost: 0, dailyMax: 10, newCount: 1, proficiencyResult: { gained: false, points: 0 } };
const accepted = { battleWon: false, expReward: 0, streak: 0, streakBonus: 0, shaQiBonus: 0, bonusText: '', losingStreakText: '', targetName: '道友', qiCost: 0, remainingCount: 98, dailyAcceptLimit: 99, battle };
const continued = { won: false, experienceGained: 0, rewardAmount: 0, qiCost: 0, remainingCount: 98, dailyAcceptLimit: 99, battle };
const tower = { success: false, message: '挑战失败', oldRank: 20, newRank: 20, rankImproved: false, experienceGained: 0, baseExperience: 0, experienceBonusText: '', reputationGained: 0, battle };
const towerSwept = { targetRank: 21, sweepCount: 1, qiSpent: 0, experienceGained: 10, baseExperience: 10, experienceBonusText: '', reputationGained: 1 };
const towerBatched = { startRank: 20, finalRank: 20, rounds: [tower], winCount: 0, lossCount: 1, experienceGained: 0, experienceBonusText: '', reputationGained: 0, events: [{ index: 1, outcome: 'lost', message: '挑战失败', displayText: '第1次挑战失败', needPotion: false, challenge: tower }] };
const reply = { title: '炼丹结果', heading: '', text: '聚灵丹已入库。', blocks: [], buttons: [], advice: [] };
const meditated = { success: true, message: '闭关已结束', elapsedMinutes: 60, qiGained: 12, expGained: 120, creditedExperience: 120, normalExperienceGained: 100,
  recoveredMental: 0, totalQi: 12, dailyQiGained: 12, dailyQiCap: 200, minimumRewardMinutes: 5, elapsedText: '1小时', bonusLine: '', rewardNotice: '',
  hasSeclusionPassBonus: false, maxDurationMinutes: 60, qiBonusRate: 0, expBonusRate: 0 };
const consumed = { outcome: 'consumed', message: '服用聚灵丹1颗，获得修为120。', normalMessage: '服用聚灵丹1颗，获得修为100。', remainingQuantity: 2 };
const dual = { success: true, experienceGained: 120, creditedExperience: 120, normalExperienceGained: 100, partnerCreditedExperience: 100, tongxinGained: 5, partnerId: 2 };
const currentItems = process.env.TREASURE_ITEM_NOTICE_FIXTURE
  ? JSON.parse(readFileSync(process.env.TREASURE_ITEM_NOTICE_FIXTURE, 'utf8')) as {
    farm: { message: string; treasureEffects: unknown };
    steal: { message: string; treasureEffects: unknown };
    alchemy: { recipeName: string; count: number; successCount: number; outputItemName: string; outputQuantity: number; normalOutputQuantity?: number; treasureEffects: unknown };
  } : undefined;
const farmEffects = currentItems ? parseTreasureEffects(currentItems.farm.treasureEffects)! : [palm];
const stolenEffects = currentItems ? parseTreasureEffects(currentItems.steal.treasureEffects)! : [{ ...palm, description: '田主的' + palm.description }];
const alchemyEffects = currentItems ? parseTreasureEffects(currentItems.alchemy.treasureEffects)! : [shennong, cauldron];
const farmData = { ...caveReceipt, ...(currentItems ? { message: currentItems.farm.message } : {}), treasureEffects: farmEffects };
const alchemyData = { ...reply, treasureEffects: alchemyEffects, ...(currentItems ? {
  text: `${currentItems.alchemy.recipeName} · 完成${currentItems.alchemy.count}炉 · 成功${currentItems.alchemy.successCount}炉\n获得 ${currentItems.alchemy.outputItemName}×${currentItems.alchemy.normalOutputQuantity ?? currentItems.alchemy.outputQuantity}`
} : {}) };

type Scenario = { slug: string; handler: typeof caveAction; command: string; data: unknown; expected: TreasureEffectNotice[] };
const scenarios: Scenario[] = [
  { slug: '01-farm-palm', handler: caveAction, command: '/收割 1', data: { mode: 'command', result: farmData }, expected: farmEffects },
  { slug: 'farm-one-click', handler: caveAction, command: '/一键收割', data: { mode: 'command', result: farmData }, expected: farmEffects },
  { slug: 'farm-snapshot-fallback', handler: caveAction, command: '/一键收割', data: { mode: 'command', result: { message: ordinaryText, snapshotError: '暂未刷新地块', treasureEffects: [palm] } }, expected: [palm] },
  ...['/一键打理灵田', '/一键照料道侣灵田 代收割'].map((command, index) => {
    const effects = farmEffects.map(effect => ({ ...effect, description: (index ? '道侣的' : '') + effect.description }));
    return { slug: 'farm-tend-' + index, handler: caveTend, command, data: { message: farmData.message + (index ? '\n收获归道侣所有' : ''), treasureEffects: effects }, expected: effects };
  }),
  { slug: 'farm-companion-harvest', handler: caveSocial, command: '/协作灵田 9 收割', data: { ...farmData, ownerUid: 9, visit, treasureEffects: farmEffects.map(effect => ({ ...effect, description: '道侣的' + effect.description })) }, expected: farmEffects.map(effect => ({ ...effect, description: '道侣的' + effect.description })) },
  { slug: 'farm-steal', handler: caveSocial, command: '/偷药 9', data: { ...caveReceipt, ownerUid: 9, visit: { ...visit, relation: 'stranger', relationLabel: '道友' }, message: currentItems?.steal.message ?? ordinaryText, treasureEffects: stolenEffects }, expected: stolenEffects },
  { slug: 'seclusion-return-jade-waiver', handler: seclusionEnd, command: '/返程', data: { result: { ...exploration, treasureEffects: [jade, mentalPearl] }, access: emptyRealmAccess }, expected: [jade, mentalPearl] },
  { slug: '03-alchemy-gains', handler: alchemy, command: '/炼丹 确认 stable-intent', data: alchemyData, expected: alchemyEffects },
  { slug: 'alchemy-raw-lines', handler: alchemy, command: '/炼丹 确认 stable-intent', data: { ...reply, title: '', text: '', blocks: undefined, rawLines: ['聚灵丹已入库。'], treasureEffects: [cauldron] }, expected: [cauldron] },
  { slug: '04-mental-waiver-defeat', handler: dungeonChallenge, command: '/秘境挑战 青云秘境', data: { outcome: 'result', data: { ...dungeon, rewardsByUser: [{ ...member, userId: 2, treasureEffects: [bag] }, { ...member, treasureEffects: [wind] }] } }, expected: [wind] },
  { slug: 'dungeon-loot-normal', handler: dungeonChallenge, command: '/秘境挑战 青云秘境', data: { outcome: 'result', data: { ...dungeon, won: true, battle: { ...battle, Winner: 'A' }, rewardsByUser: [{ ...member, eligible: true, experienceGained: 120, normalExperienceGained: 100, items: sweep.items, normalItems: [{ category: '道具', name: '赤灵果', amount: 1 }], treasureEffects: [compass, bag, jade] }] } }, expected: [compass, bag, jade] },
  { slug: '02-dungeon-loot', handler: dungeonSweep, command: '/扫荡秘境 青云秘境 1', data: { outcome: 'result', data: { ...sweep, treasureEffects: [compass, bag] } }, expected: [compass, bag] },
  { slug: 'dungeon-free-summary', handler: dungeonSweep, command: '/扫荡免费秘境', data: { sweptDungeons: [{ ...sweep, treasureEffects: [bag] }], skippedDungeons: [], totalTimes: 1, totalExp: 12, totalSpiritCost: 0, treasureEffects: [bag] }, expected: [bag] },
  { slug: 'storyline-defeat-waiver', handler: storylineChallenge, command: '/主线挑战 1-1', data: { ...manual, settlement: { ...manual.settlement, treasureEffects: [wind] } }, expected: [wind] },
  { slug: 'storyline-sweep', handler: storylineSweep, command: '/主线扫荡 1-1', data: { chapterNumber: 1, stageNumber: 1, result: { ...storySweep, treasureEffects: [wind] } }, expected: [wind] },
  { slug: '05-qi-waiver-defeat', handler: robbery, command: '/打劫 2', data: { ...robbed, treasureEffects: [pearl] }, expected: [pearl] },
  { slug: 'robbery-triple', handler: robberyTriple, command: '/三连打劫 2', data: { ...robbed, remaining: 0, treasureEffects: [pearl] }, expected: [pearl] },
  { slug: 'counter-attack-jade', handler: counterAttack, command: '/回击 9', data: { ...countered, treasureEffects: [jade] }, expected: [jade] },
  { slug: 'spar-defeat', handler: spar, command: '/比试 2', data: { allowed: true, realmName: '筑基', targetUid: 2, battle: { ...sparred, treasureEffects: [pearl] } }, expected: [pearl] },
  { slug: 'bounty-accept-defeat', handler: bountyAccept, command: '/接赏 9', data: { ...accepted, treasureEffects: [pearl] }, expected: [pearl] },
  { slug: 'bounty-continue-defeat', handler: bountyChallenge, command: '/继续接赏 9', data: { ...continued, treasureEffects: [pearl] }, expected: [pearl] },
  { slug: 'tower-defeat', handler: towerChallenge, command: '/挑战排名 19', data: { ...tower, treasureEffects: [pearl] }, expected: [pearl] },
  { slug: 'tower-sweep-free-cost', handler: towerSweep, command: '/扫荡排名 21 1', data: { outcome: 'sweep', data: { ...towerSwept, treasureEffects: [pearl] } }, expected: [pearl] },
  { slug: 'tower-batch-root-only', handler: towerBatch, command: '/连续爬塔', data: { ...towerBatched, rounds: [{ ...tower, treasureEffects: [pearl] }], events: [{ ...towerBatched.events[0], challenge: { ...tower, treasureEffects: [pearl] } }], treasureEffects: [pearl] }, expected: [pearl] },
  { slug: 'meditation-jade', handler: meditationEnd, command: '/闭关结束', data: { ...meditated, treasureEffects: [jade] }, expected: [jade] },
  { slug: 'consume-jade', handler: consume, command: '/服用 聚灵丹 1', data: { ...consumed, treasureEffects: [jade] }, expected: [jade] },
  { slug: 'dual-cultivation-jade', handler: dualCultivate, command: '/双修', data: { ...dual, treasureEffects: [jade] }, expected: [jade] }
];

type Node = { type?: string; value?: unknown; options?: Record<string, unknown> };
const nodeText = (node: Node): string => typeof node.value === 'string' ? node.value : Array.isArray(node.value) ? node.value.map(child => nodeText(child as Node)).join('') : '';
function assertNotices(result: TestRunResult, expected: TreasureEffectNotice[]) {
  assert.deepEqual(result.errors, []);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const matches = result.messages.filter(message => expected.some(effect => inspectMessage(message.nodes).text.includes(effect.description)));
  assert.equal(matches.length, 1, '宝物提示仅出现在主结算一次，不进入开始或战斗回忆消息');
  const message = matches[0];
  const view = inspectMessage(message.nodes);
  const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []) as Node[];
  for (const effect of expected) {
    const index = nodes.findIndex(node => node.type === 'MD.text' && nodeText(node) === effect.description);
    assert.ok(index >= 0, '描写必须是独立正文，不能进入括号或引用块');
    assert.equal(view.text.split(effect.description).length - 1, 1);
    assert.equal(nodes[index - 1]?.type, 'MD.newline');
    assert.equal(nodes[index - 2]?.type, 'MD.newline');
    for (const [offset, benefit] of effect.benefits.entries()) {
      assert.equal(nodes[index + 1 + offset * 2]?.type, 'MD.newline');
      const bold = nodes[index + 2 + offset * 2];
      assert.equal(bold?.type, 'MD.bold');
      assert.equal(nodeText(bold), benefit);
    }
  }
  const checkCommands = (items: Node[]) => {
    for (const node of items) {
      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
      }
      if (Array.isArray(node.value)) checkCommands(node.value as Node[]);
    }
  };
  checkCommands(message.nodes as Node[]);
  return { message, view };
}

for (const scenario of scenarios) for (const isPrivate of [true, false]) {
  test(`宝物收益独立段落 ${scenario.slug} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, scenario.data));
    const options = { text: scenario.command, platform: 'qq-bot' };
    const result = await app.runHandler(scenario.handler, isPrivate ? app.events.privateMessage(options) : app.events.groupMessage(options));
    const { message, view } = assertNotices(result, scenario.expected);
    assert.equal(requests.length, 1);
    if (scenario.slug === '04-mental-waiver-defeat') assert.ok(!view.text.includes(bag.description), '队友宝物收益不能冒充本人');
    if (scenario.slug === 'dungeon-loot-normal') {
      assert.match(view.text, /修为 \+100/);
      assert.match(view.text, /赤灵果×1/);
      assert.doesNotMatch(view.text, /修为 \+120|赤灵果×4/);
    }
    if (scenario.slug === 'meditation-jade') {
      assert.match(view.text, /本次获得修为：100/);
      assert.doesNotMatch(view.text, /本次获得修为：120/);
    }
    if (scenario.slug === 'dual-cultivation-jade') assert.match(view.text, /你的修为 100/);
    if (scenario.slug === 'counter-attack-jade') {
      assert.match(view.text, /修为 \+0/);
      assert.doesNotMatch(view.text, /修为 \+20/);
    }
    if (scenario.slug === 'consume-jade') {
      assert.match(view.text, /获得修为100/);
      assert.doesNotMatch(view.text, /获得修为120/);
    }
    if (scenario.slug === 'farm-snapshot-fallback') assert.ok(view.text.includes(ordinaryText), '保留其他正常括号');
    if (isPrivate) previews.push({
      slug: scenario.slug, title: view.text.split('\n').find(Boolean) ?? scenario.slug, command: scenario.command,
      source: currentItems && ['01-farm-palm', 'farm-one-click', 'farm-steal', '03-alchemy-gains'].includes(scenario.slug) ? '隔离Go结算数据+真实QQ模板' : '离线正收益合同夹具+真实QQ模板',
      sameTemplateCommands: scenario.slug === 'storyline-defeat-waiver' ? ['/主线挑战 1-1', '手动选技/自动战斗后的终局'] : undefined,
      text: view.text, commands: view.commands, nodes: message.nodes
    });
  });
}

test('未提供新字段的旧服务端不产生宝物段落，也不读取上次事件的回执', async t => {
  let count = 0;
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { ...reply, ...(count++ === 0 ? { treasureEffects: [cauldron] } : {}) }));
  const run = () => app.runHandler(alchemy, app.events.privateMessage({ text: '/炼丹 确认 stable-intent', platform: 'qq-bot' }));
  assertNotices(await run(), [cauldron]);
  const second = await run();
  assert.equal(second.messages.length, 1);
  assert.equal(second.actions[second.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.ok(!inspectMessage(second.messages[0].nodes).text.includes('宝物「'));
});

test('可选回执严格校验，拒绝空白、缺失收益、非法 ID、null 和混合坏条目', () => {
  assert.equal(parseTreasureEffects(undefined), undefined);
  assert.deepEqual(parseTreasureEffects([]), []);
  assert.deepEqual(parseTreasureEffects([palm]), [palm]);
  for (const invalid of [null, {}, [null], [{ ...palm, treasureId: 0 }], [{ ...palm, treasureId: 1.5 }], [{ ...palm, name: ' ' }], [{ ...palm, description: '' }], [{ ...palm, benefits: [] }], [{ ...palm, benefits: [' '] }], [palm, { ...palm, benefits: [1] }]]) {
    assert.throws(() => parseTreasureEffects(invalid), /宝物增益回执无效/);
  }
  assert.equal(parseNormalExperienceGained(undefined), undefined);
  assert.equal(parseNormalExperienceGained(0), 0);
  for (const invalid of [null, -1, 1.5, '5', Number.NaN]) assert.throws(() => parseNormalExperienceGained(invalid), /普通修为回执无效/);
  assert.throws(() => parseConsumeResult({ ...consumed, normalMessage: ' ' }), /普通道具收益回执无效/);
});

test('每个业务解析器都保留严格可选字段，不静默丢弃损坏的已结算增益', () => {
  const bad = { treasureEffects: [{ ...palm, benefits: [] }] };
  const cases: Array<() => unknown> = [
    () => parseBackendCaveCommand({ ...caveReceipt, ...bad }),
    () => parseMasterAction({ message: ordinaryText, ...bad }),
    () => parseAlchemyV2Reply({ ...reply, ...bad }),
    () => parseDungeonChallenge({ ...dungeon, rewardsByUser: [{ ...member, ...bad }] }),
    () => parseDungeonSweep({ ...sweep, ...bad }),
    () => parseDungeonFreeSweep({ sweptDungeons: [], totalTimes: 0, totalExp: 0, totalSpiritCost: 0, ...bad }),
    () => parseStorylineSweep({ ...storySweep, ...bad }),
    () => parseStorylineManualBattleState({ ...manual, settlement: { ...manual.settlement, ...bad } }),
    () => parseSeclusionEnd({ ...exploration, ...bad }),
    () => parseBackendRobbery({ ...robbed, ...bad }),
    () => parseBackendCounterAttack({ ...countered, ...bad }),
    () => parseRobotSpar({ allowed: true, realmName: '筑基', targetUid: 2, battle: { ...sparred, ...bad } }),
    () => parseBackendBountyAccept({ ...accepted, ...bad }),
    () => parseRobotBountyChallenge({ ...continued, ...bad }),
    () => parseTongtianChallenge({ ...tower, ...bad }),
    () => parseTongtianSweep({ ...towerSwept, ...bad }),
    () => parseTongtianBatch({ ...towerBatched, ...bad }),
    () => parseMeditationEnd({ ...meditated, ...bad }),
    () => parseConsumeResult({ ...consumed, ...bad }),
    () => parseBackendCompanionDualCultivation({ ...dual, ...bad })
  ];
  for (const parse of cases) assert.throws(parse, /宝物增益回执无效/);
});

test('三连每笔真实回执各显示一次，战斗回忆不重复宝物收益', async t => {
  let count = 0;
  const { app, requests } = await gameFixture(t, request => {
    const index = ++count;
    return businessEnvelope(request.bid, { ...robbed, remaining: 13 - index, battleLogId: 'treasure-triple-' + index, treasureEffects: [{ ...pearl, benefits: ['元力免耗+' + index] }] });
  });
  const result = await app.runHandler(robberyTriple, app.events.privateMessage({ text: '/三连打劫 2', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 3);
  assert.equal(result.messages.length, 2);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const summary = inspectMessage(result.messages[0].nodes);
  assert.equal(summary.text.split(pearl.description).length - 1, 3);
  const nodes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []) as Node[];
  for (let index = 1; index <= 3; index++) assert.equal(nodes.filter(node => node.type === 'MD.bold' && nodeText(node) === '元力免耗+' + index).length, 1);
  assert.ok(!inspectMessage(result.messages[1].nodes).text.includes(pearl.description));
});

test('最终发送规范化只修改蓝链发送协议，保留其他参数和原生键盘', async t => {
  const handler = onResponse(selects, async event => {
    const [message] = useMessage();
    const md = Format.createMarkdown().addBlockquote(Format.createMarkdown().addButton('查看', { data: '/我', autoEnter: true }));
    const quote = md.value.value[0] as unknown as { value: Array<{ options: Record<string, unknown> }> };
    quote.value[0].options.show = true;
    quote.value[0].options.fixtureMarker = 'preserved';
    const keyboard = Format.createButtonGroup().addRow().addButton('战斗回忆', 'https://example.com/battle', { type: 'link' });
    await message.send({ format: Format.create().addMarkdown(md).addButtonGroup(keyboard) });
    assert.equal(quote.value[0].options.autoEnter, true, '不修改调用方的原Format对象');
    assert.equal(event.UserId.length > 0, true);
  });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/协议测试', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 0);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const serialized = JSON.stringify(result.messages[0].nodes);
  assert.match(serialized, /"autoEnter":false/);
  assert.match(serialized, /"fixtureMarker":"preserved"/);
  assert.ok(!serialized.includes('"show"'));
  const native = result.messages[0].nodes.find(node => node.type === 'BT.group');
  assert.ok(native);
  assert.ok(!JSON.stringify(native).includes('autoEnter'));
  assert.match(JSON.stringify(native), /https:\/\/example.com\/battle/);
});
