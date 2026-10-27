import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { setRobotTaskInput, hasPendingRobotTaskInput } from '../../src/api/bot/task-business-context';

after(() => shutdownLogger());
const summary = { slot: 2, name: '配装', equipmentCount: 1, equipmentNames: ['剑'], skillNames: { 战技: '剑诀' }, missingEquipmentCount: 0, missingSkillCount: 0 };
const equipment = { id: 3, name: '剑', equipmentType: '武器', grade: '凡', physicalAttack: 2, physicalAttackPercent: 1.5, magicAttack: 1, magicAttackPercent: 0, physicalDefense: 0, physicalDefensePercent: 0, magicDefense: 0, hp: 0, hpPercent: 0, speed: 1, critRate: 0.1, critDamage: 1.5 };
const bossRound = { damageDealt: 10, totalPlayerDamage: 30, attackCount: 1, remainingAttempts: 2, rank: null, logId: 'battle-1', stageName: '炼气', bossTitle: '凶兽', bossName: '兽', battle: { winner: 'A', totalRounds: 1, sideA: [], sideB: [] }, battleSummary: { sideACount: 1, sideBCount: 1, totalDamageA: 10, totalDamageB: 0, totalHealsA: 0, totalHealsB: 0 } };
const dungeonSweep = { dungeonName: '秘境', times: 1, totalSpiritCost: 0, totalExp: 20, currency: [{ category: 'currency', name: '灵石', amount: 5 }], items: [] };
const chapterChests = { success: true, message: '已领取', chapterNumber: 1, claimedIndexes: [1], totalReward: 10, chests: [{ index: 1, requiredStars: 3, reward: 10, claimed: true, unlocked: true }] };
const manualState = { sessionId: 'manual-1', revision: 2, finished: false, events: [], battle: { Winner: '', Rounds: 1, SideA: [], SideB: [] }, choice: { unitId: 'p', unitName: '修士', side: 'A', round: 1, availableSkills: [{ type: 'normal', name: '普攻', available: true }] } };
const caveCommand = { message: '操作完成', needsSeedSelection: false, overview: null, snapshotError: '快照暂不可用' };
const alchemyReference = 'r1_1_a_abc_' + 'a'.repeat(24);
const alchemyReply = { title: '炼丹', heading: '', text: '服务端回执', buttons: [], advice: [], blocks: [{ text: '原预览', quoted: true, inlineButtons: [{ label: '确认', command: '/炼丹 确认 ' + alchemyReference }] }] };
const heart = { policyVersion: 'a'.repeat(64), topic: 'general', title: '心魔', prompt: '如何面对', options: [{ id: 'guard', name: '守', attackMultiplier: 0.8, defenseMultiplier: 1.2 }, { id: 'slay', name: '斩', attackMultiplier: 1.2, defenseMultiplier: 0.8 }, { id: 'accept', name: '纳', attackMultiplier: 1, defenseMultiplier: 1 }] };
const tribulationProgress = { successful: 1, requiredAttempts: 3, attackBonusPercent: 0.5, completed: false };
const tribulationPrep = { eventId: 7, targetRealm: '金丹', status: 'opened', opensAt: '2026-10-28T00:00:00Z', requiredAttempts: 3, canStart: true, heartDemon: heart };
const tReference = 'r1_1_t_abc_' + 'a'.repeat(24);
const hReference = 'r1_1_h_abc_' + 'a'.repeat(24);
const tribulationUnit = { Name: '修士', HP: 100, MP: 50, PhysicalAttack: 20, MagicAttack: 20, PhysicalDefense: 5, MagicDefense: 5, Speed: 10 };
const activityPanel = { rewardType: 'daily', cyclePeriod: '2026-10-28', currentPoints: 100, taskRewardsCanClaim: true, tasks: [], rewards: [{ requiredPoints: 10, itemId: 0, quantity: 11, name: '灵石', category: 'currency', currencyCode: 'SPIRIT_STONE', claimed: false, canClaim: true }] };
const activityClaim = { userName: '修士', requiredPoints: 10, issued: [{ type: 'currency', name: '灵石', amount: 11 }] };
const activityAll = { claimed: [activityClaim], partial: true, error: '第二档未完成' };
const monthStatus = { total: 1, claimableCount: 0, claimedCount: 1, upcomingCount: 0, prepaidCount: 0, dailyRewards: { spiritCrystal: 150, mentalPillItemId: 38, mentalPillQuantity: 2, qiPillItemId: 39, qiPillQuantity: 2 }, records: [{ day: 1, rewardDate: '2026-10-28', status: 'claimed' }] };
const shopReference = 'r1_1_s_abc_' + 'a'.repeat(24);
const soulToken = '12345678-1234-1234-1234-123456789abc';
const soulPath = { message: '已领悟', pathKey: 'xuan_fa', pathName: '玄法', nodeName: '入门', pathSwitchAvailableAt: null };
const soulNurture = { direction: 'wu_dao', directionName: '悟道', tier: 'normal', tierName: '平稳', stabilityBefore: 70, stabilityAfter: 75, insightGained: 2, proficiencyGained: 3, extraItems: [], dailyNurtureCount: 1, dailyNurtureLimit: 3, usedMonthCardExtra: false, dailyNurtureProgressText: '1/3', rerollable: true };
const spiritRootView = { granted: true, title: '灵根', quality: 1, qualityName: '下品', cultivation: 104, stagePoints: 4, stageTarget: 400, overflow: 0, bonusPercent: 2, nextBonusPercent: 3, nextQualityName: '中品', requiredRealmName: '筑基', canFeed: true, canPromote: false, meditationActive: false, activeMeditationBonusPercent: 0, message: '已晋品' };
const guildMilestone = { id: 1, threshold: 10, description: '奖励', claimed: false, canClaim: true };
const guildDaily = { guildId: 1, guildName: '青云', contributionPoints: 100, dailyActivity: 40, dailyActivityMax: 50, dailyMiningCount: 0, dailyExchangeCount: 0, prestigeRemaining: 3, miningText: '未开始', checkinDone: false, dailyWorshipDone: false, dailyStorylineDone: false, claimAllAvailable: true, dailyTasks: ['checkin','mining','exchange','worship','storyline'].map(key => ({ key, line: '任务', actionLabel: '执行', actionAvailable: true })), milestones: [guildMilestone] };
const guildWeekly = { guildId: 1, guildName: '青云', contributionPoints: 100, weeklyActivity: 40, weeklyActivityMax: 100, stipendThreshold: 40, stipendPreviewAmount: 100, stipendBaseAmount: 100, stipendGuildLevel: 1, stipendLevelMultiplier: 1, stipendActivityMultiplier: 1, weeklyCheckinCount: 1, weeklyMiningCount: 0, weeklyExchangeCount: 0, claimAllAvailable: true, weeklyTasks: ['checkin','mining','exchange'].map(key => ({ key, label: '任务', progress: 1, target: 3, unit: '次', activityReward: 1, bonusText: '奖励', completed: false })), milestones: [guildMilestone] };
const guildExpected = { shopItemId: 1, itemId: 9, name: '药草', category: 'material', quantity: 2, priceContribution: 20 };
const guildShop = { contributionPoints: 100, autoRefreshEnabled: false, isLeader: true, autoRefreshHours: [], autoRefreshStatusText: '未开启', refreshDailyLimit: 3, items: [{ id: 1, index: 1, itemId: 9, name: '药草', category: 'material', quantity: 2, priceContribution: 20, purchased: false, canExchange: true, statusText: '未兑换', itemType: 'material', itemSubtype: null }] };
const teamFacts = { teamId: 8, exists: true, leaderName: '队长', memberCount: 1, maxMembers: 6, minRealmName: null, target: null, isMember: false, isLeader: false, ownMembershipLeader: false, members: [{ userId: 9, name: '队长', isLeader: true, position: 1 }], actions: { canApply: true, canInvite: false, canManageMembers: false, canReviewApplications: false, canUseTeamMail: false, canViewDungeon: false, canLeave: false, canDisband: false, canViewInvitations: false } };
const cases = [
  { action: 'get_my_team', operation: 'teams.overview', command: '/我的队伍', input: {}, data: { access: { ok: true, realmName: '炼气' }, team: null } },
  { action: 'get_team_info', operation: 'teams.info', command: '/队伍信息 8', input: { teamId: 8 }, args: { teamId: '8' }, data: { access: { ok: false, realmName: null }, team: teamFacts } },
  { action: 'get_team_list', operation: 'teams.list', command: '/队伍列表 1', input: {}, args: { page: 1, pageSize: 5 }, data: { items: [{ id: 8, leaderId: 9, leaderName: '队长', memberCount: 1, maxMembers: 6, minRealmName: null }], page: 1, pageSize: 5, total: 1 } },
  { action: 'create_team', operation: 'teams.create', command: '/创建队伍', input: {}, data: { id: 8 } },
  { action: 'apply_to_team', operation: 'teams.apply', command: '/加入队伍 8', input: { teamId: 8 }, args: { teamId: '8' }, data: { id: 2, teamId: 8, userId: 7, status: 0, createdAt: '2026-10-28' } },
  { action: 'leave_team', operation: 'teams.leave', command: '/离开队伍', input: {}, data: { left: true } },
  { action: 'disband_team', operation: 'teams.disband', command: '/解散队伍', input: {}, data: { disbanded: true } },
  { action: 'get_team_applications', operation: 'teams.applications', command: '/队伍申请', input: {}, data: { teamId: 8, leaderName: '队长', applications: [{ id: 2, teamId: 8, userId: 7, userName: '申请人', status: 0, createdAt: '2026-10-28' }] } },
  { action: 'approve_team_application', operation: 'teams.application-approve', command: '/队伍同意 2', input: { applicationId: 2 }, args: { applicationId: '2' }, data: { id: 8 } },
  { action: 'reject_team_application', operation: 'teams.application-reject', command: '/队伍拒绝 2', input: { applicationId: 2 }, args: { applicationId: '2' }, data: { rejected: true } },
  { action: 'get_team_match', operation: 'team-match.snapshot', command: '/匹配状态', input: {}, data: null },
  { action: 'start_mainline_match', operation: 'team-match.start-mainline', command: '/匹配主线 7-3', input: { chapterNumber: 7, stageNumber: 3 }, data: { targetLabel: '主线 7-3' } },
  { action: 'start_dungeon_match', operation: 'team-match.start-dungeon', command: '/匹配秘境 5', input: { dungeonId: 5 }, data: { targetLabel: '秘境 多人秘境' } },
  { action: 'cancel_team_match', operation: 'team-match.cancel', command: '/取消匹配', input: {}, data: { cancelled: false, targetLabel: null } },
  { action: 'get_guild_daily', operation: 'guild.daily', command: '/宗门日常', input: {}, data: guildDaily },
  { action: 'get_guild_weekly', operation: 'guild.weekly', command: '/宗门周常', input: {}, data: guildWeekly },
  { action: 'claim_guild_milestone', operation: 'guild.milestone-claim', command: '/领取宗门日活奖励 1', input: { type: 'daily_activity', milestoneId: 1 }, args: { milestoneArg: '1', expectedType: 'daily_activity' }, data: { outcome: 'result', message: '已领取', receipt: { message: '已领取', milestoneId: 1, type: 'daily_activity', threshold: 10, currentPoints: 40, rewards: { spiritStone: 0, contribution: 2, prestige: 0 } } } },
  { action: 'claim_all_guild_milestones', operation: 'guild.milestone-claim-all', command: '/一键领取宗门周活奖励', input: { type: 'weekly_activity' }, data: { message: '部分已领取', partial: true, claimed: [{ id: 1, threshold: 10, description: '奖励' }] } },
  { action: 'get_guild_worship_options', operation: 'guild.worship', command: '/祭祀祖师', input: {}, args: { offer: '' }, data: { code: 'GUIDE', data: { dailyWorshipDone: false, canWorship: true, introText: '祭祀', noticeText: '每日一次', offers: [{ name: '灵石', cost: 5000, activity: 5, contribution: 20, line: '祭祀', canWorship: true }] } } },
  { action: 'worship_guild', operation: 'guild.worship', command: '/祭祀祖师 灵石', input: { offer: '灵石' }, data: { code: 'OK', data: { guildId: 1, cost: 5000, dailyActivityAdded: 5, currentDailyActivity: 45, contributionAdded: 20, offer: '灵石', message: '已祭祀', offerText: '灵石', dailyActivityText: '活跃+5', contributionText: '贡献+20' } } },
  { action: 'get_guild_shop', operation: 'guild.shop', command: '/宗门商店', input: {}, data: guildShop },
  { action: 'exchange_guild_shop_item', operation: 'guild.shop-exchange', command: '/宗门商店兑换 1', input: { itemIndex: 1, expected: guildExpected }, data: { outcome: 'result', receipt: { itemId: 1, itemName: '药草', quantity: 2, contributionDelta: -10, prestigeGain: 1, remainingDailyCount: 2 } } },
  { action: 'preview_soul_path_choose', operation: 'soul-path.choose-preview', command: '/选择道途 玄法', input: { pathKey: 'xuan_fa' }, args: { input: '玄法' }, data: { token: soulToken, message: '选择预览' } },
  { action: 'preview_soul_path_switch', operation: 'soul-path.switch-preview', command: '/切换道途 炼体', input: { pathKey: 'lian_ti' }, args: { input: '炼体' }, data: { token: soulToken, message: '切换预览' } },
  { action: 'preview_soul_path_advance', operation: 'soul-path.advance-preview', command: '/道途突破', input: {}, args: { input: '' }, data: { token: soulToken, message: '突破预览' } },
  { action: 'preview_soul_path_reroll', operation: 'soul-path.reroll-preview', command: '/神魂重选', input: {}, args: { input: '' }, data: { token: soulToken, message: '重选预览' } },
  { action: 'confirm_soul_path', operation: 'soul-path.confirm', command: '/确认神魂 choose:' + soulToken, input: { token: 'choose:' + soulToken }, data: { mode: 'choose', result: soulPath } },
  { action: 'nurture_soul_path', operation: 'soul-path.nurture', command: '/神魂温养 悟道', input: { direction: 'wu_dao' }, args: { input: '悟道' }, data: soulNurture },
  { action: 'set_soul_supply_direction', operation: 'soul-path.supply', command: '/神魂补给 自动', input: { direction: 'auto' }, args: { input: '自动' }, data: { direction: null, directionName: '自动', message: '已设置' } },
  { action: 'preview_spirit_root_feed', operation: 'spirit-root.preview', command: '/灵根培养 1 10', input: { itemId: 1, quantity: 10 }, args: { itemId: 1, quantity: 10, withReference: true }, data: { itemId: 1, itemName: '清灵草', requested: 10, consumed: 1, pointsAdded: 5, before: 99, after: 104, quality: 0, stageTarget: 100, stageBefore: 99, stageAfter: 100, reference: 'r1_1_r_abc_' + 'a'.repeat(24), expiresAt: '2026-10-28T03:30:00Z' } },
  { action: 'promote_spirit_root', operation: 'spirit-root.promote', command: '/灵根晋品 0 104', input: { expectedQuality: 0, expectedCultivation: 104 }, data: { view: spiritRootView, message: '已晋品' } },
  { action: 'preview_shop_purchase', operation: 'shops.purchase', command: '/购买 1 2', input: { productId: 1, count: 2 }, args: { mode: 'preview', productId: 1, count: 2 }, data: { preview: { productId: 1, shopCode: 'WANBAOLOU', name: '灵石', paid: '20 SPIRIT_CRYSTAL', granted: 4, buyCount: 2, needsConfirmation: false }, reference: shopReference, expiresAt: '2026-10-28T00:05:00Z' } },
  { action: 'confirm_shop_purchase', operation: 'shops.purchase', command: '/购买', input: { reference: shopReference }, args: { mode: 'reference', reference: shopReference }, data: { reference: shopReference, result: { name: '灵石', paid: '20 SPIRIT_CRYSTAL', granted: 4, buyCount: 2 } } },
  { action: 'consume_item', operation: 'items.consume', command: '/消耗 精力丹 1', input: { itemName: '精力丹', quantity: 1 }, data: { outcome: 'consumed', message: '已服用', remainingQuantity: 0 } },
  { action: 'get_green_bottle_capacity', operation: 'green-bottle.capacity', command: '/小绿瓶存储', input: {}, data: { experienceCost: 300, maxAvailable: 3, canStore: true } },
  { action: 'store_green_bottles', operation: 'green-bottle.store', command: '/小绿瓶存储 9', input: { count: 9 }, data: { success: true, message: '已存储', experienceCost: 300, converted: 3, remainingExp: 1001, totalBottles: 5 } },
  { action: 'learn_skill_book', operation: 'skill-books.learn', command: '/学习功法 2', input: { bookId: 2 }, args: { bookId: '2', confirm: null }, data: { outcome: 'learned', skillBook: { id: 2, name: '剑诀', skillType: '战技', grade: '下品', realm: '炼气', gradeLevel: 1, proficiency: 0 } } },
  { action: 'get_skill_switch_options', operation: 'skill-books.switch', command: '/切换战技', input: { skillType: '战技' }, args: { skillType: '战技', bookId: null, confirm: null }, data: { code: 'SHOW_LIST', skillType: '战技', options: [{ id: 2, name: '剑诀', skillType: '战技', status: 2, isInUse: false, canSwitch: true }] } },
  { action: 'switch_skill_book', operation: 'skill-books.switch', command: '/切换战技 2', input: { skillType: '战技', bookId: 2 }, args: { skillType: '战技', bookId: '2', confirm: null }, data: { code: 'OK', skillType: '战技', result: { outcome: 'switched', skillBook: { id: 2, name: '剑诀', skillType: '战技' } } } },
  { action: 'get_daily_activity', operation: 'activity-points.daily', command: '/日常活跃', input: {}, data: activityPanel },
  { action: 'get_weekly_activity', operation: 'activity-points.weekly', command: '/周常活跃', input: {}, data: { ...activityPanel, rewardType: 'weekly' } },
  { action: 'claim_daily_activity', operation: 'activity-points.claim-daily', command: '/领取日常活跃奖励 10', input: { requiredPoints: 10 }, args: { mode: 'claim', requiredPoints: 10 }, data: activityClaim },
  { action: 'claim_weekly_activity', operation: 'activity-points.claim-weekly', command: '/领取周常活跃奖励 10', input: { requiredPoints: 10 }, args: { mode: 'claim', requiredPoints: 10 }, data: activityClaim },
  { action: 'claim_all_daily_activity', operation: 'activity-points.claim-all-daily', command: '/一键领取日常活跃奖励', input: {}, data: activityAll },
  { action: 'claim_all_weekly_activity', operation: 'activity-points.claim-all-weekly', command: '/一键领取周常活跃奖励', input: {}, data: activityAll },
  { action: 'claim_month_card_rewards', operation: 'membership.claim-month-card', command: '/一键领取月卡', input: {}, data: { beforeTotal: 1, claim: { days: 1, rewards: { spiritCrystal: 150, mentalPill: 2, qiPill: 2 } }, status: monthStatus } },
  { action: 'claim_all_achievements', operation: 'achievements.claim-all', command: '/一键领取成就', input: {}, data: { access: { canUseFifthLayerFeature: true, realmName: '炼气' }, data: { claimedCount: 1, claimed: [{ category: 'general', categoryLabel: '通用', achievementName: '达成', issued: activityClaim.issued }] } } },
  { action: 'promote_realm', operation: 'realm.promotion', command: '/晋级', input: {}, data: { mode: 'promotion', result: { success: false, message: '条件不足', unlockedRecipes: [], masterStageMessages: [] } } },
  { action: 'open_tribulation', operation: 'tribulation.command', command: '/开启渡劫 7', input: { eventId: 7 }, args: { kind: 'open', eventId: 7 }, data: tribulationPrep },
  { action: 'preview_tribulation', operation: 'tribulation.command', command: '/渡劫评级 7 high', input: { eventId: 7, grade: 'high' }, args: { kind: 'confirm', eventId: 7, grade: 'high' }, data: { confirmationReference: tReference, materialNames: { 10: '渡劫石' }, confirmation: { eventId: 7, grade: 'high', attackMultiplier: 1.2, conditionVersion: 'a'.repeat(64), rewardScope: 'current', experienceBefore: 100, successExperienceCost: 0, failureExperienceAfter: 90, progress: tribulationProgress, materials: [{ itemId: 10, quantity: 1 }], battle: { mode: 'continuous_layers_v1', name: '雷劫', player: tribulationUnit, layers: [{ layer: 1, enemies: [tribulationUnit] }] } } } },
  { action: 'confirm_tribulation', operation: 'tribulation.command', command: '/渡劫开劫 ' + tReference, input: { reference: tReference }, args: { kind: 'reference', reference: tReference }, data: { eventId: 7, status: 'charging', grade: 'high', attackMultiplier: 1.2, conditionVersion: 'a'.repeat(64), confirmedAt: '2026-10-28T00:00:00Z', strikeAt: '2026-10-28T00:30:00Z', refunded: false } },
  { action: 'preview_heart_demon', operation: 'tribulation.command', command: '/心魔选择 7 guard', input: { eventId: 7, choice: 'guard' }, args: { kind: 'heartPreview', eventId: 7, choice: 'guard' }, data: { tribulationPreparation: tribulationPrep, confirmationReference: hReference } },
  { action: 'confirm_heart_demon', operation: 'tribulation.command', command: '/心魔回答 ' + hReference, input: { reference: hReference }, args: { kind: 'reference', reference: hReference }, data: { ...heart, choice: 'guard', answeredAt: '2026-10-28T00:00:00Z' } },
  { action: 'evade_tribulation', operation: 'tribulation.command', command: '/暂避渡劫 7', input: { eventId: 7 }, args: { kind: 'evade', eventId: 7 }, data: { eventId: 7, status: 'evaded', levelAfter: 1, recoversAt: '2026-10-28T01:00:00Z', retryAt: '2026-10-28T01:00:00Z' } },
  { action: 'get_alchemy_dashboard', operation: 'alchemy.v2', command: '/炼丹', input: {}, data: alchemyReply },
  { action: 'enroll_alchemist', operation: 'alchemy.v2', command: '/炼丹 入门', input: {}, data: alchemyReply },
  { action: 'get_alchemy_recipes', operation: 'alchemy.v2', command: '/炼丹 丹方 1', input: { page: 1 }, args: {}, data: alchemyReply },
  { action: 'preview_alchemy', operation: 'alchemy.v2', command: '/炼丹 预览 1 1000', input: { recipeId: 1, count: 1000 }, args: {}, data: alchemyReply },
  { action: 'confirm_alchemy', operation: 'alchemy.v2', command: '/炼丹 确认 ' + alchemyReference, input: { reference: alchemyReference }, args: {}, data: alchemyReply },
  { action: 'cultivate_cave_plot', operation: 'cave.cultivate', command: '/开垦 1', input: { plotIndex: 1 }, args: { plotIndex: '1' }, data: caveCommand },
  { action: 'plant_cave_seed', operation: 'cave.plant', command: '/播种 1 灵种', input: { plotIndex: 1, seedName: '灵种' }, args: { plotIndex: '1', seedName: '灵种' }, data: { mode: 'plant', result: caveCommand } },
  { action: 'water_cave_plots', operation: 'cave.water', command: '/浇灌 1', input: { plotIndex: 1 }, args: { plotIndex: '1' }, data: { mode: 'command', result: caveCommand } },
  { action: 'remove_cave_worms', operation: 'cave.worm', command: '/除虫', input: {}, args: { plotIndex: null }, data: { mode: 'command', result: caveCommand } },
  { action: 'remove_cave_weeds', operation: 'cave.weed', command: '/除草', input: {}, args: { plotIndex: null }, data: { mode: 'command', result: caveCommand } },
  { action: 'harvest_cave_plots', operation: 'cave.harvest', command: '/收割', input: {}, args: { plotIndex: null }, data: { mode: 'command', result: caveCommand } },
  { action: 'tend_cave_plots', operation: 'cave.tend-all', command: '/一键打理灵田', input: {}, args: { harvest: false }, data: { message: '浇灌：1 项\n收割：暂不可用' } },
  { action: 'checkin_guild', operation: 'guild.checkin', command: '/宗门签到', input: {}, data: { message: '签到完成', receipt: { message: '已签到', guildId: 1, contributionAdded: 1, prestigeAdded: 2, dailyActivityAdded: 3, weeklyActivityAdded: 4, weeklyBonusSpiritStone: 0, weeklyCheckinCount: 1 } } },
  { action: 'mine_guild', operation: 'guild.mining', command: '/宗门采矿', input: {}, data: { message: '采矿进行中', receipt: { outcome: 'in_progress', message: '进行中', guildName: '宗门', guildId: 1, veinLevel: 1, miningQuota: 2, remainingSeconds: 100, settledHours: 0, spiritStoneAdded: 0, contributionAdded: 0, dailyActivityAdded: 0, started: false, capReached: false } } },
  { action: 'claim_guild_stipend', operation: 'guild.stipend-claim', command: '/领取宗门俸禄', input: {}, data: { message: '领取完成', receipt: { guildId: 1, amount: 123, weeklyActivity: 40, guildLevel: 2, baseAmount: 100, levelMultiplier: 1.2, activityMultiplier: 1.025 } } },
  { action: 'challenge_storyline', operation: 'storyline.challenge', command: '/主线挑战 1-1', input: { chapterNumber: 1, stageNumber: 1 }, args: { input: '/主线挑战 1-1' }, data: manualState },
  { action: 'choose_storyline_skill', operation: 'storyline.choice', command: '/normal', input: { sessionId: 'manual-1', expectedRevision: 1, choice: 'normal' }, data: { ...manualState, choiceAccepted: false } },
  { action: 'challenge_dungeon', operation: 'dungeon.challenge', command: '/秘境挑战 秘境', input: { dungeonName: '秘境' }, args: { mode: 'challenge', dungeonName: '秘境' }, data: { outcome: 'result', data: { dungeonId: 1, won: false, experienceGained: 0, spiritStoneGained: 0, battle: { winner: 'B', rounds: 2 }, drops: [], rewardsByUser: [{ userId: 7, eligible: false, noRewardReason: '未胜利', spiritCostPaid: 10, experienceGained: 0, currency: [], items: [] }] } } },
  { action: 'sweep_dungeon', operation: 'dungeon.sweep', command: '/扫荡秘境 秘境 1', input: { dungeonName: '秘境', times: 1 }, args: { mode: 'sweep', dungeonName: '秘境', times: 1 }, data: { outcome: 'result', data: dungeonSweep } },
  { action: 'sweep_free_dungeons', operation: 'dungeon.sweep-free', command: '/扫荡免费秘境', input: {}, data: { sweptDungeons: [dungeonSweep], skippedDungeons: [{ dungeonName: '另一个秘境', message: '已完成' }], totalTimes: 1, totalExp: 20, totalSpiritCost: 0 } },
  { action: 'sweep_storyline', operation: 'storyline.sweep', command: '/主线扫荡 1-1 5', input: { chapterNumber: 1, stageNumber: 1, times: 5 }, args: { input: '/主线扫荡 1-1 5' }, data: { chapterNumber: 1, stageNumber: 1, result: { stageLabel: '第一关', times: 5, totalSpiritCost: 5, totalExp: 100, totalSpiritStone: 10, totalBonusExp: -90, expBonusText: '封顶', allItemsGained: [] } } },
  { action: 'claim_storyline_chest', operation: 'storyline.chests-claim', command: '/领取宝箱 1 1', input: { chapterNumber: 1, chestIndex: 1 }, args: { input: '/领取宝箱 1 1' }, data: chapterChests },
  { action: 'claim_storyline_chapter_chests', operation: 'storyline.chests-claim', command: '/领取宝箱 1', input: { chapterNumber: 1 }, args: { input: '/领取宝箱 1' }, data: chapterChests },
  { action: 'claim_all_storyline_chests', operation: 'storyline.chests-claim-all', command: '/一键领取宝箱', input: {}, data: { success: true, message: '已领取', totalReward: 10, claimedCount: 1, details: [{ chapterNumber: 1, chapterName: '第一章', claimed: [1], reward: 10 }] } },
  { action: 'challenge_world_boss', operation: 'world-boss.challenge', command: '/挑战凶兽', input: {}, args: { mode: 'single' }, data: { outcome: 'result', mode: 'single', data: bossRound } },
  { action: 'challenge_world_boss_all', operation: 'world-boss.challenge', command: '/挑战凶兽 全部', input: {}, args: { mode: 'all' }, data: { outcome: 'result', mode: 'all', data: { rounds: [bossRound], attemptsUsed: 1, totalDamageDealt: 10, lastRound: bossRound, stageName: '炼气', bossTitle: '凶兽', bossName: '兽', remainingAttempts: 2, stopReason: '测试中止' } } },
  { action: 'claim_world_boss_rewards', operation: 'world-boss.reward-claim', command: '/领取凶兽奖励', input: {}, data: { items: [{ bossDate: '2026-10-01', stageLevel: 1, stageName: '炼气', tierName: '参与', spiritStone: 10, spiritCrystal: 1, playerDamage: 10 }], totalStone: 10, totalCrystal: 1 } },
  { action: 'reset_demon_tower', operation: 'demon-tower.reset', command: '/妖塔重置', input: {}, data: { success: true, message: '已重置', resetsUsed: 1, maxResets: 3 } },
  { action: 'sweep_demon_tower', operation: 'demon-tower.sweep', command: '/妖塔扫荡', input: {}, data: { layersSwept: 1, totalSpiritStone: 10, totalScore: 2, cumulativeStars: 3, milestonesTriggered: [], nextLayer: 2, buffsToSelect: 1, availableBuffs: [{ key: 'hp', label: '生命', cnKey: '生命' }] } },
  { action: 'select_demon_tower_buff', operation: 'demon-tower.buff', command: '/妖塔选buff hp 1', input: { buffKey: 'hp', count: 1 }, args: { selection: { buffKey: 'hp', count: 1 } }, data: { outcome: 'result', data: { count: 1, buffApplied: 'hp', newBuffs: { hp: 0.1, atk: 0, critDmg: 0 }, remainingBuffSelections: 0, buffOptions: [] } } },
  { action: 'challenge_demon_tower', operation: 'demon-tower.challenge', command: '/妖塔挑战 3', input: { stars: 3 }, data: { outcome: 'result', data: { success: false, starsEarned: 0, scoreEarned: 0, totalTowerScore: 5, spiritStoneEarned: 0, layerCleared: false, allCleared: false, nextLayer: 1, nextStage: 1, cumulativeStars: 0, needSelectBuff: false, condition: 'ROUND_LIMIT', conditionLabel: '回合', battleWinner: 'B', battleRounds: 5, milestonesTriggered: [], availableBuffs: [] } } },
  { action: 'equip_equipment', operation: 'equipment.equip', command: '/装备 3', input: { identifier: '3' }, data: { outcome: 'equipped', equipment } },
  { action: 'auto_equip_equipment', operation: 'equipment.auto-equip', command: '/一键装备', input: {}, data: { success: false, message: '部分可用', results: [{ typeName: '武器', equipped: false, reason: '无可用装备' }] } },
  { action: 'unequip_equipment', operation: 'equipment.unequip-one', command: '/卸下 武器', input: { equipmentTypeName: '武器' }, data: { outcome: 'unequipped', stage: 'cache_cleared', instanceId: 3 } },
  { action: 'unequip_skill_book', operation: 'skill-books.unequip', command: '/换下战技', input: { skillType: '战技' }, data: { outcome: 'unequipped', skillBook: { name: '剑诀', skillType: '战技' } } },
  { action: 'hide_skill_book', operation: 'skill-books.hide', command: '/隐藏功法 3', input: { bookId: 3 }, args: { bookId: '3' }, data: { code: 'UPDATED', bookId: 3, isHidden: true, name: '剑诀', message: '已隐藏' } },
  { action: 'show_skill_book', operation: 'skill-books.show', command: '/显示功法 3', input: { bookId: 3 }, args: { bookId: '3' }, data: { code: 'UPDATED', bookId: 3, isHidden: false, name: '剑诀', message: '已显示' } },
  { action: 'open_lootbox', operation: 'lootboxes.open', command: '/开启礼盒 礼盒 10', input: { lootboxName: '礼盒', openCount: 10 }, data: { lootboxName: '礼盒', openCount: 2, rewards: [{ category: 'currency', rewardId: 1, name: '灵石', quantity: 5 }] } },
  { action: 'get_meditation_boost_options', operation: 'meditation.boost-options', command: '/闭关加速', input: {}, data: { autoEnabled: true, enabled: true, pricePerInterval: 5, intervalMinutes: 15, spiritStone: 100, maxHours: 8, multiplier: 1.5 } },
  { action: 'breakthrough_realm', operation: 'realm.breakthrough', command: '/突破', input: {}, data: { newRealm: { name: '炼气', level: 2, spiritualPower: 2, speed: 2, magicAttack: 2, physicalAttack: 2, magicDefense: 2, physicalDefense: 2, experienceLimit: 100.5 }, message: '成功', unlockedRecipes: [], isNewStage: false, masterStageMessages: [] } },
  { action: 'save_battle_template', operation: 'battle-templates.save', command: '/保存战斗模板 2 配装', input: { slot: 2, name: '配装' }, args: { slotText: '2', name: '配装' }, data: { ...summary, created: false } },
  { action: 'apply_battle_template', operation: 'battle-templates.apply', command: '/应用战斗模板 2', input: { slot: 2 }, args: { slotText: '2', name: null }, data: { ...summary, cacheInvalidated: true } },
  { action: 'delete_battle_template', operation: 'battle-templates.delete', command: '/删除战斗模板 2', input: { slot: 2 }, args: { slotText: '2', name: null }, data: { deleted: false } },
  { action: 'checkin_daily', operation: 'checkin.daily', command: '/日常签到', input: {}, data: { accumulatedDays: 1, issued: [] } },
  { action: 'checkin_newcomer', operation: 'checkin.newcomer', command: '/新人签到', input: {}, data: { accumulatedDays: 1, expireDate: '2026-11-01', issued: [] } },
  { action: 'checkin_all', operation: 'checkin.hub', command: '/签到', input: {}, data: { results: [{ name: '日常', status: 'error', message: '未完成' }] } },
  { action: 'claim_email', operation: 'emails.claim', command: '/领取邮件 9', input: { emailId: 9 }, data: { emailId: 9, issued: [] } },
  { action: 'claim_all_emails', operation: 'emails.claim-all', command: '/一键领取邮件', input: {}, data: { claimed: 1, skipped: 2, total: 3 } }
];
for (const entry of cases) for (const mode of ['success', 'refused', 'malformed', 'disabled', 'spoof', 'missing-id', 'cancel'] as const) test(`${entry.action}: ${mode}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' }, expose: { enabled: mode !== 'disabled' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  const controller = new AbortController();
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${entry.operation}`);
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['x-bid'], 'owner');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, entry.command);
    assert.deepEqual(body.arguments, entry.args ?? entry.input);
    assert.equal(body.taskInput, undefined);
    if (mode === 'cancel') return new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
      controller.abort();
    });
    const refused = mode === 'refused';
    const middleware = {
      outcome: refused ? 'reject' : 'allow', reason: refused ? 'MAINTENANCE' : 'ALLOWED',
      identity: { bid: 'owner', account: { status: 'registered', playerId: 7 } },
      replies: refused ? [{ title: '维护', heading: '', text: '稍后再试', buttons: [], advice: [] }] : [], contextWarnings: [],
      ...(!refused ? { entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } : {})
    };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: !refused, branch: refused ? 'middleware' : 'business', middleware, ...(!refused ? { data: mode === 'malformed' ? {} : entry.data } : {}) } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const originalText = event.MessageText;
  setRobotTaskInput(event, 'pending-task');
  const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, mode === 'spoof' ? { ...entry.input, uid: 999 } : entry.input, { signal: controller.signal }), 'ai-plugin');
  const result = await invoke();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(event.MessageText, originalText);
  assert.equal(hasPendingRobotTaskInput(event), true);
  assert.equal(result.value.ok, mode === 'success' || mode === 'refused', JSON.stringify(result.value));
  if (result.value.ok) {
    const value = result.value.data as any;
    assert.equal(value.success, mode === 'success');
    if (mode === 'refused') { assert.equal(value.result, undefined); assert.equal(value.replies[0].text, '稍后再试'); }
    if (mode === 'success') {
      const again = await invoke();
      assert.deepEqual(again.value.ok && again.value.data, value);
      assert.equal(requests.length, 2);
      assert.ok(requests[0].headers['idempotency-key']);
      if (['get_my_team', 'get_team_info', 'get_team_list', 'get_team_applications', 'get_team_match', 'get_daily_activity', 'get_weekly_activity', 'get_guild_daily', 'get_guild_weekly'].includes(entry.action)) {
        assert.notEqual(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
      } else {
        assert.equal(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
      }
      if (entry.action === 'claim_all_daily_activity' || entry.action === 'claim_all_weekly_activity') { assert.equal(value.result.partial, true); assert.equal(value.result.error, '第二档未完成'); assert.deepEqual(value.result.claimed, [activityClaim]); }
      if (entry.action === 'checkin_all') assert.equal(value.result[0].status, 'error');
    }
  } else {
    assert.equal(requests.length, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
    assert.equal(result.value.error.outcome, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 'not_started' : 'unknown');
  }
});

test('写操作幂等键区分原消息、玩家和参数，参数顺序不改变重试键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    const args = (typeof request.data === 'string' ? JSON.parse(request.data) : request.data).arguments;
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: request.headers['x-bid'], account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: { ...summary, slot: Number(args.slotText), created: true } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  const run = async (target: typeof event, input: unknown) => {
    const result = await app.invoke(target, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'save_battle_template', input), 'ai-plugin');
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
  };
  await run(event, { slot: 2, name: '配装' });
  await run(event, { name: '配装', slot: 2 });
  await run(event, { slot: 3, name: '配装' });
  await run({ ...event, MessageId: 'different-message' }, { slot: 2, name: '配装' });
  await run({ ...event, UserId: 'other-player' }, { slot: 2, name: '配装' });
  assert.ok(keys.every(key => /^[0-9a-f]{64}$/.test(key)));
  assert.equal(keys[0], keys[1]);
  assert.equal(new Set([keys[0], ...keys.slice(2)]).size, 4);
});

for (const [action, input] of [
  ['get_team_list', { page: 0 }],
  ['get_team_info', { teamId: 0 }],
  ['apply_to_team', { teamId: 8, userId: 999 }],
  ['approve_team_application', { applicationId: 0 }],
  ['reject_team_application', { applicationId: Number.MAX_SAFE_INTEGER + 1 }],
  ['create_team', { leaderId: 999 }],
  ['start_mainline_match', { chapterNumber: 7, stageNumber: 0 }],
  ['start_dungeon_match', { dungeonId: 5, mode: 'single' }],
  ['cancel_team_match', { uid: 999 }],
  ['claim_guild_milestone', { type: 'daily_activity', milestoneId: 0 }],
  ['claim_all_guild_milestones', { type: 'monthly' }],
  ['worship_guild', { offer: '自动' }],
  ['get_guild_worship_options', { offer: '灵石' }],
  ['exchange_guild_shop_item', { itemIndex: 1 }],
  ['exchange_guild_shop_item', { itemIndex: 1, expected: { ...guildExpected, shopItemId: 0 } }],
  ['exchange_guild_shop_item', { itemIndex: 1, expected: { ...guildExpected, priceContribution: -1 } }],
  ['exchange_guild_shop_item', { itemIndex: 0, expected: guildExpected }],
  ['preview_soul_path_choose', { pathKey: '其他' }],
  ['preview_soul_path_advance', { pathKey: 'xuan_fa' }],
  ['confirm_soul_path', { token: 'choose:' + soulToken.slice(0, -1) }],
  ['confirm_soul_path', { token: '-'.repeat(36) }],
  ['confirm_soul_path', { token: soulToken, pathKey: 'lian_ti' }],
  ['nurture_soul_path', { direction: 'auto' }],
  ['set_soul_supply_direction', { direction: 'random' }],
  ['preview_spirit_root_feed', { itemId: 1, quantity: 0 }],
  ['promote_spirit_root', { expectedQuality: 0 }],
  ['promote_spirit_root', { expectedQuality: 0, expectedCultivation: -1 }],
  ['preview_shop_purchase', { productId: 0, count: 1 }],
  ['preview_shop_purchase', { productId: 1, count: 0 }],
  ['preview_shop_purchase', { productId: 1, count: 2147483648 }],
  ['confirm_shop_purchase', { reference: 'r1_1_a_abc_' + 'a'.repeat(24) }],
  ['confirm_shop_purchase', { reference: 'r1_1_s_abc_' + 'a'.repeat(23) }],
  ['confirm_shop_purchase', { reference: 'r1_1_s_abc_' + 'a'.repeat(24), count: 3 }],
  ['consume_item', { itemName: '精力丹', quantity: 0 }],
  ['consume_item', { itemName: '精力丹', quantity: 1.5 }],
  ['consume_item', { itemName: '精力丹\n晋级', quantity: 1 }],
  ['consume_item', { itemName: '123', quantity: 1 }],
  ['consume_item', { itemName: '药'.repeat(65), quantity: 1 }],
  ['store_green_bottles', { count: 0 }],
  ['learn_skill_book', { bookId: 2, force: true }],
  ['switch_skill_book', { skillType: '战技', bookId: 2, confirm: '确认' }],
  ['get_skill_switch_options', { skillType: '未知' }],
  ['claim_daily_activity', { requiredPoints: 0 }],
  ['claim_daily_activity', { requiredPoints: 1.5 }],
  ['claim_weekly_activity', { requiredPoints: Number.MAX_SAFE_INTEGER + 1 }],
  ['claim_all_daily_activity', { type: 'weekly' }],
  ['preview_tribulation', { eventId: 7, grade: '任意' }],
  ['confirm_tribulation', { reference: 'r1_1_h_abc_' + 'a'.repeat(24) }],
  ['confirm_heart_demon', { reference: 'r1_1_t_abc_' + 'a'.repeat(24) }],
  ['preview_heart_demon', { eventId: 7, choice: 'force' }],
  ['evade_tribulation', { eventId: 0 }],
  ['preview_alchemy', { recipeId: 1, count: 1001 }],
  ['preview_alchemy', { recipeId: 1, count: 0 }],
  ['confirm_alchemy', { reference: 'r1_1_a_abc_' + 'a'.repeat(23) }],
  ['confirm_alchemy', { reference: 'r1_1_f_abc_' + 'a'.repeat(24) }],
  ['confirm_forge', { reference: 'r1_1_a_abc_' + 'a'.repeat(24) }],
  ['confirm_forge', { reference: 'b3_untrusted-payload' }],
  ['cultivate_cave_plot', { plotIndex: 0 }],
  ['plant_cave_seed', { plotIndex: 1, seedName: '' }],
  ['water_cave_plots', { plotIndex: -1 }],
  ['mine_guild', { guildId: 999 }],
  ['challenge_storyline', { chapterNumber: 1, stageNumber: 5 }],
  ['choose_storyline_skill', { sessionId: 'manual-1', choice: 'normal' }],
  ['choose_storyline_skill', { sessionId: 'manual-1', expectedRevision: 0, choice: 'normal' }],
  ['choose_storyline_skill', { sessionId: 'manual-1', expectedRevision: 1, choice: '任意技能' }],
  ['sweep_dungeon', { dungeonName: '秘境', times: 2 }],
  ['sweep_dungeon', { dungeonName: '秘境', times: 9 }],
  ['sweep_storyline', { chapterNumber: 1, stageNumber: 5, times: 1 }],
  ['sweep_storyline', { chapterNumber: 1, stageNumber: 1, times: 10000 }],
  ['claim_storyline_chest', { chapterNumber: 1, chestIndex: 0 }],
  ['challenge_dungeon', { dungeonName: '' }],
  ['challenge_demon_tower', { stars: 0 }],
  ['challenge_demon_tower', { stars: 4 }],
  ['select_demon_tower_buff', { buffKey: 'hp', count: 0 }],
  ['select_demon_tower_buff', { buffKey: 'speed', count: 1 }],
  ['challenge_world_boss', { mode: 'all' }],
  ['open_lootbox', { lootboxName: '礼盒', openCount: 0 }],
  ['open_lootbox', { lootboxName: '礼盒', openCount: 11 }],
  ['open_lootbox', { lootboxName: '礼盒', openCount: 1.5 }],
  ['open_lootbox', { lootboxName: '', openCount: 1 }],
  ['equip_equipment', { identifier: '' }],
  ['unequip_equipment', { equipmentTypeName: '' }],
  ['unequip_skill_book', { skillType: '任意功法' }],
  ['hide_skill_book', { bookId: Number.MAX_SAFE_INTEGER + 1 }],
  ['show_skill_book', { bookId: -1 }],
  ['apply_battle_template', { slot: 6 }],
  ['save_battle_template', { slot: 1.5 }],
  ['delete_battle_template', { slot: 0 }]
] as const) test(`${action}: 拒绝非法参数 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': {} } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.equal(result.value.ok, false);
  if (!result.value.ok) {
    assert.equal(result.value.error.code, 'INVALID_INPUT');
    assert.equal(result.value.error.outcome, 'not_started');
  }
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
});
