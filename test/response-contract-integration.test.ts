import { getBackendTitleOverview } from '../src/api/bot/title-overview-query';
import { getBackendCaveLogs } from '../src/api/bot/cave-queries';
import { getBackendRandomFriend } from '../src/api/bot/random-friend-queries';
import { getBackendAchievementOverview } from '../src/api/bot/achievement-overview-query';
import { getBackendCombatPowerAchievements } from '../src/api/bot/combat-power-achievement-query';
import { getBackendAttributePanel } from '../src/api/bot/attribute-panel';
import { getBackendEquipped } from '../src/api/bot/equipped-queries';
import { getBackendSoulPathState, nurtureBackendSoulPath } from '../src/api/bot/soul-path';
import { getBackendSoulArtifactOverview } from '../src/api/bot/soul-artifact-overview-queries';
import { parseSoulArtifactEquipPreview, parseSoulArtifactEquipResult } from '../src/api/bot/soul-artifact-equip';
import { refineBackendSoulArtifact } from '../src/api/bot/soul-artifact-commands';
import { upgradeBackendSoulArtifactLevel } from '../src/api/bot/soul-artifact-upgrade';
import { upgradeBackendSoulArtifactGrade } from '../src/api/bot/soul-artifact-grade-upgrade';
import { unequipBackendSoulArtifact, parseSoulArtifactUnequipResult } from '../src/api/bot/soul-artifact-unequip';
import { getBackendInventory } from '../src/api/bot/inventory';
import { setBackendStorageLock } from '../src/api/bot/storage-lock';
import type { StorageLockRequest } from '../src/api/schemas/storage-lock';
import { saveBackendBattleTemplate } from '../src/api/bot/battle-template-save';
import { applyBackendBattleTemplate } from '../src/api/bot/battle-template-apply';
import { setBackendTaskSlotStep, setBackendTaskSlotAlias } from '../src/api/bot/task-config-action';
import { getBackendTaskConfig, getBackendTaskConfigLimits, validateBackendTaskConfigPage } from '../src/api/bot/task-config';
import { runBackendTaskRuntimeAction } from '../src/api/bot/task-runtime-action';
import type { TaskRuntimeAction } from '../src/api/schemas/task-runtime-action';
import { clearBackendTaskSlotWithLimits } from '../src/api/bot/task-slot-clear';
import { cancelBackendTaskRuntime } from '../src/api/bot/task-runtime-cancel';
import { deleteAllBackendEmails } from '../src/api/bot/email-delete-all';
import { getBackendBattleTemplates } from '../src/api/bot/battle-templates-query';
import { deleteBackendBattleTemplate } from '../src/api/bot/battle-template-delete';
import { requestBackend } from '../src/api/bot/client';
import { getBackendGuildReview } from '../src/api/bot/guild-review-queries';
import { getBackendGuildApplications } from '../src/api/bot/guild-application-queries';
import { getBackendGuildBattleTraining, postBackendGuildBattleTraining } from '../src/api/bot/guild-battle-training';
import { getBackendGuildDailyTask } from '../src/api/bot/guild-daily-task-query';
import { getBackendGuildWeeklyTask } from '../src/api/bot/guild-weekly-task-query';
import { getBackendGuildRoleOptions } from '../src/api/bot/guild-role-options-queries';
import { getBackendGuildMyRedPackets } from '../src/api/bot/guild-my-red-packets-queries';
import { getBackendGuildRedPackets } from '../src/api/bot/guild-red-packets-queries';
import { postBackendGuildCheckin } from '../src/api/bot/guild-checkin';


import { getBackendSkillDetail } from '../src/api/bot/skill-detail-queries';
import { getBackendLearnedBooks } from '../src/api/bot/learned-books-queries';

import { getBackendGuildAccess } from '../src/api/bot/queries';
import { getBackendToolCategories } from '../src/api/bot/queries';
import { getBackendSocialAccess, getBackendFriendAccess } from '../src/api/bot/queries';
import { getBackendMemories, getBackendStory } from '../src/api/bot/queries';
import { getBackendMarketTrades } from '../src/api/bot/queries';
import { getBackendEquipmentBag } from '../src/api/bot/queries';
import { getBackendSkillBookBag } from '../src/api/bot/queries';
import { getBackendProfessionToolBag } from '../src/api/bot/queries';
import { getBackendEncyclopediaDetail } from '../src/api/bot/queries';
import { getBackendEncyclopedia } from '../src/api/bot/queries';
import { getBackendEmailDetail } from '../src/api/bot/email-detail';
import { getBackendEmails } from '../src/api/bot/queries';
import { getBackendGuildMembers } from '../src/api/bot/queries';
import { getBackendTeamPendingApplications, getBackendTeamApplicationRecords, getBackendTeamBattleDetail, getBackendTeamBattleRecords, getBackendSoulArtifactBag, getBackendLootboxes, getBackendGachaOverview, getBackendGachaHistory, getBackendGachaGoods, getBackendGachaCatalog, getBackendMasterRanking, getBackendGuildLogs, getBackendTeams, getBackendGuilds, getBackendFriends, getBackendAchievements, getBackendGiftRecords, getBackendEnemies } from '../src/api/bot/queries';
import { getBackendFeedbacks, getBackendFeedbackDetail } from '../src/api/bot/queries';
import { getBackendGuildStorylineRecords } from '../src/api/bot/queries';
import { getBackendDungeonCatalog } from '../src/api/bot/queries';
import { getBackendDungeonDetailCommand } from '../src/api/bot/query-presentation';
import { getBackendWorldBossInfo } from '../src/api/bot/world-boss-info-queries';
import { getBackendWorldBossRanking } from '../src/api/bot/world-boss-ranking-queries';
import { getBackendWorldBossRewards } from '../src/api/bot/world-boss-rewards-queries';
import { getBackendTowerRanking } from '../src/api/bot/tower-ranking-queries';
import { getBackendStorylineRanking } from '../src/api/bot/storyline-ranking-queries';
import { getBackendRealmRanking } from '../src/api/bot/realm-ranking-queries';
import { getBackendAlchemyRanking } from '../src/api/bot/alchemy-ranking-queries';
import { getBackendTowerFirstRewards, getBackendTowerMonthlyRewards } from '../src/api/bot/tower-rewards-queries';
import { getBackendTianjiaoRewards } from '../src/api/bot/tianjiao-rewards-queries';
import { getBackendTianjiaoLeaderboard } from '../src/api/bot/tianjiao-leaderboard-queries';
import { challengeBackendTianjiao } from '../src/api/bot/tianjiao-challenge';
import { getBackendBounties } from '../src/api/bot/bounty-queries';
import { getBackendNewcomerGuide, continueBackendNewcomerGuide, skipBackendNewcomerGuide } from '../src/api/bot/newcomer-guide';
import { claimBackendNewcomerLogin, claimBackendNewcomerTask } from '../src/api/bot/newcomer-login-actions';
import { getBackendNewcomerRechargeInfo } from '../src/api/bot/newcomer-recharge-queries';
import { getBackendNewcomerLogin } from '../src/api/bot/newcomer-login-queries';
import { getBackendMarketGuideBalance } from '../src/api/bot/market-guide-balance';
import { previewBackendCompanionShopPurchase, purchaseBackendCompanionShop } from '../src/api/bot/companion-shop-purchase';
import { deleteBackendFriend } from '../src/api/bot/friend-removal';
import { challengeBackendGuildStoryline } from '../src/api/bot/guild-storyline-actions';
import { getBackendMarketBrowse } from '../src/api/bot/market-browse-query';
import { getBackendPlayerShopVisit } from '../src/api/bot/player-shop-visit-query';
import { marketListingsView, marketCredibilityView, marketWorkflow } from '../src/api/bot/market-community-views';
import { getBackendMarketSellable } from '../src/api/bot/market-trade';
import { getBackendOwnPlayerShop } from '../src/api/bot/player-shop-own';
import { getBackendGuildShopPage } from '../src/api/bot/guild-shop-page';
import { getBackendCheckInShop } from '../src/api/bot/checkin-shop-queries';
import { getBackendEventShop } from '../src/api/bot/event-shop-queries';
import { getBackendUnifiedShop } from '../src/api/bot/companion-shop-queries';
import { getBackendShopList, getBackendShopRanking } from '../src/api/bot/shop-queries';
import { getBackendCompetitionHome, getBackendCompetitionBattleDetail, getBackendPromotionTeams } from '../src/api/bot/competition-read-projections';
import { getBackendSecretRealmHome, challengeBackendSecretRealm, claimBackendSecretRealm } from '../src/api/bot/guild-secret-realm-war';
import { replaceBackendProfessionTool } from '../src/api/bot/profession-tool-replace';
import { parseTribulationPreparation } from '../src/api/schemas/tribulation';
import { observeBackendPublicTribulation } from '../src/api/bot/public-tribulation';
import { confirmBackendTribulationQuery } from '../src/api/bot/tribulation-confirmation-query';
import { getBackendTribulationReceipt } from '../src/api/bot/tribulation';
import { getBackendItemDetail } from '../src/api/bot/item-detail-queries';
import { executeBackendCompanionProposalCommand } from '../src/api/bot/interaction-overview';
import { claimBackendKillGodTitle } from '../src/api/bot/shaqi-queries';
import { getBackendRechargeCatalog } from '../src/api/bot/recharge-catalog-queries';
import { getBackendTowerRewardOverview } from '../src/api/bot/tower-reward-overview-queries';
import { applyBackendGlossaryEdit } from '../src/api/bot/glossary-apply';
import { getBackendStorylineCatalog } from '../src/api/bot/storyline-catalog-queries';
import { getBackendTaskPanelView } from '../src/api/bot/task-panel-view';
import { getBackendPublicPlayerProfile } from '../src/api/bot/public-player-profile-query';

import { commandBackendCompanionGift } from '../src/api/bot/companion-gift-command';
import { requestFriendWorkflow, requestTeamWorkflow } from '../src/api/bot/social-workflows';
import { requestGuildWorkflow } from '../src/api/bot/guild-workflow';
import { createBackendGuild, applyBackendGuild, decideBackendGuildApplication } from '../src/api/bot/guild-membership-mutations';
import { removeBackendBlocklist } from '../src/api/bot/blocklist-removal';
import { blockBackendUserByName } from '../src/api/bot/block-user-by-name';
import { setBackendFlyMailMute, commandBackendFlyMailMute } from '../src/api/bot/flymail-mute';
import { previewBackendSkillBookReroll, confirmBackendSkillBookReset } from '../src/api/bot/skill-book-reset-reroll';
import { cancelBackendMarketListing } from '../src/api/bot/market-cancel';
import { getBackendFriendRequests, getBackendBlocklist } from '../src/api/bot/queries';
import { acceptBackendFriendRequest } from '../src/api/bot/friend-request-actions';
import { leaveBackendGuild, transferBackendGuildLeadership } from '../src/api/bot/guild-member-lifecycle';
import { postBackendGuildUpgrade } from '../src/api/bot/guild-upgrade';
import { postBackendGuildMilestoneClaim, postBackendGuildMilestonesClaimAll } from '../src/api/bot/guild-milestone-claim';
import { likeBackendPopularity } from '../src/api/bot/popularity-like';
import { postBackendGuildMining } from '../src/api/bot/guild-mining';
import { postBackendGuildStipendClaim, postBackendGuildWorship } from '../src/api/bot/guild-worship-stipend';
import { exchangeBackendGuildShopByIndex } from '../src/api/bot/guild-shop-actions';
import { getBackendGuildAutoRefresh, getBackendGuildLeadership } from '../src/api/bot/guild-shop-auto-refresh';
import { sendBackendGuildRedPacket, claimBackendGuildRedPacket, recycleBackendGuildRedPacket } from '../src/api/bot/guild-red-packet-mutations';
import { getBackendCaveView, executeBackendCaveCommand } from '../src/api/bot/cave-command';
import { getBackendCaveVisit } from '../src/api/bot/cave-visit-queries';
import { getBackendCaveAccelerationPreview } from '../src/api/bot/cave-plot-actions';
import { activateBackendCaveFormation } from '../src/api/bot/cave-formation-actions';
import { confirmBackendSoulPathChoose } from '../src/api/bot/soul-path-choose';
import { confirmBackendSoulPathAction, previewBackendSoulPathAction } from '../src/api/bot/soul-path-action';
import { previewBackendSoulArtifactWash, confirmBackendSoulArtifactWash } from '../src/api/bot/soul-artifact-wash';
import { cancelBackendSoulWash } from '../src/api/bot/soul-wash-cancel';
import { pulseBackendMeridian } from '../src/api/bot/meridian';
import { getBackendTeamMatchSnapshot, guardBackendTeamMatchCommand } from '../src/api/bot/team-match-queries';
import { cancelBackendTeamMatch } from '../src/api/bot/team-match-cancel';
import { applyBackendTeam, inviteBackendTeam } from '../src/api/bot/team-actions';
import { getBackendTeamInfo } from '../src/api/bot/team-info-queries';
import { refreshBackendTeamInvitations } from '../src/api/bot/team-invitation-inbox';
import { applyBackendMaster, acceptBackendMaster, teachBackendMaster, blessBackendMaster, giftBackendMaster, applyBackendGraduation, decideBackendGraduation, rebelBackendMaster, expelBackendMaster, listBackendMasterProposals, listBackendGraduationProposals } from '../src/api/bot/master-actions';
import { getBackendMasterInfo } from '../src/api/bot/master-info-queries';
import { getBackendCompanionInfo } from '../src/api/bot/companion-info-queries';
import { breakupBackendCompanion, upgradeBackendCompanionOath, dualCultivateBackendCompanion } from '../src/api/bot/companion-relationship-actions';
import { useBackendSkillBookProficiency } from '../src/api/bot/skill-book-proficiency';
import { claimBackendLimitedEventTask } from '../src/api/bot/limited-event-actions';
import { claimBackendMonthCardOverview, claimBackendFirstRechargeOverview } from '../src/api/bot/reward-claim-overview';
import { claimBackendAchievementRewards } from '../src/api/bot/achievement-claim';
import { claimBackendFirstRewards, claimBackendMonthlyRewards } from '../src/api/bot/tower-reward-claims';
import { claimBackendEmail } from '../src/api/bot/email-claim';
import { claimAllBackendEmails } from '../src/api/bot/email-claim-all';
import { dailyBackendCheckIn, newcomerBackendCheckIn } from '../src/api/bot/daily-checkin';
import { claimBackendCelestialCheckIn } from '../src/api/bot/celestial-checkin';
import { redeemBackendGiftCode } from '../src/api/bot/gift-code-redeem';
import { claimBackendActivityReward, claimAllBackendActivityRewards } from '../src/api/bot/activity-points-claim';
import { bindBackendReferralCode, claimBackendReferralRewards } from '../src/api/bot/referral-actions';
import { claimBackendWeeklyRebate } from '../src/api/bot/weekly-rebate-claim';
import { activateBackendTitle, deactivateBackendTitle } from '../src/api/bot/title-actions';
import { claimBackendStorylineChest, claimAllBackendChapterChests, claimAllBackendStorylineChests } from '../src/api/bot/storyline-chest-claim';
import { claimBackendNewcomerRechargeDay } from '../src/api/bot/newcomer-recharge-claim';
import { consumeBackendItem, parsePeiyuanPending, parseMingwuSelection } from '../src/api/bot/consume';
import { equipBackendEquipment } from '../src/api/bot/equipment-equip';
import { previewBackendEquipmentBatchDecompose, batchDecomposeBackendEquipment } from '../src/api/bot/equipment-batch-decompose';
import { autoEquipBackendEquipment } from '../src/api/bot/equipment-auto-equip';
import { getBackendEquipmentDetail } from '../src/api/bot/equipment-detail-queries';
import { unequipBackendEquipmentOne } from '../src/api/bot/equipment-unequip-one';
import { decomposeBackendEquipment } from '../src/api/bot/equipment-decompose';
import { getBackendSkillBookBatchLearnCandidates, batchLearnCurrentBackendSkillBooks } from '../src/api/bot/skill-book-batch-learn';
import { unequipBackendSkillBook } from '../src/api/bot/skill-book-unequip';
import { upgradeBackendSkillBook } from '../src/api/bot/skill-book-upgrade';
import { batchUpgradeBackendSkillBook } from '../src/api/bot/skill-book-batch-upgrade';
import { decomposeBackendSkillBook } from '../src/api/bot/skill-book-decompose';
import { previewBackendSkillBookBatchDecompose, getBackendSkillBookDecomposeQuery } from '../src/api/bot/skill-book-batch-decompose';
import { learnBackendSkillBook } from '../src/api/bot/skill-book-learn';
import { switchBackendSkillBook } from '../src/api/bot/skill-book-switch';
import { activateBackendTheme } from '../src/api/bot/theme-state';
import { switchBackendInkMode } from '../src/api/bot/theme-ink-mode';
import { setBackendSkillVisibility } from '../src/api/bot/skill-visibility';
import { verifyBackendCaptcha } from '../src/api/bot/captcha-state';
import { cancelBackendGuildApplication } from '../src/api/bot/guild-application-cancel';
import { rejectBackendFriendRequest } from '../src/api/bot/friend-request-reject';
import { postBackendLimitedEventCheckin } from '../src/api/bot/limited-event-checkin';
import { openBackendLootbox } from '../src/api/bot/lootbox-open';
import { claimAllBackendWorldBossRewards } from '../src/api/bot/world-boss-claim';
import { sweepBackendDungeon, sweepBackendFreeDungeons } from '../src/api/bot/dungeon-sweep';
import { batchDecomposeBackendSkillBooks } from '../src/api/bot/skill-book-batch-decompose';
import { counterAttackBackend } from '../src/api/bot/counter-attack';
import { commandBackendSpar } from '../src/api/bot/spar';
import { acceptBackendBounty, publishBackendBounty, claimBackendBounty, getBackendPendingBountyRewards, getBackendBountyPublishPolicy } from '../src/api/bot/bounty-actions';
import { challengeBackendDungeon } from '../src/api/bot/dungeon-challenge';
import { challengeBackendTongtianTower, batchChallengeBackendTongtianTower } from '../src/api/bot/tongtian-tower';
import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performBackendRealmBreakthrough } from '../src/api/bot/realm-breakthrough';

import { getBackendNormalPaymentSettlement, getBackendLimitedEventPaymentSettlement } from '../src/api/bot/sponsor-payment';
import { getBackendRealmAccess } from '../src/api/bot/realm-access-queries';
import { getBackendGuildHome } from '../src/api/bot/guild-home-query';
import { getBackendProfessionDashboard } from '../src/api/bot/profession-dashboard-query';
import { readBackendStorylineManualBattle } from '../src/api/bot/storyline-manual-battle';

async function assertTitleOverviewContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  for (const suffix of ['1', '2', '999', 'Idle']) {
    const fixture = fixtures[`titleOverviewActual:${suffix}`];
    setPayload(fixture);
    const result = await getBackendTitleOverview('contract-player', suffix === 'Idle' ? 1 : Number(suffix));
    assert.deepEqual(result, {
      moodText: fixture.moodText,
      titles: (fixture.titles as Record<string, unknown>[]).map(item => ({
        id: item.id, title: item.title, isActive: item.isActive,
        description: item.description ?? null, bonusSummary: item.bonusSummary,
        expireDate: item.expireDate, actionLabel: item.actionLabel, actionCommand: item.actionCommand
      }))
    });
  }
  for (const field of ['id', 'title', 'isActive', 'description', 'bonusSummary', 'expireDate', 'actionLabel', 'actionCommand']) {
    const values: unknown[] = field === 'id'
      ? [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]
      : field === 'isActive' ? [undefined, null, 'false', 0, {}, []]
        : ['description', 'bonusSummary', 'expireDate'].includes(field) ? [1, false, {}, []]
          : [undefined, null, 1, false, {}, []];
    for (const value of values) {
      const fixture = structuredClone(fixtures['titleOverviewActual:1']);
      (fixture.titles as Record<string, unknown>[])[0][field] = value;
      setPayload(fixture);
      await assert.rejects(getBackendTitleOverview('contract-player', 1), /称号概览响应不完整/);
    }
  }
}

async function assertArtifactWashContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-artifact-wash', idempotencyKey: 'contract-artifact-wash' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('artifactWashActual:')) continue;
    setPayload(fixture);
    if (key.endsWith(':Preview') || key.endsWith(':Confirm')) {
      const pending = fixture.pending as Record<string, unknown>;
      const { updateData, ...projection } = pending;
      assert.ok(updateData);
      const result = key.endsWith(':Preview') ? await previewBackendSoulArtifactWash('contract-player', 1, key.includes(':Bounded:') ? 99 : key.includes(':One:') ? 1 : 2, request) : await confirmBackendSoulArtifactWash('contract-player', 1, request);
      assert.deepEqual(result, { ...fixture, pending: projection });
      assert.equal(result.pending.totalSuccess, key.includes(':Bounded:') ? 3 : key.includes(':One:') ? 1 : 2);
    } else {
      assert.deepEqual(await cancelBackendSoulWash('contract-player', 1, request), fixture);
    }
    tested++;
  }
  assert.equal(tested, 12);
  for (const totalSuccess of [undefined, null, false, '1', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    setPayload({ status: 'cancelled', totalSuccess });
    await assert.rejects(cancelBackendSoulWash('contract-player', 1, request), /取消接口数据不完整/);
  }
  const valid = fixtures['artifactWashActual:Two:Preview'];
  const pending = valid.pending as Record<string, unknown>;
  for (const field of ['instanceId', 'artifactId', 'times', 'totalSuccess', 'createdAt']) {
    setPayload({ ...valid, pending: { ...pending, [field]: Number.MAX_SAFE_INTEGER + 1 } });
    await assert.rejects(previewBackendSoulArtifactWash('contract-player', 1, 2, request), /本命物洗涤响应不完整/);
  }
}

async function assertArtifactLevelContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-artifact-level', idempotencyKey: 'contract-artifact-level' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('artifactLevelActual:')) continue;
    const raw = fixture.result as Record<string, unknown>;
    const artifact = raw.artifact as Record<string, unknown>;
    setPayload(raw);
    const result = await upgradeBackendSoulArtifactLevel('contract-player', 1, fixture.levels as number, request);
    assert.deepEqual(result, { ...raw, artifact: { id: artifact.id, name: artifact.name, level: artifact.level } });
    assert.equal(result.artifact.name, key.endsWith(':EmptyName') ? '' : '青莲');
    assert.equal(result.actualLevels, key.endsWith(':RealmCap') ? 2 : 1);
    assert.equal(result.cost, result.actualLevels * 100);
    if (key.endsWith(':Fractional')) assert.ok(result.comparison.some(row => !Number.isInteger(row.after)));
    tested++;
  }
  assert.equal(tested, 5);
  const raw = fixtures['artifactLevelActual:One'].result as { artifact: Record<string, unknown>; comparison: Record<string, unknown>[] };
  for (const field of ['id', 'level', 'previousLevel', 'actualLevels', 'cost']) {
    for (const invalid of [undefined, null, false, '1', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload(['id', 'level'].includes(field) ? { ...raw, artifact: { ...raw.artifact, [field]: invalid } } : { ...raw, [field]: invalid });
      await assert.rejects(upgradeBackendSoulArtifactLevel('contract-player', 1, 1, request), /本命物升级响应字段无效/);
    }
  }
  for (const field of ['before', 'after']) {
    for (const invalid of [undefined, null, false, '1']) {
      setPayload({ ...raw, comparison: [{ ...raw.comparison[0], [field]: invalid }] });
      await assert.rejects(upgradeBackendSoulArtifactLevel('contract-player', 1, 1, request), /本命物升级响应字段无效/);
    }
  }
}

async function assertArtifactGradeContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-artifact-grade', idempotencyKey: 'contract-artifact-grade' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('artifactGradeActual:')) continue;
    const raw = fixture.result as Record<string, unknown>;
    const artifact = raw.artifact as Record<string, unknown>;
    setPayload(raw);
    const result = await upgradeBackendSoulArtifactGrade('contract-player', 1, fixture.instance === 0 ? undefined : fixture.instance as number, request);
    assert.deepEqual(result, {
      artifact: { id: artifact.id, artifactId: artifact.artifactId, name: artifact.name, gradeId: artifact.gradeId, level: artifact.level },
      consumed: raw.consumed, previousGrade: raw.previousGrade, newGrade: raw.newGrade, previousGradeName: raw.previousGradeName, newGradeName: raw.newGradeName
    });
    assert.equal(result.artifact.name, key.endsWith(':EmptyName') ? '' : '青莲');
    assert.equal(result.artifact.level, key.endsWith(':Explicit') ? 7 : 0);
    assert.equal(result.consumed, 4);
    tested++;
  }
  assert.equal(tested, 3);
  const raw = fixtures['artifactGradeActual:Default'].result as Record<string, unknown>;
  const artifact = raw.artifact as Record<string, unknown>;
  for (const field of ['id', 'artifactId', 'gradeId', 'level', 'consumed', 'previousGrade', 'newGrade']) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const nested = ['id', 'artifactId', 'gradeId', 'level'].includes(field);
      setPayload(nested ? { ...raw, artifact: { ...artifact, [field]: invalid } } : { ...raw, [field]: invalid });
      await assert.rejects(upgradeBackendSoulArtifactGrade('contract-player', 1, undefined, request), /本命物升品接口字段无效/);
    }
  }
  setPayload({ ...raw, artifact: { ...artifact, name: null } });
  await assert.rejects(upgradeBackendSoulArtifactGrade('contract-player', 1, undefined, request), /artifact.name/);
}

async function assertArtifactUnequipContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-artifact', idempotencyKey: 'contract-artifact' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('artifactUnequipActual:')) continue;
    assert.deepEqual(parseSoulArtifactUnequipResult(fixture), fixture);
    setPayload(fixture);
    if (key.endsWith(':Confirmation')) {
      await assert.rejects(unequipBackendSoulArtifact('contract-player', 1, request), /分离本命物响应不完整/);
    } else {
      assert.deepEqual(await unequipBackendSoulArtifact('contract-player', 1, request), fixture);
    }
    if (key.endsWith(':Unequipped')) {
      const result = parseSoulArtifactUnequipResult(fixture);
      assert.equal(result.artifact?.name, key.includes(':MissingName:') ? null : key.includes(':EmptyName:') ? '' : '青莲');
    }
    tested++;
  }
  assert.equal(tested, 9);
  for (const outcome of ['unequipped', 'confirmation']) {
    const valid = fixtures['artifactUnequipActual:Normal:Unequipped'] as { artifact: Record<string, unknown> };
    for (const field of ['previousLevel', 'totalCost', 'refundQuantity']) {
      for (const invalid of [undefined, null, false, '1', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => parseSoulArtifactUnequipResult({ ...valid, outcome, artifact: { ...valid.artifact, [field]: invalid } }), /分离本命物响应不完整/);
      }
    }
  }
}

async function assertLootboxOpenContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-box', idempotencyKey: 'contract-box' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('lootboxOpenActual:')) continue;
    setPayload(fixture.result);
    const result = await openBackendLootbox('contract-player', 7, fixture.reference as string, fixture.requested as number, request);
    assert.deepEqual({ ...result }, fixture.result);
    assert.equal(result.openCount, key.endsWith(':ClampTen') ? 10 : key.endsWith(':PartialTen') ? 2 : 1);
    assert.equal(result.rewards.length, result.openCount);
    for (const reward of result.rewards) assert.deepEqual(reward, { category: 'lootbox', rewardId: 2, name: '子礼盒', quantity: 3 });
    tested++;
  }
  assert.equal(tested, 4);
  const valid = fixtures['lootboxOpenActual:ID'].result as { rewards: Record<string, unknown>[] };
  for (const field of ['openCount', 'rewardId', 'quantity']) {
    for (const invalid of [undefined, null, '1', false, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload(field === 'openCount' ? { ...valid, [field]: invalid } : { ...valid, rewards: [{ ...valid.rewards[0], [field]: invalid }] });
      await assert.rejects(openBackendLootbox('contract-player', 7, '1', 1, request), /礼盒接口字段无效/);
    }
  }
}

async function assertStorageBulkCapabilityContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  for (const kind of ['lockAll', 'unlockAll']) {
    for (const invalid of [undefined, null, '', false, 0, {}, []]) {
      setPayload({ ...fixtures.bookBagTyped, capabilities: [{ kind, skillType: invalid }] });
      await assert.rejects(getBackendSkillBookBag('contract-player', 1, 'SkillA', 1), /功法背包批量能力缺少分类/);
      setPayload({ ...fixtures.equipBagDefault, capabilities: [{ kind, equipmentType: invalid }] });
      await assert.rejects(getBackendEquipmentBag('contract-player', 1, null, 1), /装备接口批量能力缺少分类/);
    }
  }
  for (const kind of ['identify', 'identifyAll']) {
    for (const count of [undefined, null, '', false, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const valid = fixtures.bookBagUnidentified as { items: Record<string, unknown>[] };
      setPayload({ ...valid, items: [{ ...valid.items[0], capabilities: [{ kind, count }] }] });
      await assert.rejects(getBackendSkillBookBag('contract-player', 1, '未鉴定', 1), /功法背包接口返回未知能力/);
    }
  }
}

async function assertInventoryBagContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('inventoryBagActual:')) continue;
    setPayload(fixture.result);
    const result = await getBackendInventory('contract-player', fixture.uid as number, fixture.query as { category: 'prop' | 'material'; subtype: string; page: number });
    assert.deepEqual({ ...result }, fixture.result);
    tested++;
    if (key.endsWith(':First')) { assert.equal(result.items.length, 5); assert.equal(result.items[0].isLocked, 2); }
    if (key.endsWith(':Second')) { assert.equal(result.items.length, 1); assert.equal(result.items[0].quantity, 0); }
    if (key.endsWith(':Material')) {
      assert.equal(result.items[0].grade, null);
      assert.equal(result.items[0].realm, null);
      assert.equal(result.playerStageLevel, 4);
      assert.ok(result.capabilities.some(row => row.kind === 'nascentSoulPath'));
    }
  }
  assert.equal(tested, 7);
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('inventoryCapabilityActual:')) continue;
    setPayload(fixture.result);
    const result = await getBackendInventory('contract-player', 1, { category: fixture.category as 'prop' | 'material', subtype: fixture.subtype as string, page: 1 });
    assert.deepEqual({ ...result }, fixture.result);
    assert.equal(result.items.length, 1);
    assert.deepEqual(result.items[0].capabilities.map(row => row.kind), fixture.action ? [fixture.action, 'lock', 'viewDetail'] : ['lock', 'viewDetail']);
    if (key.endsWith(':Recipe')) assert.equal(result.items[0].capabilities[0].recipeId, 9);
    if (key.endsWith(':Malformed')) assert.equal(result.items[0].effect, null);
    if (key.endsWith(':Array')) assert.deepEqual(result.items[0].effect, []);
  }
  assert.equal(Object.keys(fixtures).filter(key => key.startsWith('inventoryCapabilityActual:')).length, 13);
  const recipe = fixtures['inventoryCapabilityActual:Recipe'].result as { items: Record<string, unknown>[] };
  for (const recipeId of [undefined, null, false, '9', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    setPayload({ ...recipe, items: [{ ...recipe.items[0], capabilities: [{ kind: 'viewRecipe', recipeId }] }] });
    await assert.rejects(getBackendInventory('contract-player', 1, { category: 'prop', subtype: 'danfang', page: 1 }), /背包接口返回不完整/);
  }

  const fixture = fixtures['inventoryBagActual:First'];
  const valid = fixture.result as { items: Record<string, unknown>[]; pagination: Record<string, unknown> };
  const run = () => getBackendInventory('contract-player', 1, { category: 'prop', page: 1 });
  for (const field of ['id', 'userItemId', 'itemId', 'quantity', 'listedQuantity', 'stackMax', 'permission', 'isLocked']) {
    for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...valid, items: [{ ...valid.items[0], [field]: invalid }] });
      await assert.rejects(run(), /背包接口返回不完整/);
    }
  }
  for (const [field, invalid] of [['type', null], ['subtype', false], ['isStackable', 1], ['grade', { id: 1, name: '一品' }], ['realm', { id: 1, name: '元婴' }], ['capabilities', [{ kind: 'viewRecipe', recipeId: Number.MAX_SAFE_INTEGER + 1 }]]] as const) {
    setPayload({ ...valid, items: [{ ...valid.items[0], [field]: invalid }] });
    await assert.rejects(run(), /背包接口返回不完整/);
  }
  for (const field of ['page', 'pageSize', 'total', 'totalPages']) {
    setPayload({ ...valid, pagination: { ...valid.pagination, [field]: Number.MAX_SAFE_INTEGER + 1 } });
    await assert.rejects(run(), /背包接口返回不完整/);
  }
}

async function assertStorageLockContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-lock', idempotencyKey: 'contract-lock' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('storageLockActual:')) continue;
    const body = fixture.input as StorageLockRequest;
    setPayload(fixture.result);
    const result = await setBackendStorageLock('contract-player', 1, body, request);
    assert.deepEqual({ ...result }, fixture.result);
    tested++;
    if (key === 'storageLockActual:Partial:0') {
      assert.equal(result.kind, 'name');
      if (result.kind === 'name') {
        assert.equal(result.name.completion, 'aborted');
        assert.ok(result.name.changedCount > 0);
        assert.equal(result.view.count, 0);
        assert.equal(result.view.success, false);
      }
    }
    const bad = structuredClone(fixture.result) as Record<string, unknown>;
    const view = bad.view as Record<string, unknown>;
    view.count = view.count === 0 ? 1 : 0;
    view.success = (view.count as number) > 0;
    setPayload(bad);
    await assert.rejects(setBackendStorageLock('contract-player', 1, body, request), /锁定接口展示数量不一致/);
  }
  assert.equal(tested, 30);
  const fixture = fixtures['storageLockActual:Name:0'];
  const result = fixture.result as Record<string, unknown>;
  const name = result.name as Record<string, unknown>;
  const changes = name.changes as Record<string, unknown>[];
  setPayload({ ...result, name: { ...name, changes: [
    { ...changes[0], count: Number.MAX_SAFE_INTEGER },
    { ...changes[1], count: 1 }
  ], changedCount: Number.MAX_SAFE_INTEGER } });
  await assert.rejects(setBackendStorageLock('contract-player', 1, fixture.input as StorageLockRequest, request), /锁定接口数量无效/);
  await assert.rejects(setBackendStorageLock('contract-player', 1, fixture.input as StorageLockRequest), /缺少唯一标识/);
}

async function assertStorageLockAssetContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-lock-asset', idempotencyKey: 'contract-lock-asset' };
  let tested = 0;
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('storageLockAssetActual:')) continue;
    const body = fixture.input as StorageLockRequest;
    setPayload(fixture.result);
    const result = await setBackendStorageLock('contract-player', 1, body, request);
    assert.deepEqual({ ...result }, fixture.result);
    assert.equal(result.kind, 'instance');
    if (result.kind !== 'instance') throw new Error('expected instance');
    tested++;
    if (key.includes(':SoulListed:')) assert.equal(result.instance.outcome, 'listed');
    if (key.includes(':OtherOwner:')) assert.equal(result.instance.outcome, 'not_found');
    if (key.endsWith(':0')) {
      if (key.includes(':SkillGroup:')) {
        assert.equal(result.instance.group, true);
        assert.equal(result.instance.count, 2);
      }
      if (key.includes(':SkillListedGroup:')) {
        assert.equal(result.instance.group, true);
        assert.equal(result.instance.count, 0);
        assert.equal(result.instance.outcome, 'not_changed');
      }
      if (key.includes(':ToolEmptyName:')) assert.equal(result.instance.name, '');
      if (/:(SoulMissingName|ToolNullName|SkillNullName|SkillMissingName):/.test(key)) assert.equal(result.instance.name, null);
    }
    for (const [field, invalid, pattern] of [
      ['group', null, /锁定接口变更结果不一致/],
      ['name', undefined, /锁定接口名称无效/],
      ['outcome', 'unknown', /锁定接口状态无效/]
    ] as const) {
      setPayload({ ...result, instance: { ...result.instance, [field]: invalid } });
      await assert.rejects(setBackendStorageLock('contract-player', 1, body, request), pattern);
    }
  }
  assert.equal(tested, 36);
  const fixture = fixtures['storageLockAssetActual:ToolEmptyName:0'];
  const result = fixture.result as { instance: Record<string, unknown> };
  for (const invalid of [{ group: true }, { outcome: 'learned' }, { outcome: 'listed' }]) {
    setPayload({ ...result, instance: { ...result.instance, ...invalid } });
    await assert.rejects(setBackendStorageLock('contract-player', 1, fixture.input as StorageLockRequest, request), /锁定接口资产状态不一致/);
  }
}

async function assertBattleTemplateContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-template', idempotencyKey: 'contract-template' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (key.startsWith('battleTemplateSaveActual:')) {
      setPayload(fixture.result);
      const result = await saveBackendBattleTemplate('contract-player', 1, fixture.slot as number, fixture.name === null ? undefined : fixture.name as string, request);
      assert.deepEqual({ ...result }, fixture.result);
      assert.equal(result.created, !key.endsWith(':Updated'));
      if (key.endsWith(':Updated')) assert.equal(result.name, '我的模板');
      if (key.endsWith(':DefaultName')) assert.equal(result.name, '战斗模板2');
      if (key.endsWith(':Empty')) assert.equal(result.equipmentCount, 0);
    }
    if (key.startsWith('battleTemplateApplyActual:')) {
      setPayload(fixture);
      const result = await applyBackendBattleTemplate('contract-player', 1, 1, request);
      assert.deepEqual({ ...result }, fixture);
      assert.equal(result.cacheInvalidated, !key.endsWith(':CacheUnavailable'));
      assert.equal(result.equipmentCount, key.endsWith(':Empty') ? 0 : 20);
    }
  }
  for (const kind of ['Save', 'Apply'] as const) {
    const valid = kind === 'Save' ? fixtures['battleTemplateSaveActual:Created'].result as Record<string, unknown> : fixtures['battleTemplateApplyActual:Success'];
    const run = () => kind === 'Save' ? saveBackendBattleTemplate('contract-player', 1, 1, undefined, request) : applyBackendBattleTemplate('contract-player', 1, 1, request);
    const error = kind === 'Save' ? /保存战斗模板响应不完整/ : /应用战斗模板响应不完整/;
    for (const field of ['equipmentCount', 'missingEquipmentCount', 'missingSkillCount']) {
      for (const invalid of [undefined, null, false, '0', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        setPayload({ ...valid, [field]: invalid });
        await assert.rejects(run(), error);
      }
    }
    for (const [field, invalid] of [['slot', 2], ['name', null], ['equipmentNames', [1]], ['skillNames', []], ['skillNames', { 战技: 1 }], [kind === 'Save' ? 'created' : 'cacheInvalidated', 'false']] as const) {
      setPayload({ ...valid, [field]: invalid });
      await assert.rejects(run(), error);
    }
  }

  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('battleTemplateDeleteActual:')) continue;
    setPayload(fixture.result);
    assert.deepEqual(await deleteBackendBattleTemplate('contract-player', 1, fixture.slot as number, request), fixture.result);
  }
  for (const deleted of [undefined, null, 'false', 0, 1, {}, []]) {
    setPayload({ deleted });
    await assert.rejects(deleteBackendBattleTemplate('contract-player', 1, 1, request), /删除战斗模板响应不完整/);
  }
  for (const slot of [0, 6, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(deleteBackendBattleTemplate('contract-player', 1, slot, request), /模板槽位必须为 1-5 的整数/);
  }
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('battleTemplatesActual:')) continue;
    setPayload(fixture);
    const result = await getBackendBattleTemplates('contract-player', 1);
    assert.deepEqual(result, fixture);
    assert.equal(result.current.slot, 0);
    if (key.endsWith(':Normal')) {
      const saved = result.templates.find(row => row.slot === 2);
      assert.equal(saved?.equipmentCount, 6);
      assert.equal(saved?.missingEquipmentCount, 5);
      assert.equal(saved?.missingSkillCount, 2);
    }
    if (key.endsWith(':Transferred')) assert.equal(result.templates.find(row => row.slot === 2)?.missingEquipmentCount, 6);
    if (key.endsWith(':EmptySaved') || key.endsWith(':AllEmpty')) assert.deepEqual(result.templates, []);
    if (key.endsWith(':AllEmpty')) {
      assert.deepEqual(result.current.equipmentNames, []);
      assert.deepEqual(result.current.skillNames, {});
      assert.equal(result.current.equipmentCount, 0);
    }
  }
  for (const field of ['slot', 'equipmentCount', 'missingEquipmentCount', 'missingSkillCount']) {
    for (const invalid of [undefined, null, false, '0', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      for (const current of [false, true]) {
        const bad = structuredClone(fixtures['battleTemplatesActual:Normal']);
        const row = current ? bad.current as Record<string, unknown> : (bad.templates as Record<string, unknown>[])[0];
        row[field] = invalid;
        setPayload(bad);
        await assert.rejects(getBackendBattleTemplates('contract-player', 1), /战斗模板接口返回不完整/);
      }
    }
  }
}

async function assertFriendAcceptContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-friend', idempotencyKey: 'contract-friend' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('friendAcceptActual:')) continue;
    setPayload(fixture);
    assert.deepEqual(await acceptBackendFriendRequest('contract-player', 2, 88, request), fixture);
    if (key.endsWith(':EmptyTargetName')) assert.equal(fixture.targetName, '');
  }
  const valid = fixtures['friendAcceptActual:Accepted'];
  for (const requestId of [undefined, null, false, '88', {}, [], -1, 0, 1.5, 89, Number.MAX_SAFE_INTEGER + 1]) {
    setPayload({ ...valid, requestId });
    await assert.rejects(acceptBackendFriendRequest('contract-player', 2, 88, request), /好友申请结算响应不完整/);
  }
  for (const success of [undefined, null, 'false', 0, 1, {}, []]) {
    setPayload({ ...valid, success });
    await assert.rejects(acceptBackendFriendRequest('contract-player', 2, 88, request), /好友申请结算响应不完整/);
  }
}

async function assertEmailDeleteContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-email-delete', idempotencyKey: 'contract-email-delete' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('emailDeleteActual:')) continue;
    setPayload(fixture.result);
    assert.deepEqual(await deleteAllBackendEmails('contract-player', fixture.uid as number, request), fixture.result);
  }
  const valid = fixtures['emailDeleteActual:Partial'].result as Record<string, unknown>;
  for (const field of ['deleted', 'total']) {
    for (const invalid of [undefined, null, false, '1', {}, [], -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...valid, [field]: invalid });
      await assert.rejects(deleteAllBackendEmails('contract-player', 1, request), /批量删除邮件计数不完整/);
    }
  }
  setPayload({ deleted: 2, total: 1 });
  await assert.rejects(deleteAllBackendEmails('contract-player', 1, request), /批量删除邮件计数不完整/);
}

async function assertConsumeContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-consume', idempotencyKey: 'contract-consume' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('consumePendingActual:')) continue;
    const peiyuan = key.includes(':peiyuan:');
    const quantity = peiyuan ? Number(key.split(':')[2]) : 2;
    setPayload(fixture);
    const result = await consumeBackendItem('contract-player', 1, { itemName: peiyuan ? '培元丹' : '明悟丹', quantity }, request);
    assert.deepEqual(result, fixture);
    const pending = peiyuan ? parsePeiyuanPending(result.pending) : parseMingwuSelection(result.pending);
    assert.deepEqual(pending, fixture.pending);
    if (!peiyuan) {
      const selection = parseMingwuSelection(result.pending);
      assert.equal(selection.remainingCount, 10 - Number(key.split(':')[2]));
      assert.equal(selection.books.find(book => book.proficiency === 60)?.canSelect, false);
      assert.equal(selection.books.find(book => book.proficiency === -1)?.canSelect, true);
    }
  }
  const selection = fixtures['consumePendingActual:mingwu:0'].pending as Record<string, unknown>;
  for (const field of ['quantity', 'remainingCount']) {
    for (const invalid of [undefined, null, false, '1', {}, [], -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => parseMingwuSelection({ ...selection, [field]: invalid }), /明悟丹待选择响应不完整/);
    }
  }
  for (const field of ['skillBookId', 'proficiency']) {
    for (const invalid of [undefined, null, false, '1', {}, [], 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const bad = structuredClone(selection);
      (bad.books as Record<string, unknown>[])[0][field] = invalid;
      assert.throws(() => parseMingwuSelection(bad), /明悟丹待选择响应不完整/);
    }
  }
  const pending = fixtures['consumePendingActual:peiyuan:2'].pending as Record<string, unknown>;
  for (const invalid of [undefined, null, false, '2', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parsePeiyuanPending({ ...pending, quantity: invalid }), /培元丹待确认响应不完整/);
  }
  const view = pending.view as Record<string, unknown>;
  for (const field of ['hasChanges', 'showRollDetails']) {
    assert.throws(() => parsePeiyuanPending({ ...pending, view: { ...view, [field]: !view[field] } }), /培元丹待确认响应不完整/);
  }
  for (const field of ['changeLines', 'rollLines']) {
    for (const invalid of [undefined, null, 'text', [1], [null]]) {
      assert.throws(() => parsePeiyuanPending({ ...pending, view: { ...view, [field]: invalid } }), /培元丹待确认响应不完整/);
    }
  }
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (!key.startsWith('consumeActual:')) continue;
    const input = fixture.input as { itemName: string; itemId: number; storageId: number; pillOnly: boolean; quantity: number };
    setPayload(fixture.result);
    const result = await consumeBackendItem('contract-player', 1, {
      quantity: input.quantity,
      ...(input.itemName ? { itemName: input.itemName } : {}),
      ...(input.itemId ? { itemId: input.itemId } : {}),
      ...(input.storageId ? { storageId: input.storageId } : {}),
      ...(input.pillOnly ? { pillOnly: true } : {})
    }, request);
    assert.deepEqual(result, fixture.result);
    if (key.includes('Partial')) assert.equal(result.remainingQuantity, 0);
    if (key.endsWith(':GiftRejected')) assert.equal(result.outcome, 'rejected');
  }
  for (const outcome of [undefined, null, false, 1, {}, [], '', 'unknown']) {
    setPayload({ ...fixtures.consumeLastItem, outcome });
    await assert.rejects(consumeBackendItem('contract-player', 1, { itemName: '精力丹', quantity: 1 }, request), /消耗道具响应不完整/);
  }
}

async function assertTaskClearContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-clear', idempotencyKey: 'contract-clear' };
  for (const [key, fixture] of Object.entries(fixtures)) {
    if (key.startsWith('taskClearActual:')) {
      setPayload(fixture.result);
      assert.deepEqual(await clearBackendTaskSlotWithLimits('contract-player', fixture.uid as number, fixture.slot as number, request), fixture.result);
    } else if (key.startsWith('taskCancelActual:')) {
      setPayload(fixture);
      assert.deepEqual(await cancelBackendTaskRuntime('contract-player', 1, request), fixture);
    }
  }
  const clear = fixtures['taskClearActual:SameRuntime'].result as Record<string, unknown>;
  setPayload(fixtures['taskLimitsActual:1']);
  assert.deepEqual(await clearBackendTaskSlotWithLimits('contract-player', 1, 6), { outcome: 'invalid_slot', limits: fixtures['taskLimitsActual:1'] });
  await assert.rejects(clearBackendTaskSlotWithLimits('contract-player', 1, 1), /当前平台消息缺少唯一标识/);
  for (const invalid of [null, false, 1, 'true', {}, []]) {
    setPayload({ cleared: invalid });
    await assert.rejects(cancelBackendTaskRuntime('contract-player', 1, request), /任务取消响应不完整/);
    setPayload({ ...clear, limits: invalid });
    await assert.rejects(clearBackendTaskSlotWithLimits('contract-player', 1, 1, request), /任务清空响应不完整/);
    for (const field of ['cleared', 'runtimeCleared']) {
      if (field === 'runtimeCleared' && invalid === false) continue;
      setPayload({ ...clear, result: { cleared: true, runtimeCleared: false, [field]: invalid } });
      await assert.rejects(clearBackendTaskSlotWithLimits('contract-player', 1, 1, request), /任务清空响应不完整/);
    }
  }
  for (const invalid of [undefined, null, false, 1, {}, []]) {
    setPayload({ ...clear, result: invalid });
    await assert.rejects(clearBackendTaskSlotWithLimits('contract-player', 1, 1, request), /任务清空响应不完整/);
  }
  for (const outcome of [undefined, null, false, 1, '', 'unknown']) {
    setPayload({ ...clear, outcome });
    await assert.rejects(clearBackendTaskSlotWithLimits('contract-player', 1, 1, request), /任务清空响应不完整/);
  }
  for (const invalid of [null, false, 1, [], 'bad']) {
    setPayload(invalid);
    await assert.rejects(clearBackendTaskSlotWithLimits('contract-player', 1, 1, request), /任务清空响应不完整/);
  }
}

async function assertTaskRuntimeContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'contract-runtime', idempotencyKey: 'contract-runtime' };
  const expected: Record<string, string> = {
    NotRunning: 'not_running', SkipNotRunning: 'not_running', InvalidSlot: 'invalid_slot', EmptySlot: 'empty_slot',
    AliasStarted: 'started', Current: 'current', Expected: 'expected', Next: 'next', SkipCompleted: 'completed',
    Started: 'started', NextAgain: 'next', Completed: 'completed', LegacyEmptyRuntime: 'not_running'
  };
  for (const [name, outcome] of Object.entries(expected)) {
    const fixture = fixtures[`runtimeActionActual:${name}`];
    setPayload(fixture.result);
    const result = await runBackendTaskRuntimeAction('contract-player', 1, fixture.action as TaskRuntimeAction, fixture.input as string, fixture.slot as number, request);
    assert.deepEqual(result, fixture.result);
    assert.equal(result.outcome, outcome);
    if (name === 'Completed') assert.equal(result.executed, '领取');
    if (name === 'SkipCompleted') assert.equal(result.executed, undefined);
    if (name === 'Current') assert.equal(result.page, undefined);
    if (name === 'NotRunning') assert.ok(result.page);
  }
  const current = fixtures['runtimeActionActual:Current'].result as Record<string, unknown>;
  for (const outcome of [undefined, null, false, 1, {}, [], '', 'unknown']) {
    setPayload({ ...current, outcome });
    await assert.rejects(runBackendTaskRuntimeAction('contract-player', 1, 'overview', undefined, undefined, request), /任务运行状态机响应不完整/);
  }
  for (const field of ['command', 'executed', 'message']) {
    for (const invalid of [null, false, 1, {}, []]) {
      setPayload({ ...current, [field]: invalid });
      await assert.rejects(runBackendTaskRuntimeAction('contract-player', 1, 'overview', undefined, undefined, request), /任务运行状态机响应不完整/);
    }
  }
  for (const field of ['slot', 'step']) {
    for (const invalid of [null, false, '1', {}, [], 0, -1, 1.5, 11, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...current, [field]: invalid });
      await assert.rejects(runBackendTaskRuntimeAction('contract-player', 1, 'overview', undefined, undefined, request), /任务运行状态机响应不完整/);
    }
  }
}

async function assertTaskConfigContracts(fixtures: Record<string, Record<string, unknown>>, setPayload: (value: unknown) => void) {
  for (const uid of [1, 2]) {
    const state = fixtures[`taskConfigActual:${uid}`];
    const limits = fixtures[`taskLimitsActual:${uid}`];
    setPayload(state);
    assert.deepEqual(await getBackendTaskConfig('contract-player', uid), state);
    setPayload(limits);
    assert.deepEqual(await getBackendTaskConfigLimits('contract-player', uid), limits);
    const page = { config: state.config, limits };
    assert.equal(validateBackendTaskConfigPage(page), page);
  }
  const state = fixtures['taskConfigActual:1'];
  const limits = fixtures['taskLimitsActual:1'];
  for (const version of [undefined, null, false, 1, {}, [], '']) {
    setPayload({ ...state, version });
    await assert.rejects(getBackendTaskConfig('contract-player', 1), /任务配置接口返回不完整/);
  }
  const invalidConfigs: unknown[] = [undefined, null, false, 1, [], {}, { slots: [] }];
  for (const invalid of [undefined, null, false, 1, {}, []]) {
    for (const field of ['alias', 'steps']) {
      if (field === 'steps' && Array.isArray(invalid)) continue;
      const config = structuredClone(state.config) as { slots: Record<string, unknown>[] };
      config.slots[0][field] = invalid;
      invalidConfigs.push(config);
    }
    const config = structuredClone(state.config) as { slots: Record<string, unknown>[] };
    config.slots[0].steps = [invalid];
    invalidConfigs.push(config);
  }
  for (const config of invalidConfigs) {
    setPayload({ ...state, config });
    await assert.rejects(getBackendTaskConfig('contract-player', 1), /任务配置接口返回不完整/);
    assert.throws(() => validateBackendTaskConfigPage({ config, limits }), /任务展示配置响应不完整/);
  }
  for (const badLimits of [undefined, null, [], {}, { ...limits, isMonthCard: 'false' }, { ...limits, slotCount: 10 }, { ...limits, maxSteps: 10 }]) {
    setPayload(badLimits);
    await assert.rejects(getBackendTaskConfigLimits('contract-player', 1), badLimits === undefined ? /Response is missing data/ : /任务权益接口返回不完整/);
    assert.throws(() => validateBackendTaskConfigPage({ config: state.config, limits: badLimits }), /任务展示配置响应不完整/);
  }
  for (const badLimits of [{ ...limits, isMonthCard: 'false' }, { ...limits, slotCount: 10 }, { ...limits, maxSteps: 10 }]) {
    setPayload({ ...state, ...badLimits });
    await assert.rejects(getBackendTaskConfig('contract-player', 1), /任务配置接口返回不完整/);
  }
}

async function assertCavePageContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void, getRequestURL: () => string) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('cavePageActual:'))) {
    const expected = fixtures[key];
    setPayload(expected.response);
    assert.deepEqual(await getBackendCaveLogs('contract-player', expected.uid, expected.page), expected.response);
    tested++;
  }
  assert.equal(tested, 9);
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('caveCursorActual:'))) {
    setPayload(fixtures[key]);
    assert.deepEqual(await getBackendCaveLogs('contract-player', 2), fixtures[key]);
  }
  const source = fixtures['cavePageActual:First'].response;
  for (const field of ['page', 'total', 'totalPages']) {
    for (const invalid of [undefined, null, false, '1', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...source, [field]: invalid });
      await assert.rejects(getBackendCaveLogs('contract-player', 2), /洞府记录接口返回格式不完整/);
    }
  }
  for (const invalid of [null, false, 1, [], {}]) {
    setPayload({ ...source, nextCursor: invalid });
    await assert.rejects(getBackendCaveLogs('contract-player', 2), /洞府记录接口返回格式不完整/);
  }
  for (const invalid of [undefined, null, false, 1, [null], [{}]]) {
    setPayload({ ...source, logs: invalid });
    await assert.rejects(getBackendCaveLogs('contract-player', 2), /洞府记录接口返回格式不完整/);
  }
  setPayload({ ...source, page: 3 });
  await assert.rejects(getBackendCaveLogs('contract-player', 2), /洞府记录接口返回格式不完整/);
  setPayload(source);
  for (const [page, expected] of [[-1, 1], [0, 1], [1.9, 1], [NaN, 1], [Infinity, Number.MAX_SAFE_INTEGER]]) {
    await getBackendCaveLogs('contract-player', 2, page);
    const url = new URL(getRequestURL(), 'http://contract.test');
    assert.equal(url.searchParams.get('page'), String(expected));
    assert.equal(url.searchParams.get('pageSize'), '5');
  }
  for (const uid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
    await assert.rejects(getBackendCaveLogs('contract-player', uid), /洞府记录查询参数无效/);
  }
  for (const bid of [undefined, '', ' ']) {
    await assert.rejects(getBackendCaveLogs(bid, 2), /查询缺少平台身份/);
  }
}

async function assertRandomFriendContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('randomFriendActual:'))) {
    setPayload(fixtures[key]);
    const uid = key.endsWith(':Locked10') ? 10 : key.endsWith(':Locked999') ? 999 : 1;
    assert.deepEqual(await getBackendRandomFriend('contract-player', uid), fixtures[key]);
    tested++;
  }
  assert.equal(tested, 7);
  const source = fixtures['randomFriendActual:Candidate6'];
  for (const invalid of [undefined, null, false, '6', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    setPayload({ ...source, player: { ...source.player, uid: invalid } });
    await assert.rejects(getBackendRandomFriend('contract-player', 1), /随机道友信息字段不完整/);
  }
  for (const invalid of [undefined, false, [], {}]) {
    for (const field of ['realmName', 'activeTitle']) {
      setPayload({ ...source, player: { ...source.player, [field]: invalid } });
      await assert.rejects(getBackendRandomFriend('contract-player', 1), /随机道友文本字段不完整/);
    }
  }
  setPayload({ ...source, access: { ...source.access, ok: false } });
  await assert.rejects(getBackendRandomFriend('contract-player', 1), /随机道友资格字段不完整/);
  setPayload(source);
  for (const uid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
    await assert.rejects(getBackendRandomFriend('contract-player', uid), /随机道友查询参数无效/);
  }
  for (const bid of [undefined, '', '  ']) {
    await assert.rejects(getBackendRandomFriend(bid, 1), /查询缺少平台身份/);
  }
}

async function assertAchievementOverviewContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('achievementOverviewActual:'))) {
    const expected = fixtures[key];
    setPayload(expected);
    assert.deepEqual(await getBackendAchievementOverview('contract-player', 1), expected);
    tested++;
  }
  assert.equal(tested, 7);
  const source = fixtures['achievementOverviewActual:Default'];
  for (const path of [
    ['totalClaimable'], ['summary', 'totalAchievements'], ['summary', 'completedAchievements'],
    ['categories', 0, 'total'], ['categories', 0, 'completed'], ['categories', 0, 'claimableCount']
  ]) {
    for (const invalid of [undefined, null, false, '1', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = structuredClone(source);
      let row = result;
      for (const key of path.slice(0, -1)) row = row[key];
      row[path[path.length - 1]] = invalid;
      setPayload(result);
      await assert.rejects(getBackendAchievementOverview('contract-player', 1), /成就总览响应不完整/);
    }
  }
  for (const invalid of [undefined, null, false, 1, [], 'row']) {
    for (const field of ['access', 'summary']) {
      setPayload({ ...source, [field]: invalid });
      await assert.rejects(getBackendAchievementOverview('contract-player', 1), /成就总览响应不完整/);
    }
    setPayload({ ...source, categories: [invalid] });
    await assert.rejects(getBackendAchievementOverview('contract-player', 1), /成就总览响应不完整/);
  }
  for (const invalid of [undefined, null, false, '33.33', []]) {
    setPayload({ ...source, summary: { ...source.summary, completionRate: invalid } });
    await assert.rejects(getBackendAchievementOverview('contract-player', 1), /成就总览响应不完整/);
    const result = structuredClone(source);
    result.categories[0].completionRate = invalid;
    setPayload(result);
    await assert.rejects(getBackendAchievementOverview('contract-player', 1), /成就总览响应不完整/);
  }
}

async function assertCombatAchievementContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('combatAchievementActual:'))) {
    const expected = fixtures[key];
    setPayload(expected);
    assert.deepEqual(await getBackendCombatPowerAchievements('contract-player', 1), expected);
    tested++;
  }
  assert.equal(tested, 5);
  const source = fixtures['combatAchievementActual:Default'];
  for (const field of ['currentPower', 'totalCount', 'completedCount', 'claimableCount']) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...source, [field]: invalid });
      await assert.rejects(getBackendCombatPowerAchievements('contract-player', 1), /战力成就响应不完整/);
    }
  }
  for (const path of [['items', 0, 'id'], ['nextTarget', 'id'], ['nextTarget', 'threshold'], ['nextTarget', 'remainingPower']]) {
    const values: unknown[] = [undefined, null, false, '1'];
    if (path[path.length - 1] === 'id') values.push(-1, 1.5, Number.MAX_SAFE_INTEGER + 1);
    for (const invalid of values) {
      const result = structuredClone(source);
      let row = result;
      for (const key of path.slice(0, -1)) row = row[key];
      row[path[path.length - 1]] = invalid;
      setPayload(result);
      await assert.rejects(getBackendCombatPowerAchievements('contract-player', 1), /战力成就响应不完整/);
    }
  }
  const claimable = fixtures['combatAchievementActual:Claimable'];
  for (const field of ['id', 'remainingClaimableCount']) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...claimable, currentClaimable: { ...claimable.currentClaimable, [field]: invalid } });
      await assert.rejects(getBackendCombatPowerAchievements('contract-player', 1), /战力成就响应不完整/);
    }
  }
}

async function assertAttributePanelContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('attributePanelActual:'))) {
    const expected = fixtures[key];
    setPayload(expected);
    assert.deepEqual(await getBackendAttributePanel('contract-player', 1), { ...expected, resourceRecovery: undefined });
    tested++;
  }
  assert.equal(tested, 5);
  const source = fixtures['attributePanelActual:Default'];
  const numericFields = Object.keys(source).filter(key => typeof source[key] === 'number' && key !== 'uid');
  assert.equal(numericFields.length, 25);
  for (const field of numericFields) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...source, [field]: invalid });
      await assert.rejects(getBackendAttributePanel('contract-player', 1), /属性面板响应字段无效/);
    }
  }
  for (const invalid of [undefined, null, false, '1', 2, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    setPayload({ ...source, uid: invalid });
    await assert.rejects(getBackendAttributePanel('contract-player', 1), /属性面板响应不完整/);
  }
  for (const invalid of [undefined, false, 'theme', []]) {
    setPayload({ ...source, theme: invalid });
    await assert.rejects(getBackendAttributePanel('contract-player', 1), /属性面板响应不完整/);
  }
}

async function assertEquippedOverviewContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('equippedOverviewActual:'))) {
    const expected = structuredClone(fixtures[key]);
    setPayload(expected);
    const result = await getBackendEquipped('contract-player', 1);
    expected.sets.forEach((set: any) => {
      set.recoveryEffects = [];
      set.effects.forEach((entry: any) => {
        for (const field of ['id', 'createdAt', 'updatedAt', 'deletedAt', 'setId']) delete entry.effect[field];
      });
    });
    assert.deepEqual(result, expected);
    tested++;
  }
  assert.equal(tested, 3);
  const source = fixtures['equippedOverviewActual:1'];
  const paths = [
    ['types', 0, 'id'], ['items', 0, 'id'], ['items', 0, 'equipmentId'],
    ['items', 0, 'equipment', 'id'], ['items', 0, 'equipment', 'equipmentTypeId'], ['items', 0, 'equipment', 'setId'],
    ['slots', 0, 'type', 'id'], ['slots', 0, 'item', 'id'], ['slots', 0, 'item', 'equipmentId'],
    ['slots', 0, 'item', 'equipment', 'id'], ['slots', 0, 'item', 'equipment', 'equipmentTypeId'],
    ['slots', 0, 'item', 'equipment', 'setId'], ['sets', 0, 'id'], ['sets', 0, 'count'],
    ['sets', 0, 'effects', 0, 'effect', 'pieces'],
    ...['physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed'].map(field => ['sets', 0, 'effects', 0, 'effect', field])
  ];
  for (const path of paths) {
    for (const invalid of [undefined, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = structuredClone(source);
      let row = result;
      for (const key of path.slice(0, -1)) row = row[key];
      row[path[path.length - 1]] = invalid;
      setPayload(result);
      await assert.rejects(getBackendEquipped('contract-player', 1), /查询接口/);
    }
  }
  const fractional = structuredClone(source);
  fractional.sets[0].effects[0].effect.magicDefensePercent = 1.25;
  setPayload(fractional);
  assert.equal((await getBackendEquipped('contract-player', 1)).sets[0].effects[0].effect.magicDefensePercent, 1.25);
}

async function assertProfessionDashboardContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('professionDashboardActual:'))) {
    const expected = structuredClone(fixtures[key]);
    setPayload(expected);
    const result = await getBackendProfessionDashboard('contract-player', 1);
    expected.alchemy.equipments = expected.alchemy.equipments.map((item: any) => ({
      typeName: item.typeName, equipped: item.equipped,
      equipmentName: item.equipped === false && item.equipmentName === undefined ? null : item.equipmentName,
      gradeName: item.equipped === false && item.gradeName === undefined ? null : item.gradeName
    }));
    assert.deepEqual(result, expected);
    tested++;
  }
  assert.equal(tested, 8);
  const source = fixtures['professionDashboardActual:Guide'];
  for (const [section, fields] of [
    ['alchemy', ['level', 'exp', 'nextExpRequired', 'totalCrafts', 'learnedRecipeCount']],
    ['lingzhi', ['level', 'exp', 'nextExpRequired', 'dailyExpGained', 'dailyExpCap', 'maxPlots', 'maxFieldGrade', 'yieldBonus']],
    ['guide', ['step', 'expiresAt']]
  ] as const) {
    for (const field of fields) {
      const values: unknown[] = [undefined, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1];
      if (!['nextExpRequired', 'step', 'expiresAt'].includes(field)) values.push(null);
      for (const invalid of values) {
        const result = structuredClone(source);
        const row = section === 'guide' ? result.alchemy.guide : result[section];
        row[field] = invalid;
        setPayload(result);
        await assert.rejects(getBackendProfessionDashboard('contract-player', 1), /职业面板接口/);
      }
    }
  }
}

async function assertSoulStateContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'soul-state-contract', idempotencyKey: 'soul-state-contract' };
  for (const name of ['Before', 'After']) {
    const expected = fixtures[`soulStateActual:${name}`];
    setPayload(expected);
    assert.deepEqual(await getBackendSoulPathState('contract-player', 1), expected);
  }
  const nurture = fixtures['soulStateActual:Nurture'];
  setPayload(nurture);
  assert.deepEqual(await nurtureBackendSoulPath('contract-player', 1, 'wu_dao', request), nurture);
  const preview = fixtures['soulStateActual:Preview'];
  setPayload(preview);
  assert.deepEqual(await previewBackendSoulPathAction('contract-player', 1, 'reroll', null, request), preview);
  const confirmed = fixtures['soulStateActual:Confirmed'];
  setPayload(confirmed);
  const { direction, directionName, tier, tierName, stabilityBefore, stabilityAfter, insightGained, proficiencyGained, extraItems } = confirmed.nurture;
  assert.deepEqual(await confirmBackendSoulPathAction('contract-player', 1, '00000000-0000-0000-0000-000000000001', request), {
    action: 'reroll', nurture: { direction, directionName, tier, tierName, stabilityBefore, stabilityAfter, insightGained, proficiencyGained, extraItems }
  });
  for (const field of ['stability', 'insight', 'lowYieldStreak', 'pathProficiency']) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...fixtures['soulStateActual:Before'], [field]: invalid });
      await assert.rejects(getBackendSoulPathState('contract-player', 1), /神魂状态响应不完整/);
    }
  }
  for (const field of ['stabilityBefore', 'stabilityAfter', 'insightGained', 'proficiencyGained', 'dailyNurtureCount', 'dailyNurtureLimit']) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...nurture, [field]: invalid });
      await assert.rejects(nurtureBackendSoulPath('contract-player', 1, 'wu_dao', request), /神魂温养响应不完整/);
      if (['dailyNurtureCount', 'dailyNurtureLimit'].includes(field)) continue;
      setPayload({ ...confirmed, nurture: { ...confirmed.nurture, [field]: invalid } });
      await assert.rejects(confirmBackendSoulPathAction('contract-player', 1, '00000000-0000-0000-0000-000000000001', request), /神魂重选响应不完整/);
    }
  }
  for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const extraItems = [{ name: '悟道残篇', quantity: invalid }];
    setPayload({ ...nurture, extraItems });
    await assert.rejects(nurtureBackendSoulPath('contract-player', 1, 'wu_dao', request), /神魂温养响应不完整/);
    setPayload({ ...confirmed, nurture: { ...confirmed.nurture, extraItems } });
    await assert.rejects(confirmBackendSoulPathAction('contract-player', 1, '00000000-0000-0000-0000-000000000001', request), /神魂重选响应不完整/);
  }
}

async function assertArtifactOverviewContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  let tested = 0;
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('artifactOverviewActual:'))) {
    const expected = fixtures[key];
    const view = key.endsWith(':Equipped') ? 'equipped' : undefined;
    setPayload(expected);
    const result = await getBackendSoulArtifactOverview('contract-player', 1, view);
    assert.equal(result.maxLevel, expected.realmLevel === null ? 36 : expected.realmLevel);
    assert.equal(result.equippedInstanceId, expected.equippedInstanceId);
    assert.deepEqual(result.capabilities, expected.capabilities);
    if (view) assert.equal(result.hasDisplayItems, expected.hasDisplayItems);
    assert.deepEqual(result.items, expected.items.map((item: any) => {
      const { instanceId, artifactId, name, category, positioning, gradeId, gradeName, level, washCount,
        hasUpgraded, isEquipped, lockStatus, statusText, maxAffixCount, capabilities, panels, basePanels } = item;
      return { instanceId, artifactId, name, category, positioning, gradeId, gradeName, level, washCount,
        hasUpgraded, isEquipped, lockStatus, statusText, maxAffixCount, capabilities, panels, basePanels,
        recoveryEffects: [], isListed: lockStatus === 2, washQuality: item.washQualityText, revealedAffixCount: panels.length };
    }));
    tested++;
  }
  assert.equal(tested, 8);
  const source = fixtures['artifactOverviewActual:Full:Full'];
  for (const field of ['instanceId', 'artifactId', 'gradeId', 'level', 'washCount', 'lockStatus', 'maxAffixCount']) {
    for (const invalid of [undefined, null, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = structuredClone(source);
      result.items[0][field] = invalid;
      setPayload(result);
      await assert.rejects(getBackendSoulArtifactOverview('contract-player', 1), /本命物查询/);
    }
  }
  for (const field of ['realmLevel', 'equippedInstanceId']) {
    for (const invalid of [undefined, false, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      setPayload({ ...source, [field]: invalid });
      await assert.rejects(getBackendSoulArtifactOverview('contract-player', 1), /本命物/);
    }
  }
  for (const field of ['instanceId', 'maxLevels', 'requiredItemId', 'requiredQuantity', 'availableQuantity']) {
    const itemIndex = source.items.findIndex((item: any) => item.capabilities.some((cap: any) => field in cap));
    assert.ok(itemIndex >= 0, `actual Go fixture must contain capability ${field}`);
    const capIndex = source.items[itemIndex].capabilities.findIndex((cap: any) => field in cap);
    for (const invalid of [false, '1', 1.5, -1, Number.MAX_SAFE_INTEGER + 1]) {
      const result = structuredClone(source);
      result.items[itemIndex].capabilities[capIndex][field] = invalid;
      setPayload(result);
      await assert.rejects(getBackendSoulArtifactOverview('contract-player', 1), /本命物/);
    }
  }
  const fractional = structuredClone(source);
  fractional.items[0].basePanels[0].value = 1.25;
  fractional.items[0].panels[0].washBonus = 0.125;
  setPayload(fractional);
  const result = await getBackendSoulArtifactOverview('contract-player', 1);
  assert.equal(result.items[0].basePanels[0].value, 1.25);
  assert.equal(result.items[0].panels[0].washBonus, 0.125);
}

async function assertArtifactEquipContracts(fixtures: Record<string, any>, setPayload: (value: unknown) => void) {
  const request = { requestId: 'artifact-equip-contract', idempotencyKey: 'artifact-equip-contract' };
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('artifactEquipActual:'))) {
    const expected = fixtures[key];
    setPayload(expected);
    const result = await refineBackendSoulArtifact('contract-player', 1, 10, key.endsWith(':Confirmed'), request);
    assert.deepEqual(result.preview, expected.preview);
    assert.equal(result.consumed, null);
    if (expected.equipped === null) {
      assert.equal(result.equipped, null);
    } else {
      const { id, artifactId, name, category, gradeId, level, washCount, isEquipped, isListed } = expected.equipped.artifact;
      const old = expected.equipped.separated;
      assert.deepEqual(result.equipped, {
        artifact: { id, artifactId, name, category, gradeId, level, washCount, isEquipped, isListed },
        separated: old === null ? null : { name: old.name, previousLevel: old.previousLevel, refundQuantity: old.refundQuantity }
      });
    }
  }
  const source = fixtures['artifactEquipActual:Replacement:Confirmed'];
  const invalidCounts = [undefined, null, false, '1', -1, 1.5, Number.MAX_SAFE_INTEGER + 1];
  for (const field of ['id', 'artifactId', 'gradeId', 'level', 'washCount']) {
    for (const invalid of invalidCounts) {
      const result = structuredClone(source.equipped);
      result.artifact[field] = invalid;
      assert.throws(() => parseSoulArtifactEquipResult(result), /炼化本命物响应不完整/);
    }
  }
  for (const field of ['previousLevel', 'refundQuantity']) {
    for (const invalid of invalidCounts) {
      const result = structuredClone(source.equipped);
      result.separated[field] = invalid;
      assert.throws(() => parseSoulArtifactEquipResult(result), /炼化本命物响应不完整/);
    }
  }
  for (const field of ['instanceId', 'gradeId', 'level']) {
    for (const invalid of invalidCounts) {
      const result = structuredClone(source.preview);
      result.target[field] = invalid;
      assert.throws(() => parseSoulArtifactEquipPreview(result), /本命物炼化预览响应不完整/);
    }
  }
  const fractional = structuredClone(source.preview);
  fractional.target.panels[0].value = 1.25;
  assert.equal(parseSoulArtifactEquipPreview(fractional).target?.panels[0].value, 1.25);
}

test('actual Go omitempty and nil-slice JSON passes robot SDK and adapters', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/ROBOT_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go response fixture output missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  const request = { requestId: 'contract-message', idempotencyKey: 'contract-message' };
  for (const key of Object.keys(fixtures).filter(key => key.startsWith('tribulationPreparation_'))) {
    assert.equal(parseTribulationPreparation(fixtures[key]).status, fixtures[key].status);
    for (const invalid of [undefined, null, 0, {}, [fixtures[key].status]]) {
      assert.throws(() => parseTribulationPreparation({ ...fixtures[key], status: invalid }), /渡劫接口返回不完整/);
    }
  }
  const cases: { key: string; run: () => Promise<unknown> }[] = [
    ...['guildMemberQueryPage', 'guildMemberQueryLast', 'guildMemberQueryNone', 'guildMemberQueryMissing', 'guildMemberQueryDeleted'].map(key => ({ key, run: () => getBackendGuildMembers('contract-player', key === 'guildMemberQueryNone' ? 99 : key === 'guildMemberQueryMissing' ? 5 : key === 'guildMemberQueryDeleted' ? 6 : 1, key === 'guildMemberQueryLast' ? 99 : 1, 2) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('encyclopediaPage:')).map(key => ({ key, run: () => {
      const [, category, subCategory, page] = key.split(':');
      return getBackendEncyclopedia('contract-player', category, subCategory || null, Number(page));
    } })),
    ...['encyclopediaToolCategoriesFull', 'encyclopediaToolCategoriesEmpty'].map(key => ({ key, run: () => getBackendToolCategories('contract-player') })),
    ...Object.keys(fixtures).filter(key => key.startsWith('encyclopediaQuery')).map(key => ({ key, run: () => getBackendEncyclopediaDetail('contract-player', fixtures[key].category as string, key === 'encyclopediaQueryMissingGrade' ? 2 : 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('socialAccessQuery')).map(key => ({ key, run: () => getBackendSocialAccess('contract-player', 1) })),
    ...['historyQueryFullMemory', 'historyQueryEmptyMemory'].map(key => ({ key, run: () => getBackendMemories('contract-player', key === 'historyQueryFullMemory' ? 1 : 2) })),
    ...['historyQueryFullStory', 'historyQueryEmptyStory'].map(key => ({ key, run: () => getBackendStory('contract-player', key === 'historyQueryFullStory' ? 1 : 2) })),
    ...['encyclopediaDetailEmpty', 'encyclopediaDetailSources'].map(key => ({ key, run: () => getBackendEncyclopediaDetail('contract-player', '道具', 1) })),
    ...['encyclopediaListEmpty', 'encyclopediaListFull'].map(key => ({ key, run: () => getBackendEncyclopedia('contract-player', '道具', null, 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('emailDetailRaw')).map(key => ({ key, run: () => getBackendEmailDetail('contract-player', 1, 1) })),
    ...['emailQueryPage1', 'emailQueryPage99'].map(key => ({ key, run: () => getBackendEmails('contract-player', 1, key === 'emailQueryPage99' ? 99 : 1, 5) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('guildMembers')).map(key => ({ key, run: () => getBackendGuildMembers('contract-player', 1, 1, 5) })),
    ...[{ key: 'queuePendingFull', uid: 2 }, { key: 'queuePendingLeaderMissing', uid: 999 }, { key: 'queuePendingEmpty', uid: 777 }].map(entry => ({ key: entry.key, run: () => getBackendTeamPendingApplications('contract-player', entry.uid) })),
    ...[{ key: 'queueSentFull', uid: 7001 }, { key: 'queueSentLeader', uid: 2 }, { key: 'queueSentEmpty', uid: 8888 }].map(entry => ({ key: entry.key, run: () => getBackendTeamApplicationRecords('contract-player', entry.uid) })),
    ...['teamReportFull', 'teamReportNoMembers'].map(key => ({ key, run: () => getBackendTeamBattleDetail('contract-player', key === 'teamReportFull' ? 1 : 2) })),
    ...['teamHistoryFull', 'teamHistoryEmpty', 'teamHistoryOutOfRange'].map(key => ({ key, run: () => getBackendTeamBattleRecords('contract-player', key === 'teamHistoryOutOfRange' ? 99 : 1, 5) })),
    ...['tradeHistoryAll', 'tradeHistoryBuy', 'tradeHistorySell', 'tradeHistoryEmpty', 'tradeHistoryLast'].map(key => ({ key, run: () => getBackendMarketTrades('contract-player', key === 'tradeHistoryEmpty' ? 88 : 1, key === 'tradeHistoryBuy' ? 'buy' : key === 'tradeHistorySell' ? 'sell' : 'all', key === 'tradeHistoryEmpty' || key === 'tradeHistoryLast' ? 99 : 1, 2) })),
    ...['equipBagDefault', 'equipBagRobe', 'equipBagLife', 'equipBagEmpty', 'equipBagOutOfRange', 'equipBagMissingGrade'].map(key => ({ key, run: () => getBackendEquipmentBag('contract-player', key === 'equipBagEmpty' ? 999 : 1, key === 'equipBagRobe' ? 'Robe' : key === 'equipBagLife' ? '锤' : key === 'equipBagOutOfRange' || key === 'equipBagMissingGrade' ? 'Sword' : null, key === 'equipBagOutOfRange' ? 999 : 1) })),
    ...['bookBagDefault', 'bookBagUnidentified', 'bookBagTyped', 'bookBagEmpty', 'bookBagOutOfRange'].map(key => ({ key, run: () => getBackendSkillBookBag('contract-player', key === 'bookBagEmpty' ? 999 : 1, key === 'bookBagUnidentified' ? '未鉴定' : key === 'bookBagTyped' || key === 'bookBagOutOfRange' ? 'SkillA' : null, key === 'bookBagOutOfRange' ? 999 : 1) })),
    ...['toolBagDefault', 'toolBagB', 'toolBagEmpty', 'toolBagOutOfRange'].map(key => ({ key, run: () => getBackendProfessionToolBag('contract-player', key === 'toolBagEmpty' ? 999 : 1, key === 'toolBagDefault' ? undefined : key === 'toolBagB' ? 'B' : 'A', key === 'toolBagOutOfRange' ? 99 : 1) })),
    ...['artifactBagFull', 'artifactBagEmpty', 'artifactBagOutOfRange'].map(key => ({ key, run: () => getBackendSoulArtifactBag('contract-player', key === 'artifactBagEmpty' ? 999 : 1, key === 'artifactBagOutOfRange' ? 99 : 1) })),
    ...['boxListFull', 'boxListEmpty', 'boxListOutOfRange'].map(key => ({ key, run: () => getBackendLootboxes('contract-player', key === 'boxListEmpty' ? 999 : 1, key === 'boxListOutOfRange' ? 99 : 1) })),
    ...['lotteryOverviewReady', 'lotteryOverviewLow', 'lotteryOverviewInactive'].map(key => ({ key, run: () => getBackendGachaOverview('contract-player', key === 'lotteryOverviewLow' ? 2 : 1) })),
    ...['lotteryGoodsEmpty', 'lotteryGoodsFull'].map(key => ({ key, run: () => getBackendGachaGoods('contract-player', 1) })),
    ...['lotteryHistoryEmpty', 'lotteryHistoryFull'].map(key => ({ key, run: () => getBackendGachaHistory('contract-player', 1, 1) })),
    ...['lotteryCatalogInactive', 'lotteryCatalogEmpty', 'lotteryCatalogReady', 'lotteryCatalogLow'].map(key => ({ key, run: () => getBackendGachaCatalog('contract-player', key === 'lotteryCatalogLow' ? 2 : 1) })),
    ...['virtueRankingEmpty', 'virtueRankingFull', 'virtueRankingNoSelf'].map(key => ({ key, run: () => getBackendMasterRanking('contract-player', key === 'virtueRankingNoSelf' ? 8888 : 2) })),
    ...([{ key: 'guildLogsFull', uid: 1, page: 1 }, { key: 'guildLogsLast', uid: 1, page: 99 }, { key: 'guildLogsEmpty', uid: 8001, page: 99 }, { key: 'guildLogsMissing', uid: 8002, page: 99 }, { key: 'guildLogsNone', uid: 8888, page: 99 }]).map(entry => ({ key: entry.key, run: () => getBackendGuildLogs('contract-player', entry.uid, entry.page, 1) })),
    ...['teamListEmpty', 'teamListFull', 'teamListOutOfRange'].map(key => ({ key, run: () => getBackendTeams('contract-player', key === 'teamListOutOfRange' ? 99 : 1, 5) })),
    { key: 'guildListFull', run: () => getBackendGuilds('contract-player', 1, 5) },
    { key: 'guildListEmpty', run: () => getBackendGuilds('contract-player', 99, 5) },
    ...['friendPageFull', 'friendPageSecond', 'friendPageOutOfRange', 'friendPageEmpty'].map(key => ({ key, run: () => getBackendFriends('contract-player', key === 'friendPageEmpty' ? 5 : 1, key === 'friendPageSecond' ? 2 : key === 'friendPageFull' ? 1 : 99, key === 'friendPageFull' ? 5 : 2) })),
    { key: 'friendListFull', run: () => getBackendFriends('contract-player', 7001, 99, 5) },
    { key: 'friendListEmpty', run: () => getBackendFriends('contract-player', 2, 99, 5) },
    ...(['all', 'send', 'receive'] as const).map(mode => ({ key: `giftRecords${mode[0].toUpperCase()}${mode.slice(1)}`, run: () => getBackendGiftRecords('contract-player', 2, mode, 99, 1) })),
    { key: 'giftRecordsEmpty', run: () => getBackendGiftRecords('contract-player', 100, 'all', 99, 5) },
    { key: 'catalogAchievements', run: () => getBackendAchievements('contract-player', 1, 5) },
    { key: 'completedAchievements', run: () => getBackendAchievements('contract-player', 1, 5, 2) },
    { key: 'emptyAchievements', run: () => getBackendAchievements('contract-player', 99, 5, 2) },
    ...['enemyQueryEmpty', 'enemyQueryFull'].map(key => ({ key, run: () => getBackendEnemies('contract-player', 1) })),
    ...['feedbackPage1', 'feedbackPage2', 'feedbackPage99', 'feedbackPageEmpty'].map(key => ({ key, run: () => getBackendFeedbacks('contract-player', key === 'feedbackPage99' ? 99 : key === 'feedbackPage2' ? 2 : 1) })),
    ...['feedbackDetail1', 'feedbackDetail6'].map(key => ({ key, run: () => getBackendFeedbackDetail('contract-player', key === 'feedbackDetail1' ? 1 : 6) })),
    ...['guildStoryRecordsEmpty', 'guildStoryRecordsFull'].map(key => ({ key, run: () => getBackendGuildStorylineRecords('contract-player', 1) })),
    ...['dungeonCatalogEmpty', 'dungeonCatalogFull'].map(key => ({ key, run: () => getBackendDungeonCatalog('contract-player', 1, 1) })),
    ...['dungeonDetailEmpty', 'dungeonDetailFull'].map(key => ({ key, run: () => getBackendDungeonDetailCommand('contract-player', 1, '桃花镇', '/秘境详情 桃花镇', request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('bossInfo')).map(key => ({ key, run: () => getBackendWorldBossInfo('contract-player', 1) })),
    ...['bossRankingLocked', 'bossRankingEmpty', 'bossRankingDecimal'].map(key => ({ key, run: () => getBackendWorldBossRanking('contract-player', 1) })),
    ...['bossRewardPreviewLocked', 'bossRewardPreviewMissing', 'bossRewardPreviewFull'].map(key => ({ key, run: () => getBackendWorldBossRewards('contract-player', 1) })),
    ...['rankingTowerLocked', 'rankingTowerEmpty', 'rankingTowerFull'].map(key => ({ key, run: () => getBackendTowerRanking('contract-player', 1, 1) })),
    ...['rankingStoryLocked', 'rankingStoryEmpty', 'rankingStoryFull'].map(key => ({ key, run: () => getBackendStorylineRanking('contract-player', 1, 1) })),
    ...['rankingRealmEmpty', 'rankingRealmFull'].flatMap(key => [false, true].map(regional => ({ key, run: () => getBackendRealmRanking('contract-player', 1, regional) }))),
    ...['rankingAlchemyLocked', 'rankingAlchemyFull'].map(key => ({ key, run: () => getBackendAlchemyRanking('contract-player', 1, 1, 5) })),
    ...['tianjiaoBoardLocked', 'tianjiaoBoardVisible', 'tianjiaoBoardRanked'].map(key => ({ key, run: () => getBackendTianjiaoLeaderboard('contract-player', 1) })),
    ...['tianjiaoDirect', 'tianjiaoWin', 'tianjiaoLoss'].map(key => ({ key, run: () => challengeBackendTianjiao('contract-player', 1, 2, request) })),
    ...['bountyListEmpty', 'bountyListNullable'].map(key => ({ key, run: () => getBackendBounties('contract-player', 1) })),
    { key: 'bountyPublishPolicy', run: () => getBackendBountyPublishPolicy('contract-player') },
    { key: 'bountyPublish', run: () => publishBackendBounty('contract-player', 1, 2, 120, 3, request) },
    { key: 'bountyRewardClaim', run: () => claimBackendBounty('contract-player', 1, request) },
    ...['bountyPendingEmpty', 'bountyPendingFull'].map(key => ({ key, run: () => getBackendPendingBountyRewards('contract-player', 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('guideProgress_')).map(key => ({ key, run: () => getBackendNewcomerGuide('contract-player', 1, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('guideAction_')).map(key => ({ key, run: () => key === 'guideAction_skipped' ? skipBackendNewcomerGuide('contract-player', 1, 1, request) : continueBackendNewcomerGuide('contract-player', 1, 1, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('claimLogin')).map(key => ({ key, run: () => claimBackendNewcomerLogin('contract-player', 1, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('claimTask')).map(key => ({ key, run: () => claimBackendNewcomerTask('contract-player', 1, 1, request) })),
    ...['newcomerRechargeEmpty', 'newcomerRechargeFunded', 'newcomerRechargeClaimed'].map(key => ({ key, run: () => getBackendNewcomerRechargeInfo('contract-player', 1) })),
    ...['newcomerLoginExpired', 'newcomerLoginActive', 'newcomerLoginClaimed'].flatMap(key => [
      { key, run: () => getBackendNewcomerLogin('contract-player', 1) },
      { key, run: () => getBackendNewcomerLogin('contract-player', 1, request) }
    ]),
    ...['marketGuideBalanceZero', 'marketGuideBalanceFunded', 'marketGuideBalanceSigned'].map(key => ({ key, run: () => getBackendMarketGuideBalance('contract-player', 1, request) })),
    { key: 'companionPurchasePreview', run: () => previewBackendCompanionShopPurchase('contract-player', 1, 1, 3, request) },
    { key: 'companionPurchaseResult', run: () => purchaseBackendCompanionShop('contract-player', 1, 1, 3, request) },
    ...['catalogShopEmpty', 'catalogShopDiscount', 'catalogShopCooldown'].map(key => ({ key, run: () => getBackendUnifiedShop('contract-player', 1, 1, 'WANBAOLOU') })),
    ...['checkInShopEmpty', 'checkInShopUnlimited', 'checkInShopExhausted'].map(key => ({ key, run: () => getBackendCheckInShop('contract-player', 1) })),
    ...['eventShopEmpty', 'eventShopUnlimited'].map(key => ({ key, run: () => getBackendEventShop('contract-player', 1, 1) })),
    ...['guildShopPageEmpty', 'guildShopPageItems'].map(key => ({ key, run: () => getBackendGuildShopPage('contract-player', 1) })),
    { key: 'guildShopExchangePrestige', run: () => exchangeBackendGuildShopByIndex('contract-player', 1, 1, request) },
    ...['ownShopNullable', 'ownShopFull'].map(key => ({ key, run: () => getBackendOwnPlayerShop('contract-player', 1, request) })),
    ...['shopListEmpty', 'shopListPopulated'].map(key => ({ key, run: () => getBackendShopList('contract-player', 1) })),
    ...['shopRankingEmpty', 'shopRankingPopulated'].map(key => ({ key, run: () => getBackendShopRanking('contract-player', 5) })),
    ...['marketPurchaseReceipt', 'marketPurchaseReclaimed', 'marketPurchaseConfirm', 'marketPurchaseWarning'].map(key => ({ key, run: () => marketWorkflow('contract-player', 1, { action: 'purchase', listingId: 1, quantity: 1 }, request) })),
    ...['marketRange_median', 'marketRange_base_price', 'marketRange_fallback', 'marketRangeError', 'marketRangeReceipt'].map(key => ({ key, run: () => marketWorkflow('contract-player', 1, { action: 'sell', category: 'item', userItemId: 1 }) })),
    ...['median', 'base_price', 'fallback'].map(source => ({ key: `marketSellableRange_${source}`, run: () => getBackendMarketSellable('contract-player', 1, { category: 'item', page: 1, pageSize: 5 }) })),
    ...['marketCredibilityLow', 'marketCredibilityReady'].map(key => ({ key, run: () => marketCredibilityView('contract-player', 1) })),
    ...['myListingsEmpty', 'myListingsDecimals'].map(key => ({ key, run: () => marketListingsView('contract-player', 1, 1) })),
    ...['shopVisitmarketBrowseEmpty', 'shopVisitmarketBrowseItems'].map(key => ({ key, run: () => getBackendPlayerShopVisit('contract-player', 1, 2, 1) })),
    ...['marketBrowseEmpty', 'marketBrowseItems'].map(key => ({ key, run: () => getBackendMarketBrowse('contract-player', 1, { page: 1 }) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('competitionHome_')).map(key => ({ key, run: () => getBackendCompetitionHome('contract-player', 1) })),
    ...['competitionDetailWin', 'competitionDetailLoss'].map(key => ({ key, run: () => getBackendCompetitionBattleDetail('contract-player', 1, 1) })),
    ...['competitionPromotionEmpty', 'competitionPromotionTeams'].map(key => ({ key, run: () => getBackendPromotionTeams('contract-player') })),
    ...['guildStorylineZero', 'guildStorylinePartial', 'guildStorylineCleared'].map(key => ({ key, run: () => challengeBackendGuildStoryline('contract-player', 1, request) })),
    ...['secretWarHomeNoGuild', 'secretWarHomeJoined'].map(key => ({ key, run: () => getBackendSecretRealmHome('contract-player', 1) })),
    ...['secretWarChallengeWon', 'secretWarChallengeLost'].map(key => ({ key, run: () => challengeBackendSecretRealm('contract-player', 1, 1, 1, request) })),
    ...['secretWarClaimed', 'secretWarReputationClaimed'].map(key => ({ key, run: () => claimBackendSecretRealm('contract-player', 1, request) })),
    ...['professionToolReplaceActualFull', 'professionToolReplaceActualBlank', 'professionToolReplaceActualSignedGrade'].map(key => ({ key, run: () => replaceBackendProfessionTool('contract-player', 1, '2', request) })),
    { key: 'professionToolReplaced', run: () => replaceBackendProfessionTool('contract-player', 1, '2', request) },
    { key: 'guildCreated', run: () => createBackendGuild('contract-player', 1, '宗门', request) },
    { key: 'guildApplied', run: () => applyBackendGuild('contract-player', 1, 1, request) },
    ...Object.keys(fixtures).filter(key => key.startsWith('publicTribulation_')).map(key => ({ key, run: () => observeBackendPublicTribulation('contract-player', 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('tribulationCharging_')).map(key => ({ key, run: () => getBackendTribulationReceipt('contract-player', 1, 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('tribulationConfirmation_')).map(key => ({ key, run: () => confirmBackendTribulationQuery('contract-player', 1, 1, 'standard', request) })),
    ...['itemDetailEmpty', 'itemDetailProjected'].map(key => ({ key, run: () => getBackendItemDetail('contract-player', 1, { name: '道具' }) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('companionProposal')).map(key => ({ key, run: () => executeBackendCompanionProposalCommand('contract-player', 1, { target: '2' }, request) })),
    ...['manualBattleChoosing', 'manualBattleFinished'].map(key => ({ key, run: () => readBackendStorylineManualBattle('contract-player', 1, 'contract-session') })),
    ...['sparDenied', 'sparMissingTarget', 'sparWinner_B'].map(key => ({ key, run: () => commandBackendSpar('contract-player', 1, 2, undefined, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('killGodTitle_')).map(key => ({ key, run: () => claimBackendKillGodTitle('contract-player', 1, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('rechargeCatalog_')).map(key => ({ key, run: () => getBackendRechargeCatalog('contract-player', 1) })),
    ...['towerFirstQuery', 'towerFirstQueryDescribed'].map(key => ({ key, run: () => getBackendTowerFirstRewards('contract-player', 1) })),
    ...['towerMonthlyQuery', 'towerMonthlyQueryClaimable'].map(key => ({ key, run: () => getBackendTowerMonthlyRewards('contract-player', 1) })),
    { key: 'towerOverviewConfigured', run: () => getBackendTowerRewardOverview('contract-player', 1) },
    ...Object.keys(fixtures).filter(key => key.startsWith('towerOverview_')).map(key => ({ key, run: () => getBackendTowerRewardOverview('contract-player', 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('glossaryApply_')).map(key => ({ key, run: () => applyBackendGlossaryEdit('contract-player', '申请编辑', request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('storylineCatalog_')).map(key => ({ key, run: () => getBackendStorylineCatalog('contract-player', 1, 1, 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('publicProfile')).map(key => ({ key, run: () => getBackendPublicPlayerProfile('contract-player', 1, 2) })),
    { key: 'taskPanelFull', run: () => getBackendTaskPanelView('contract-player', 1) },
    { key: 'taskPanelSelected', run: () => getBackendTaskPanelView('contract-player', 1, { tabKey: 'checkin' }) },
    ...Object.keys(fixtures).filter(key => key.startsWith('giftCommand')).map(key => ({ key, run: () => commandBackendCompanionGift('contract-player', 1, {}, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('friendWorkflow_')).map(key => ({ key, run: () => requestFriendWorkflow('contract-player', 1, { action: 'remove', targetUid: '1', confirmed: true }, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('guildDecision_')).map(key => ({ key, run: () => decideBackendGuildApplication('contract-player', 1, 2, key !== 'guildDecision_rejected', request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('teamPosition_')).map(key => ({ key, run: () => requestTeamWorkflow('contract-player', 1, { action: 'position', targetUid: '2', position: 2 }, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('teamLeader_')).map(key => ({ key, run: () => requestTeamWorkflow('contract-player', 1, { action: 'leadership', targetUid: '2' }, request) })),
    { key: 'guildResignationOptions', run: () => requestGuildWorkflow('contract-player', 1, { action: 'resignation_options' }, request) },
    { key: 'guildResignationWorkflow', run: () => requestGuildWorkflow('contract-player', 1, { action: 'role_resign' }, request) },
    ...Object.keys(fixtures).filter(key => key.startsWith('friendRemoval_')).map(key => ({ key, run: () => deleteBackendFriend('contract-player', 1, 2, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('blockRemoval_')).map(key => ({ key, run: () => removeBackendBlocklist('contract-player', 1, { exactName: '道友' }, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('blockByName_')).map(key => ({ key, run: () => blockBackendUserByName('contract-player', 1, '道友', request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('flyMute_')).map(key => ({ key, run: () => setBackendFlyMailMute('contract-player', 1, 2, true, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('flyMuteCommand_')).map(key => ({ key, run: () => commandBackendFlyMailMute('contract-player', 1, 2, undefined, true, request) })),
    { key: 'masterApply', run: () => applyBackendMaster('contract-player', 1, '2', request) },
    { key: 'masterAccept', run: () => acceptBackendMaster('contract-player', 1, '2', request) },
    { key: 'masterTeach', run: () => teachBackendMaster('contract-player', 1, '2', request) },
    { key: 'masterBless', run: () => blessBackendMaster('contract-player', 1, '2', request) },
    { key: 'masterGift', run: () => giftBackendMaster('contract-player', 1, '2', undefined, request) },
    { key: 'masterGraduationApply', run: () => applyBackendGraduation('contract-player', 1, request) },
    ...['masterGraduationAccepted', 'masterGraduationRejected'].map(key => ({ key, run: () => decideBackendGraduation('contract-player', 1, '2', key === 'masterGraduationAccepted', request) })),
    ...['monthCardNone', 'monthCardClaimed', 'monthCardSnapshotFailed'].map(key => ({ key, run: () => claimBackendMonthCardOverview('contract-player', 1, request) })),
    ...['firstRechargeInvalidTier', 'firstRechargeClaimFailed', 'firstRechargeClaimed', 'firstRechargeNilRewards'].map(key => ({ key, run: () => claimBackendFirstRechargeOverview('contract-player', 1, 150, request) })),
    ...['achievementClaimed', 'achievementEmptyReward'].map(key => ({ key, run: () => claimBackendAchievementRewards('contract-player', 1, 'storyline', request) })),
    { key: 'towerFirstClaim', run: () => claimBackendFirstRewards('contract-player', 1, 470, request) },
    { key: 'towerFirstClaimAll', run: () => claimBackendFirstRewards('contract-player', 1, 'all', request) },
    { key: 'towerMonthlyClaim', run: () => claimBackendMonthlyRewards('contract-player', 1, 'all', request) },
    ...['emailClaimed', 'emailEmptyReward'].map(key => ({ key, run: () => claimBackendEmail('contract-player', 1, 1, request) })),
    ...['emailAllEmpty', 'emailAllPartial'].map(key => ({ key, run: () => claimAllBackendEmails('contract-player', 1, request) })),
    { key: 'dailyCheckinEmpty', run: () => dailyBackendCheckIn('contract-player', 1, request) },
    { key: 'newcomerCheckinEmpty', run: () => newcomerBackendCheckIn('contract-player', 1, request) },
    ...['celestialCheckinCapped', 'celestialCheckinReward'].map(key => ({ key, run: () => claimBackendCelestialCheckIn('contract-player', 1, request) })),
    { key: 'giftCodeRedeemed', run: () => redeemBackendGiftCode('contract-player', 1, 'test', request) },
    ...['activityClaimed', 'activityEmptyReward'].map(key => ({ key, run: () => claimBackendActivityReward('contract-player', 1, 'daily', key === 'activityClaimed' ? 20 : 40, request) })),
    ...['activityAllClaimed', 'activityAllPartial'].map(key => ({ key, run: () => claimAllBackendActivityRewards('contract-player', 1, 'daily', request) })),
    { key: 'referralBoundEmpty', run: () => bindBackendReferralCode('contract-player', 1, 'tt-2', request) },
    ...['referralClaimed', 'referralEmptyReward'].map(key => ({ key, run: () => claimBackendReferralRewards('contract-player', 1, request) })),
    ...['weeklyRebateClaimed', 'weeklyRebateEmpty'].map(key => ({ key, run: () => claimBackendWeeklyRebate('contract-player', 1, 1, request) })),
    { key: 'titleActivated', run: () => activateBackendTitle('contract-player', 1, 1, request) },
    ...['titleRemoved', 'titleNotWorn'].map(key => ({ key, run: () => deactivateBackendTitle('contract-player', 1, request) })),
    ...['storyChestClaimed', 'storyChestLocked'].map(key => ({ key, run: () => claimBackendStorylineChest('contract-player', 1, 1, 1, request) })),
    { key: 'storyChapterMissing', run: () => claimAllBackendChapterChests('contract-player', 1, 1, request) },
    ...['storyAllChestsEmpty', 'storyAllChestsClaimed'].map(key => ({ key, run: () => claimAllBackendStorylineChests('contract-player', 1, request) })),
    ...['newcomerRebateEmpty', 'newcomerRebateItems'].map(key => ({ key, run: () => claimBackendNewcomerRechargeDay('contract-player', 1, key === 'newcomerRebateItems' ? 14 : 1, request) })),
    ...['consumeLastItem', 'consumeRejected'].map(key => ({ key, run: () => consumeBackendItem('contract-player', 1, { itemName: '精力丹', quantity: 1 }, request) })),
    ...['equipSucceeded', 'equipNotFound'].map(key => ({ key, run: () => equipBackendEquipment('contract-player', 1, '1', request) })),
    { key: 'equipmentPreviewEmpty', run: () => previewBackendEquipmentBatchDecompose('contract-player', 1) },
    { key: 'equipmentBatchEmpty', run: () => batchDecomposeBackendEquipment('contract-player', 1, undefined, request) },
    { key: 'autoEquipSkipped', run: () => autoEquipBackendEquipment('contract-player', 1, request) },
    ...['learnedDetailQueryFull', 'learnedDetailQueryInUse', 'learnedDetailQueryForeign', 'learnedDetailQueryMissing', 'learnedDetailQueryEmpty', 'learnedDetailQueryNullSkill', 'learnedDetailQueryMissingSkill', 'learnedDetailQueryDeletedBuff', 'learnedDetailQueryBlankName'].map(key => ({ key, run: () => getBackendSkillDetail('contract-player', key === 'learnedDetailQueryEmpty' ? 99 : 1, key === 'learnedDetailQueryInUse' ? 2 : key === 'learnedDetailQueryForeign' ? 3 : key === 'learnedDetailQueryMissing' ? 99 : 1) })),
    ...['learnedPageQueryVisible', 'learnedPageQueryHidden', 'learnedPageQueryOutOfRange', 'learnedPageQueryEmpty'].map(key => ({ key, run: () => getBackendLearnedBooks('contract-player', key === 'learnedPageQueryEmpty' ? 99 : 1, key === 'learnedPageQueryOutOfRange' ? 99 : 1, key === 'learnedPageQueryHidden' ? 'hidden' : 'visible') })),
    ...['equipmentDetailQueryFull', 'equipmentDetailQueryMissingUser', 'equipmentDetailQueryEmpty', 'equipmentDetailQueryEmptyType', 'equipmentDetailQueryMissingType', 'equipmentDetailQueryDeletedType', 'equipmentDetailQueryNamedGrade', 'equipmentDetailQueryBlankNames', 'equipmentDetailQueryDeletedUser', 'equipmentDetailQueryDeletedGrade'].map(key => ({ key, run: () => getBackendEquipmentDetail('contract-player', key === 'equipmentDetailQueryMissingUser' ? 2 : key === 'equipmentDetailQueryEmpty' ? 99 : 1, key === 'equipmentDetailQueryEmptyType' ? '空' : key === 'equipmentDetailQueryMissingType' ? 'missing' : key === 'equipmentDetailQueryDeletedType' ? '已删' : '武器') })),
    ...['equipmentDetailEmpty', 'equipmentDetailNullableNames', 'equipmentDetailNamed'].map(key => ({ key, run: () => getBackendEquipmentDetail('contract-player', 1, '武器') })),
    ...['MissingType', 'MissingTemplates', 'NotWorn', 'ConcurrentChange', 'WriteUncertain', 'CacheFailed', 'Completed'].map(state => ({ key: `equipmentUnequip${state}`, run: () => unequipBackendEquipmentOne('contract-player', 1, '武器', request) })),
    { key: 'equipmentDecomposed', run: () => decomposeBackendEquipment('contract-player', 1, 1, request) },
    { key: 'skillLearnCandidatesEmpty', run: () => getBackendSkillBookBatchLearnCandidates('contract-player', 1) },
    ...['skillLearnCommandEmpty', 'skillLearnCommandMixed'].map(key => ({ key, run: () => batchLearnCurrentBackendSkillBooks('contract-player', 1, request) })),
    ...['skillUnequipNone', 'skillUnequipNullable'].map(key => ({ key, run: () => unequipBackendSkillBook('contract-player', 1, '战技', request) })),
    ...['skillUpgradeNone', 'skillUpgraded'].map(key => ({ key, run: () => upgradeBackendSkillBook('contract-player', 1, 1, request) })),
    ...['skillBatchUpgradeNone', 'skillBatchUpgradeStopped'].map(key => ({ key, run: () => batchUpgradeBackendSkillBook('contract-player', 1, 1, 2, request) })),
    ...['skillDecomposedLow', 'skillDecomposedHigh'].map(key => ({ key, run: () => decomposeBackendSkillBook('contract-player', 1, 1, request) })),
    ...['skillDecomposePreviewEmpty', 'skillDecomposePreviewFull'].map(key => ({ key, run: () => previewBackendSkillBookBatchDecompose('contract-player', 1) })),
    ...['skillDecomposeQueryNoGrade', 'skillDecomposeQueryMatched'].map(key => ({ key, run: () => getBackendSkillBookDecomposeQuery('contract-player', 1, key === 'skillDecomposeQueryMatched' ? '一品' : '') })),
    ...['skillSingleLearnEmptyBag', 'skillSingleLearned', 'skillLearnConfirmation', 'skillLearnReplaced'].map(key => ({ key, run: () => learnBackendSkillBook('contract-player', 1, 1, key === 'skillLearnReplaced', request) })),
    ...['skillSwitched', 'skillSwitchConfirmation'].map(key => ({ key, run: () => switchBackendSkillBook('contract-player', 1, 1, '战技', key === 'skillSwitched', request) })),
    ...['themeActivated', 'themeNotFound'].map(key => ({ key, run: () => activateBackendTheme('contract-player', 1, 1, request) })),
    ...['inkModeUpdated', 'inkModeNoTheme'].map(key => ({ key, run: () => switchBackendInkMode('contract-player', 1, 'ink', request) })),
    ...['skillVisibilityUpdated', 'skillVisibilityNotFound'].map(key => ({ key, run: () => setBackendSkillVisibility('contract-player', 1, 1, true, request) })),
    ...['captchaNotPending', 'captchaPending'].map(key => ({ key, run: () => verifyBackendCaptcha('contract-player', 1, '1') })),
    ...['guildApplicationCancelled', 'guildApplicationNotPending'].map(key => ({ key, run: () => cancelBackendGuildApplication('contract-player', 1, 1, request) })),
    ...['friendRequestRejected', 'friendRequestMissing'].map(key => ({ key, run: () => rejectBackendFriendRequest('contract-player', 1, 1, request) })),
    { key: 'masterRebel', run: () => rebelBackendMaster('contract-player', 1, request) },
    { key: 'masterExpel', run: () => expelBackendMaster('contract-player', 1, '2', request) },
    { key: 'masterProposalsEmpty', run: () => listBackendMasterProposals('contract-player', 1) },
    { key: 'masterGraduationProposalsEmpty', run: () => listBackendGraduationProposals('contract-player', 1) },
    { key: 'masterInfoEmpty', run: () => getBackendMasterInfo('contract-player', 1) },
    { key: 'companionInfoNone', run: () => getBackendCompanionInfo('contract-player', 1) },
    { key: 'companionBreakup', run: () => breakupBackendCompanion('contract-player', 1, request) },
    { key: 'companionOathUpgrade', run: () => upgradeBackendCompanionOath('contract-player', 1, request) },
    { key: 'companionDualCapped', run: () => dualCultivateBackendCompanion('contract-player', 1, request) },
    ...['None', 'WAITING', 'SAME_REALM', 'ADJACENT_REALM', 'NEAREST_REALM'].map(phase => ({ key: `teamMatch${phase}`, run: () => getBackendTeamMatchSnapshot('contract-player') })),
    ...['teamMatchGuardAllowed', 'teamMatchGuardBlocked'].map(key => ({ key, run: () => guardBackendTeamMatchCommand('contract-player', '/主线挑战 1-1') })),
    ...['teamMatchCancelNone', 'teamMatchCancelled'].map(key => ({ key, run: () => cancelBackendTeamMatch('contract-player', request) })),
    ...['teamApplyPending', 'teamApplyApproved'].map(key => ({ key, run: () => applyBackendTeam('contract-player', 1, request) })),
    ...['teamInvitePending', 'teamInviteAccepted'].map(key => ({ key, run: () => inviteBackendTeam('contract-player', 2, request) })),
    { key: 'teamInfoNone', run: () => getBackendTeamInfo('contract-player') },
    { key: 'teamInvitationInboxEmpty', run: () => refreshBackendTeamInvitations('contract-player', 1, request) },
    { key: 'soulPathChoose', run: () => confirmBackendSoulPathChoose('contract-player', 1, '00000000-0000-0000-0000-000000000001', request) },
    ...['soulPathSwitch', 'soulPathAdvance'].map(key => ({ key, run: () => confirmBackendSoulPathAction('contract-player', 1, '00000000-0000-0000-0000-000000000001', request) })),
    { key: 'soulWashPreview', run: () => previewBackendSoulArtifactWash('contract-player', 1, 1, request) },
    { key: 'soulWashConfirm', run: () => confirmBackendSoulArtifactWash('contract-player', 1, request) },
    ...['soulWashNoPending', 'soulWashCancelled'].map(key => ({ key, run: () => cancelBackendSoulWash('contract-player', 1, request) })),
    { key: 'meridianPulseZeroRemaining', run: () => pulseBackendMeridian('contract-player', 1, request) },
    ...['caveViewLocked', 'caveViewNoPlot'].map(key => ({ key, run: () => getBackendCaveView('contract-player', 1) })),
    ...['caveCommandSnapshotFailed', 'caveCommandChooseSeed'].map(key => ({ key, run: () => executeBackendCaveCommand('contract-player', 1, { action: key === 'caveCommandChooseSeed' ? 'plant' : 'harvest' }, request) })),
    { key: 'caveVisitStranger', run: () => getBackendCaveVisit('contract-player', 1, 2) },
    ...['caveAccelerationNotFound', 'caveAccelerationEmptyInventory'].map(key => ({ key, run: () => getBackendCaveAccelerationPreview('contract-player', 1, 1) })),
    ...['caveFormationCreated', 'caveFormationRefreshed', 'caveFormationReplaced'].map(key => ({ key, run: () => activateBackendCaveFormation('contract-player', 1, '聚灵阵', request) })),
    ...['guildMiningStarted', 'guildMiningProgress', 'guildMiningCapped'].map(key => ({ key, run: () => postBackendGuildMining('contract-player', 1, request) })),
    { key: 'guildWorshipCapped', run: () => postBackendGuildWorship('contract-player', 1, '灵石', request) },
    { key: 'guildStipendFractional', run: () => postBackendGuildStipendClaim('contract-player', 1, request) },
    { key: 'guildShopSignedDelta', run: () => exchangeBackendGuildShopByIndex('contract-player', 1, 1, request) },
    ...['guildAutoRefreshNotJoined', 'guildAutoRefreshReady'].map(key => ({ key, run: () => getBackendGuildAutoRefresh('contract-player', 1) })),
    { key: 'guildPacketSend', run: () => sendBackendGuildRedPacket('contract-player', 1, { currencyType: 'contribution', packetCount: 5, perAmount: 100 }, request) },
    { key: 'guildPacketClaim', run: () => claimBackendGuildRedPacket('contract-player', 1, 1, request) },
    { key: 'guildPacketRecycle', run: () => recycleBackendGuildRedPacket('contract-player', 1, 1, request) },
    ...['guildLeave', 'guildLeaveConfirm'].map(key => ({ key, run: () => leaveBackendGuild('contract-player', 1, request) })),
    ...['guildTransferCandidates', 'guildTransferConfirm', 'guildTransferDone'].map(key => ({ key, run: () => transferBackendGuildLeadership('contract-player', 1, key === 'guildTransferCandidates' ? 0 : 1, request) })),
    ...(['level', 'vein', 'shop'] as const).map(kind => ({ key: `guildUpgradeActual:${kind}`, run: () => postBackendGuildUpgrade('contract-player', 9, kind, request) })),
    ...['guildCheckinActualBonus', 'guildCheckinActualFirst'].map(key => ({ key, run: () => postBackendGuildCheckin('contract-player', key === 'guildCheckinActualBonus' ? 88 : 89, request) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('redPacketListQuery')).map(key => ({ key, run: () => getBackendGuildRedPackets('contract-player', key === 'redPacketListQueryOther' ? 2 : key === 'redPacketListQueryNoGuild' ? 3 : 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('senderPacketQuery')).map(key => ({ key, run: () => getBackendGuildMyRedPackets('contract-player', key === 'senderPacketQueryNoGuild' ? 2 : key === 'senderPacketQueryMissingGuild' ? 3 : 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('roleDirectoryQuery')).map(key => ({ key, run: () => getBackendGuildRoleOptions('contract-player', key === 'roleDirectoryQueryMember' ? 2 : key === 'roleDirectoryQueryMissingGuild' ? 4 : key === 'roleDirectoryQueryNoGuild' ? 99 : key.includes('Deputy') ? 3 : 1) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('autoRefreshReadQuery:') || key.startsWith('autoRefreshWriteQuery:')).map(key => ({ key, run: () => getBackendGuildAutoRefresh('contract-player', key.includes(':UID') ? Number(key.split(':UID')[1]) : 1, key.startsWith('autoRefreshWriteQuery:')) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('autoRefreshLeadershipQuery:')).map(key => ({ key, run: () => getBackendGuildLeadership('contract-player', Number(key.split(':')[1])) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('taskOverviewQuery:')).map(key => ({ key, run: () => key.includes(':daily:') ? getBackendGuildDailyTask('contract-player', Number(key.split(':')[2])) : getBackendGuildWeeklyTask('contract-player', Number(key.split(':')[2])) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('miningReceiptActual')).map(key => ({ key, run: () => postBackendGuildMining('contract-player', 71, request) })),
    ...['Full', 'Capped'].flatMap(suffix => [{ key: `worshipReceiptActual${suffix}`, run: () => postBackendGuildWorship('contract-player', 71, '灵石', request) }, { key: `stipendReceiptActual${suffix}`, run: () => postBackendGuildStipendClaim('contract-player', 71, request) }]),
    ...Object.keys(fixtures).filter(key => key.startsWith('battlePreparationQuery:')).map(key => ({ key, run: () => getBackendGuildBattleTraining('contract-player', key.endsWith(':2') || key.endsWith(':Capped') ? 2 : 1) })),
    { key: 'battlePreparationUpgradeTeam', run: () => postBackendGuildBattleTraining('contract-player', 1, '团队', '攻', request) },
    { key: 'battlePreparationUpgradePersonal', run: () => postBackendGuildBattleTraining('contract-player', 2, '个人', '命', request) },
    ...Object.keys(fixtures).filter(key => key.startsWith('packetMutationActual:')).map(key => ({ key, run: () => {
      const [, action, currencyType] = key.split(':');
      if (action === 'send') return sendBackendGuildRedPacket('contract-player', 1, { currencyType: currencyType as 'spirit_stone' | 'spirits_crystal' | 'contribution', packetCount: 5, perAmount: 100 }, request);
      if (action === 'claim') return claimBackendGuildRedPacket('contract-player', 2, fixtures[key].packetId as number, request);
      return recycleBackendGuildRedPacket('contract-player', 1, fixtures[key].packetId as number, request);
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('milestoneReceiptActual:')).map(key => ({ key, run: () => {
      const [, action, kind] = key.split(':');
      if (action === 'single') return postBackendGuildMilestoneClaim('contract-player', 1, 1, request);
      return postBackendGuildMilestonesClaimAll('contract-player', action === 'all' ? 2 : 3, kind as 'daily_activity' | 'weekly_activity', request);
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('shopPageQuery')).map(key => ({ key, run: () => getBackendGuildShopPage('contract-player', key.endsWith(':8') ? 8 : 7) })),
    ...([
      ['Leader', 1, 1], ['Deputy', 2, 1], ['Elder', 4, 1], ['Last', 4, 99],
      ['Denied', 3, 1], ['MissingGuild', 5, 1], ['NoGuild', 99, 1],
      ['Vice', 6, 8], ['Empty', 7, 99],
      ['ExpiredDeputy', 2, 1], ['RedisUnavailable1', 1, 1], ['RedisUnavailable2', 2, 1], ['MissingDate', 1, 1]
    ] as const).map(([name, uid, page]) => ({ key: `reviewQueryActual:${name}`, run: () => getBackendGuildReview('contract-player', uid, page) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('reviewCursorActual:')).map(key => ({ key, run: () => requestBackend('contract-player', 'get_players_id_guild_review_applications', {
      path: { id: key.endsWith(':Empty') ? 7 : key.endsWith(':Denied') ? 3 : key.endsWith(':NoGuild') ? 99 : 1 },
      query: { cursor: key.endsWith(':Last') ? fixtures['reviewCursorActual:First'].nextCursor as string : key.endsWith(':AfterLast') ? Buffer.from(JSON.stringify({ v: 1, k: '6' })).toString('base64url') : key.endsWith(':Denied') || key.endsWith(':NoGuild') ? 'invalid' : '' }
    }) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('historyCursorActual:')).map(key => ({ key, run: () => requestBackend('contract-player', 'get_players_id_notifications', {
      path: { id: key.endsWith(':UID2') ? 2 : key.endsWith(':UID99') ? 99 : 1 },
      query: { cursor: key.endsWith(':Last') ? fixtures['historyCursorActual:First'].nextCursor as string : key.endsWith(':AfterLast') ? Buffer.from(JSON.stringify({ v: 1, k: '0\u00000' })).toString('base64url') : '' }
    }) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('caveCursorActual:')).map(key => ({ key, run: () => requestBackend('contract-player', 'get_players_id_cave_logs', {
      path: { id: key.includes(':UID') ? Number(key.split(':UID')[1]) : 2 },
      query: { pageSize: 5, cursor: key.endsWith(':Last') ? fixtures['caveCursorActual:First'].nextCursor as string : key.endsWith(':AfterLast') ? Buffer.from(JSON.stringify({ v: 1, k: '最旧' })).toString('base64url') : key.includes(':UID') ? 'invalid' : '' }
    }) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('storyCursorActual:')).map(key => ({ key, run: () => {
      const page = key.includes(':Page') ? Number(key.split(':Page')[1]) : 1;
      const previous = fixtures[`storyCursorActual:Page${page - 1}`]?.leaderboard as Record<string, unknown> | undefined;
      return requestBackend('contract-player', 'get_players_id_storyline_leaderboard', {
        path: { id: key.includes(':UID') ? Number(key.split(':UID')[1]) : 1 },
        query: { cursor: key.includes(':UID') ? 'invalid' : key.endsWith(':AfterLast') ? Buffer.from(JSON.stringify({ v: 1, k: '50:3' })).toString('base64url') : page === 1 ? '' : previous?.nextCursor as string }
      });
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('glossaryCursorActual:')).map(key => ({ key, run: () => requestBackend('contract-player', 'get_glossary', {
      query: { pageSize: 5, cursor: key.endsWith(':Last') ? fixtures['glossaryCursorActual:First'].nextCursor as string : '', keyword: key.endsWith(':Wildcard') ? '修仙%' : key.endsWith(':Empty') ? '不存在' : undefined, category: key.endsWith(':Category') ? '道具' : undefined }
    }) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('feedbackCursorActual:')).map(key => ({ key, run: () => {
      const row = (fixtures['feedbackCursorActual:Last'].items as Record<string, unknown>[])[0];
      const after = Buffer.from(JSON.stringify({ v: 1, k: `${BigInt(Date.parse(row.feedbackTime as string)) * 1000000n}:${row.id}` })).toString('base64url');
      return requestBackend('contract-player', 'get_feedback_mine', { query: { pageSize: 5, cursor: key.endsWith(':Last') ? fixtures['feedbackCursorActual:First'].nextCursor as string : key.endsWith(':AfterLast') ? after : '' } });
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('encyclopediaCursorActual:')).map(key => ({ key, run: () => {
      const [, category, subCategory, rawPage] = key.split(':');
      const page = Number(rawPage);
      const previous = fixtures[`encyclopediaCursorActual:${category}:${subCategory}:${page - 1}`];
      return requestBackend('contract-player', 'get_encyclopedia', { query: { category, subCategory: subCategory || undefined, cursor: page === 1 ? '' : previous.nextCursor as string } });
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('alchemistCursorActual:')).map(key => ({ key, run: () => {
      const page = key.includes(':Page') ? Number(key.split(':Page')[1]) : 1;
      const previous = fixtures[`alchemistCursorActual:Page${page - 1}`];
      return requestBackend('contract-player', 'get_players_id_alchemy_leaderboard', {
        path: { id: key.includes(':UID') ? Number(key.split(':UID')[1]) : 1 },
        query: { pageSize: 5, cursor: key.includes(':UID') ? 'invalid' : key.endsWith(':AfterLast') ? Buffer.from(JSON.stringify({ v: 1, k: '50:50' })).toString('base64url') : page === 1 ? '' : previous.nextCursor as string }
      });
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('catalogCursorActual:')).map(key => ({ key, run: () => {
      const [, scope, rawPage] = key.split(':');
      const page = Number(rawPage);
      const shopCode = scope === 'Soul' || scope === 'EmptyCurrency' ? 'WANBAOLOU' : scope === 'DeniedCompanion' ? 'DAOLV' : scope === 'DeniedTower' ? 'TOWER_SCORE' : scope === 'DeniedReputation' ? 'REPUTATION' : undefined;
      return requestBackend('contract-player', 'get_players_id_shop_products', {
        path: { id: scope.startsWith('Denied') ? 2 : 1 },
        query: { shopCode, currencyCode: scope === 'Soul' ? 'SPIRIT_MILK' : scope === 'EmptyCurrency' ? 'SPIRIT_CRYSTAL' : undefined, cursor: page === 1 ? '' : fixtures[`catalogCursorActual:${scope}:${page - 1}`].nextCursor as string }
      });
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('taskActionActual:')).map(key => ({ key, run: () => {
      const [, action, name] = key.split(':');
      const slot = name === 'InvalidSlot' ? 6 : 1;
      if (action === 'alias') return setBackendTaskSlotAlias('contract-player', 1, slot, name === 'EmptySaved' ? '清空' : name === 'TooLong' ? '😀'.repeat(7) : '  每日   清修 ', request);
      return setBackendTaskSlotStep('contract-player', 1, slot, name === 'InvalidStep' ? 0 : name === 'OutOfOrder' ? 2 : 1, name === 'Empty' ? ' ' : name === 'TooLong' ? '😀'.repeat(26) : name === 'Nested' ? '任务 跳过' : '/ 签到', request);
    } })),
    ...Object.keys(fixtures).filter(key => key.startsWith('applicationQueryActual:')).map(key => ({ key, run: () => getBackendGuildApplications('contract-player', key.endsWith(':MissingDate') ? 1 : Number(key.split(':')[1])) })),
    ...Object.keys(fixtures).filter(key => key.startsWith('guildHomeQueryActual:')).map(key => ({ key, run: () => getBackendGuildHome('contract-player', key.endsWith(':2') ? 2 : key.endsWith(':3') ? 3 : 1) })),
    { key: 'guildUpgrade', run: () => postBackendGuildUpgrade('contract-player', 1, 'level', request) },
    ...['guildMilestoneFull', 'guildMilestonePartial'].map(key => ({ key, run: () => postBackendGuildMilestonesClaimAll('contract-player', 1, 'daily_activity', request) })),
    ...['friendAccept', 'friendAcceptFull'].map(key => ({ key, run: () => acceptBackendFriendRequest('contract-player', 1, 1, request) })),
    { key: 'popularityLastLike', run: () => likeBackendPopularity('contract-player', 1, 2, 'battle', request) },
    ...['friendRequestNoMessage', 'friendRequestsEmpty'].map(key => ({ key, run: () => getBackendFriendRequests('contract-player', 1) })),
    ...['blockedQueryFull', 'blockedQueryOther', 'blockedQueryEmpty', 'blockedQueryCapped'].map(key => ({ key, run: () => getBackendBlocklist('contract-player', key === 'blockedQueryFull' ? 8 : key === 'blockedQueryOther' ? 9 : key === 'blockedQueryCapped' ? 10 : 99) })),
    ...['pendingQueryFull', 'pendingQueryOther', 'pendingQueryEmpty'].map(key => ({ key, run: () => getBackendFriendRequests('contract-player', key === 'pendingQueryFull' ? 10 : key === 'pendingQueryOther' ? 20 : 99) })),
    ...['marketCancelFree', 'marketCancelPaid'].map(key => ({ key, run: () => cancelBackendMarketListing('contract-player', 1, 1, request) })),
    ...['skillRerollNoCharm', 'skillRerollLastCharm'].map(key => ({ key, run: () => previewBackendSkillBookReroll('contract-player', 1, 1, key === 'skillRerollLastCharm' ? '物攻' : undefined, request) })),
    ...['skillResetEmptyRefund', 'skillResetNoAttrs'].map(key => ({ key, run: () => confirmBackendSkillBookReset('contract-player', 1, 1, request) })),
    ...['proficiencySuccess', 'proficiencyFailure', 'proficiencyInsufficient'].map(key => ({ key, run: () => useBackendSkillBookProficiency('contract-player', 1, '功法', 1, request) })),
    ...['eventTaskEmpty', 'eventTaskToken'].map(key => ({ key, run: () => claimBackendLimitedEventTask('contract-player', 1, 49, request) })),
    { key: 'eventCheckinEmpty', run: () => postBackendLimitedEventCheckin('contract-player', 1, request) },
    { key: 'lootboxEmpty', run: () => openBackendLootbox('contract-player', 1, '礼盒', 1, request) },
    { key: 'worldBossClaimEmpty', run: () => claimAllBackendWorldBossRewards('contract-player', 1, request) },
    { key: 'dungeonSweepEmpty', run: () => sweepBackendDungeon('contract-player', 1, '桃花镇', 1, request) },
    { key: 'dungeonFreeSweepEmpty', run: () => sweepBackendFreeDungeons('contract-player', 1, request) },
    { key: 'skillBatchEmpty', run: () => batchDecomposeBackendSkillBooks('contract-player', 1, undefined, request) },
    ...['tianjiaoRewardsLocked', 'tianjiaoRewardsEmpty', 'tianjiaoRewardsHistory'].map(key => ({ key, run: () => getBackendTianjiaoRewards('contract-player', 1) })),
    ...['dungeonWin', 'dungeonLoss', 'dungeonFirstClear', 'dungeonDraw', 'dungeonDrop', 'dungeonIneligible'].map(key => ({ key, run: () => challengeBackendDungeon('contract-player', 1, '桃花镇', request) })),
    ...['counterWin', 'counterLoss', 'counterDrop'].map(key => ({ key, run: () => counterAttackBackend('contract-player', 1, 1, request) })),
    ...['spar', 'sparLoss'].map(key => ({ key, run: () => commandBackendSpar('contract-player', 1, 2, undefined, request) })),
    ...['bounty', 'bountyLoss', 'bountyDrop'].map(key => ({ key, run: () => acceptBackendBounty('contract-player', 1, request) })),
    { key: 'tongtianChallenge', run: () => challengeBackendTongtianTower('contract-player', 1, 1, request) },
    { key: 'tongtianBatch', run: () => batchChallengeBackendTongtianTower('contract-player', 1, request) },
    { key: 'breakthrough', run: () => performBackendRealmBreakthrough('contract-player', 1, request) },
    { key: 'normalSettlement', run: () => getBackendNormalPaymentSettlement('contract-player', 1, 'contract-order') },
    { key: 'limitedSettlement', run: () => getBackendLimitedEventPaymentSettlement('contract-player', 1, 'contract-order') },
    { key: 'realmAccess', run: () => getBackendRealmAccess('contract-player') },
    { key: 'guildHome', run: () => getBackendGuildHome('contract-player', 1) },
    { key: 'professionDashboard', run: () => getBackendProfessionDashboard('contract-player', 1) },
    { key: 'manualBattle', run: () => readBackendStorylineManualBattle('contract-player', 1, 'contract-session') }
  ];
  let payload: unknown;
  let calls = 0;
  let lastRequestURL = '';
  const server = createServer((_req, response) => {
    lastRequestURL = _req.url ?? '';
    calls++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-contract-token' });
  try {
    for (const entry of cases) {
      payload = fixtures[entry.key];
      assert.ok(Object.hasOwn(fixtures, entry.key), `fixture ${entry.key} missing`);
      const before = calls;
      const result = await entry.run() as Record<string, unknown>;
      if (entry.key.startsWith('tianjiaoBoard')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (['tianjiaoDirect', 'tianjiaoWin', 'tianjiaoLoss'].includes(entry.key)) {
        assert.equal(result.oldRank, fixtures[entry.key].oldRank); assert.equal(result.newRank, fixtures[entry.key].newRank);
        assert.equal(result.rewardText, fixtures[entry.key].rewardText);
        if (entry.key === 'tianjiaoDirect') assert.equal(result.battle, undefined);
        else assert.equal((result.battle as Record<string, unknown>).rounds, 2);
      }
      if (entry.key === 'bountyListEmpty') { assert.equal(result.total, 0); assert.deepEqual(result.list, []); }
      if (entry.key === 'bountyListNullable') {
        const item = (result.list as Record<string, unknown>[])[0];
        assert.equal(item.publisherName, ''); assert.equal(item.targetName, '未知'); assert.equal(item.remainingSlots, -1); assert.equal(item.hoursLeft, 0);
        assert.equal((item.expiresAt as Date).toISOString(), new Date((fixtures.bountyListNullable.items as Record<string, unknown>[])[0].expiresAt as string).toISOString());
      }
      if (entry.key === 'bountyPublish') { assert.equal(result.totalCost, 120); assert.equal(result.fee, 24); assert.equal(result.rewardPool, 96); assert.equal(result.rewardPerPerson, 32); }
      if (entry.key === 'bountyRewardClaim') assert.equal(result.rewardAmount, 32);
      if (entry.key.startsWith('bountyPending')) assert.deepEqual(result as unknown, fixtures[entry.key]);
      if (entry.key.startsWith('guideProgress_') || entry.key.startsWith('guideAction_')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('claimLogin') || entry.key.startsWith('claimTask')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'claimTaskZeroProgress') assert.equal(result.current, undefined);
      if (entry.key.startsWith('newcomerRecharge')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('newcomerLogin')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('marketGuideBalance')) assert.equal(result as unknown, fixtures[entry.key].SPIRIT_CRYSTAL);
      assert.equal(calls, before + 1, `${entry.key}: must not retry a committed action`);
      if (['themeActivated', 'themeNotFound', 'captchaNotPending', 'captchaPending', 'guildApplicationCancelled', 'guildApplicationNotPending', 'friendRequestRejected', 'friendRequestMissing'].includes(entry.key)) {
        assert.equal(result.outcome, fixtures[entry.key].outcome);
      }
      if (['inkModeUpdated', 'inkModeNoTheme', 'skillVisibilityUpdated', 'skillVisibilityNotFound'].includes(entry.key)) assert.equal(result.code, fixtures[entry.key].code);
      if (entry.key === 'captchaNotPending') assert.equal(result.passedTtlSeconds, -2);
      if (entry.key === 'themeNotFound') { assert.equal(result.id, null); assert.equal(result.name, null); }
      if (entry.key === 'guildApplicationNotPending') assert.equal(result.guildName, null);
      if (entry.key === 'friendRequestMissing') assert.equal(result.fromUserName, null);
      if (entry.key.startsWith('secretWarChallenge')) assert.equal(result.won, entry.key === 'secretWarChallengeWon');
      if (entry.key.startsWith('guildStoryline')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('competitionDetail') || entry.key.startsWith('competitionPromotion')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('competitionHome_')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('marketBrowse')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('shopVisit')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('myListings')) assert.deepEqual({ ...result }, fixtures[entry.key].listings);
      if (entry.key.startsWith('marketRange') || entry.key.startsWith('marketSellableRange_')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('marketCredibility')) assert.deepEqual({ ...result }, fixtures[entry.key].credibility);
      if (entry.key.startsWith('marketPurchase')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('ownShop') || entry.key.startsWith('shopRanking')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('guildShopPage') || entry.key === 'guildShopExchangePrestige') assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('checkInShop') || entry.key.startsWith('eventShop')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('catalogShop')) {
        assert.deepEqual(result.access, fixtures[entry.key].access);
        assert.deepEqual(result.currencies, fixtures[entry.key].currencies);
        const projected = result.result as { success: boolean; data: Record<string, unknown>[]; pagination: Record<string, unknown> };
        assert.equal(projected.success, true);
        assert.equal(projected.pagination.total, fixtures[entry.key].total);
        assert.equal(projected.data.length, entry.key === 'catalogShopEmpty' ? 0 : 1);
        if (entry.key !== 'catalogShopEmpty') assert.equal(projected.data[0].remaining, -1);
        if (entry.key === 'catalogShopDiscount') assert.equal(projected.data[0].discountPriceAmount, 95);
      }
      if (entry.key.startsWith('shopList')) {
        assert.deepEqual(result.data, (fixtures[entry.key].items as Record<string, unknown>[]).map(item => ({ ...item, description: item.description ?? null })));
        const pagination = result.pagination as Record<string, unknown>;
        assert.equal(pagination.currentPage, fixtures[entry.key].currentPage);
        assert.equal(pagination.totalPages, fixtures[entry.key].totalPages);
        assert.equal(pagination.total, fixtures[entry.key].total);
      }
      if (entry.key === 'secretWarReputationClaimed') { assert.equal(result.reputation, 0); assert.equal(result.reputationAlreadyClaimed, true); }
      if (entry.key === 'secretWarHomeNoGuild') { assert.equal(result.guildId, null); assert.equal(result.activeData, null); }
      if (entry.key.startsWith('professionToolReplaceActual')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'professionToolReplaced') assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'guildCreated' || entry.key === 'guildApplied') assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('publicTribulation_') || entry.key.startsWith('tribulationCharging_')) assert.equal(result.status, fixtures[entry.key].status);
      if (entry.key.startsWith('tribulationConfirmation_')) assert.equal((result.confirmation as Record<string, unknown>).rewardScope, entry.key.slice('tribulationConfirmation_'.length));
      if (entry.key.startsWith('itemDetail')) assert.deepEqual(result.entries, fixtures[entry.key].entries);
      if (entry.key.startsWith('companionProposal')) {
        assert.equal(result.code, fixtures[entry.key].code);
        if (entry.key === 'companionProposal_COMPLETED') { assert.equal(result.result, null); assert.equal(result.mutationError, '物品数量不足'); }
        if (entry.key === 'companionProposalSucceeded') assert.equal((result.result as Record<string, unknown>).success, true);
      }
      if (entry.key.startsWith('killGodTitle_')) assert.equal(result, fixtures[entry.key].code);
      if (entry.key === 'sparDenied' || entry.key === 'sparMissingTarget') assert.equal(result.battle, null);
      if (entry.key.startsWith('sparWinner_')) assert.equal((result.battle as Record<string, unknown>).winner, entry.key.slice('sparWinner_'.length));
      if (entry.key === 'manualBattleChoosing') assert.deepEqual((result.choice as Record<string, unknown>).availableSkills, (fixtures[entry.key].choice as Record<string, unknown>).availableSkills);
      if (entry.key === 'manualBattleFinished') { assert.equal(result.finished, true); assert.equal(result.choice, undefined); assert.deepEqual(result.events, []); }
      if (entry.key.startsWith('glossaryApply_')) assert.equal(result.outcome, fixtures[entry.key].outcome);
      if (entry.key.startsWith('queuePending')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          leaderName: source.leaderName === null ? '未知' : source.leaderName,
          applications: (source.applications as Record<string, unknown>[]).map(row => ({
            id: row.id, userId: row.userId, teamId: row.teamId, userName: row.userName === null ? '未知' : row.userName
          }))
        });
      }
      if (entry.key.startsWith('queueSent')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          isLeader: source.isLeader, canUseSecondLayerFeature: source.canUseSecondLayerFeature,
          realmName: source.realmName, applications: (source.applications as Record<string, unknown>[]).map(row => ({
            id: row.id, leaderName: row.leaderName === null ? '未知' : row.leaderName,
            createdAt: new Date(row.createdAt as string)
          }))
        });
      }
      if (entry.key.startsWith('teamReport')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          ...Object.fromEntries(['id', 'teamId', 'leaderUserId', 'battleMode', 'targetLabel', 'battleResult', 'participantCount'].map(key => [key, source[key]])),
          battleLogId: source.battleLogId === null || source.battleLogId === '' ? null : source.battleLogId,
          settledAt: new Date(source.settledAt as string),
          members: (source.members as Record<string, unknown>[]).map(member => ({
            userId: member.userId, userName: member.userName, isLeader: member.isLeader,
            position: member.position, rewardSnapshot: member.rewardSnapshot ?? null
          }))
        });
      }
      if (entry.key.startsWith('teamHistory')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          currentPage: source.page, total: source.total, totalPages: source.totalPages,
          records: (source.items as Record<string, unknown>[]).map(row => ({ ...row,
            battleLogId: row.battleLogId === null || row.battleLogId === '' ? null : row.battleLogId,
            settledAt: new Date(row.settledAt as string)
          }))
        });
      }
      if (entry.key.startsWith('tradeHistory')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          total: source.total, currentPage: source.currentPage, totalPages: source.totalPages,
          rows: (source.items as Record<string, unknown>[]).map(row => {
            const { sellerName, sellerExists, createdAt, feeRate: _feeRate, ...rest } = row;
            return { ...rest, seller: sellerExists ? { name: sellerName } : null, created_at: new Date(createdAt as string) };
          })
        });
        if (entry.key === 'tradeHistoryBuy') {
          const rows = result.rows as Record<string, unknown>[];
          assert.equal(rows[0].role, 'buy');
          assert.equal(rows[0].quantity, -2);
          assert.equal(rows[0].totalPriceAmount, -10);
          assert.equal(rows[0].displayQuantity, 0);
          assert.equal(rows[0].displayTotalPrice, 0);
          assert.equal(rows[1].seller, null);
        }
        if (entry.key === 'tradeHistoryLast') {
          assert.equal(result.currentPage, 2);
          assert.equal(result.total, 4);
          assert.deepEqual((result.rows as Record<string, unknown>[])[1].seller, { name: '' });
        }
      }
      if (entry.key.startsWith('equipBag')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          ...source,
          items: (source.items as Record<string, unknown>[]).map(row => {
            const { requiredRealm: _requiredRealm, ...rest } = row;
            return { ...rest, name: row.name === null ? '未知装备' : row.name,
              equipmentType: row.equipmentType === null ? '未知' : row.equipmentType,
              grade: row.grade === null ? '未知' : row.grade };
          })
        });
        if (entry.key === 'equipBagDefault') {
          const first = (result.items as Record<string, unknown>[])[0];
          assert.equal(first.hpPercent, 1.25);
          assert.equal(first.critRate, 2.5);
          assert.equal(first.isLocked, 1);
          assert.equal(first.canEquip, false);
          assert.equal(first.canLock, true);
          assert.equal(first.canDecompose, false);
          assert.deepEqual(first.capabilities, [{ kind: 'unlock' }, { kind: 'viewDetail' }]);
        }
        if (entry.key === 'equipBagMissingGrade') {
          assert.equal((result.items as Record<string, unknown>[])[0].grade, '未知');
        }
        if (entry.key === 'equipBagOutOfRange') {
          assert.equal(result.page, 999);
          assert.equal(result.total, 747);
          assert.deepEqual(result.items, []);
        }
      }
      if (entry.key.startsWith('bookBag')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          ...source,
          items: (source.items as Record<string, unknown>[]).map(row => ({ ...row,
            grade: row.grade === null ? '未知' : row.grade,
            skillType: row.skillType === null ? '未知' : row.skillType
          }))
        });
        if (entry.key === 'bookBagTyped') {
          const first = (result.items as Record<string, unknown>[])[0];
          assert.equal(first.hpPercent, 1.25);
          assert.equal(first.critRate, 2.5);
          assert.equal(first.isLocked, 1);
          assert.deepEqual(first.capabilities, [{ kind: 'unlock' }, { kind: 'viewDetail' }]);
        }
        if (entry.key === 'bookBagUnidentified') {
          const first = (result.items as Record<string, unknown>[])[0];
          assert.equal(first.quantity, 1);
          assert.equal(first.identifiableCount, 0);
          assert.equal(first.unidentified, false);
          assert.ok(!(first.capabilities as {kind:string}[]).some(c=>c.kind==='identify' || c.kind==='identifyAll'));
        }
        if (entry.key === 'bookBagOutOfRange') {
          assert.equal(result.page, 999);
          assert.equal(result.total, 756);
          assert.deepEqual(result.items, []);
        }
      }
      if (entry.key.startsWith('toolBag')) {
        const requestURL = new URL(lastRequestURL, 'http://localhost');
        assert.equal(requestURL.pathname, `/api/v1/players/${entry.key === 'toolBagEmpty' ? 999 : 1}/profession-tools/bag`);
        assert.equal(requestURL.searchParams.get('typeName'), entry.key === 'toolBagDefault' ? null : entry.key === 'toolBagB' ? 'B' : 'A');
        assert.equal(requestURL.searchParams.get('page'), entry.key === 'toolBagOutOfRange' ? '99' : '1');
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          types: source.types, activeType: source.activeType,
          page: source.page, total: source.total, pageSize: source.pageSize, totalPages: source.totalPages,
          capabilities: source.capabilities,
          items: (source.items as Record<string, unknown>[]).map(row => ({
            id: row.id, toolId: row.toolId, name: row.displayName,
            typeName: row.typeName === null ? '未知' : row.typeName,
            grade: row.displayGrade, gradeId: row.gradeId === null ? 0 : row.gradeId,
            isEquipped: row.isEquipped, isLocked: row.isLocked,
            canReplace: row.canReplace, canToggleLock: row.canToggleLock, capabilities: row.capabilities
          }))
        });
        if (entry.key === 'toolBagDefault') {
          const items = result.items as Record<string, unknown>[];
          assert.equal(items[0].canReplace, false);
          assert.equal(items[1].canReplace, true);
          assert.equal(items[3].isLocked, 1);
          assert.deepEqual(items[3].capabilities, ['unlock', 'viewDetail']);
          assert.equal(items[4].name, '');
          assert.equal(items[4].grade, '');
        }
        if (entry.key === 'toolBagOutOfRange') {
          assert.equal(result.total, 16);
          assert.equal(result.page, 99);
          assert.deepEqual(result.items, []);
        }
      }
      if (entry.key.startsWith('artifactBag')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          page: source.page, total: source.total, pageSize: source.pageSize,
          items: (source.items as Record<string, unknown>[]).map(row => ({ ...row,
            userSoulArtifactId: row.id, name: row.name === null ? '未知本命物' : row.name,
            gradeName: row.gradeName === null ? '未知' : row.gradeName,
            hasUpgraded: row.hasUpgraded === 1, isEquipped: row.isEquipped === 1
          }))
        });
        if (entry.key === 'artifactBagFull') {
          const items = result.items as Record<string, unknown>[];
          assert.equal(items[4].isLocked, -1);
          assert.equal(items[4].lockAction, '');
          assert.equal(items[4].canRefine, false);
        }
      }
      if (entry.key.startsWith('boxList')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          page: source.page, total: source.total, pageSize: source.pageSize,
          items: (source.items as Record<string, unknown>[]).map(row => ({ ...row,
            name: row.name === null ? '未知礼盒' : row.name,
            description: row.description === null ? '' : row.description
          }))
        });
        if (entry.key === 'boxListFull') {
          const items = result.items as { capabilities: { valid: boolean; options: { effectiveCount: number }[] }[] }[];
          assert.equal(items[0].capabilities[0].options[1].effectiveCount, 5);
          assert.equal(items[1].capabilities[0].options[1].effectiveCount, 10);
          assert.equal(items[2].capabilities[0].valid, false);
        }
      }
      if (entry.key.startsWith('lotteryOverview')) {
        const source = fixtures[entry.key];
        if (source.banner === null) assert.equal(result, null);
        else {
          const banner = source.banner as Record<string, unknown>;
          const realm = (value: unknown) => {
            if (value === null) return null;
            const row = value as Record<string, unknown>;
            return { name: row.name, level: row.level, stageLevel: row.stageLevel };
          };
          assert.deepEqual({ ...result }, {
            title: banner.title, description: banner.description,
            startTime: new Date(banner.startTime as string), endTime: new Date(banner.endTime as string),
            minRealm: realm(source.minRealm), userRealm: realm(source.userRealm),
            accessStatus: source.accessStatus, currencies: source.currencies,
            pools: (banner.pools as Record<string, unknown>[]).map(pool => ({
              ...Object.fromEntries(['id', 'poolName', 'poolLevel', 'currencyCode', 'currencyName', 'pricePerPull', 'tenPullCost', 'maxUpPerUser', 'merchantTitle', 'pity', 'mainPityRemaining', 'subPityRemaining', 'upLimitReached'].map(key => [key, pool[key]])),
              realm: realm(pool.realm), tiers: pool.tiers,
              upItems: (pool.upItems as Record<string, unknown>[]).map(row => ({ itemName: row.itemName }))
            }))
          });
          if (entry.key === 'lotteryOverviewReady') {
            const pools = result.pools as Record<string, unknown>[];
            assert.equal(pools[0].tenPullCost, 70);
            assert.equal(pools[0].mainPityRemaining, -2);
            assert.equal(pools[0].currencyName, '道晶');
          }
        }
      }
      if (entry.key.startsWith('lotteryGoods')) assert.deepEqual(result as unknown, fixtures[entry.key]);
      if (entry.key.startsWith('lotteryHistory')) {
        assert.deepEqual(result as unknown, (fixtures[entry.key] as unknown as Record<string, unknown>[]).map(row => ({
          id: row.id, tierName: row.tierName, itemSnapshotJson: row.itemSnapshotJson,
          isFree: row.isFree, created_at: new Date(row.createdAt as string)
        })));
      }
      if (entry.key.startsWith('lotteryCatalog')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('virtueRanking')) {
        const source = fixtures[entry.key];
        const stats = (row: Record<string, unknown>) => ({ masterVirtueLevel: row.virtueLevel,
          virtueTitle: row.virtueTitle, masterVirtueExp: row.virtueExperience,
          totalGraduatedCount: row.totalGraduatedCount, activeDiscipleCount: row.activeDiscipleCount });
        assert.deepEqual({ ...result }, {
          top: (source.top as Record<string, unknown>[]).map(row => ({ ...stats(row), userId: row.userId,
            userName: row.userName === null ? '未知修士' : row.userName })),
          self: source.self === null ? undefined : { ...stats(source.self as Record<string, unknown>), rank: (source.self as Record<string, unknown>).rank }
        });
        if (entry.key === 'virtueRankingFull') assert.equal((result.self as Record<string, unknown>).rank, 1);
      }
      if (entry.key.startsWith('guildLogs')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          hasGuild: source.hasGuild, guildName: source.guildName, total: source.total, page: source.page,
          totalPages: source.totalPages, logs: (source.logs as Record<string, unknown>[]).map(row => ({
            id: row.id, content: row.content, formattedTime: row.formattedTime
          }))
        });
      }
      if (entry.key.startsWith('teamList')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          teams: (source.items as Record<string, unknown>[]).map(row => ({
            teamId: row.id, leaderName: row.leaderName === null ? '未知' : row.leaderName,
            memberCount: row.memberCount, maxMembers: row.maxMembers, minRealmName: row.minRealmName
          })), total: source.total, currentPage: source.page,
          totalPages: Math.ceil((source.total as number) / (source.pageSize as number))
        });
        if (entry.key === 'teamListOutOfRange') { assert.equal(result.total, 3); assert.equal(result.currentPage, 99); }
      }
      if (entry.key.startsWith('guildList')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          guilds: (source.guilds as Record<string, unknown>[]).map(row => ({
            id: row.id, name: row.name, intro: row.intro === null ? `${row.name}，欢迎加入` : row.intro,
            memberCount: row.memberCount, levelId: row.levelId,
            levelName: row.level === null ? undefined : `${row.level}级`,
            minRealmName: row.minRealmName === null ? undefined : row.minRealmName,
            titles: (row.titles as string[]).map(value => value.trim()).filter(Boolean)
          })), total: source.total, currentPage: source.currentPage, totalPages: source.totalPages
        });
      }
      if (entry.key.startsWith('friendList') || entry.key.startsWith('friendPage')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          total: source.total, currentPage: source.currentPage, pageSize: source.pageSize,
          maxFriends: source.maxFriends, myGender: source.myGender, hasCompanion: source.hasCompanion,
          list: (source.list as Record<string, unknown>[]).map(row => ({
            friendId: row.friendId, friendName: row.userExists ? row.friendName : '未知用户',
            relationType: row.relationType, relationText: row.relationText, intimacy: row.intimacy,
            spiritBondLevel: row.spiritBondLevel, canProposeCompanion: row.canProposeCompanion,
            gender: row.gender, hasCompanion: row.hasCompanion
          }))
        });
      }
      if (entry.key === 'friendPageFull') {
        const list = (result as { list: { friendId: number; friendName: string; gender: number | null; canProposeCompanion: boolean; hasCompanion: boolean }[] }).list;
        assert.deepEqual(list.map(row => row.friendId), [999, 2, 3, 4, 5]);
        assert.equal(list[0].gender, null);
        assert.equal(list[1].friendName, '');
        assert.equal(list[1].canProposeCompanion, true);
        assert.equal(list[2].hasCompanion, true);
        assert.equal(list[2].canProposeCompanion, false);
        assert.equal(list[3].gender, null);
      }
      if (entry.key === 'friendPageOutOfRange') {
        assert.equal(result.currentPage, 1);
        assert.equal(result.total, 5);
      }
      if (entry.key === 'friendPageEmpty') {
        assert.equal(result.currentPage, 99);
        assert.equal(result.total, 0);
      }
      if (entry.key.startsWith('giftRecords')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          rows: (source.list as Record<string, unknown>[]).map(row => ({
            id: row.id, senderUid: row.senderUid, receiverUid: row.receiverUid,
            giftName: row.giftName, quantity: row.quantity, intimacyGained: row.intimacyGained,
            tongxinGained: row.tongxinGained, premium: row.premium, relationText: row.relationText,
            created_at: new Date(row.createdAt as string),
            senderName: row.senderName === null ? `#${row.senderUid}` : row.senderName,
            receiverName: row.receiverName === null ? `#${row.receiverUid}` : row.receiverName
          })), currentPage: source.page, totalPages: source.totalPages, total: source.total
        });
      }
      if (['catalogAchievements', 'completedAchievements', 'emptyAchievements'].includes(entry.key)) {
        const source = fixtures[entry.key];
        const page = source.page as Record<string, unknown>;
        assert.deepEqual({ ...result }, {
          achievements: (source.items as Record<string, unknown>[]).map(row => ({
            id: row.id, name: row.name === null ? '未知成就' : row.name,
            description: row.description === null ? '暂无描述' : row.description,
            displayIndex: entry.key === 'catalogAchievements' ? row.displayIndex : null,
            completedAt: row.completedAt == null ? null : new Date(row.completedAt as string).toISOString()
          })), total: page.total, currentPage: page.currentPage, totalPages: page.totalPages
        });
      }
      if (entry.key.startsWith('encyclopediaPage:')) {
        const [, category, , requestedPage] = entry.key.split(':');
        const source = fixtures[entry.key];
        const page = source.page as Record<string, unknown>;
        assert.deepEqual({ ...result }, { code: 'OK', data: {
          items: (source.items as Record<string, unknown>[]).map(row => ({ id: row.id, name: row.name, gradeName: row.gradeName })),
          totalCount: page.totalCount, totalPages: page.totalPages, page: page.page,
          detailPrefix: category === '材料' ? '道具' : category === '本命' ? '本命物' : category
        } });
        assert.equal(page.page, Math.min(Number(requestedPage), page.totalPages as number));
        if (requestedPage === '99') assert.deepEqual(source.items, []);
        if (entry.key === 'encyclopediaPage:道具:丹药:99') assert.equal(page.totalCount, 7);
      }
      if (entry.key.startsWith('encyclopediaToolCategories')) {
        const directory = (fixtures[entry.key].items as Record<string, unknown>[]).find(row => row.category === '天工');
        assert.deepEqual(result, directory?.subCategories);
        assert.deepEqual(result, entry.key === 'encyclopediaToolCategoriesFull' ? ['锤'] : []);
      }
      if (entry.key.startsWith('encyclopediaQuery')) {
        const source = fixtures[entry.key];
        const kinds: Record<string, string> = { 道具: 'item', 材料: 'item', 装备: 'equipment', 功法: 'skillBook', 天工: 'professionTool', 本命: 'soulArtifact', 本命物: 'soulArtifact' };
        const lore = source.lore as Record<string, unknown> | null;
        const set = source.equipmentSet as Record<string, unknown> | null;
        assert.deepEqual({ ...result }, {
          category: kinds[source.category as string], record: source.record, grade: source.grade,
          facts: { sources: source.sources, setEffects: source.setEffects,
            lore: lore === null ? null : { gameplay: lore.gameplay, lore: lore.lore },
            equipmentSet: set === null ? null : { name: set.name },
            view: (source.view as Record<string, unknown>[]).map(row => ({ kind: row.kind, text: row.text, command: row.command })) }
        });
        if (entry.key === 'encyclopediaQueryEquipment') {
          assert.equal(set?.name, '赤霄');
          assert.deepEqual((source.setEffects as Record<string, unknown>[]).map(row => row.pieces), [2, 4]);
        }
        if (entry.key === 'encyclopediaQueryItem') {
          assert.equal(lore?.lore, null);
          assert.equal(typeof lore?.gameplay, 'string');
        }
        if (entry.key === 'encyclopediaQueryMissingGrade') assert.equal(result.grade, null);
      }
      if (entry.key.startsWith('encyclopediaDetail')) {
        assert.equal(result.category, 'item');
        const facts = result.facts as { sources: unknown; view: { kind: string; text?: string; command?: string }[]; lore: null };
        assert.deepEqual(facts.sources, fixtures[entry.key].sources);
        assert.equal(facts.lore, null);
        assert.deepEqual(facts.view.map(row => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))), fixtures[entry.key].view);
      }
      if (entry.key.startsWith('encyclopediaList')) {
        assert.equal(result.code, 'OK');
        const data = result.data as { page: number; totalCount: number; totalPages: number; items: unknown[]; detailPrefix: string };
        assert.equal(data.page, 1);
        assert.equal(data.totalPages, 1);
        assert.equal(data.totalCount, entry.key === 'encyclopediaListEmpty' ? 0 : 1);
        assert.equal(data.detailPrefix, '道具');
        assert.deepEqual(data.items, entry.key === 'encyclopediaListEmpty' ? [] : [{ id: 1, name: '丹药', gradeName: '一品' }]);
      }
      if (entry.key.startsWith('emailDetailRaw')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('emailQueryPage')) {
        assert.equal(result.total, 2);
        const list = result.list as { 'email.id': number; 'email.subtitle': string; 'email.data': string; 'email.goods': { quantity: number }[]; canClaim: boolean; canDelete: boolean }[];
        if (entry.key === 'emailQueryPage99') {
          assert.deepEqual(list, []);
          assert.equal(result.hasClaimable, false);
          assert.equal(result.hasDeletable, false);
        } else {
          assert.deepEqual(list.map(row => row['email.id']), [2, 1]);
          assert.equal(list[0]['email.subtitle'], '');
          assert.equal(list[0]['email.data'], '');
          assert.deepEqual(list[0]['email.goods'], []);
          assert.equal(list[0].canDelete, true);
          assert.equal(list[1].canClaim, true);
          assert.equal(list[1]['email.goods'][0].quantity, 1);
          assert.equal(result.hasClaimable, true);
          assert.equal(result.hasDeletable, true);
        }
      }
      if (entry.key.startsWith('guildMembers') || entry.key.startsWith('guildMemberQuery')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          membershipStatus: source.membershipStatus, guildName: source.guildName, page: source.page,
          pageSize: source.pageSize, total: source.total, totalPages: source.totalPages,
          members: (source.members as Record<string, unknown>[]).map(row => ({
            userId: row.userId, roleId: row.roleId, roleName: row.roleName === null ? '弟子' : row.roleName,
            userName: row.name === null ? '未知' : `${row.name}（${row.realmName ?? '未知'}）`,
            dailyActivity: row.dailyActivity, weeklyActivity: row.weeklyActivity, contributionTotal: row.contributionTotal,
            isOnLeave: row.isOnLeave, isDeputy: row.isDeputy,
            leaveEndAt: row.leaveEndAt === null ? undefined : new Date(row.leaveEndAt as string)
          }))
        });
        const members = result.members as { userName: string; roleName: string; leaveEndAt?: Date; isDeputy: boolean }[];
        if (entry.key === 'guildMembersJoined') {
          assert.equal(members[0].userName, '（炼气）');
          assert.equal(members[0].roleName, '宗主');
          assert.ok(members[0].leaveEndAt instanceof Date);
          assert.equal(members[1].userName, '未知');
          assert.equal(members[1].roleName, '弟子');
          assert.equal(members[1].leaveEndAt, undefined);
          assert.equal(members[1].isDeputy, true);
        } else if (!entry.key.startsWith('guildMemberQuery')) assert.deepEqual(members, []);
        if (entry.key === 'guildMemberQueryLast') {
          assert.equal(result.page, 2);
          assert.equal(result.total, 4);
          assert.equal(members[0].userName, '（未知）');
          assert.equal(members[1].isDeputy, true);
        }
      }
      if (entry.key === 'enemyQueryEmpty') assert.deepEqual(result as unknown, []);
      if (entry.key === 'enemyQueryFull') {
        const enemies = result as unknown as { uid: number; name: string; totalAttacks: number; lastLogId: number; lastAttackTime: Date }[];
        const raw = fixtures[entry.key] as unknown as { uid: number; lastAttackTime: string }[];
        assert.equal(enemies.length, 2);
        assert.equal(enemies[0].uid, 99);
        assert.equal(enemies[0].name, '玩家99');
        assert.equal(enemies[1].name, '');
        assert.equal(enemies[1].totalAttacks, 2);
        assert.equal(enemies[1].lastLogId, 9);
        assert.equal(enemies[1].lastAttackTime.toISOString(), new Date(raw[1].lastAttackTime).toISOString());
      }
      if (entry.key.startsWith('feedbackPage')) {
        const fixture = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          feedbacks: (fixture.items as Record<string, unknown>[]).map(row => ({ id: row.id, content: row.content, isReplied: row.isReplied, feedbackTime: new Date(row.feedbackTime as string) })),
          total: fixture.total, currentPage: fixture.page, totalPages: Math.ceil((fixture.total as number) / (fixture.pageSize as number))
        });
        assert.equal(result.totalPages, entry.key === 'feedbackPageEmpty' ? 0 : 2);
        const items = result.feedbacks as { id: number; feedbackTime: Date; isReplied: boolean }[];
        const raw = fixture.items as { id: number; feedbackTime: string; isReplied: boolean }[];
        assert.deepEqual(items.map(row => row.id), raw.map(row => row.id));
        for (let index = 0; index < items.length; index++) {
          assert.equal(items[index].feedbackTime.toISOString(), new Date(raw[index].feedbackTime).toISOString());
          assert.equal(items[index].isReplied, raw[index].isReplied);
        }
      }
      if (entry.key.startsWith('feedbackDetail')) {
        const fixture = fixtures[entry.key];
        assert.deepEqual({ ...result }, {
          id: fixture.id, content: fixture.content, isReplied: fixture.isReplied, feedbackTime: new Date(fixture.feedbackTime as string),
          reply: fixture.reply, 'category.name': fixture.categoryName
        });
        assert.equal(result.reply, entry.key === 'feedbackDetail6' ? null : '已记录');
        assert.equal(result['category.name'], entry.key === 'feedbackDetail6' ? null : '');
        assert.equal((result.feedbackTime as Date).toISOString(), new Date(fixture.feedbackTime as string).toISOString());
      }
      if (entry.key.startsWith('guildStoryRecords')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'guildStoryRecordsFull') {
        const records = result.records as { stageIndex: number; damageDealt: number; isEffective: boolean }[];
        assert.equal(records.length, 10);
        assert.equal(records[0].stageIndex, 12);
        assert.equal(records[0].damageDealt, 0);
        assert.equal(records[0].isEffective, false);
        assert.equal(records[9].stageIndex, 3);
      }
      if (entry.key.startsWith('dungeonDetail')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('dungeonCatalog')) {
        const fixture = fixtures[entry.key];
        const { currentPage, totalPages, total, ...projection } = fixture;
        assert.deepEqual({ ...result }, { ...projection, pagination: { currentPage, totalPages, total } });
      }
      if (entry.key.startsWith('bossInfo')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'bossInfo_2.5') assert.equal(result.remainingAttempts, 7.5);
      if (entry.key === 'bossInfo_11') assert.equal(result.remainingAttempts, -1);
      if (entry.key.startsWith('bossRanking') || entry.key.startsWith('bossRewardPreview')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'bossRankingDecimal') assert.equal(result.myDamage, 12.5);
      if (entry.key === 'bossRewardPreviewFull') assert.equal((result.config as { baseDamage: number }).baseDamage, 100 / 9);
      if (entry.key.startsWith('ranking')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('towerFirstQuery')) {
        assert.equal(result.realmName, null);
        const rewards = result.rewards as { ranking: number; state: string; description?: string }[];
        assert.equal(rewards[0].ranking, 470);
        assert.equal(rewards[0].description, entry.key === 'towerFirstQueryDescribed' ? '首通奖励' : undefined);
      }
      if (entry.key.startsWith('towerMonthlyQuery')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.equal(result.bestRank, entry.key === 'towerMonthlyQueryClaimable' ? 3 : null);
      }
      if (entry.key === 'towerOverviewConfigured') assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key.startsWith('towerOverview_')) { assert.equal(result.monthlyClaimStatus, fixtures[entry.key].monthlyClaimStatus); assert.equal(result.monthlyClaimable, entry.key === 'towerOverview_AVAILABLE'); assert.deepEqual(result.firstRewards, []); }
      if (entry.key.startsWith('rechargeCatalog_')) assert.equal((result.packages as Record<string, unknown>[])[0].resolvedLimitPeriod, entry.key.slice('rechargeCatalog_'.length));
      if (entry.key.startsWith('storylineCatalog_')) assert.equal((result.detail as Record<string, unknown>).status, entry.key.slice(entry.key.indexOf('_') + 1));
      if (entry.key === 'publicProfileMissing') { assert.equal(result.found, false); assert.equal(result.profile, null); }
      if (entry.key.startsWith('publicProfile_')) { assert.equal(result.hideProfile, true); assert.equal(result.detail, undefined); assert.equal((result.cave as Record<string, unknown>).relation, entry.key.slice(entry.key.indexOf('_') + 1)); }
      if (entry.key.startsWith('commandAlchemy:')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('taskPanel')) assert.equal(result.defaultTabKey, fixtures[entry.key].defaultTabKey);
      if (entry.key.startsWith('alchemyAccessQuery')) {
        const expected = { ...fixtures[entry.key], currentStep: fixtures[entry.key].currentStep ?? null, message: fixtures[entry.key].message ?? '' };
        assert.deepEqual({ ...result }, expected);
      }
      if (entry.key.startsWith('alchemy') && !entry.key.startsWith('alchemyAccessQuery')) assert.equal(result.code, fixtures[entry.key].code);
      if (entry.key.startsWith('giftCommand')) {
        assert.equal(result.mode, fixtures[entry.key].mode);
        if (entry.key === 'giftCommandMutationFailed') { assert.equal(result.mutation, null); assert.equal(result.mutationError, '物品数量不足'); }
        if (entry.key === 'giftCommandTargetsEmpty') assert.deepEqual((result.targets as Record<string, unknown>).friends, []);
        if (entry.key === 'giftCommandOptionsEmpty') assert.deepEqual((result.options as Record<string, unknown>).gifts, []);
      }
      if (/^(friendWorkflow_|guildDecision_|teamPosition_|teamLeader_)/.test(entry.key)) assert.equal(result.outcome, fixtures[entry.key].outcome);
      if (entry.key === 'guildResignationOptions') assert.equal(result.membershipStatus, 'not_joined');
      if (entry.key === 'guildResignationWorkflow') assert.equal((result.options as Record<string, unknown>).membershipStatus, 'not_joined');
      if (/^(friendRemoval_|blockRemoval_|blockByName_|flyMute_)/.test(entry.key)) assert.equal(result.outcome, fixtures[entry.key].outcome);
      if (entry.key.startsWith('flyMuteCommand_')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'monthCardNone') { assert.equal(result.claim, null); assert.equal(result.status, null); }
      if (entry.key === 'monthCardSnapshotFailed') { assert.ok(result.claim); assert.equal(result.status, null); assert.equal(result.statusError, '状态查询失败'); }
      if (entry.key === 'monthCardClaimed') { assert.ok(result.claim); assert.ok(result.status); }
      if (entry.key.startsWith('firstRecharge')) {
        assert.deepEqual(result.validTiers, [1.5]);
        assert.equal(result.validTier, entry.key !== 'firstRechargeInvalidTier');
        if (entry.key === 'firstRechargeInvalidTier' || entry.key === 'firstRechargeClaimFailed') assert.equal(result.result, null);
        if (entry.key === 'firstRechargeClaimFailed') assert.equal(result.claimError, '奖励已领取');
        if (entry.key === 'firstRechargeNilRewards') assert.deepEqual((result.result as Record<string, unknown>).issued, []);
      }
      if (entry.key.startsWith('achievement')) {
        assert.equal(result.claimedCount, 1);
        assert.equal((result.claimed as Record<string, unknown>[])[0].rewardText, entry.key === 'achievementClaimed' ? '灵晶×1600' : '');
      }
      if (entry.key === 'towerFirstClaim') assert.equal(result.ranking, 470);
      if (entry.key === 'towerFirstClaimAll') assert.equal(result.claimedCount, 2);
      if (entry.key === 'towerMonthlyClaim') assert.equal(result.claimedCount, 1);
      if (entry.key === 'emailClaimed') assert.deepEqual(result.issued, fixtures.emailClaimed.issued);
      if (['emailEmptyReward', 'dailyCheckinEmpty', 'newcomerCheckinEmpty'].includes(entry.key)) assert.deepEqual(result.issued, []);
      if (entry.key === 'emailAllEmpty') assert.equal(result.total, 0);
      if (entry.key === 'emailAllPartial') assert.deepEqual({ ...result }, { claimed: 1, skipped: 1, total: 4 });
      if (entry.key.startsWith('celestialCheckin')) assert.equal((result.issued as Record<string, unknown>[])[0].amount, entry.key === 'celestialCheckinCapped' ? 0 : 10);
      if (entry.key === 'giftCodeRedeemed') assert.deepEqual(result.rewardSummary, fixtures[entry.key].rewardSummary);
      if (entry.key === 'activityEmptyReward' || entry.key === 'referralEmptyReward') assert.deepEqual(result.issued, []);
      if (entry.key.startsWith('activityAll')) {
        assert.equal(result.partial, entry.key === 'activityAllPartial');
        assert.equal((result.claimed as unknown[]).length, entry.key === 'activityAllPartial' ? 1 : 2);
        if (entry.key === 'activityAllPartial') assert.equal(result.error, '后续奖励配置失效');
      }
      if (entry.key === 'referralBoundEmpty' || entry.key === 'weeklyRebateEmpty') assert.deepEqual(result, []);
      if (entry.key === 'referralClaimed') { assert.equal(result.claimed, 1); assert.deepEqual(result.issued, [{ name: '灵晶', amount: 10 }]); }
      if (entry.key === 'weeklyRebateClaimed') assert.deepEqual(result, fixtures.weeklyRebateClaimed.issued);
      if (entry.key === 'titleActivated') assert.equal(result.isActive, true);
      if (entry.key === 'titleRemoved' || entry.key === 'titleNotWorn') assert.equal(result.removed, entry.key === 'titleRemoved');
      if (['storyChestClaimed', 'storyChestLocked', 'storyChapterMissing', 'storyAllChestsEmpty', 'storyAllChestsClaimed'].includes(entry.key)) {
        assert.equal(result.success, entry.key === 'storyChestClaimed' || entry.key === 'storyAllChestsClaimed');
        assert.equal(result.totalReward, fixtures[entry.key].totalReward);
      }
      if (entry.key.startsWith('newcomerRebate')) assert.deepEqual(result.itemNames, fixtures[entry.key].itemNames);
      if (entry.key === 'consumeLastItem') assert.equal(result.remainingQuantity, 0);
      if (entry.key === 'consumeRejected') { assert.equal(result.outcome, 'rejected'); assert.equal(result.remainingQuantity, undefined); }
      if (entry.key === 'equipSucceeded') {
        const equipped = result.equipment as Record<string, unknown>;
        assert.equal(equipped.magicDefensePercent, undefined);
        assert.equal(equipped.physicalAttackPercent, 0.5);
      }
      if (entry.key === 'equipNotFound') assert.equal(result.equipment, undefined);
      if (entry.key === 'equipmentPreviewEmpty' || entry.key === 'equipmentBatchEmpty') { assert.equal(result.success, false); assert.equal(result.totalYield, 0); }
      if (entry.key === 'autoEquipSkipped') assert.equal(result.power, undefined);
      if (entry.key.startsWith('learnedPageQuery')) {
        const { pageSize: _size, ...expected } = fixtures[entry.key];
        assert.deepEqual(result, expected);
      }
      if (entry.key.startsWith('learnedDetailQuery')) {
        const expected = structuredClone(fixtures[entry.key]);
        if (expected.book !== null) {
          const book = expected.book as Record<string, unknown>;
          delete book.skill;
          delete book.skillBuffs;
          for (const field of ['skillId', 'skillTypeId']) if (book[field] === null) book[field] = undefined;
          const display = book.detailDisplay as Record<string, unknown>;
          display.recoveryLines ??= [];
          for (const effect of book.skillEffects as Record<string, unknown>[]) {
            for (const field of ['probability', 'type', 'applyTiming', 'effectTiming', 'applyProbability', 'effectProbability', 'duration', 'multiplier', 'maxStacks', 'attributeModule', 'removable', 'triggerScope']) if (effect[field] === null) delete effect[field];
          }
        }
        assert.deepEqual(result, expected);
      }
      if (entry.key.startsWith('equipmentDetail')) {
        const expected = structuredClone(fixtures[entry.key]);
        if (expected.item !== null) (expected.item as Record<string, unknown>).recoveryEffects = [];
        assert.deepEqual(result, expected);
      }
      if (entry.key === 'equipmentDetailEmpty') { assert.equal(result.item, null); assert.equal(result.playerName, null); }
      if (entry.key === 'equipmentDetailNullableNames') {
        const item = result.item as Record<string, unknown>;
        assert.equal(item.gradeName, null);
        assert.equal(item.magicDefensePercent, 0.5);
        assert.deepEqual(item.recoveryEffects, []);
      }
      if (entry.key.startsWith('equipmentUnequip')) { assert.equal(result.outcome, fixtures[entry.key].outcome); assert.equal(result.stage, fixtures[entry.key].stage); assert.equal(result.instanceId, fixtures[entry.key].instanceId); }
      if (entry.key === 'equipmentDecomposed') assert.equal(result.yieldQuantity, 1);
      if (entry.key === 'skillLearnCommandEmpty') assert.deepEqual(result.results, []);
      if (entry.key === 'skillLearnCommandMixed') {
        const results = result.results as Record<string, unknown>[];
        assert.equal(results[0].success, true); assert.equal(results[1].success, false); assert.equal(results[1].skillBook, undefined);
      }
      if (entry.key === 'skillUnequipNone') assert.equal(result.skillBook, null);
      if (entry.key === 'skillUnequipNullable') assert.deepEqual(result.skillBook, { name: null, skillType: null });
      if (entry.key === 'skillUpgraded') assert.equal((result.attributeUpgrade as Record<string, unknown>).growth, 0.5);
      if (entry.key === 'skillBatchUpgradeStopped') { assert.equal(result.successCount, 0); assert.equal(result.stopReason, '物品数量不足'); }
      if (entry.key.startsWith('skillDecomposed')) {
        assert.equal(result.refundExp, entry.key === 'skillDecomposedLow' ? 2000 : 6000);
        const items = result.refundedItems as Record<string, number>[];
        assert.equal(items.reduce((sum, item) => sum + item.quantity * item.expValue, 0), result.refundExp);
      }
      if (entry.key === 'skillDecomposePreviewFull') { assert.equal(result.totalExp, 2000); assert.deepEqual(result.estimatedItems, [{ itemId: 1, name: '残页', quantity: 2, expValue: 1000 }]); }
      if (entry.key === 'skillDecomposePreviewEmpty') { assert.equal(result.totalCount, 0); assert.deepEqual(result.estimatedItems, []); }
      if (entry.key === 'skillDecomposeQueryNoGrade') assert.equal(result.preview, null);
      if (entry.key === 'skillDecomposeQueryMatched') assert.ok(result.preview);
      if (entry.key === 'skillLearnConfirmation' || entry.key === 'skillSwitchConfirmation') {
        assert.equal((result.targetMaximum as Record<string, number>).physicalAttackPercent, 0.5);
        assert.equal((result.oldMaximum as Record<string, number>).physicalAttackPercent, 0);
      }
      if (entry.key === 'skillLearnReplaced') assert.equal((result.refundInfo as Record<string, number>).totalExp, 2000);
      if (entry.key === 'skillSingleLearnEmptyBag') assert.equal(result.skillBook, undefined);
      if (entry.key === 'skillSingleLearned' || entry.key === 'skillSwitched') assert.equal(result.oldSkillBook, undefined);
      if (entry.key.startsWith('master') && !['masterProposalsEmpty', 'masterGraduationProposalsEmpty', 'masterInfoEmpty'].includes(entry.key)) {
        assert.equal(result.message, entry.key === 'masterApply' ? '已向师父发起拜师申请，等待对方同意' : fixtures[entry.key].message);
      }
      if (entry.key === 'masterProposalsEmpty' || entry.key === 'masterGraduationProposalsEmpty') assert.deepEqual(result, []);
      if (entry.key === 'masterInfoEmpty') { assert.equal(result.discipleSide, null); assert.equal(result.masterSide, null); }
      if (entry.key === 'companionInfoNone') assert.equal(result.companion, null);
      if (entry.key === 'companionBreakup') assert.equal(result.narrativeText, fixtures.companionBreakup.narrativeText);
      if (entry.key === 'companionOathUpgrade') assert.equal(result.success, true);
      if (entry.key === 'companionDualCapped') { assert.equal(result.experienceGained, 0); assert.equal(result.tongxinGained, 5); }
      if (entry.key === 'teamMatchNone') assert.equal(result, null);
      if (['WAITING', 'SAME_REALM', 'ADJACENT_REALM', 'NEAREST_REALM'].some(phase => entry.key === `teamMatch${phase}`)) assert.equal(result.phase, entry.key.slice('teamMatch'.length));
      if (entry.key.startsWith('teamMatchGuard')) assert.equal(result.blocked, entry.key === 'teamMatchGuardBlocked');
      if (entry.key === 'teamMatchCancelNone') { assert.equal(result.cancelled, false); assert.equal(result.targetLabel, null); }
      if (entry.key === 'teamMatchCancelled') assert.equal(result.cancelled, true);
      if (entry.key.startsWith('teamApply')) assert.equal(result.autoApproved, entry.key === 'teamApplyApproved');
      if (entry.key.startsWith('teamInvite')) assert.equal(result.autoAccepted, entry.key === 'teamInviteAccepted');
      if (entry.key === 'teamInfoNone') assert.equal(result.team, null);
      if (entry.key === 'teamInvitationInboxEmpty') assert.deepEqual(result.invitations, []);
      if (entry.key.startsWith('soulPath')) {
        const path = entry.key === 'soulPathChoose' ? result : result.path as Record<string, unknown>;
        assert.equal(path.pathKey, entry.key === 'soulPathSwitch' ? 'lian_ti' : 'xuan_fa');
        assert.equal(path.pathSwitchAvailableAt, entry.key === 'soulPathAdvance' ? null : '2030-01-01T00:00:00Z');
      }
      if (entry.key === 'soulWashPreview' || entry.key === 'soulWashConfirm') {
        const pending = result.pending as { totalSuccess: number; results: { success: boolean; details?: string[] }[] };
        assert.equal(pending.totalSuccess, 1);
        assert.equal(pending.results[0].success, true);
        assert.equal(pending.results[0].details, undefined);
      }
      if (entry.key === 'soulWashNoPending') assert.equal(result.totalSuccess, 0);
      if (entry.key === 'soulWashCancelled') assert.equal(result.totalSuccess, 1);
      if (entry.key === 'meridianPulseZeroRemaining') { assert.equal(result.trueQiRemaining, 0); assert.equal(result.jumped, false); }
      if (entry.key === 'caveViewLocked') assert.equal(result.overview, null);
      if (entry.key === 'caveViewNoPlot') assert.equal(result.overview, null);
      if (entry.key === 'caveCommandSnapshotFailed') {
        assert.equal(result.message, '收获完成');
        assert.equal(result.snapshotError, '操作已完成，暂时无法刷新灵田，请稍后查看。');
        assert.equal(result.overview, null);
        assert.equal(result.needsSeedSelection, false);
      }
      if (entry.key === 'caveCommandChooseSeed') {
        assert.equal(result.needsSeedSelection, true);
        assert.deepEqual((result.options as Record<string, unknown>).options, []);
      }
      if (entry.key === 'caveVisitStranger') assert.deepEqual(result.plots, []);
      if (entry.key === 'caveAccelerationNotFound') assert.equal(result.found, false);
      if (entry.key === 'caveAccelerationEmptyInventory') {
        assert.equal(result.remainingHours, 0.5);
        assert.equal(result.maxLingfei, 0);
        assert.equal(result.maxGreenBottle, 0);
      }
      if (entry.key.startsWith('caveFormation')) {
        assert.equal(result.durationHours, 1.5);
        assert.equal(result.replaced, entry.key === 'caveFormationReplaced');
      }
      if (entry.key.startsWith('guildMining')) {
        assert.equal(result.started, entry.key === 'guildMiningStarted');
        assert.equal(result.capReached, entry.key === 'guildMiningCapped');
        assert.equal(result.spiritStoneAdded, 0);
      }
      if (entry.key === 'guildWorshipCapped') assert.equal(result.dailyActivityAdded, 0);
      if (entry.key === 'guildStipendFractional') {
        assert.equal(result.levelMultiplier, 1.1);
        assert.equal(result.activityMultiplier, 1.2);
        assert.equal(result.amount, 1320);
      }
      if (entry.key === 'guildShopSignedDelta') {
        assert.equal(result.contributionDelta, -100);
        assert.equal(result.prestigeGain, 0);
        assert.equal(result.remainingDailyCount, 0);
      }
      if (entry.key === 'guildAutoRefreshNotJoined') assert.deepEqual(result.hours, []);
      if (entry.key === 'guildAutoRefreshReady') assert.deepEqual(result.hours, [0, 12, 23]);
      if (entry.key.startsWith('guildPacket')) assert.equal(result.currencyType, 'contribution');
      if (entry.key.startsWith('guildLeave')) assert.equal(result.confirmationRequired, entry.key === 'guildLeaveConfirm');
      if (entry.key === 'guildTransferDone') assert.deepEqual(result.candidates, []);
      if (entry.key === 'guildTransferConfirm') assert.equal(result.confirmationExpiresInSeconds, 60);
      if (entry.key.startsWith('guildUpgradeActual:') || entry.key.startsWith('guildCheckinActual')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('redPacketListQuery')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'redPacketListQueryFull') assert.deepEqual((result.packets as Record<string, unknown>[]).map(row => row.id), [20, 19]);
      if (entry.key === 'redPacketListQueryAtExpiry') {
        const packets = result.packets as Record<string, unknown>[];
        assert.deepEqual(packets.map(row => row.id), [20, 19]);
        assert.equal(packets[0].remainingTimeText, '已过期');
        assert.equal(packets[1].remainingTimeText, '1小时0分钟');
      }
      if (entry.key === 'redPacketListQueryPastExpiry') assert.deepEqual((result.packets as Record<string, unknown>[]).map(row => row.id), [19]);
      if (entry.key === 'redPacketListQueryAllExpired') assert.deepEqual(result.packets, []);
      if (entry.key.startsWith('senderPacketQuery')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'senderPacketQueryFull') {
        const packets = result.packets as Record<string, unknown>[];
        assert.equal(packets.length, 20);
        assert.deepEqual(packets.map(row => row.id), Array.from({ length: 20 }, (_, index) => 20 - index));
        assert.equal(packets[0].expiresAt, null);
        assert.equal(packets[2].recycleAmount, 72);
      }
      if (entry.key === 'senderPacketQueryAtExpiry' || entry.key === 'senderPacketQueryPastExpiry') {
        const packet = (result.packets as Record<string, unknown>[])[0];
        assert.equal(packet.canRecycle, entry.key === 'senderPacketQueryPastExpiry');
        assert.equal(packet.recycleAmount, entry.key === 'senderPacketQueryPastExpiry' ? 72 : 0);
        assert.equal(packet.statusText, entry.key === 'senderPacketQueryPastExpiry' ? '⏰已过期' : '🧧发放中（剩已过期）');
      }
      if (entry.key.startsWith('roleDirectoryQuery')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'roleDirectoryQueryLeader') {
        const members = result.members as Record<string, unknown>[];
        assert.deepEqual(members.map(row => row.userId), [1, 3, 2, 5, 6]);
        assert.equal(members[0].name, '');
        assert.equal(members[1].name, null);
        assert.equal(members[1].userExists, false);
        assert.deepEqual(members[1].appointableRoles, [{ id: 3, name: '副宗主' }, { id: 4, name: '长老' }]);
        assert.deepEqual((result.kickableMembers as Record<string, unknown>[]).map(row => row.userId), [3, 2, 5, 6]);
      }
      if (entry.key === 'roleDirectoryQueryMember' || entry.key === 'roleDirectoryQueryExpiredDeputy') assert.deepEqual(result.kickableMembers, []);
      if (entry.key.startsWith('autoRefresh')) assert.deepEqual(result, fixtures[entry.key]);
      if (/^autoRefresh(?:Read|Write)Query:Fractional$/.test(entry.key)) assert.deepEqual(result.hours, [8.5]);
      if (/^autoRefresh(?:Read|Write)Query:Sorted$/.test(entry.key)) assert.deepEqual(result.hours, [8, 12, 20]);
      if (/^autoRefresh(?:Read|Write)Query:LegacyCoercion$/.test(entry.key)) assert.deepEqual(result.hours, [0, 1, 16]);
      if (/^autoRefresh(?:Read|Write)Query:Truthy$/.test(entry.key)) assert.deepEqual(result.hours, [0]);
      if (entry.key.startsWith('taskOverviewQuery:')) {
        const source = fixtures[entry.key];
        const expected = entry.key.includes(':daily:') ? { ...source, milestones: (source.milestones as Record<string, unknown>[]).map(row => ({ id: row.id, threshold: row.threshold, description: row.description ?? '', claimed: row.claimed, canClaim: row.canClaim })) } : source;
        assert.deepEqual({ ...result }, expected);
        if (entry.key.includes(':weekly:')) {
          assert.equal(result.stipendLevelMultiplier, 1.1);
          assert.equal(result.stipendActivityMultiplier, entry.key.endsWith(':11') ? 1.5 : entry.key.endsWith(':12') ? 1.2 : 0);
          assert.equal(result.stipendPreviewAmount, entry.key.endsWith(':11') ? 165 : entry.key.endsWith(':12') ? 132 : 0);
        }
        if (entry.key.endsWith(':13')) assert.equal(result.claimAllAvailable, false);
      }
      if (entry.key.startsWith('miningReceiptActual')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'miningReceiptActualStarted') assert.equal(result.remainingSeconds, 3600);
      if (entry.key === 'miningReceiptActualSettled') {
        assert.equal(result.settledHours, 2);
        assert.equal(result.spiritStoneAdded, 5);
        assert.equal(result.contributionAdded, 40);
        assert.equal(result.capReached, true);
      }
      if (entry.key === 'miningReceiptActualCapped') {
        assert.equal(result.settledHours, 6);
        assert.equal(result.spiritStoneAdded, 0);
        assert.equal(result.contributionAdded, 120);
      }
      if (entry.key.startsWith('worshipReceiptActual') || entry.key.startsWith('stipendReceiptActual')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('worshipReceiptActual')) {
        assert.equal(result.cost, 5000);
        assert.equal(result.currentDailyActivity, 45);
        assert.equal(result.dailyActivityAdded, entry.key.endsWith('Capped') ? 0 : 5);
        assert.equal(result.contributionAdded, 20);
      }
      if (entry.key.startsWith('stipendReceiptActual')) {
        assert.equal(result.levelMultiplier, 1.2);
        assert.equal(result.activityMultiplier, entry.key.endsWith('Capped') ? 1.2 : 1.5);
        assert.equal(result.amount, entry.key.endsWith('Capped') ? 144 : 180);
      }
      if (entry.key.startsWith('battlePreparation')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'battlePreparationUpgradeTeam') {
        assert.equal(result.prestige, 450);
        assert.equal(result.spiritStone, 45000);
        assert.equal(result.contributionPoints, null);
      }
      if (entry.key === 'battlePreparationUpgradePersonal') {
        assert.equal(result.contributionPoints, 800);
        assert.equal(result.prestige, null);
        assert.equal(result.spiritStone, null);
      }
      if (entry.key === 'battlePreparationQuery:Capped') {
        assert.equal((result.team as Record<string, unknown>[])[0].nextCostPrestige, null);
        assert.equal((result.personal as Record<string, unknown>[])[4].nextCostContribution, null);
      }
      if (entry.key === 'battlePreparationQuery:Locked') assert.equal(result.unlocked, false);
      if (entry.key.startsWith('packetMutationActual:')) {
        assert.deepEqual(result, fixtures[entry.key]);
        const action = entry.key.split(':')[1];
        if (action === 'send') assert.equal(result.autoClaimedAmount, 100);
        if (action === 'claim') assert.equal(result.amount, 100);
        if (action === 'recycle') assert.equal(result.refundAmount, 300);
        if (action.startsWith('refund')) assert.equal(result.refundAmount, Number(action.slice(6)));
      }
      if (entry.key.startsWith('milestoneReceiptActual:')) {
        assert.deepEqual(result, fixtures[entry.key]);
        const [, action] = entry.key.split(':');
        if (action === 'single') assert.deepEqual(result.rewards, { spiritStone: 10, contribution: 2, prestige: 1 });
        else {
          assert.equal(result.partial, action === 'partial');
          assert.deepEqual((result.claimed as Record<string, unknown>[]).map(row => row.id), action === 'all' ? [1, 2] : [1]);
          assert.equal((result.claimed as Record<string, unknown>[])[0].description, '');
        }
      }
      if (entry.key.startsWith('shopPageQuery')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key === 'shopPageQueryFractional') assert.deepEqual(result.autoRefreshHours, [8.5]);
      if (entry.key === 'shopPageQueryReady') {
        const items = result.items as Record<string, unknown>[];
        assert.equal(items[0].purchased, true);
        assert.equal(items[0].canExchange, false);
        assert.equal(items[0].itemType, null);
        assert.equal(items[1].canExchange, true);
      }
      if (entry.key.startsWith('shopPageQueryLinked:')) {
        const items = result.items as Record<string, unknown>[];
        assert.equal(items[0].itemType, 'pill');
        assert.equal(items[0].itemSubtype, '恢复');
        assert.equal(items[1].itemType, null);
      }
      if (entry.key === 'shopPageQueryLinked:8') {
        assert.equal(result.isLeader, false);
        assert.equal(result.contributionPoints, 0);
        assert.ok((result.items as Record<string, unknown>[]).every(row => row.purchased === false && row.canExchange === true));
      }
      if (entry.key === 'shopPageQueryDeletedItem') assert.equal((result.items as Record<string, unknown>[])[0].itemType, null);
      if (entry.key.startsWith('taskActionActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.ok(Array.isArray(result.steps));
        if (entry.key.endsWith(':EmptySaved')) { assert.equal(result.alias, ''); assert.deepEqual(result.steps, []); }
        if (entry.key === 'taskActionActual:step:Saved') assert.deepEqual(result.steps, ['签到']);
        if (entry.key === 'taskActionActual:alias:Saved') assert.equal(result.alias, '每日 清修');
      }
      if (entry.key.startsWith('catalogCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.equal(new URL(lastRequestURL, 'http://localhost').searchParams.has('cursor'), true);
        const products = result.products as Record<string, unknown>[];
        assert.ok(products.length <= 5);
        if (entry.key.includes(':Denied') || entry.key.includes(':EmptyCurrency')) assert.deepEqual(products, []);
        for (const product of products) {
          if (product.productId === 1 || product.productId === 2) {
            assert.equal(product.discountRate, 0.96);
            assert.equal(product.discountPriceAmount, 96);
          }
          if (product.productId === 7) {
            assert.equal(product.unlocked, false);
            assert.equal(typeof product.nextPurchaseAt, 'string');
            assert.equal(product.discountRate, null);
          }
        }
      }
      if (entry.key.startsWith('alchemistCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.equal(new URL(lastRequestURL, 'http://localhost').searchParams.has('cursor'), true);
        const items = result.items as Record<string, unknown>[];
        if (entry.key.includes(':Page')) {
          const page = Number(entry.key.split(':Page')[1]);
          assert.equal(result.total, 50);
          assert.deepEqual(items.map(row => row.playerId), Array.from({ length: 5 }, (_, index) => (page - 1) * 5 + index + 1));
          assert.equal(typeof result.nextCursor, page < 10 ? 'string' : 'undefined');
        } else assert.deepEqual(items, []);
        if (entry.key.endsWith(':Page1')) {
          assert.equal(items[0].name, '');
          assert.equal(items[0].title, '');
          assert.equal(items[0].successRate, '3.13');
          assert.equal(items[0].canLike, false);
        }
      }
      if (entry.key.startsWith('encyclopediaCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.equal(Object.hasOwn(result, 'page'), false);
        const [, category, subCategory, rawPage] = entry.key.split(':');
        const url = new URL(lastRequestURL, 'http://localhost');
        assert.equal(url.searchParams.get('category'), category);
        assert.equal(url.searchParams.get('subCategory'), subCategory || null);
        assert.equal(url.searchParams.has('cursor'), true);
        if (rawPage === '1') assert.equal(url.searchParams.get('cursor'), '');
        const items = result.items as Record<string, unknown>[];
        assert.ok(items.length <= 5);
        for (const row of items) {
          assert.ok(Number.isSafeInteger(row.id));
          for (const field of ['name', 'gradeName', 'detailCategory']) assert.equal(typeof row[field], 'string');
        }
      }
      if (entry.key.startsWith('feedbackCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.equal(new URL(lastRequestURL, 'http://localhost').searchParams.has('cursor'), true);
        for (const field of ['total', 'page', 'pageSize']) assert.equal(Object.hasOwn(result, field), false);
        const items = result.items as Record<string, unknown>[];
        if (entry.key.endsWith(':First')) assert.deepEqual(items.map(row => row.id), [6, 5, 4, 3, 2]);
        if (entry.key.endsWith(':Last')) assert.deepEqual(items.map(row => row.id), [1]);
        if (entry.key.endsWith(':UID2')) assert.deepEqual(items.map(row => row.id), [7]);
        if (entry.key.endsWith(':UID99') || entry.key.endsWith(':AfterLast')) assert.deepEqual(items, []);
      }
      if (entry.key.startsWith('glossaryCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        const url = new URL(lastRequestURL, 'http://localhost');
        assert.equal(url.searchParams.has('cursor'), true);
        assert.equal(Object.hasOwn(result, 'total'), false);
        assert.equal(Object.hasOwn(result, 'page'), false);
        assert.equal(Object.hasOwn(result, 'pageSize'), false);
        const items = result.items as Record<string, unknown>[];
        if (entry.key.endsWith(':First')) assert.deepEqual(items.map(row => row.id), [6, 5, 4, 3, 2]);
        if (entry.key.endsWith(':Last')) assert.deepEqual(items.map(row => row.id), [1]);
        if (entry.key.endsWith(':Category')) { assert.deepEqual(items.map(row => row.id), [2]); assert.equal(url.searchParams.get('category'), '道具'); }
        if (entry.key.endsWith(':Wildcard')) assert.equal(url.searchParams.get('keyword'), '修仙%');
        if (entry.key.endsWith(':Empty')) assert.deepEqual(items, []);
      }
      if (entry.key.startsWith('storyCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.equal(new URL(lastRequestURL, 'http://localhost').searchParams.has('cursor'), true);
        if (entry.key.includes(':Page')) {
          const page = Number(entry.key.split(':Page')[1]);
          const board = result.leaderboard as Record<string, unknown>;
          const items = board.items as Record<string, unknown>[];
          assert.equal(board.total, 50);
          assert.deepEqual(items.map(row => row.uid), Array.from({ length: 5 }, (_, index) => 52 - (page - 1) * 5 - index));
          assert.equal(typeof board.nextCursor, page < 10 ? 'string' : 'undefined');
        }
        if (entry.key.endsWith(':AfterLast')) assert.deepEqual((result.leaderboard as Record<string, unknown>).items, []);
      }
      if (entry.key.startsWith('caveCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.ok(Array.isArray(result.logs));
        assert.equal(new URL(lastRequestURL, 'http://localhost').searchParams.has('cursor'), true);
        if (entry.key.endsWith(':First')) {
          assert.deepEqual(result.logs, ['最新', '二', '三', '四', '五']);
          assert.equal(result.total, 6);
          assert.equal(result.totalPages, 1);
        }
        if (entry.key.endsWith(':Last')) assert.deepEqual(result.logs, ['最旧']);
        if (entry.key.endsWith(':AfterLast') || entry.key.endsWith(':Empty')) assert.deepEqual(result.logs, []);
        if (entry.key.endsWith(':Structured')) assert.deepEqual(result.logs, ['灵植已成熟', '灵植已成熟']);
      }
      if (entry.key.startsWith('historyCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.ok(Array.isArray(result.items));
        assert.equal(new URL(lastRequestURL, 'http://localhost').searchParams.has('cursor'), true);
        if (entry.key.endsWith(':First')) assert.deepEqual((result.items as Record<string, unknown>[]).map(row => row.id), ['5', '4', '3', '2', '1']);
        if (entry.key.endsWith(':Last')) assert.deepEqual((result.items as Record<string, unknown>[]).map(row => row.id), ['0']);
        if (entry.key.endsWith(':AfterLast') || entry.key.endsWith(':UID99')) assert.deepEqual(result.items, []);
      }
      if (entry.key.startsWith('reviewCursorActual:')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        assert.ok(Array.isArray(result.applications));
        const requestURL = new URL(lastRequestURL, 'http://localhost');
        assert.equal(requestURL.searchParams.has('cursor'), true);
        if (entry.key === 'reviewCursorActual:First') {
          assert.equal(requestURL.searchParams.get('cursor'), '');
          assert.equal(result.currentPage, 0);
          assert.equal(typeof result.nextCursor, 'string');
        }
      }
      if (entry.key.startsWith('reviewQueryActual:')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'reviewQueryActual:Leader') {
        const rows = result.applications as Record<string, unknown>[];
        assert.deepEqual(rows.map(row => row.id), [1, 2, 3, 4, 5]);
        assert.deepEqual(rows.slice(0, 3).map(row => row.userName), ['', null, null]);
        assert.equal(result.total, 6);
        assert.equal(result.totalPages, 2);
      }
      if (entry.key === 'reviewQueryActual:Last') {
        assert.equal(result.currentPage, 2);
        assert.deepEqual((result.applications as Record<string, unknown>[]).map(row => row.id), [6]);
      }
      if (entry.key === 'reviewQueryActual:Empty') {
        assert.equal(result.currentPage, 99);
        assert.equal(result.totalPages, 0);
        assert.deepEqual(result.applications, []);
      }
      if (entry.key === 'reviewQueryActual:MissingDate') assert.equal((result.applications as Record<string, unknown>[])[0].createdAt, null);
      if (['reviewQueryActual:ExpiredDeputy', 'reviewQueryActual:RedisUnavailable2', 'reviewQueryActual:Denied'].includes(entry.key)) {
        assert.equal(result.canReview, false);
        assert.deepEqual(result.applications, []);
      }
      if (entry.key.startsWith('applicationQueryActual:')) assert.deepEqual({ ...result }, fixtures[entry.key]);
      if (entry.key === 'applicationQueryActual:1') {
        const rows = result.applications as Record<string, unknown>[];
        assert.deepEqual(rows.map(row => row.id), [3, 2, 1]);
        assert.deepEqual(rows.map(row => row.guildName), [null, null, '']);
        assert.ok(rows.every(row => row.status === 0 && row.canCancel === true));
      }
      if (entry.key === 'applicationQueryActual:MissingDate') {
        const row = (result.applications as Record<string, unknown>[]).find(row => row.id === 1);
        assert.ok(row);
        assert.equal(row.createdAt, null);
        assert.equal(row.createdDateText, '2026/10/2');
      }
      if (entry.key.startsWith('guildHomeQueryActual:')) {
        const source = fixtures[entry.key];
        assert.deepEqual({ ...result }, { ...source, membership: source.membership ?? null, guild: source.guild ?? null });
      }
      if (entry.key === 'guildHomeQueryActual:Fractional') assert.deepEqual(((result.guild as Record<string, unknown>).shopAutoRefresh as Record<string, unknown>).hours, [8.5]);
      if (entry.key === 'guildHomeQueryActual:Nullable') {
        const guild = result.guild as Record<string, unknown>;
        assert.equal(guild.notice, null);
        assert.equal(guild.spiritStone, 0);
        assert.equal((guild.leader as Record<string, unknown>).name, null);
      }
      if (entry.key === 'guildUpgrade') assert.equal(result.prestigeCost, 0);
      if (entry.key.startsWith('guildMilestone')) {
        assert.equal(result.partial, entry.key === 'guildMilestonePartial');
        assert.deepEqual(result.claimed, [{ id: 1, threshold: 40, description: '' }]);
      }
      if (entry.key.startsWith('friendAccept')) assert.equal(result.success, entry.key === 'friendAccept');
      if (entry.key === 'popularityLastLike') assert.equal(result.remainingLikes, 0);
      if (entry.key.startsWith('socialAccessQuery')) {
        const source = fixtures[entry.key];
        const realmName = source.realmName || '未知';
        assert.deepEqual({ ...result }, { ok: source.canUseFifthLayerFeature, realmName });
        assert.deepEqual(await getBackendGuildAccess('contract-player', 1), { ok: source.canCreateOrApplyGuild, realmName });
        if (entry.key === 'socialAccessQueryGuild') assert.equal(source.canCreateOrApplyGuild, true);
        assert.deepEqual(await getBackendFriendAccess('contract-player', 1), [
          { ok: source.canUseFifthLayerFeature, realmName }, { ok: source.canUseSpar, realmName }
        ]);
        if (entry.key === 'socialAccessQueryFifth') {
          assert.equal(source.canUseFifthLayerFeature, true);
          assert.equal(source.canUseSpar, false);
        }
        if (entry.key === 'socialAccessQuerySpar') {
          assert.equal(source.canUseFifthLayerFeature, false);
          assert.equal(source.canUseSpar, true);
        }
        if (entry.key.endsWith('MissingRealm') || entry.key.endsWith('MissingUser')) {
          assert.equal(source.canUseFifthLayerFeature, false);
          assert.equal(source.canUseSpar, false);
        }
      }
      if (entry.key.startsWith('historyQuery')) {
        const source = fixtures[entry.key];
        if (entry.key.endsWith('Memory')) {
          const items = (source.items as Record<string, unknown>[]).map(row => ({ label: row.label, text: row.text, subtext: row.subtext }));
          assert.deepEqual({ ...result }, { name: source.name, totalDays: source.totalDays, canShowStoryButton: source.canShowStoryButton, items });
          assert.equal(source.totalDays, 3);
          assert.equal(source.canShowStoryButton, entry.key === 'historyQueryFullMemory');
          if (entry.key === 'historyQueryFullMemory') {
            assert.equal(items.length, 3);
            assert.equal(items[1].subtext, undefined);
            assert.match(items[2].text as string, /三星大捷/);
          } else assert.equal(items.length, 1);
        } else {
          assert.deepEqual({ ...result }, { name: source.name, items: source.items, canShowMemoryButton: source.canShowMemoryButton });
          assert.equal(source.canShowMemoryButton, entry.key === 'historyQueryFullStory');
        }
      }
      if (entry.key.startsWith('blockedQuery')) {
        const source = fixtures[entry.key] as unknown as Record<string, unknown>[];
        assert.deepEqual(result, source.map(row => ({ id: row.id, blockedUserName: row.blockedUserName || '未知用户', createdAt: new Date(row.createdAt as string) })));
        if (entry.key === 'blockedQueryFull') {
          const blocked = result as unknown as { id: number; blockedUserName: string }[];
          assert.deepEqual(blocked.map(row => row.id), [4, 3, 2, 1]);
          assert.deepEqual(blocked.map(row => row.blockedUserName), ['未知用户', '未知用户', '未知用户', '甲']);
        }
        if (entry.key === 'blockedQueryCapped') {
          const blocked = result as unknown as { id: number }[];
          assert.equal(blocked.length, 100);
          assert.equal(blocked[0].id, 300);
          assert.equal(blocked[99].id, 201);
        }
      }
      if (entry.key.startsWith('pendingQuery')) {
        const source = fixtures[entry.key] as unknown as Record<string, unknown>[];
        assert.deepEqual(result, source.map(row => ({
          id: row.id, fromUserId: row.fromUserId, fromUserName: row.fromUserName || '未知用户',
          fromUserRealm: row.fromUserRealmId ? row.fromUserRealmName || '未知境界' : '无境界',
          message: row.message ?? null, createdAt: new Date(row.createdAt as string)
        })));
        if (entry.key === 'pendingQueryFull') {
          const requests = result as unknown as { id: number; fromUserName: string; fromUserRealm: string }[];
          assert.deepEqual(requests.map(row => row.id), [1, 2, 3, 4, 5, 6, 7]);
          assert.equal(requests[1].fromUserName, '未知用户');
          assert.equal(requests[2].fromUserRealm, '未知境界');
          assert.equal(requests[3].fromUserName, '未知用户');
          assert.equal(requests[4].fromUserRealm, '无境界');
          assert.equal(requests[6].fromUserRealm, '无境界');
        }
      }
      if (entry.key === 'friendRequestsEmpty') assert.deepEqual(result, []);
      if (entry.key === 'friendRequestNoMessage') {
        const rows = result as unknown as { message: string | null; fromUserName: string; createdAt: Date }[];
        assert.equal(rows[0].message, null);
        assert.equal(rows[0].fromUserName, '好友');
        assert.ok(Number.isFinite(rows[0].createdAt.getTime()));
      }
      if (entry.key.startsWith('marketCancel')) assert.equal(result.feeAmount, entry.key === 'marketCancelFree' ? 0 : 5);
      if (entry.key === 'tongtianChallenge' || entry.key === 'tongtianBatch') {
        const rounds = entry.key === 'tongtianBatch' ? result.rounds as Record<string, unknown>[] : [result];
        for (const round of rounds) {
          const battle = round.battle as { sideA: { isDead: boolean }[]; sideB: { isDead: boolean }[] };
          assert.equal(battle.sideA[0].isDead, false);
          assert.equal(battle.sideB[0].isDead, true);
        }
        if (entry.key === 'tongtianBatch') {
          const events = result.events as { challenge: { battle: { sideA: { isDead: boolean }[]; sideB: { isDead: boolean }[] } } }[];
          assert.equal(events[0].challenge.battle.sideA[0].isDead, false);
          assert.equal(events[0].challenge.battle.sideB[0].isDead, true);
        }
      }
      if (entry.key === 'guideRefineStepOnly' || entry.key.startsWith('guideJoin') || entry.key === 'alchemyAdvanceSubmitted') assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('advanceCheckQuery:')) {
        const expected = structuredClone(fixtures[entry.key]);
        if (expected.status === 'NOT_ALCHEMIST') assert.deepEqual({ ...result }, { status: 'NOT_ALCHEMIST' });
        else {
          for (const field of ['requiredExp', 'nextLevel', 'nextTitle', 'nextRealmRequired']) expected[field] ??= null;
          assert.deepEqual(result, expected);
        }
      }
      if (entry.key.startsWith('recipeCatalog')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('recipeDetailQuery')) assert.deepEqual(result, fixtures[entry.key]);
      if (entry.key.startsWith('skillReroll')) { assert.equal(result.ownedCount, 0); assert.equal(result.mode, entry.key === 'skillRerollNoCharm' ? 'list' : 'preview'); }
      if (entry.key === 'skillResetNoAttrs') assert.deepEqual(result.refundInfo, { exp: 0, spiritStone: 0, upgradeCount: 1, affectedAttrs: [], items: [] });
      if (entry.key === 'skillResetEmptyRefund') assert.deepEqual(result.refundInfo, { exp: 0, spiritStone: 0, upgradeCount: 0, affectedAttrs: ['物攻'], items: [] });
      if (entry.key === 'proficiencySuccess') { assert.equal(result.oldProficiency, 0); assert.equal(result.newProficiency, 1); assert.equal(result.remainingPoints, 0); assert.equal(result.failCount, 0); assert.equal(result.pityTriggered, false); }
      if (entry.key === 'companionPurchasePreview') { assert.equal(result.totalPrice, 9); assert.equal(result.grantQuantity, 6); assert.equal(result.count, 3); }
      if (entry.key === 'companionPurchaseResult') { assert.equal(result.paid, '9 同心值'); assert.equal(result.granted, 6); assert.equal(result.buyCount, 3); }
      if (entry.key === 'proficiencyFailure') { assert.equal(result.newProficiency, 0); assert.equal(result.successCount, 0); assert.equal(result.failCount, 1); }
      if (entry.key === 'proficiencyInsufficient') assert.equal(result.currentPoints, 0);
      if (entry.key === 'eventTaskEmpty') assert.deepEqual(result.issued, []);
      if (entry.key === 'eventTaskToken') assert.deepEqual(result.issued, [{ type: 'free_token', name: '仙缘', amount: 10 }]);
      if (entry.key === 'lootboxEmpty') assert.deepEqual(result.rewards, []);
      if (entry.key === 'worldBossClaimEmpty' || entry.key === 'skillBatchEmpty') assert.deepEqual(result.items, []);
      if (entry.key === 'dungeonSweepEmpty') { assert.deepEqual(result.items, []); assert.deepEqual(result.currency, []); }
      if (entry.key === 'dungeonFreeSweepEmpty') assert.deepEqual(result.sweptDungeons, []);
      if (entry.key.startsWith('counter')) assert.equal(result.isWin, entry.key !== 'counterLoss');
      if (entry.key === 'counterDrop') { assert.equal(result.shaQiBonus, .12); assert.equal(result.stoneReward, 10); assert.deepEqual(result.droppedItem, { name: '丹药', category: '物品', quantity: 2 }); }
      if (['spar', 'sparDenied', 'sparMissingTarget', 'sparLoss'].includes(entry.key)) {
        assert.equal(result.allowed, fixtures[entry.key].allowed);
        assert.equal(result.targetUid, fixtures[entry.key].targetUid);
        if (entry.key === 'sparDenied' || entry.key === 'sparMissingTarget') assert.equal(result.battle, null);
        if (entry.key === 'sparLoss') assert.equal((result.battle as Record<string, unknown>).winner, 'B');
      }
      if (['bounty', 'bountyLoss', 'bountyDrop'].includes(entry.key)) assert.equal(result.battleWon, fixtures[entry.key].battleWon);
      if (entry.key === 'bountyLoss') { assert.equal(result.streak, -1); assert.equal(result.bountyReward, undefined); }
      if (entry.key === 'bountyDrop') { assert.equal(result.streakBonus, .1); assert.equal(result.shaQiBonus, .12); assert.equal(result.completionId, 1); assert.deepEqual(result.droppedItem, { name: '丹药', category: '物品', quantity: 2 }); }
      if (entry.key.startsWith('tianjiaoRewards')) {
        assert.deepEqual({ ...result }, fixtures[entry.key]);
        const view = result.view as { tiers: { claimedAt: string | null; rewardText: string }[]; records: { rewardText: string }[]; recordTotal: number };
        assert.equal(view.tiers.length, entry.key === 'tianjiaoRewardsLocked' ? 0 : 10);
        if (entry.key === 'tianjiaoRewardsHistory') {
          assert.equal((result.records as unknown[]).length, 21);
          assert.equal(view.recordTotal, 21);
          assert.equal(view.records.length, 20);
          assert.equal(view.tiers[0].rewardText, '声望×10');
          assert.equal(view.records[0].rewardText, '声望：+10');
        }
      }
      if (['dungeonWin', 'dungeonLoss', 'dungeonFirstClear', 'dungeonDraw', 'dungeonDrop', 'dungeonIneligible'].includes(entry.key)) {
        const battle = result.battle as { winner: string; rounds: number };
        assert.equal(battle.winner, entry.key === 'dungeonDraw' ? 'draw' : entry.key === 'dungeonLoss' ? 'B' : 'A');
        assert.equal(battle.rounds, 2);
        if (entry.key === 'dungeonFirstClear') {
          const members = result.rewardsByUser as { firstClear: { name: string; amount: number }[] }[];
          assert.equal(members[0].firstClear[0].name, '首通丹药');
          assert.equal(members[0].firstClear[0].amount, 1);
        }
      }
      if (entry.key === 'breakthrough') { assert.deepEqual(result.unlockedRecipes, []); assert.equal(result.newStageName, ''); }
      if (entry.key === 'alchemyAccess') { assert.equal(result.canUse, true); assert.equal(result.currentStep, null); assert.equal(result.message, ''); }
      if (entry.key === 'alchemyInGuide') assert.equal(result.currentStep, 3);
      if (entry.key.endsWith('Settlement')) assert.equal(result.vipUpgrade, null);
      if (entry.key === 'realmAccess') assert.deepEqual(result.moreVisibleCommands, []);
      if (entry.key === 'guildHome') { assert.equal(result.hasGuild, false); assert.equal(result.guild, null); assert.equal(result.membership, null); }
      if (entry.key === 'manualBattle') assert.deepEqual(result.events, []);
      if (entry.key === 'professionDashboard') {
        const alchemy = result.alchemy as { equipments: { equipped: boolean; equipmentName: string | null; gradeName: string | null }[] };
        assert.deepEqual(alchemy.equipments[0], { typeName: '灵火', equipped: false, equipmentName: null, gradeName: null });
      }
    }
    for (const entry of cases.filter(entry => entry.key.startsWith('master') && !['masterProposalsEmpty', 'masterGraduationProposalsEmpty', 'masterInfoEmpty'].includes(entry.key))) {
      for (const invalid of [undefined, null, 123]) {
        payload = { ...fixtures[entry.key], message: invalid };
        await assert.rejects(entry.run(), /师徒服务响应不完整/);
      }
    }
    for (const [key, field, invalid] of [['companionBreakup', 'narrativeText', undefined], ['companionDualCapped', 'experienceGained', undefined], ['companionInfoNone', 'companion', undefined], ['masterInfoEmpty', 'discipleHistory', null]] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
    for (const [field, invalid] of [['phase', ['WAITING']], ['phase', 'UNKNOWN'], ['waitedSeconds', -1], ['waitedSeconds', '0'], ['timeoutSeconds', undefined]] as const) {
      const snapshot = { ...fixtures.teamMatchWAITING, [field]: invalid };
      payload = snapshot;
      await assert.rejects(getBackendTeamMatchSnapshot('contract-player'), /匹配状态接口数据不完整/);
      payload = { blocked: true, match: snapshot };
      await assert.rejects(guardBackendTeamMatchCommand('contract-player', '/主线挑战 1-1'), /匹配指令判定快照不完整/);
    }
    for (const [key, field, invalid] of [['teamMatchCancelNone', 'targetLabel', undefined], ['teamMatchGuardBlocked', 'match', null], ['teamInvitationInboxEmpty', 'invitations', null]] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
    for (const key of ['soulPathChoose', 'soulPathSwitch', 'soulPathAdvance']) {
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      for (const [field, invalid] of [['pathKey', 'unknown'], ['nodeName', undefined], ['pathSwitchAvailableAt', undefined], ['pathSwitchAvailableAt', 0]] as const) {
        const fixture = structuredClone(fixtures[key]);
        const path = key === 'soulPathChoose' ? fixture : fixture.path as Record<string, unknown>;
        path[field] = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /道途.*确认响应不完整/);
      }
    }
    for (const [key, field, invalid] of [
      ['soulWashPreview', 'pending', null], ['soulWashConfirm', 'message', undefined],
      ['soulWashNoPending', 'totalSuccess', undefined], ['meridianPulseZeroRemaining', 'jumped', undefined]
    ] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
    for (const [key, field, invalid] of [
      ['caveCommandSnapshotFailed', 'message', undefined], ['caveViewNoPlot', 'access', null],
      ['caveAccelerationEmptyInventory', 'remainingSeconds', undefined], ['caveVisitStranger', 'capabilities', null],
      ['caveFormationReplaced', 'replacedFormationName', undefined], ['caveFormationCreated', 'replaced', true]
    ] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
    for (const [key, field, invalid] of [
      ['guildMiningCapped', 'capReached', undefined], ['guildMiningStarted', 'spiritStoneAdded', undefined],
      ['guildWorshipCapped', 'dailyActivityAdded', undefined], ['guildStipendFractional', 'levelMultiplier', '1.1'],
      ['guildShopSignedDelta', 'contributionDelta', undefined], ['guildAutoRefreshNotJoined', 'hours', null],
      ['guildPacketSend', 'autoClaimedAmount', undefined], ['guildPacketClaim', 'amount', undefined],
      ['guildPacketRecycle', 'refundAmount', undefined]
    ] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
    payload = { ...fixtures.guildTransferCandidates, candidates: [null] };
    await assert.rejects(transferBackendGuildLeadership('contract-player', 1, 0, request), /宗主转让候选响应不完整/);
    for (const field of ['remainingLikes', 'currentPopularity']) {
      for (const invalid of [null, '0', -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.popularityLastLike, [field]: invalid };
        await assert.rejects(likeBackendPopularity('contract-player', 1, 2, 'battle', request), /人气点赞响应不完整/);
      }
    }
    for (const [key, field, invalid] of [
      ['guildTransferDone', 'candidates', null], ['guildTransferConfirm', 'confirmationRequired', undefined],
      ['guildUpgrade', 'prestigeCost', undefined], ['guildMilestonePartial', 'partial', undefined],
      ['guildMilestonePartial', 'claimed', null], ['friendAcceptFull', 'success', undefined],
      ['popularityLastLike', 'remainingLikes', undefined]
    ] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
    for (const invalid of [null, '0', -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.marketCancelFree, feeAmount: invalid };
      await assert.rejects(cancelBackendMarketListing('contract-player', 1, 1, request), /交易下架响应不完整/);
    }
    for (const field of ['listingId', 'quantity', 'itemName', 'message']) {
      payload = { ...fixtures.marketCancelFree, [field]: undefined };
      await assert.rejects(cancelBackendMarketListing('contract-player', 1, 1, request), /交易下架响应不完整/);
    }
    for (const invalid of [null, '0', 0.5]) {
      payload = { ...fixtures.skillRerollLastCharm, ownedCount: invalid };
      await assert.rejects(previewBackendSkillBookReroll('contract-player', 1, 1, '物攻', request), /换词响应缺少换词符数量/);
    }
    for (const [field, invalid] of [['items', null], ['refundExp', '0'], ['refundSpiritStone', null]] as const) {
      payload = { ...fixtures.skillResetEmptyRefund, [field]: invalid };
      await assert.rejects(confirmBackendSkillBookReset('contract-player', 1, 1, request), /重制响应/);
    }
    for (const [field, invalid] of [['pityTriggered', null], ['pityTriggered', 0], ['oldProficiency', '0'], ['failCount', null], ['consumedPoints', undefined]] as const) {
      payload = { ...fixtures.proficiencySuccess, [field]: invalid };
      await assert.rejects(useBackendSkillBookProficiency('contract-player', 1, '功法', 1, request), /参悟功法接口字段无效/);
    }
    for (const [key, field, run] of [
      ['towerFirstClaim', 'ranking', () => claimBackendFirstRewards('contract-player', 1, 470, request)],
      ['towerFirstClaimAll', 'claimedCount', () => claimBackendFirstRewards('contract-player', 1, 'all', request)],
      ['towerMonthlyClaim', 'claimedCount', () => claimBackendMonthlyRewards('contract-player', 1, 'all', request)]
    ] as const) {
      for (const invalid of [undefined, null, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures[key], [field]: invalid };
        await assert.rejects(run(), /排名奖励结算响应不完整/);
      }
    }
    for (const [key, field, run] of [
      ['themeNotFound', 'outcome', () => activateBackendTheme('contract-player', 1, 1, request)],
      ['inkModeNoTheme', 'code', () => switchBackendInkMode('contract-player', 1, 'ink', request)],
      ['skillVisibilityNotFound', 'code', () => setBackendSkillVisibility('contract-player', 1, 1, true, request)],
      ['captchaNotPending', 'outcome', () => verifyBackendCaptcha('contract-player', 1, '1')],
      ['guildApplicationNotPending', 'outcome', () => cancelBackendGuildApplication('contract-player', 1, 1, request)],
      ['friendRequestMissing', 'outcome', () => rejectBackendFriendRequest('contract-player', 1, 1, request)]
    ] as const) {
      for (const invalid of [[fixtures[key][field]], undefined, null, 0, {}]) {
        payload = { ...fixtures[key], [field]: invalid };
        await assert.rejects(run(), /响应不完整/);
      }
    }
    for (const [key, run] of [
      ['skillLearnConfirmation', () => learnBackendSkillBook('contract-player', 1, 1, false, request)],
      ['skillSwitchConfirmation', () => switchBackendSkillBook('contract-player', 1, 1, '战技', false, request)]
    ] as const) {
      for (const invalid of [undefined, null, '0.5', [], {}]) {
        const fixture = structuredClone(fixtures[key]);
        (fixture.targetMaximum as Record<string, unknown>).physicalAttackPercent = invalid;
        payload = fixture;
        await assert.rejects(run(), /功法确认数据不完整/);
      }
      for (const invalid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures[key]);
        (fixture.skillBook as Record<string, unknown>).id = invalid;
        payload = fixture;
        await assert.rejects(run(), /学习功法响应缺少目标功法|切换功法响应不完整/);
      }
    }
    for (const invalid of [undefined, null, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.skillDecomposePreviewFull, totalExp: invalid };
      await assert.rejects(previewBackendSkillBookBatchDecompose('contract-player', 1), /一键分解功法接口字段无效/);
      payload = { ...fixtures.skillBatchEmpty, decomposedCount: invalid };
      await assert.rejects(batchDecomposeBackendSkillBooks('contract-player', 1, undefined, request), /一键分解功法接口字段无效/);
      payload = { ...fixtures.skillDecomposedLow, refundExp: invalid };
      await assert.rejects(decomposeBackendSkillBook('contract-player', 1, 1, request), /分解功法接口字段无效/);
    }
    for (const invalid of [undefined, null, 'false', 0, [], {}]) {
      const fixture = structuredClone(fixtures.skillLearnCommandMixed);
      (fixture.results as Record<string, unknown>[])[0].success = invalid;
      payload = fixture;
      await assert.rejects(batchLearnCurrentBackendSkillBooks('contract-player', 1, request), /一键学习功法接口字段无效: result.success/);
    }
    for (const invalid of [undefined, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.skillUpgraded, upgradeCount: invalid };
      await assert.rejects(upgradeBackendSkillBook('contract-player', 1, 1, request), /升级功法接口字段无效/);
      payload = { ...fixtures.skillBatchUpgradeStopped, successCount: invalid };
      await assert.rejects(batchUpgradeBackendSkillBook('contract-player', 1, 1, 2, request), /连续升级功法接口字段无效/);
    }
    for (const invalid of [undefined, -1, 0, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.equipmentUnequipCompleted, instanceId: invalid };
      await assert.rejects(unequipBackendEquipmentOne('contract-player', 1, '武器', request), /卸下装备响应不完整/);
      payload = { ...fixtures.equipmentDecomposed, yieldQuantity: invalid };
      await assert.rejects(decomposeBackendEquipment('contract-player', 1, 1, request), /装备分解接口字段无效/);
    }
    for (const field of ['id', 'status', 'isHidden', 'upgradeCount', 'proficiency', 'physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed', 'maxPhysicalAttack', 'maxMagicAttack', 'maxPhysicalDefense', 'maxMagicDefense', 'maxHp', 'maxSpeed']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
        const fixture = structuredClone(fixtures.learnedDetailQueryFull);
        (fixture.book as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendSkillDetail('contract-player', 1, 1), /已学功法接口缺少数值字段/);
      }
    }
    for (const collection of ['items', 'inUseBooks']) {
      for (const field of ['id', 'status', 'isHidden', 'upgradeCount', 'proficiency', 'physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed', 'maxPhysicalAttack', 'maxMagicAttack', 'maxPhysicalDefense', 'maxMagicDefense', 'maxHp', 'maxSpeed']) {
        const fixture = structuredClone(fixtures.learnedPageQueryVisible);
        (fixture[collection] as Record<string, unknown>[])[0][field] = 1.5;
        payload = fixture;
        await assert.rejects(getBackendLearnedBooks('contract-player', 1, 1, 'visible'), /已学功法接口缺少数值字段/);
      }
    }
    for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
      payload = { ...fixtures.learnedDetailQueryFull, proficiencyPoints: invalid };
      await assert.rejects(getBackendSkillDetail('contract-player', 1, 1), /功法详情接口缺少数值字段/);
    }
    for (const invalid of [2, 99, Number.MAX_SAFE_INTEGER]) {
      const fixture = structuredClone(fixtures.learnedDetailQueryFull);
      (fixture.book as Record<string, unknown>).id = invalid;
      payload = fixture;
      await assert.rejects(getBackendSkillDetail('contract-player', 1, 1), /功法详情接口实例不匹配/);
    }
    for (const field of ['skillId', 'skillTypeId', 'skillModule', 'cost', 'cooldown', 'targetCount']) {
      for (const invalid of [undefined, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
        const fixture = structuredClone(fixtures.learnedDetailQueryFull);
        (fixture.book as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendSkillDetail('contract-player', 1, 1), /功法详情接口缺少数值字段/);
      }
    }
    for (const field of ['module', 'probability', 'type', 'applyTiming', 'effectTiming', 'applyProbability', 'effectProbability', 'duration', 'multiplier', 'maxStacks', 'attributeModule']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
        const fixture = structuredClone(fixtures.learnedDetailQueryFull);
        ((fixture.book as Record<string, unknown>).skillEffects as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendSkillDetail('contract-player', 1, 1), /功法详情接口缺少数值字段/);
      }
    }
    for (const field of ['total', 'totalPages', 'currentPage', 'proficiencyPoints']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
        payload = { ...fixtures.learnedPageQueryVisible, [field]: invalid };
        await assert.rejects(getBackendLearnedBooks('contract-player', 1, 1, 'visible'), /已学功法接口缺少数值字段/);
      }
    }
    for (const field of ['physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed', 'id', 'isLocked']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures.equipmentDetailQueryFull);
        (fixture.item as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEquipmentDetail('contract-player', 1, '武器'), /装备详情接口数据不完整/);
      }
    }
    for (const field of ['physicalAttackPercent', 'magicAttackPercent', 'physicalDefensePercent', 'magicDefensePercent', 'hpPercent', 'critRate', 'critDamage', 'antiCritRate', 'hitRate', 'dodgeRate']) {
      for (const invalid of [undefined, null, '0.5', false, {}, []]) {
        const fixture = structuredClone(fixtures.equipmentDetailQueryFull);
        (fixture.item as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEquipmentDetail('contract-player', 1, '武器'), /装备详情接口数据不完整/);
      }
    }
    for (const invalid of [undefined, 0, false, {}, []]) {
      payload = { ...fixtures.equipmentDetailQueryFull, playerName: invalid };
      await assert.rejects(getBackendEquipmentDetail('contract-player', 1, '武器'), /装备详情接口数据不完整/);
    }
    const detailMissingStat = structuredClone(fixtures.equipmentDetailNullableNames);
    delete (detailMissingStat.item as Record<string, unknown>).magicDefensePercent;
    payload = detailMissingStat;
    await assert.rejects(getBackendEquipmentDetail('contract-player', 1, '武器'), /装备详情接口数据不完整/);
    payload = { outcome: ['not_found'] };
    await assert.rejects(equipBackendEquipment('contract-player', 1, '1', request), /装备接口结果无效/);
    for (const invalid of [null, '0', Number.MAX_SAFE_INTEGER + 1, -1, 0.5]) {
      payload = { ...fixtures.equipmentPreviewEmpty, totalYield: invalid };
      await assert.rejects(previewBackendEquipmentBatchDecompose('contract-player', 1), /一键分解装备接口字段无效/);
      payload = { ...fixtures.equipmentBatchEmpty, decomposedCount: invalid };
      await assert.rejects(batchDecomposeBackendEquipment('contract-player', 1, undefined, request), /一键分解装备接口字段无效/);
      payload = { ...fixtures.consumeLastItem, remainingQuantity: invalid };
      await assert.rejects(consumeBackendItem('contract-player', 1, { itemName: '精力丹', quantity: 1 }, request), /消耗道具响应不完整/);
    }
    for (const invalid of [null, '0']) {
      const fixture = structuredClone(fixtures.equipSucceeded);
      (fixture.equipment as Record<string, unknown>).magicDefensePercent = invalid;
      payload = fixture;
      await assert.rejects(equipBackendEquipment('contract-player', 1, '1', request), /装备接口数值无效/);
    }
    for (const invalid of [null, [], { 1: 2 }, { 1: null }, { 1: ['丹药'] }]) {
      payload = { ...fixtures.newcomerRebateItems, itemNames: invalid };
      await assert.rejects(claimBackendNewcomerRechargeDay('contract-player', 1, 14, request), /新人返利领取响应不完整/);
    }
    for (const invalid of [0, 15, -1, 1.5, '1']) {
      payload = { ...fixtures.newcomerRebateItems, dayIndex: invalid };
      await assert.rejects(claimBackendNewcomerRechargeDay('contract-player', 1, 14, request), /新人返利领取响应不完整/);
    }
    for (const invalid of [undefined, null, Number.MAX_SAFE_INTEGER + 1, -1, 0.5]) {
      payload = { ...fixtures.storyAllChestsClaimed, totalReward: invalid };
      await assert.rejects(claimAllBackendStorylineChests('contract-player', 1, request), /主线全章节宝箱响应不完整/);
    }
    payload = { ...fixtures.titleActivated, isActive: false };
    await assert.rejects(activateBackendTitle('contract-player', 1, 1, request), /佩戴称号响应不完整/);
    payload = {};
    await assert.rejects(deactivateBackendTitle('contract-player', 1, request), /卸下称号响应不完整/);
    for (const invalid of [null, [], {}, { type: 'item', name: '丹药', amount: 0 }, { type: 'item', name: '丹药', amount: -1 }, { type: 'item', name: '丹药', amount: 1.5 }, { type: 'item', name: '丹药', amount: '1' }]) {
      payload = { ...fixtures.activityClaimed, issued: [invalid] };
      await assert.rejects(claimBackendActivityReward('contract-player', 1, 'daily', 20, request), /活跃奖励响应不完整/);
      payload = { ...fixtures.referralClaimed, issued: [invalid] };
      await assert.rejects(claimBackendReferralRewards('contract-player', 1, request), /领取邀请码奖励响应不完整/);
      payload = { ...fixtures.referralBoundEmpty, issued: [invalid] };
      await assert.rejects(bindBackendReferralCode('contract-player', 1, 'tt-2', request), /绑定邀请码奖励响应不完整/);
      payload = { ...fixtures.weeklyRebateClaimed, issued: [invalid] };
      await assert.rejects(claimBackendWeeklyRebate('contract-player', 1, 1, request), /周周返利领取响应不完整/);
    }
    for (const invalid of [null, [], {}, { type: 'item', name: '丹药', amount: -1 }, { type: 'item', name: '丹药', amount: 1.5 }, { type: 'item', name: '丹药', amount: '1' }]) {
      payload = { ...fixtures.emailClaimed, issued: [invalid] };
      await assert.rejects(claimBackendEmail('contract-player', 1, 1, request), /邮件领取响应不完整/);
      payload = { ...fixtures.dailyCheckinEmpty, issued: [invalid] };
      await assert.rejects(dailyBackendCheckIn('contract-player', 1, request), /日常签到响应不完整/);
      payload = { ...fixtures.newcomerCheckinEmpty, issued: [invalid] };
      await assert.rejects(newcomerBackendCheckIn('contract-player', 1, request), /新人签到响应不完整/);
      payload = { ...fixtures.celestialCheckinReward, issued: [invalid] };
      await assert.rejects(claimBackendCelestialCheckIn('contract-player', 1, request), /登仙台签到响应不完整/);
    }
    for (const amount of [0, -1, 1.5, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
      const fixture = structuredClone(fixtures.achievementClaimed);
      const claim = (fixture.claimed as Record<string, unknown>[])[0];
      (claim.issued as Record<string, unknown>[])[0].amount = amount;
      payload = fixture;
      await assert.rejects(claimBackendAchievementRewards('contract-player', 1, 'storyline', request), /成就领取响应不完整/);
      payload = { ...fixtures.firstRechargeClaimed, result: { issued: claim.issued } };
      await assert.rejects(claimBackendFirstRechargeOverview('contract-player', 1, 150, request), /首充领取响应不完整/);
    }
    for (const invalid of [null, [], {}, { ...fixtures.monthCardClaimed, statusError: 1 }, { ...fixtures.monthCardClaimed, beforeTotal: 0.5 }]) {
      payload = invalid as typeof payload;
      await assert.rejects(claimBackendMonthCardOverview('contract-player', 1, request), /月卡每日奖励响应不完整/);
    }
    for (const invalid of [null, [], {}, { ...fixtures.firstRechargeClaimed, result: undefined }, { ...fixtures.firstRechargeClaimed, result: [] }, { ...fixtures.firstRechargeClaimFailed, claimError: 1 }]) {
      payload = invalid as typeof payload;
      await assert.rejects(claimBackendFirstRechargeOverview('contract-player', 1, 150, request), /首充领取响应不完整/);
    }
    for (const days of [0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
      const fixture = structuredClone(fixtures.monthCardClaimed);
      (fixture.claim as Record<string, unknown>).days = days;
      payload = fixture;
      await assert.rejects(claimBackendMonthCardOverview('contract-player', 1, request), /月卡领取响应不完整/);
    }
    for (const amount of [0, -1, '10', null, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const fixture = structuredClone(fixtures.eventTaskToken);
      (fixture.issued as Record<string, unknown>[])[0].amount = amount;
      payload = fixture;
      await assert.rejects(claimBackendLimitedEventTask('contract-player', 1, 49, request), /活动任务领取奖励响应不完整/);
    }
    for (const [field, invalid] of [['Winner', undefined], ['Winner', 1], ['Rounds', undefined], ['Rounds', '2'], ['Rounds', -1]] as const) {
      const fixture = structuredClone(fixtures.dungeonWin);
      (fixture.battle as Record<string, unknown>)[field] = invalid;
      payload = fixture;
      await assert.rejects(challengeBackendDungeon('contract-player', 1, '桃花镇', request), /秘境挑战响应不完整/);
    }
    for (const key of ['friendRemoval_removed', 'blockRemoval_removed', 'blockByName_blocked', 'flyMute_updated', 'flyMuteCommand_updated']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const invalid of [undefined, null, 0, {}, [fixtures[key].outcome ?? 'updated']]) {
        const fixture = structuredClone(fixtures[key]);
        const state = key.startsWith('flyMuteCommand_') ? fixture.result as Record<string, unknown> : fixture;
        state.outcome = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /响应不完整/);
      }
    }
    for (const targetName of [null, '', 1]) {
      const fixture = structuredClone(fixtures.flyMuteCommand_updated);
      (fixture.result as Record<string, unknown>).targetName = targetName;
      payload = fixture;
      await assert.rejects(commandBackendFlyMailMute('contract-player', 1, 2, undefined, true, request), /飞信禁言状态响应不完整/);
    }
    for (const targetUid of [undefined, 0, -1, '2', [], Number.MAX_SAFE_INTEGER + 1]) {
      const fixture = structuredClone(fixtures.flyMuteCommand_updated);
      (fixture.access as Record<string, unknown>).targetUid = targetUid;
      payload = fixture;
      await assert.rejects(commandBackendFlyMailMute('contract-player', 1, 2, undefined, true, request), /飞信禁言资格响应不完整/);
    }
    for (const key of ['friendWorkflow_removed', 'guildDecision_approved', 'teamPosition_updated', 'teamLeader_transferred', 'guildResignationOptions', 'guildResignationWorkflow']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const invalid of [undefined, null, 0, {}, [key.startsWith('guildResignation') ? 'not_joined' : fixtures[key].outcome]]) {
        const fixture = structuredClone(fixtures[key]);
        const state = key === 'guildResignationWorkflow' ? fixture.options as Record<string, unknown> : fixture;
        state[key.startsWith('guildResignation') ? 'membershipStatus' : 'outcome'] = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /响应不完整/);
      }
    }
    for (const invalid of [undefined, null, 0, {}, ['removed']]) {
      const fixture = structuredClone(fixtures.friendWorkflow_removed);
      (fixture.removal as Record<string, unknown>).outcome = invalid;
      payload = fixture;
      await assert.rejects(requestFriendWorkflow('contract-player', 1, { action: 'remove', targetUid: '1', confirmed: true }, request), /删除好友响应不完整/);
    }
    
    for (const key of ['caveFormationCreated', 'giftCommandInvalid']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const invalid of [undefined, null, 0, {}, [key === 'caveFormationCreated' ? 'created' : 'INVALID']]) {
        const fixture = structuredClone(fixtures[key]);
        fixture[key === 'caveFormationCreated' ? 'outcome' : 'mode'] = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /响应不完整/);
      }
    }
    for (const key of ['storylineCatalog_NOT_FOUND', 'publicProfile_self', 'taskPanelFull', 'taskPanelSelected']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const invalid of [undefined, null, 0, {}, [key.startsWith('storyline') ? 'NOT_FOUND' : key.startsWith('publicProfile') ? 'self' : 'checkin']]) {
        const fixture = structuredClone(fixtures[key]);
        const state = key.startsWith('storyline') ? fixture.detail as Record<string, unknown> : key.startsWith('publicProfile') ? fixture.cave as Record<string, unknown> : fixture;
        state[key.startsWith('storyline') ? 'status' : key.startsWith('publicProfile') ? 'relation' : 'defaultTabKey'] = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /状态无效|数据不完整|响应不完整/);
      }
    }
    for (const key of ['rechargeCatalog_daily', 'towerOverview_AVAILABLE', 'glossaryApply_submitted']) {
      const entry = cases.find(entry => entry.key === key)!;
      const field = key.startsWith('recharge') ? 'resolvedLimitPeriod' : key.startsWith('tower') ? 'monthlyClaimStatus' : 'outcome';
      const valid = key.startsWith('recharge') ? 'daily' : key.startsWith('tower') ? 'AVAILABLE' : 'submitted';
      for (const invalid of [undefined, null, 0, {}, [valid]]) {
        const fixture = structuredClone(fixtures[key]);
        const state = key.startsWith('recharge') ? (fixture.packages as Record<string, unknown>[])[0] : fixture;
        state[field] = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /状态不完整|状态无效|响应不完整/);
      }
    }
    for (const key of ['killGodTitle_OK', 'spar', 'manualBattleChoosing']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const invalid of [undefined, null, 0, {}, [key === 'killGodTitle_OK' ? 'OK' : key === 'spar' ? 'A' : 'normal']]) {
        const fixture = structuredClone(fixtures[key]);
        if (key === 'killGodTitle_OK') fixture.code = invalid;
        else if (key === 'spar') (fixture.battle as Record<string, unknown>).winner = invalid;
        else ((fixture.choice as Record<string, unknown>).availableSkills as Record<string, unknown>[])[0].type = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /响应不完整|技能数据不完整/);
      }
    }
    for (const invalid of [undefined, null, 0, {}, ['COMPLETED']]) {
      payload = { ...fixtures.companionProposal_COMPLETED, code: invalid };
      await assert.rejects(executeBackendCompanionProposalCommand('contract-player', 1, { target: '2' }, request), /道侣申请响应不完整/);
    }
    for (const invalid of [undefined, null, 0, {}, ['text']]) {
      const fixture = structuredClone(fixtures.itemDetailProjected);
      const entry = (fixture.entries as Record<string, unknown>[])[0];
      (entry.view as Record<string, unknown>[])[0].kind = invalid;
      payload = fixture;
      await assert.rejects(getBackendItemDetail('contract-player', 1, { name: '道具' }), /物品详情展示投影无效/);
    }
    for (const key of ['publicTribulation_preparing', 'tribulationCharging_charging', 'tribulationConfirmation_current']) {
      const entry = cases.find(entry => entry.key === key)!;
      const field = key.startsWith('tribulationConfirmation') ? 'rewardScope' : 'status';
      const valid = key.startsWith('tribulationConfirmation') ? 'current' : fixtures[key].status;
      for (const invalid of [undefined, null, 0, {}, [valid]]) {
        const fixture = structuredClone(fixtures[key]);
        const state = key.startsWith('tribulationConfirmation') ? fixture.confirmation as Record<string, unknown> : fixture;
        state[field] = invalid;
        payload = fixture;
        await assert.rejects(entry.run(), /渡劫接口返回不完整/);
      }
    }
    for (const invalid of [undefined, null, 0, {}, ['physicalAttack']]) {
      const fixture = structuredClone(fixtures.tribulationConfirmation_current);
      const confirmation = fixture.confirmation as Record<string, unknown>;
      ((confirmation.weather as Record<string, unknown>).changes as Record<string, unknown>[])[0].attribute = invalid;
      payload = fixture;
      await assert.rejects(confirmBackendTribulationQuery('contract-player', 1, 1, 'standard', request), /渡劫接口返回不完整/);
    }
    for (const [key, fields] of [['guildCreated', ['guildId']], ['guildApplied', ['guildId', 'applicationId', 'memberCount']], ['guildDecision_approved', ['guildId', 'applicationId', 'applicantId']]] as const) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const field of fields) {
        for (const invalid of [undefined, null, '1', true, 1.5, -1, Number.MAX_SAFE_INTEGER + 1, ...(field === 'memberCount' ? [] : [0])]) {
          payload = { ...fixtures[key], [field]: invalid };
          await assert.rejects(entry.run(), /响应不完整/);
        }
      }
    }
    for (const field of ['toolId', 'userToolId', 'gradeLevel']) {
      for (const invalid of [undefined, null, '1', true, 1.5, Number.MAX_SAFE_INTEGER + 1, ...(field === 'gradeLevel' ? [] : [-1, 0])]) {
        payload = { ...fixtures.professionToolReplaced, [field]: invalid };
        await assert.rejects(replaceBackendProfessionTool('contract-player', 1, '2', request), /替换职业工具响应不完整/);
      }
    }
    for (const [key, field, invalids] of [
      ['secretWarChallengeWon', 'won', [undefined, null, 'false', 0]],
      ['secretWarChallengeWon', 'frozenUntil', [null, 1, 'invalid']],
      ['secretWarChallengeWon', 'realmNo', [undefined, 0, -1, '1', Number.MAX_SAFE_INTEGER + 1]],
      ['secretWarClaimed', 'spiritCrystal', [undefined, null, -1, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['secretWarClaimed', 'reputationAlreadyClaimed', [undefined, null, 'false', 0]],
      ['secretWarHomeJoined', 'guildId', [0, -1, '1', Number.MAX_SAFE_INTEGER + 1]],
      ['secretWarHomeJoined', 'attackUsed', [1.5, Number.MAX_SAFE_INTEGER + 1]]
    ] as const) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const invalid of invalids) {
        payload = { ...fixtures[key], [field]: invalid };
        await assert.rejects(entry.run(), /响应不完整/);
      }
    }
    for (const field of ['damageDealt', 'bossHpBefore', 'bossHpAfter', 'stageCleared']) {
      const invalids = field === 'stageCleared' ? [undefined, null, 'false', 0] : [undefined, null, '0', -1, 1.5, Number.MAX_SAFE_INTEGER + 1];
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.guildStorylinePartial);
        (fixture.reward as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(challengeBackendGuildStoryline('contract-player', 1, request), /宗门主线挑战.*不完整/);
      }
    }
    for (const invalid of [undefined, null, '1', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.guildStorylinePartial, stageIndex: invalid };
      await assert.rejects(challengeBackendGuildStoryline('contract-player', 1, request), /宗门主线挑战关卡不完整/);
    }
    for (const invalid of [undefined, null, []]) {
      payload = { ...fixtures.guildStorylinePartial, reward: invalid };
      await assert.rejects(challengeBackendGuildStoryline('contract-player', 1, request), /宗门主线挑战结算不完整/);
    }
    for (const field of ['stageName', 'attackerName', 'defenderName', 'winnerName']) {
      for (const invalid of [undefined, null, 1, []]) {
        payload = { ...fixtures.competitionDetailWin, [field]: invalid };
        await assert.rejects(getBackendCompetitionBattleDetail('contract-player', 1, 1), /详情响应不完整/);
      }
    }
    for (const [field, invalids] of [
      ['battleId', [undefined, null, 0, -1, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['isWin', [undefined, null, 'false', 0]], ['battleTime', [undefined, null, 0, 'invalid']],
      ['battleLogId', [undefined, 1, []]]
    ] as const) {
      for (const invalid of invalids) {
        payload = { ...fixtures.competitionDetailWin, [field]: invalid };
        await assert.rejects(getBackendCompetitionBattleDetail('contract-player', 1, 1), /详情响应不完整/);
      }
    }
    for (const invalid of [undefined, null, {}]) {
      payload = { teams: invalid };
      await assert.rejects(getBackendPromotionTeams('contract-player'), /晋级队伍响应不完整/);
    }
    for (const field of ['id', 'guildId', 'rank', 'status', 'wins', 'guildName']) {
      const invalids = field === 'guildName' ? [undefined, null, 1, []] : [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1,
        ...(['id', 'guildId'].includes(field) ? [0, -1] : field === 'wins' ? [-1] : [])];
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.competitionPromotionTeams);
        (fixture.teams as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendPromotionTeams('contract-player'), /晋级队伍响应不完整/);
      }
    }
    for (const field of ['team', 'roster', 'oddsInfo', 'knockoutInfo', 'topTeams', 'config', 'guildName', 'signupGuildCount']) {
      payload = { ...fixtures.competitionHome_REGISTRATION, [field]: undefined };
      await assert.rejects(getBackendCompetitionHome('contract-player', 1), /宗门大比.*不完整/);
    }
    for (const [key, field, invalids] of [
      ['config', 'settlementTime', [undefined, null, 0, 'invalid']],
      ['knockoutInfo', 'score', [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['team', 'id', [undefined, 0, '1', Number.MAX_SAFE_INTEGER + 1]]
    ] as const) {
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.competitionHome_KNOCKOUT);
        (fixture[key] as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendCompetitionHome('contract-player', 1), /宗门大比.*不完整/);
      }
    }
    for (const [field, invalids] of [ ['action', [undefined, null, 0, ['BET']]], ['odds', [undefined, null, '1.5']], ['guildName', [undefined, null, 1]], ['guildId', [undefined, 0, '1']] ] as const) {
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.competitionHome_PROMOTION);
        ((fixture.oddsInfo as { items: Record<string, unknown>[] }).items[0])[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendCompetitionHome('contract-player', 1), /宗门大比.*不完整/);
      }
    }
    for (const field of ['position', 'userId']) {
      for (const invalid of [undefined, 0, '1', 1.5, Number.MAX_SAFE_INTEGER + 1, ...(field === 'position' ? [7] : [])]) {
        const fixture = structuredClone(fixtures.competitionHome_KNOCKOUT);
        (fixture.roster as { slots: Record<string, unknown>[] }).slots[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendCompetitionHome('contract-player', 1), /站位响应不完整/);
      }
    }
    for (const [field, invalids] of [
      ['itemType', [undefined, 1]], ['itemSubtype', [undefined, 1]],
      ['templateItemId', [undefined, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['quantity', [undefined, null, '2', 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['unitPriceAmount', [undefined, null, '10', 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['attributes', [undefined, [], 1]], ['attributeView', [undefined, [], 1]],
      ['hasUpgraded', [null, 'false', 0]], ['createdAt', [undefined, null, 1, 'invalid']],
      ['expiresAt', [undefined, 1, 'invalid']]
    ] as const) {
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.marketBrowseItems);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendMarketBrowse('contract-player', 1, { page: 1 }), /珍宝楼浏览响应不完整/);
      }
    }
    for (const key of ['quota', 'pagination']) {
      const original = fixtures.marketBrowseEmpty[key] as Record<string, unknown>;
      for (const field of Object.keys(original)) {
        for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
          payload = { ...fixtures.marketBrowseEmpty, [key]: { ...original, [field]: invalid } };
          await assert.rejects(getBackendMarketBrowse('contract-player', 1, { page: 1 }), /珍宝楼浏览响应不完整/);
        }
      }
    }
    for (const [field, invalids] of [
      ['itemType', [undefined, 1]], ['templateItemId', [undefined, '1', 1.5]], ['quantity', [undefined, 1.5, Number.MAX_SAFE_INTEGER + 1]],
      ['attributes', [undefined, [], 1]], ['attributeView', [undefined, [], 1]], ['lockedUntil', [undefined, 1, 'invalid']], ['status', [undefined, '1', 1.5]]
    ] as const) {
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.shopVisitmarketBrowseItems);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendPlayerShopVisit('contract-player', 1, 2, 1), /逛店响应不完整/);
      }
    }
    for (const field of Object.keys(fixtures.shopVisitmarketBrowseEmpty.currencies as Record<string, unknown>)) {
      for (const invalid of [undefined, null, '0', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.shopVisitmarketBrowseEmpty);
        (fixture.currencies as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendPlayerShopVisit('contract-player', 1, 2, 1), /逛店响应不完整/);
      }
    }
    for (const [field, invalids] of [['ownerName', [undefined, null, 1]], ['description', [1, []]], ['heatScore', [undefined, '1', 1.5]]] as const) {
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.shopVisitmarketBrowseItems);
        (fixture.shop as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendPlayerShopVisit('contract-player', 1, 2, 1), /逛店响应不完整/);
      }
    }
    for (const field of ['listingId', 'status']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.myListingsDecimals);
        (fixture.listings as { items: Record<string, unknown>[] }).items[0][field] = invalid;
        payload = fixture;
        await assert.rejects(marketListingsView('contract-player', 1, 1), /挂单字段不完整/);
      }
    }
    for (const field of ['createdAt', 'expiresAt', 'lockedUntil']) {
      const fixture = structuredClone(fixtures.myListingsDecimals);
      (fixture.listings as { items: Record<string, unknown>[] }).items[0][field] = 'invalid';
      payload = fixture;
      await assert.rejects(marketListingsView('contract-player', 1, 1), /挂单字段不完整/);
    }
    for (const field of ['currentPage', 'totalPages', 'total']) {
      const fixture = structuredClone(fixtures.myListingsEmpty);
      (fixture.listings as { pagination: Record<string, unknown> }).pagination[field] = Number.MAX_SAFE_INTEGER + 1;
      payload = fixture;
      await assert.rejects(marketListingsView('contract-player', 1, 1), /我的上架响应不完整/);
    }
    for (const key of ['myListingsDecimals', 'marketBrowseItems', 'shopVisitmarketBrowseItems']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const field of ['status', 'gradeId', 'washCount', 'hasUpgraded', 'physicalAttack']) {
        for (const invalid of [undefined, '1', ...(field === 'physicalAttack' ? [] : [1.5, Number.MAX_SAFE_INTEGER + 1])]) {
          const fixture = structuredClone(fixtures[key]);
          const container = key === 'myListingsDecimals' ? fixture.listings : fixture;
          const items = (container as { items: Record<string, unknown>[] }).items;
          const item = key === 'myListingsDecimals' ? items[0] : items[1];
          (item.attributes as Record<string, unknown>)[field] = invalid;
          payload = fixture;
          await assert.rejects(entry.run(), /不完整/);
        }
      }
    }
    for (const key of ['marketRange_median', 'marketSellableRange_median']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const field of ['minPrice', 'maxPrice', 'referencePrice', 'templateItemId', 'maxListingQuantity', 'source', 'credibilityReady', 'fixedQuantity']) {
        const invalids = field === 'source' ? [undefined, null, 1, ['median']] : ['credibilityReady', 'fixedQuantity'].includes(field) ? [undefined, null, 'false', 0] : [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1];
        for (const invalid of invalids) {
          const fixture = structuredClone(fixtures[key]);
          const range = key === 'marketRange_median' ? fixture.range : (fixture.items as { priceRange: unknown }[])[0].priceRange;
          (range as Record<string, unknown>)[field] = invalid;
          payload = fixture;
          await assert.rejects(entry.run(), /价格区间.*不完整/);
        }
      }
    }
    for (const field of ['listingError', 'receipt']) {
      for (const invalid of [null, [], 0]) {
        payload = { ...fixtures.marketRange_fallback, [field]: invalid };
        await assert.rejects(marketWorkflow('contract-player', 1, { action: 'sell', category: 'item', userItemId: 1 }), /交易上架响应不完整/);
      }
    }
    for (const field of ['baseScore', 'vipBonus', 'monthCardBonus', 'activityScore', 'totalScore', 'threshold', 'dailyFreeCancelLimit', 'maxScore']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.marketCredibilityReady);
        (fixture.credibility as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(marketCredibilityView('contract-player', 1), /信誉资料数值不完整/);
      }
    }
    for (const key of ['marketRangeReceipt', 'marketPurchaseReceipt', 'marketCancelFree']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const field of ['listingId', 'quantity', 'totalPrice', 'feeAmount', 'systemReclaimed', 'itemName', 'lines']) {
        const invalids = field === 'systemReclaimed' ? [null, 'false', 0] : field === 'itemName' ? [null, 1, []] : field === 'lines' ? [null, {}, 1] : [null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1];
        for (const invalid of invalids) {
          const fixture = structuredClone(fixtures[key]);
          const receipt = key === 'marketCancelFree' ? fixture : fixture.receipt;
          (receipt as Record<string, unknown>)[field] = invalid;
          payload = fixture;
          await assert.rejects(entry.run(), /响应不完整/);
        }
      }
    }
    for (const field of ['listingId', 'sellerUserId', 'quantity', 'unitPriceAmount', 'totalPrice', 'systemReclaimed']) {
      const invalids = field === 'systemReclaimed' ? [null, 'false', 0] : [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1];
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.marketPurchaseReceipt);
        (fixture.receipt as { lines: Record<string, unknown>[] }).lines[0][field] = invalid;
        payload = fixture;
        await assert.rejects(marketWorkflow('contract-player', 1, { action: 'purchase', listingId: 1, quantity: 1 }, request), /选购响应不完整/);
      }
    }
    for (const field of ['listingId', 'quantity', 'totalPrice', 'shouldConfirm', 'itemName', 'currencyName', 'overpriceWarning']) {
      const invalids = field === 'shouldConfirm' ? [undefined, null, 'false', 0] : ['listingId', 'quantity', 'totalPrice'].includes(field) ? [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1] : [undefined, null, 1];
      for (const invalid of invalids) {
        const fixture = structuredClone(fixtures.marketPurchaseConfirm);
        (fixture.preview as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(marketWorkflow('contract-player', 1, { action: 'purchase', listingId: 1, quantity: 1 }, request), /购买预览响应不完整/);
      }
    }
    for (const key of ['ownShopFull', 'shopListPopulated', 'shopVisitmarketBrowseItems']) {
      const entry = cases.find(entry => entry.key === key)!;
      for (const field of ['shopId', 'userId', 'heatScore', 'totalSales', 'totalVolume', 'level', 'status', 'activeListings']) {
        for (const invalid of [undefined, '1', 1.5, Number.MAX_SAFE_INTEGER + 1, ...(key === 'ownShopFull' && ['level', 'status'].includes(field) ? [] : [null])]) {
          const fixture = structuredClone(fixtures[key]);
          const shop = key === 'ownShopFull' ? fixture : key === 'shopListPopulated' ? (fixture.items as Record<string, unknown>[])[0] : fixture.shop as Record<string, unknown>;
          shop[field] = invalid;
          payload = fixture;
          await assert.rejects(entry.run(), /响应不完整/);
        }
      }
    }
    for (const field of ['rank', 'heatScore', 'totalSales']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.shopRankingPopulated);
        (fixture as unknown as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendShopRanking('contract-player', 5), /缺少数值字段/);
      }
    }
    for (const field of ['itemId', 'quantity', 'contributionDelta', 'prestigeGain', 'remainingDailyCount']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.guildShopSignedDelta, [field]: invalid };
        await assert.rejects(exchangeBackendGuildShopByIndex('contract-player', 1, 1, request), /兑换响应不完整/);
      }
    }
    for (const field of ['contributionPoints', 'refreshDailyLimit']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.guildShopPageEmpty, [field]: invalid };
        await assert.rejects(getBackendGuildShopPage('contract-player', 1), /商店响应不完整/);
      }
    }
    for (const field of ['id', 'index', 'itemId', 'quantity', 'priceContribution']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.guildShopPageItems);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildShopPage('contract-player', 1), /商品响应不完整/);
      }
    }
    for (const field of ['id', 'quantity', 'price', 'monthlyLimit', 'bought', 'remaining']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.checkInShopUnlimited);
        (fixture.products as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendCheckInShop('contract-player', 1), /数值字段不完整/);
      }
    }
    for (const field of ['productId', 'subActivityId', 'priceAmount', 'limitPerUser', 'stockTotal', 'stockRemain', 'userBought']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.eventShopUnlimited);
        (fixture as unknown as { products: Record<string, unknown>[] }[])[0].products[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEventShop('contract-player', 1, 1), /接口缺少数值/);
      }
    }
    for (const field of ['rewardSpiritStone', 'rewardSpiritCrystal', 'rewardSpiritMilk', 'rewardCheckInCoin', 'rewardTowerScore', 'rewardReputation', 'rewardTongxin', 'rewardPaidToken', 'rewardFreeToken']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.eventShopUnlimited);
        (fixture as unknown as { products: { rewardFields: Record<string, unknown> }[] }[])[0].products[0].rewardFields[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEventShop('contract-player', 1, 1), /活动奖励字段不完整/);
      }
    }
    for (const field of ['priceAmount', 'quantity', 'used', 'limit', 'remaining', 'itemId', 'secondaryPriceAmount', 'requiredRealmId', 'requiredStars', 'discountPriceAmount']) {
      for (const invalid of [undefined, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.catalogShopDiscount);
        (fixture.products as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendUnifiedShop('contract-player', 1, 1, 'WANBAOLOU'), /商品数据不完整/);
      }
    }
    for (const invalid of [undefined, '0.95', []]) {
      const fixture = structuredClone(fixtures.catalogShopDiscount);
      (fixture.products as Record<string, unknown>[])[0].discountRate = invalid;
      payload = fixture;
      await assert.rejects(getBackendUnifiedShop('contract-player', 1, 1, 'WANBAOLOU'), /商品数据不完整/);
    }
    for (const field of Object.keys(fixtures.catalogShopEmpty.currencies as Record<string, unknown>)) {
      const fixture = structuredClone(fixtures.catalogShopEmpty);
      (fixture.currencies as Record<string, unknown>)[field] = 1.5;
      payload = fixture;
      await assert.rejects(getBackendUnifiedShop('contract-player', 1, 1, 'WANBAOLOU'), /接口数据不完整/);
    }
    for (const [key, fields, run] of [
      ['companionPurchasePreview', ['productId', 'unitPrice', 'totalPrice', 'grantQuantity', 'count'], () => previewBackendCompanionShopPurchase('contract-player', 1, 1, 3, request)],
      ['companionPurchaseResult', ['granted', 'buyCount'], () => purchaseBackendCompanionShop('contract-player', 1, 1, 3, request)]
    ] as const) {
      for (const field of fields) {
        for (const invalid of [undefined, null, '3', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
          payload = { ...fixtures[key], [field]: invalid };
          await assert.rejects(run(), /道侣商店.*响应不完整/);
        }
      }
    }
    for (const invalid of [undefined, null, '100', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.marketGuideBalanceFunded, SPIRIT_CRYSTAL: invalid };
      await assert.rejects(getBackendMarketGuideBalance('contract-player', 1, request), /货币余额响应不完整/);
    }
    for (const invalid of [null, [], 100]) {
      payload = invalid as unknown as Record<string, unknown>;
      await assert.rejects(getBackendMarketGuideBalance('contract-player', 1, request), /货币余额响应不完整/);
    }
    for (const run of [() => getBackendNewcomerLogin('contract-player', 1), () => getBackendNewcomerLogin('contract-player', 1, request)]) {
      const groups = [
        ['', ['currentDayIndex', 'daysSinceRegistration', 'registrationTime', 'guildContribution']],
        ['dayConfigs', ['dayIndex', 'spiritCrystal']],
        ['taskConfigs', ['id', 'dayIndex', 'threshold', 'spiritCrystal', 'vipExpYuan', 'sortOrder']],
        ['view', ['eventDays', 'contentDays', 'currentDayIndex']]
      ] as const;
      for (const [group, fields] of groups) {
        for (const field of fields) {
          for (const invalid of [undefined, null, '2', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
            const fixture = structuredClone(fixtures.newcomerLoginActive);
            const target = group === '' ? fixture : group === 'view' ? fixture.view as Record<string, unknown> : (fixture[group] as Record<string, unknown>[])[0];
            target[field] = invalid;
            payload = fixture;
            await assert.rejects(run(), /新人活动.*不完整/);
          }
        }
      }
      for (const field of ['claimedLoginDays', 'claimedTaskIds', 'taskProgress']) {
        payload = { ...fixtures.newcomerLoginActive, [field]: field === 'taskProgress' ? { storyline: 1.5 } : [1.5] };
        await assert.rejects(run(), /新人活动接口数据不完整/);
      }
      for (const field of ['dayConfigs', 'taskConfigs']) {
        payload = { ...fixtures.newcomerLoginActive, [field]: [null] };
        await assert.rejects(run(), /新人活动接口数据不完整/);
      }
      const fixture = structuredClone(fixtures.newcomerLoginActive);
      const view = fixture.view as Record<string, unknown>;
      (view.overviewDays as Record<string, unknown>[])[0].day = 1.5;
      payload = fixture;
      await assert.rejects(run(), /新人活动展示投影不完整/);
    }
    for (const [group, fields] of [
      ['', ['contentDays', 'daysSinceRegistration', 'currentDay', 'todayRechargedAmount', 'thresholdAmount', 'maxClaimableDay']],
      ['rewards', ['day', 'spiritStone', 'spiritCrystal', 'spiritMilk']],
      ['items', ['itemId', 'quantity']]
    ] as const) {
      for (const field of fields) {
        for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
          const fixture = structuredClone(fixtures.newcomerRechargeFunded);
          const reward = (fixture.rewards as Record<string, unknown>[])[0];
          const target = group === '' ? fixture : group === 'rewards' ? reward : (reward.items as Record<string, unknown>[])[0];
          target[field] = invalid;
          payload = fixture;
          await assert.rejects(getBackendNewcomerRechargeInfo('contract-player', 1), /新人返利接口缺少数值/);
        }
      }
    }
    payload = { ...fixtures.newcomerRechargeFunded, claimedDays: [1.5] };
    await assert.rejects(getBackendNewcomerRechargeInfo('contract-player', 1), /新人返利接口缺少数值/);
    for (const id of ['', '0x1', '1e2', '01', '-1', '1.5', String(Number.MAX_SAFE_INTEGER + 1)]) {
      payload = { ...fixtures.newcomerRechargeFunded, itemNames: { [id]: '丹药' } };
      await assert.rejects(getBackendNewcomerRechargeInfo('contract-player', 1), /新人返利接口名称无效/);
    }
    for (const [key, fields, run] of [
      ['claimLoginFull', ['claimDay', 'spiritCrystal'], () => claimBackendNewcomerLogin('contract-player', 1, request)],
      ['claimTaskFull', ['spiritCrystal', 'vipExpYuan', 'required', 'current'], () => claimBackendNewcomerTask('contract-player', 1, 1, request)]
    ] as const) {
      for (const field of fields) {
        for (const invalid of [null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
          payload = { ...fixtures[key], [field]: invalid };
          await assert.rejects(run(), /新人活动领取响应缺少/);
        }
      }
      for (const code of [undefined, null, 'UNKNOWN', [], 1]) {
        payload = { ...fixtures[key], code };
        await assert.rejects(run(), /新人.*领取响应缺少code/);
      }
    }
    for (const [field, invalid] of [
      ['version', -1], ['version', 1.5], ['version', Number.MAX_SAFE_INTEGER + 1], ['step', undefined], ['step', '3'], ['step', 6], ['expiresAt', undefined], ['expiresAt', '2030-01-01T00:00:00Z']
    ] as const) {
      const progress = { ...fixtures.guideProgress_3, [field]: invalid };
      payload = progress;
      await assert.rejects(getBackendNewcomerGuide('contract-player', 1, request), /新手引导状态接口返回不完整/);
      for (const run of [() => continueBackendNewcomerGuide('contract-player', 1, 1, request), () => skipBackendNewcomerGuide('contract-player', 1, 1, request)]) {
        payload = { ...fixtures['guideAction_step-3'], progress };
        await assert.rejects(run(), /新手引导动作接口返回不完整/);
      }
    }
    for (const invalid of [null, [], {}, 'tip']) {
      const fixture = structuredClone(fixtures.guideAction_completed);
      (fixture.presentation as Record<string, unknown>).advice = [invalid];
      payload = fixture;
      await assert.rejects(continueBackendNewcomerGuide('contract-player', 1, 1, request), /新手引导动作接口返回不完整/);
    }
    for (const field of ['qiCost', 'stoneReward', 'crystalReward', 'experience']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.counterDrop, [field]: invalid };
        await assert.rejects(counterAttackBackend('contract-player', 1, 1, request), /反击响应缺少/);
      }
    }
    for (const invalid of ['', 'draw', 'UNKNOWN', null, []]) {
      payload = { ...fixtures.counterWin, winner: invalid };
      await assert.rejects(counterAttackBackend('contract-player', 1, 1, request), /反击响应不完整/);
    }
    for (const [field, invalid] of [['HP', 1.5], ['MaxHP', 1.5], ['Dead', 'false'], ['Dead', undefined], ['Dead', null]] as const) {
      const fixture = structuredClone(fixtures.counterWin);
      ((fixture.battle as Record<string, unknown>).SideA as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(counterAttackBackend('contract-player', 1, 1, request), /反击战斗单位响应不完整/);
    }
    for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const fixture = structuredClone(fixtures.counterDrop);
      (fixture.droppedItem as Record<string, unknown>).quantity = invalid;
      payload = fixture;
      await assert.rejects(counterAttackBackend('contract-player', 1, 1, request), /反击响应缺少droppedItem.quantity/);
      const roundsFixture = structuredClone(fixtures.counterWin);
      (roundsFixture.battle as Record<string, unknown>).Rounds = invalid;
      payload = roundsFixture;
      await assert.rejects(counterAttackBackend('contract-player', 1, 1, request), /反击响应缺少battle.rounds/);
    }
    for (const invalid of ['', 'UNKNOWN', [], null]) {
      const fixture = structuredClone(fixtures.dungeonWin);
      (fixture.battle as Record<string, unknown>).Winner = invalid;
      payload = fixture;
      await assert.rejects(challengeBackendDungeon('contract-player', 1, '桃花镇', request), /秘境挑战响应不完整/);
    }
    for (const [field, invalid] of [['currencyCode', 1], ['currencyCode', null], ['itemId', '1'], ['itemId', null], ['itemId', 1.5]] as const) {
      const fixture = structuredClone(fixtures.dungeonDrop);
      (fixture.drops as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(challengeBackendDungeon('contract-player', 1, '桃花镇', request), /秘境挑战掉落响应不完整/);
    }
    for (const invalid of [null, 1, []]) {
      payload = { ...fixtures.dungeonWin, logId: invalid };
      await assert.rejects(challengeBackendDungeon('contract-player', 1, '桃花镇', request), /秘境挑战响应不完整/);
      const fixture = structuredClone(fixtures.dungeonIneligible);
      (fixture.rewardsByUser as Record<string, unknown>[])[0].noRewardReason = invalid;
      payload = fixture;
      await assert.rejects(challengeBackendDungeon('contract-player', 1, '桃花镇', request), /秘境挑战成员结算响应不完整/);
    }
    payload = fixtures.sparWinner_;
    await assert.rejects(commandBackendSpar('contract-player', 1, 2, undefined, request), /比试响应不完整/);
    for (const invalid of ['', 'draw', 'UNKNOWN']) {
      const fixture = structuredClone(fixtures.spar);
      (fixture.battle as Record<string, unknown>).winner = invalid;
      payload = fixture;
      await assert.rejects(commandBackendSpar('contract-player', 1, 2, undefined, request), /比试响应不完整/);
    }
    for (const field of ['baseExperience', 'experience', 'qiCost', 'dailyMax', 'newCount']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.spar);
        (fixture.battle as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(commandBackendSpar('contract-player', 1, 2, undefined, request), /比试响应不完整/);
      }
    }
    for (const field of ['expReward', 'streak', 'bountyReward', 'stoneReward', 'crystalReward']) {
      for (const invalid of [null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.bountyDrop, [field]: invalid };
        await assert.rejects(acceptBackendBounty('contract-player', 1, request), /接赏响应不完整/);
      }
    }
    for (const [field, invalid] of [['Name', undefined], ['HP', undefined], ['MaxHP', undefined], ['HP', 1.5], ['Dead', 'false']] as const) {
      const fixture = structuredClone(fixtures.bounty);
      ((fixture.battle as Record<string, unknown>).SideA as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(acceptBackendBounty('contract-player', 1, request), /接赏战斗单位响应不完整/);
    }
    for (const invalid of [null, 1.5, '2']) {
      const fixture = structuredClone(fixtures.bountyDrop);
      (fixture.droppedItem as Record<string, unknown>).quantity = invalid;
      payload = fixture;
      await assert.rejects(acceptBackendBounty('contract-player', 1, request), /接赏掉落响应不完整/);
      payload = { ...fixtures.bountyDrop, completionId: invalid };
      await assert.rejects(acceptBackendBounty('contract-player', 1, request), /接赏响应不完整/);
    }
    for (const field of ['totalCost', 'fee', 'rewardPool', 'rewardPerCompletion', 'maxCompletions']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.bountyPublish, [field]: invalid };
        await assert.rejects(publishBackendBounty('contract-player', 1, 2, 120, 3, request), /悬赏发布响应不完整/);
      }
    }
    for (const invalid of [undefined, null, '32', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      payload = { ...fixtures.bountyRewardClaim, changeAmount: invalid };
      await assert.rejects(claimBackendBounty('contract-player', 1, request), /领赏响应不完整/);
      payload = [{ bountyId: 1, targetName: '对手', rewardAmount: invalid }];
      await assert.rejects(getBackendPendingBountyRewards('contract-player', 1), /待领赏金响应不完整/);
    }
    for (const field of ['id', 'targetUid', 'rewardPerCompletion', 'maxCompletions', 'completedCount', 'remainingSlots', 'hoursLeft']) {
      for (const invalid of [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.bountyListNullable);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendBounties('contract-player', 1), /悬赏接口缺少数值字段/);
      }
    }
    for (const field of ['publisherName', 'targetName', 'expiresAt']) {
      for (const invalid of [undefined, 1, []]) {
        const fixture = structuredClone(fixtures.bountyListNullable);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendBounties('contract-player', 1), /悬赏接口缺少名称字段|悬赏接口日期无效/);
      }
    }
    for (const field of ['page', 'pageSize', 'total']) {
      payload = { ...fixtures.bountyListEmpty, [field]: 1.5 };
      await assert.rejects(getBackendBounties('contract-player', 1), /悬赏接口缺少数值字段/);
    }
    for (const [key, run] of [
      ['counterWin', () => counterAttackBackend('contract-player', 1, 1, request)],
      ['bounty', () => acceptBackendBounty('contract-player', 1, request)]
    ] as const) {
      const fixture = structuredClone(fixtures[key]);
      const battle = fixture.battle as Record<string, unknown>;
      for (const side of ['SideA', 'SideB']) {
        battle[side] = (battle[side] as Record<string, unknown>[]).map(unit => ({ name: unit.Name, hp: unit.HP, maxHp: unit.MaxHP, dead: unit.Dead }));
      }
      payload = fixture;
      const result = await run();
      const units = 'sideA' in result ? result.sideA : result.battleResult.finalState.sideA;
      assert.deepEqual(units[0], { name: '玩家', hp: 10, maxHp: 10, isDead: false });
      for (const [field, invalid] of [['HP', '10'], ['MaxHP', '10'], ['Dead', 'false'], ['Name', 1], ['HP', null], ['Dead', null]] as const) {
        const malformed = structuredClone(fixture);
        ((malformed.battle as Record<string, unknown>).SideA as Record<string, unknown>[])[0][field] = invalid;
        payload = malformed;
        await assert.rejects(run(), /战斗单位响应不完整/);
      }
    }
    for (const field of ['oldRank', 'newRank']) {
      for (const invalid of [undefined, '2', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.tianjiaoWin, [field]: invalid };
        await assert.rejects(challengeBackendTianjiao('contract-player', 1, 2, request), /登天挑战响应不完整/);
      }
    }
    for (const [field, invalid] of [['rewardText', undefined], ['rewardText', null], ['logId', null], ['logId', 1], ['battle', false], ['battle', 0], ['battle', []]] as const) {
      payload = { ...fixtures.tianjiaoWin, [field]: invalid };
      await assert.rejects(challengeBackendTianjiao('contract-player', 1, 2, request), /登天挑战响应不完整/);
    }
    for (const field of ['HP', 'MaxHP']) {
      const fixture = structuredClone(fixtures.tianjiaoWin);
      ((fixture.battle as Record<string, unknown>).SideA as Record<string, unknown>[])[0][field] = 1.5;
      payload = fixture;
      await assert.rejects(challengeBackendTianjiao('contract-player', 1, 2, request), /登天挑战响应不完整/);
    }
    const fixture = structuredClone(fixtures.tianjiaoWin);
    (fixture.battle as Record<string, unknown>).Rounds = 1.5;
    payload = fixture;
    await assert.rejects(challengeBackendTianjiao('contract-player', 1, 2, request), /登天挑战响应不完整/);
    for (const field of ['stageLevel', 'myRank', 'suggestedTarget']) {
      for (const invalid of [undefined, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        payload = { ...fixtures.tianjiaoBoardRanked, [field]: invalid };
        await assert.rejects(getBackendTianjiaoLeaderboard('contract-player', 1), /登天梯榜单接口数据不完整/);
      }
    }
    for (const field of ['rank', 'power', 'userId']) {
      for (const invalid of [null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const fixture = structuredClone(fixtures.tianjiaoBoardRanked);
        (fixture.entries as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendTianjiaoLeaderboard('contract-player', 1), /登天梯榜单条目不完整/);
      }
    }
    for (const invalid of [null, '7.5', []]) {
      payload = { ...fixtures.tianjiaoBoardRanked, attemptsLeft: invalid };
      await assert.rejects(getBackendTianjiaoLeaderboard('contract-player', 1), /登天梯榜单接口数据不完整/);
    }
    for (const [path, invalid, message] of [
      [['stageLevel'], 1.5, '接口数据'],
      [['view'], [], '接口数据'],
      [['configs', 0, 'rank'], 1.5, '配置'],
      [['configs', 0, 'description'], undefined, '配置'],
      [['records', 0, 'stageLevel'], 1.5, '记录'],
      [['records', 0, 'rank'], Number.MAX_SAFE_INTEGER + 1, '记录'],
      [['records', 0, 'claimedAt'], 'invalid', '记录'],
      [['view', 'tiers', 0, 'claimedAt'], 'invalid', '档位回执'],
      [['view', 'tiers', 0, 'claimedAt'], undefined, '档位回执'],
      [['view', 'records', 0, 'claimedAt'], 'invalid', '展示记录'],
      [['view', 'records', 0, 'rank'], 1.5, '展示记录']
    ] as [Array<string | number>, unknown, string][]) {
      const fixture = structuredClone(fixtures.tianjiaoRewardsHistory);
      let parent = fixture;
      for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
      parent[path[path.length - 1]] = invalid;
      payload = fixture;
      await assert.rejects(getBackendTianjiaoRewards('contract-player', 1), new RegExp(`登天奖励${message}.*不完整`));
    }
    for (const [key, run, paths] of [
      ['towerFirstQuery', () => getBackendTowerFirstRewards('contract-player', 1), [['openStartDay'], ['openEndDay'], ['userRank'], ['maxRank'], ['rewards', 0, 'ranking']]],
      ['towerMonthlyQueryClaimable', () => getBackendTowerMonthlyRewards('contract-player', 1), [['openStartDay'], ['openEndDay'], ['currentRank'], ['bestRank'], ['maxRank'], ['claimCount'], ['bestClaimRank'], ['rewards', 0, 'id'], ['rewards', 0, 'rankingStart'], ['rewards', 0, 'rankingEnd'], ['rewards', 0, 'lingJing'], ['rewards', 0, 'spiritStone']]],
      ['towerOverviewConfigured', () => getBackendTowerRewardOverview('contract-player', 1), [['currentDay'], ['userRank'], ['maxRank'], ['firstRewards', 0, 'ranking'], ['firstRewards', 0, 'lingJing'], ['firstRewards', 0, 'spiritStone']]]
    ] as [string, () => Promise<unknown>, Array<Array<string | number>>][]) {
      for (const path of paths) {
        for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
          const fixture = structuredClone(fixtures[key]);
          let parent = fixture;
          for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
          parent[path[path.length - 1]] = invalid;
          payload = fixture;
          await assert.rejects(run(), /奖励.*缺少数值/);
        }
      }
    }
    for (const invalid of [null, 1]) {
      const fixture = structuredClone(fixtures.towerFirstQuery);
      (fixture.rewards as Record<string, unknown>[])[0].description = invalid;
      payload = fixture;
      await assert.rejects(getBackendTowerFirstRewards('contract-player', 1), /首通奖励状态无效/);
    }
    for (const [key, run, paths] of [
      ['rankingTowerFull', () => getBackendTowerRanking('contract-player', 1, 1), [['leaderboard', 'page'], ['leaderboard', 'total'], ['leaderboard', 'totalPages'], ...['rank', 'playerId', 'totalStars', 'highestLayer'].map(field => ['leaderboard', 'list', 0, field])]],
      ['rankingStoryFull', () => getBackendStorylineRanking('contract-player', 1, 1), [['leaderboard', 'page'], ['leaderboard', 'total'], ['leaderboard', 'totalPages'], ...['rank', 'uid', 'totalStars'].map(field => ['leaderboard', 'items', 0, field])]],
      ['rankingRealmFull', () => getBackendRealmRanking('contract-player', 1), ['rank', 'uid', 'realmLevel', 'experience'].map(field => ['list', 0, field])],
      ['rankingAlchemyFull', () => getBackendAlchemyRanking('contract-player', 1, 1, 5), [...['page', 'pageSize', 'total', 'totalPages'].map(field => [field]), ...['rank', 'playerId', 'level', 'exp', 'totalCrafts', 'successCount'].map(field => ['items', 0, field])]]
    ] as [string, () => Promise<unknown>, Array<Array<string | number>>][]) {
      for (const path of paths) {
        for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
          const fixture = structuredClone(fixtures[key]);
          let parent = fixture;
          for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
          parent[path[path.length - 1]] = invalid;
          payload = fixture;
          await assert.rejects(run(), /查询接口缺少数值字段|丹师排行接口数据不完整/);
        }
      }
    }
    for (const [key, run] of [
      ['rankingTowerLocked', () => getBackendTowerRanking('contract-player', 1, 1)],
      ['rankingStoryLocked', () => getBackendStorylineRanking('contract-player', 1, 1)]
    ] as [string, () => Promise<unknown>][]) {
      payload = { ...fixtures[key], leaderboard: {} };
      await assert.rejects(run(), /资格与榜单不一致/);
    }
    for (const [key, run, integerPaths, decimalPaths] of [
      ['bossRankingDecimal', () => getBackendWorldBossRanking('contract-player', 1), [['stageLevel'], ['myRank'], ['ranking', 0, 'rank']], [['myDamage'], ['ranking', 0, 'damage']]],
      ['bossRewardPreviewFull', () => getBackendWorldBossRewards('contract-player', 1), [['stageLevel'], ['claimableRewardCount'], ['tiers', 0, 'damagePercent'], ['tiers', 0, 'spiritStone'], ['tiers', 0, 'spiritCrystal']], [['config', 'baseDamage']]]
    ] as [string, () => Promise<unknown>, Array<Array<string | number>>, Array<Array<string | number>>][]) {
      for (const [paths, invalidValues] of [[integerPaths, [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']], [decimalPaths, [undefined, null, '1']]] as [Array<Array<string | number>>, unknown[]][]) {
        for (const path of paths) {
          for (const invalid of invalidValues) {
            const fixture = structuredClone(fixtures[key]);
            let parent = fixture;
            for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
            parent[path[path.length - 1]] = invalid;
            payload = fixture;
            await assert.rejects(run(), /凶兽.*缺少数值字段/);
          }
        }
      }
    }
    for (const path of [...['stageLevel', 'totalDamage', 'totalAttacks', 'playerDamage', 'playerAttacks', 'playerRank', 'claimableRewardCount'].map(field => [field]), ...['baseHp', 'dailyAttempts', 'maxRounds', 'activeStartHour', 'activeEndHour'].map(field => ['config', field])]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.bossInfoInactive);
        let parent = fixture;
        for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
        parent[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendWorldBossInfo('contract-player', 1), /凶兽资料数值不完整/);
      }
    }
    for (const invalid of [undefined, null, '7.5', 'nan', {}, []]) {
      payload = { ...fixtures.bossInfoInactive, remainingAttempts: invalid };
      await assert.rejects(getBackendWorldBossInfo('contract-player', 1), /凶兽资料数值不完整/);
    }
    for (const [key, run, paths] of [
      ['dungeonCatalogFull', () => getBackendDungeonCatalog('contract-player', 1, 1), [...['mentalValue', 'realmLevel', 'realmStageLevel', 'currentPage', 'totalPages', 'total'].map(field => [field]), ...['id', 'spiritCost'].map(field => ['items', 0, field])]],
      ['dungeonDetailFull', () => getBackendDungeonDetailCommand('contract-player', 1, '桃花镇', undefined, request), [...['id', 'spiritCost', 'guildContributionCost', 'minPlayers', 'usedToday', 'dailyLimit', 'freeUsed', 'freeLimit', 'expReward'].map(field => [field]), ['currencyDrops', 0, 'amount'], ...['skillDrops', 'materialDrops'].flatMap(list => ['itemId', 'amount', 'probability'].map(field => [list, 0, field]))]]
    ] as [string, () => Promise<unknown>, Array<Array<string | number>>][]) {
      for (const path of paths) {
        for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
          const fixture = structuredClone(fixtures[key]);
          let parent = fixture;
          for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
          parent[path[path.length - 1]] = invalid;
          payload = fixture;
          await assert.rejects(run(), /查询接口缺少数值字段/);
        }
      }
    }
    for (const [key, run, fields] of [
      ['dungeonDetailFull', () => getBackendDungeonDetailCommand('contract-player', 1, '桃花镇', undefined, request), [['isSingle', '单人状态'], ['hasCleared', '通关状态'], ['inTeam', '队伍状态']]],
      ['dungeonCatalogFull', () => getBackendDungeonCatalog('contract-player', 1, 1), [['inTeam', '队伍状态'], ['canUseMeridian', '经脉资格'], ['canMatchDungeon', '匹配资格'], ['isSingle', '挑战状态'], ['hasCleared', '挑战状态']]]
    ] as [string, () => Promise<unknown>, string[][]][]) {
      for (const [field, message] of fields) {
        for (const valid of [false, true]) {
          const fixture = structuredClone(fixtures[key]);
          const nested = key === 'dungeonCatalogFull' && ['isSingle', 'hasCleared'].includes(field);
          const target = nested ? (fixture.items as Record<string, unknown>[])[0] : fixture;
          target[field] = valid;
          payload = fixture;
          const result = await run() as Record<string, unknown>;
          assert.equal(nested ? (result.items as Record<string, unknown>[])[0][field] : result[field], valid);
        }
        for (const invalid of [undefined, null, 'false', 0, {}, []]) {
          const fixture = structuredClone(fixtures[key]);
          const target = key === 'dungeonCatalogFull' && ['isSingle', 'hasCleared'].includes(field) ? (fixture.items as Record<string, unknown>[])[0] : fixture;
          target[field] = invalid;
          payload = fixture;
          await assert.rejects(run(), new RegExp(message));
        }
      }
    }
    for (const invalid of [undefined, null, {}, '丹药']) {
      payload = { ...fixtures.dungeonDetailFull, firstClearReward: { parts: invalid } };
      await assert.rejects(getBackendDungeonDetailCommand('contract-player', 1, '桃花镇', undefined, request), /秘境首通奖励缺少列表/);
    }
    payload = { ...fixtures.dungeonDetailFull, firstClearReward: { parts: [] } };
    assert.deepEqual((await getBackendDungeonDetailCommand('contract-player', 1, '桃花镇', undefined, request)).firstClearReward, { parts: [] });
    for (const path of [['guildLevel'], ...['stageIndex', 'damageDealt', 'participationPoint', 'battleResult', 'attemptNo'].map(field => ['records', 0, field])]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.guildStoryRecordsFull);
        let parent = fixture;
        for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
        parent[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildStorylineRecords('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const invalid of [undefined, null, 'false', 0]) {
      const fixture = structuredClone(fixtures.guildStoryRecordsFull);
      (fixture.records as Record<string, unknown>[])[0].isEffective = invalid;
      payload = fixture;
      await assert.rejects(getBackendGuildStorylineRecords('contract-player', 1), /宗门主线记录缺少有效状态/);
    }
    for (const path of [['page'], ['pageSize'], ['total'], ['items', 0, 'id']]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.feedbackPage1);
        let parent = fixture;
        for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
        parent[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendFeedbacks('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid, pattern] of [
      ['id', 1.5, /查询接口缺少数值字段/],
      ['id', Number.MAX_SAFE_INTEGER + 1, /查询接口缺少数值字段/],
      ['isReplied', 'false', /反馈接口缺少回复状态/],
      ['feedbackTime', 'invalid', /查询接口日期无效/],
      ['reply', undefined, /查询接口缺少文本字段/],
      ['categoryName', undefined, /查询接口缺少文本字段/]
    ] as [string, unknown, RegExp][]) {
      payload = { ...fixtures.feedbackDetail6, [field]: invalid };
      await assert.rejects(getBackendFeedbackDetail('contract-player', 6), pattern);
    }
    for (const field of ['uid', 'totalAttacks', 'lastLogId']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.enemyQueryFull) as unknown as Record<string, unknown>[];
        fixture[0][field] = invalid;
        payload = fixture as unknown as typeof payload;
        await assert.rejects(getBackendEnemies('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid, pattern] of [['lastAttackTime', 'invalid', /查询接口日期无效/], ['name', undefined, /查询接口缺少文本字段/]] as [string, unknown, RegExp][]) {
      const fixture = structuredClone(fixtures.enemyQueryFull) as unknown as Record<string, unknown>[];
      fixture[0][field] = invalid;
      payload = fixture as unknown as typeof payload;
      await assert.rejects(getBackendEnemies('contract-player', 1), pattern);
    }
    for (const path of [...['page', 'pageSize', 'total', 'totalPages'].map(field => [field]), ...['userId', 'roleId', 'dailyActivity', 'weeklyActivity', 'contributionTotal'].map(field => ['members', 0, field])]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.guildMembersJoined);
        let parent = fixture;
        for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
        parent[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildMembers('contract-player', 1, 1, 5), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid, pattern] of [
      ['realmName', undefined, /查询接口缺少文本字段/],
      ['realmName', 1, /查询接口缺少文本字段/],
      ['leaveEndAt', 'invalid', /查询接口日期无效/],
      ['isDeputy', 'false', /宗门成员接口缺少职位状态/]
    ] as [string, unknown, RegExp][]) {
      const fixture = structuredClone(fixtures.guildMembersJoined);
      (fixture.members as Record<string, unknown>[])[1][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendGuildMembers('contract-player', 1, 1, 5), pattern);
    }
    for (const path of [['total'], ['list', 0, 'id'], ['list', 0, 'state']]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.emailQueryPage1);
        let parent = fixture;
        for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
        parent[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEmails('contract-player', 1, 1, 5), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['subtitle', 'data']) {
      for (const invalid of [undefined, null, 1]) {
        const fixture = structuredClone(fixtures.emailQueryPage1);
        (fixture.list as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEmails('contract-player', 1, 1, 5), /查询接口缺少文本字段/);
      }
    }
    for (const [field, invalid] of [
      ['id', 1.5], ['id', Number.MAX_SAFE_INTEGER + 1], ['id', '1'],
      ['state', 1.5], ['state', Number.MAX_SAFE_INTEGER + 1], ['state', undefined],
      ['time', 'invalid'], ['time', null], ['time', undefined],
      ['name', undefined], ['subtitle', 1], ['data', {}], ['goods', undefined],
      ['canClaim', 'false'], ['canDelete', 0]
    ] as [string, unknown][]) {
      payload = { ...fixtures.emailDetailRaw0, [field]: invalid };
      await assert.rejects(getBackendEmailDetail('contract-player', 1, 1), /邮件详情返回对象不一致/);
    }
    payload = fixtures.encyclopediaListFull;
    for (const [category, prefix] of [['材料', '道具'], ['本命', '本命物']]) {
      assert.equal((await getBackendEncyclopedia('contract-player', category, null, 1)).data.detailPrefix, prefix);
    }
    for (const path of [['page', 'totalCount'], ['page', 'totalPages'], ['page', 'page'], ['items', 0, 'id']]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.encyclopediaListFull);
        let parent = fixture;
        for (const field of path.slice(0, -1)) parent = parent[field] as Record<string, unknown>;
        parent[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEncyclopedia('contract-player', '道具', null, 1), /查询接口缺少数值字段/);
      }
    }
    for (const [list, field] of [['stages', 'probability'], ['stages', 'chapterId'], ['dungeons', 'probability'], ['recipes', 'id'], ['recipes', 'pillItemId'], ['recipes', 'inferiorPillItemId'], ['shops', 'priceAmount'], ['guildShop', 'priceContribution'], ['materials', 'recipeId']]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.encyclopediaDetailSources);
        ((fixture.sources as Record<string, Record<string, unknown>[]>)[list])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEncyclopediaDetail('contract-player', '道具', 1), /查询接口缺少数值字段/);
      }
    }
    for (const [kind, value] of [['newline', 1], ['text', undefined], ['quote', null], ['source', []]]) {
      payload = { ...fixtures.encyclopediaDetailEmpty, view: [{ kind, text: value }] };
      await assert.rejects(getBackendEncyclopediaDetail('contract-player', '道具', 1), /图鉴详情展示投影无效/);
    }
    for (const field of ['id', 'displayIndex', 'total', 'currentPage', 'totalPages']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.catalogAchievements);
        const target = ['id', 'displayIndex'].includes(field) ? (fixture.items as Record<string, unknown>[])[0] : fixture.page as Record<string, unknown>;
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendAchievements('contract-player', 1, 5), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['name', 'description', 'completedAt']) {
      const fixture = structuredClone(fixtures.completedAchievements);
      delete (fixture.items as Record<string, unknown>[])[0][field];
      payload = fixture;
      await assert.rejects(getBackendAchievements('contract-player', 1, 5, 2), /查询接口缺少文本字段|成就完成时间缺失/);
    }
    const invalidAchievementTime = structuredClone(fixtures.completedAchievements);
    (invalidAchievementTime.items as Record<string, unknown>[])[0].completedAt = 'invalid-date';
    payload = invalidAchievementTime;
    await assert.rejects(getBackendAchievements('contract-player', 1, 5, 2), /时间|日期/);
    for (const field of ['id', 'senderUid', 'receiverUid', 'quantity', 'intimacyGained', 'tongxinGained', 'page', 'totalPages', 'total']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.giftRecordsSend);
        const target = ['page', 'totalPages', 'total'].includes(field) ? fixture : (fixture.list as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGiftRecords('contract-player', 2, 'send', 99, 1), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid, pattern] of [
      ['createdAt', null, /查询接口缺少文本字段/], ['createdAt', 'invalid', /查询接口日期无效/],
      ['senderName', undefined, /查询接口缺少文本字段/], ['receiverName', 1, /查询接口缺少文本字段/],
      ['premium', 'true', /查询接口缺少布尔字段/]
    ] as const) {
      const fixture = structuredClone(fixtures.giftRecordsSend);
      (fixture.list as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendGiftRecords('contract-player', 2, 'send', 99, 1), pattern);
    }
    for (const field of ['total', 'currentPage', 'pageSize', 'maxFriends', 'myGender', 'friendId', 'relationType', 'intimacy', 'gender']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.friendListFull);
        const target = ['friendId', 'relationType', 'intimacy', 'gender'].includes(field) ? (fixture.list as Record<string, unknown>[])[1] : fixture;
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendFriends('contract-player', 7001, 99, 5), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid] of [['friendName', null], ['relationText', 1], ['spiritBondLevel', undefined], ['userExists', 'false'], ['hasCompanion', null], ['canProposeCompanion', 1]] as const) {
      const fixture = structuredClone(fixtures.friendListFull);
      (fixture.list as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendFriends('contract-player', 7001, 99, 5), /查询接口缺少/);
    }
    for (const field of ['id', 'memberCount', 'levelId', 'level', 'total', 'currentPage', 'totalPages']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.guildListFull);
        const target = ['total', 'currentPage', 'totalPages'].includes(field) ? fixture : (fixture.guilds as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuilds('contract-player', 1, 5), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid] of [['intro', undefined], ['minRealmName', 1], ['name', null], ['titles', null], ['titles', [1]]] as const) {
      const fixture = structuredClone(fixtures.guildListFull);
      (fixture.guilds as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendGuilds('contract-player', 1, 5), /查询接口缺少/);
    }
    for (const field of ['id', 'memberCount', 'maxMembers', 'total', 'page', 'pageSize']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.teamListFull);
        const target = ['total', 'page', 'pageSize'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendTeams('contract-player', 1, 5), /查询接口缺少数值字段/);
      }
    }
    for (const invalid of [0, -1]) {
      payload = { ...fixtures.teamListEmpty, pageSize: invalid };
      await assert.rejects(getBackendTeams('contract-player', 1, 5), /队伍列表分页大小无效/);
    }
    payload = { ...fixtures.teamListOutOfRange, total: undefined };
    await assert.rejects(getBackendTeams('contract-player', 99, 5), /查询接口缺少数值字段/);
    for (const field of ['leaderName', 'minRealmName']) {
      const fixture = structuredClone(fixtures.teamListFull);
      (fixture.items as Record<string, unknown>[])[0][field] = 1;
      payload = fixture;
      await assert.rejects(getBackendTeams('contract-player', 1, 5), /查询接口缺少文本字段/);
    }
    for (const field of ['total', 'page', 'totalPages', 'id']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.guildLogsFull);
        const target = field === 'id' ? (fixture.logs as Record<string, unknown>[])[0] : fixture;
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildLogs('contract-player', 1, 1, 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['content', 'formattedTime']) {
      for (const invalid of [null, undefined, 1]) {
        const fixture = structuredClone(fixtures.guildLogsLast);
        (fixture.logs as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildLogs('contract-player', 1, 99, 1), /查询接口缺少文本字段/);
      }
    }
    payload = { ...fixtures.guildLogsNone, hasGuild: 'false' };
    await assert.rejects(getBackendGuildLogs('contract-player', 8888, 99, 1), /宗门日志接口返回格式不完整/);
    for (const scope of ['top', 'self']) {
      const fields = ['virtueLevel', 'virtueExperience', 'totalGraduatedCount', 'activeDiscipleCount', scope === 'top' ? 'userId' : 'rank'];
      for (const field of fields) {
        for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
          const fixture = structuredClone(fixtures.virtueRankingFull);
          const target = scope === 'top' ? (fixture.top as Record<string, unknown>[])[0] : fixture.self as Record<string, unknown>;
          target[field] = invalid;
          payload = fixture;
          await assert.rejects(getBackendMasterRanking('contract-player', 2), /查询接口缺少数值字段/);
        }
      }
    }
    for (const invalid of [undefined, 1]) {
      const fixture = structuredClone(fixtures.virtueRankingFull);
      (fixture.top as Record<string, unknown>[])[0].userName = invalid;
      payload = fixture;
      await assert.rejects(getBackendMasterRanking('contract-player', 2), /查询接口缺少文本字段/);
    }
    payload = { ...fixtures.virtueRankingNoSelf, self: undefined };
    await assert.rejects(getBackendMasterRanking('contract-player', 8888), /查询接口返回格式不完整/);
    for (const path of [['bannerId'], ['minRealm', 'id'], ['minRealm', 'level'], ['minRealm', 'stageLevel'], ['userRealm', 'id'], ['userRealm', 'level'], ['userRealm', 'stageLevel'], ['pools', '0', 'id'], ['pools', '0', 'realm', 'id'], ['pools', '0', 'realm', 'level'], ['pools', '0', 'realm', 'stageLevel']]) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.lotteryCatalogReady);
        let target = fixture;
        for (const field of path.slice(0, -1)) target = target[field] as Record<string, unknown>;
        target[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGachaCatalog('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid, pattern] of [['active', 'false', /活动目录接口返回格式不完整/], ['accessStatus', 'UNKNOWN', /活动目录接口返回访问状态无效/], ['minRealm', undefined, /查询接口返回格式不完整/], ['pools', null, /查询接口缺少列表/]] as const) {
      payload = { ...fixtures.lotteryCatalogReady, [field]: invalid };
      await assert.rejects(getBackendGachaCatalog('contract-player', 1), pattern);
    }
    for (const field of ['tierWeight', 'pityLimit', 'quantity']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.lotteryGoodsFull) as unknown as Record<string, unknown>[];
        const target = field === 'quantity' ? (fixture[0].items as Record<string, unknown>[])[0] : fixture[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGachaGoods('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['probabilityPercent', 'probability', 'actualRatePercent']) {
      for (const invalid of [null, undefined, '1']) {
        const fixture = structuredClone(fixtures.lotteryGoodsFull) as unknown as Record<string, unknown>[];
        const target = field === 'probabilityPercent' ? fixture[0] : (fixture[0].items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGachaGoods('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['isUp', 'canViewDetail']) {
      const fixture = structuredClone(fixtures.lotteryGoodsFull) as unknown as Record<string, unknown>[];
      (fixture[0].items as Record<string, unknown>[])[0][field] = 'false';
      payload = fixture;
      await assert.rejects(getBackendGachaGoods('contract-player', 1), /货品接口返回格式不完整/);
    }
    for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
      const fixture = structuredClone(fixtures.lotteryHistoryFull) as unknown as Record<string, unknown>[];
      fixture[0].id = invalid;
      payload = fixture;
      await assert.rejects(getBackendGachaHistory('contract-player', 1, 1), /查询接口缺少数值字段/);
    }
    for (const [field, invalid, pattern] of [['createdAt', 'invalid', /查询接口日期无效/], ['itemSnapshotJson', null, /查询接口缺少文本字段/], ['isFree', 1, /记录接口返回格式不完整/]] as const) {
      const fixture = structuredClone(fixtures.lotteryHistoryFull) as unknown as Record<string, unknown>[];
      fixture[0][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendGachaHistory('contract-player', 1, 1), pattern);
    }
    const overviewIntegerPaths = [
      ...['spiritStone', 'spiritsCrystal', 'spiritsMilk', 'signInCoin', 'towerScore', 'reputation', 'tongxin', 'greenBottle'].map(field => ['currencies', field]),
      ...['minRealm', 'userRealm'].flatMap(field => ['level', 'stageLevel'].map(key => [field, key])),
      ...['id', 'poolLevel', 'pricePerPull', 'tenPullCost', 'maxUpPerUser', 'mainPityRemaining', 'subPityRemaining'].map(field => ['banner', 'pools', '0', field]),
      ...['freeRemaining', 'upObtained'].map(field => ['banner', 'pools', '0', 'pity', field]),
      ['banner', 'pools', '0', 'pity', 'tierPity', 'main_up'],
      ['banner', 'pools', '0', 'realm', 'level'], ['banner', 'pools', '0', 'realm', 'stageLevel'],
      ['banner', 'pools', '0', 'tiers', '0', 'weight'], ['banner', 'pools', '0', 'tiers', '0', 'pityLimit']
    ];
    for (const path of overviewIntegerPaths) {
      const invalidValues = path.includes('tierPity') ? [1.5, Number.MAX_SAFE_INTEGER + 1, '1'] : [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1'];
      for (const invalid of invalidValues) {
        const fixture = structuredClone(fixtures.lotteryOverviewReady);
        let target = fixture;
        for (const field of path.slice(0, -1)) target = target[field] as Record<string, unknown>;
        target[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGachaOverview('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['startTime', 'endTime']) {
      const fixture = structuredClone(fixtures.lotteryOverviewReady);
      (fixture.banner as Record<string, unknown>)[field] = 'invalid';
      payload = fixture;
      await assert.rejects(getBackendGachaOverview('contract-player', 1), /查询接口日期无效/);
    }
    payload = { ...fixtures.lotteryOverviewReady, accessStatus: 'UNKNOWN' };
    await assert.rejects(getBackendGachaOverview('contract-player', 1), /转盘概览接口返回访问状态无效/);
    const boxIntegerPaths = [['page'], ['total'], ['pageSize'], ...['id', 'lootboxId', 'quantity'].map(field => ['items', '0', field]), ...['requestedCount', 'effectiveCount'].map(field => ['items', '0', 'capabilities', '0', 'options', '0', field])];
    for (const path of boxIntegerPaths) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.boxListFull);
        let target = fixture;
        for (const field of path.slice(0, -1)) target = target[field] as Record<string, unknown>;
        target[path[path.length - 1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendLootboxes('contract-player', 1, 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['requestedCount', 'effectiveCount']) {
      for (const invalid of [0, -1]) {
        const fixture = structuredClone(fixtures.boxListFull);
        const items = fixture.items as { capabilities: { options: Record<string, unknown>[] }[] }[];
        items[0].capabilities[0].options[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendLootboxes('contract-player', 1, 1), /礼盒接口能力选项无效/);
      }
    }
    for (const [field, invalid] of [['kind', 'unknown'], ['valid', 'false']] as const) {
      const fixture = structuredClone(fixtures.boxListFull);
      const items = fixture.items as { capabilities: Record<string, unknown>[] }[];
      items[0].capabilities[0][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendLootboxes('contract-player', 1, 1), /礼盒接口返回未知能力/);
    }
    for (const field of ['page', 'total', 'pageSize', 'id', 'artifactId', 'gradeId', 'level', 'washCount', 'hasUpgraded', 'isEquipped', 'isLocked']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.artifactBagFull);
        const target = ['page', 'total', 'pageSize'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendSoulArtifactBag('contract-player', 1, 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['canRefine', 'canToggleLock']) {
      for (const invalid of [undefined, null, 'false', 0]) {
        const fixture = structuredClone(fixtures.artifactBagFull);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendSoulArtifactBag('contract-player', 1, 1), /查询接口缺少布尔字段/);
      }
    }
    payload = structuredClone(fixtures.artifactBagFull);
    const invalidArtifactBag = payload as Record<string, unknown>;
    (invalidArtifactBag.items as Record<string, unknown>[])[0].lockAction = 'unknown';
    await assert.rejects(getBackendSoulArtifactBag('contract-player', 1, 1), /本命物背包接口返回未知锁定动作/);
    for (const field of ['page', 'total', 'totalPages', 'id', 'teamId', 'leaderUserId', 'participantCount']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.teamHistoryFull);
        const target = ['page', 'total', 'totalPages'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendTeamBattleRecords('contract-player', 1, 5), /查询接口缺少数值字段/);
      }
    }
    for (const [field, invalid, pattern] of [['settledAt', null, /查询接口缺少文本字段/], ['settledAt', 'invalid', /查询接口日期无效/], ['battleLogId', undefined, /查询接口缺少文本字段/], ['targetLabel', null, /查询接口缺少文本字段/]] as const) {
      const fixture = structuredClone(fixtures.teamHistoryFull);
      (fixture.items as Record<string, unknown>[])[0][field] = invalid;
      payload = fixture;
      await assert.rejects(getBackendTeamBattleRecords('contract-player', 1, 5), pattern);
    }
    for (const field of ['id', 'teamId', 'leaderUserId', 'participantCount', 'userId', 'position']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.teamReportFull);
        const target = ['userId', 'position'].includes(field) ? (fixture.members as Record<string, unknown>[])[0] : fixture;
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendTeamBattleDetail('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const invalid of [undefined, null, 'false', 0, {}, []]) {
      const fixture = structuredClone(fixtures.teamReportFull);
      (fixture.members as Record<string, unknown>[])[0].isLeader = invalid;
      payload = fixture;
      await assert.rejects(getBackendTeamBattleDetail('contract-player', 1), /战报接口缺少队长标记/);
    }
    for (const [field, invalid, pattern] of [['settledAt', null, /查询接口缺少文本字段/], ['settledAt', 'invalid', /查询接口日期无效/], ['battleLogId', undefined, /查询接口缺少文本字段/]] as const) {
      payload = { ...fixtures.teamReportFull, [field]: invalid };
      await assert.rejects(getBackendTeamBattleDetail('contract-player', 1), pattern);
    }
    for (const field of ['id', 'userId', 'teamId']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.queuePendingFull);
        (fixture.applications as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendTeamPendingApplications('contract-player', 2), /查询接口缺少数值字段/);
      }
    }
    for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
      const fixture = structuredClone(fixtures.queueSentFull);
      (fixture.applications as Record<string, unknown>[])[0].id = invalid;
      payload = fixture;
      await assert.rejects(getBackendTeamApplicationRecords('contract-player', 7001), /查询接口缺少数值字段/);
    }
    for (const field of ['isLeader', 'canUseSecondLayerFeature']) {
      for (const invalid of [null, undefined, 'false', 0]) {
        payload = { ...fixtures.queueSentFull, [field]: invalid };
        await assert.rejects(getBackendTeamApplicationRecords('contract-player', 7001), /申请接口缺少身份或境界资格/);
      }
    }
    for (const invalid of [null, 'invalid']) {
      const fixture = structuredClone(fixtures.queueSentFull);
      (fixture.applications as Record<string, unknown>[])[0].createdAt = invalid;
      payload = fixture;
      await assert.rejects(getBackendTeamApplicationRecords('contract-player', 7001), /查询接口缺少文本字段|查询接口日期无效/);
    }
    for (const field of ['page', 'total', 'pageSize', 'totalPages', 'id', 'toolId', 'gradeId', 'isEquipped', 'isLocked']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.toolBagDefault);
        const target = ['page', 'total', 'pageSize', 'totalPages'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendProfessionToolBag('contract-player', 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['canReplace', 'canToggleLock']) {
      for (const invalid of [undefined, null, 'false', 0]) {
        const fixture = structuredClone(fixtures.toolBagDefault);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendProfessionToolBag('contract-player', 1), /查询接口缺少布尔字段/);
      }
    }
    for (const itemLevel of [false, true]) {
      const fixture = structuredClone(fixtures.toolBagDefault);
      const target = itemLevel ? (fixture.items as Record<string, unknown>[])[0] : fixture;
      target.capabilities = ['unknown'];
      payload = fixture;
      await assert.rejects(getBackendProfessionToolBag('contract-player', 1), /天工接口返回未知能力/);
    }
    for (const field of ['page', 'total', 'totalPages', 'id', 'skillBookId', 'status', 'isLocked', 'quantity', 'identifiableCount', 'physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed', 'maxPhysicalAttack', 'maxMagicAttack', 'maxPhysicalDefense', 'maxMagicDefense', 'maxHp', 'maxSpeed', 'gradeId']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.bookBagTyped);
        const target = ['page', 'total', 'totalPages'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendSkillBookBag('contract-player', 1, 'SkillA', 1), /查询接口缺少数值字段/);
      }
    }
    for (const field of ['page', 'total', 'totalPages', 'id', 'equipmentId', 'isEquipped', 'isLocked', 'physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.equipBagDefault);
        const target = ['page', 'total', 'totalPages'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEquipmentBag('contract-player', 1, null, 1), /查询接口缺少数值字段/);
      }
    }
    for (const [field, message] of [['canEquip', '装备资格'], ['canLock', '锁定资格'], ['canDecompose', '分解资格']]) {
      for (const invalid of [undefined, null, 'false', 0]) {
        const fixture = structuredClone(fixtures.equipBagDefault);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEquipmentBag('contract-player', 1, null, 1), new RegExp(message));
      }
    }
    for (const field of ['total', 'currentPage', 'totalPages', 'id', 'listingId', 'sellerUserId', 'quantity', 'unitPriceAmount', 'totalPriceAmount', 'displayQuantity', 'displayUnitPrice', 'displayTotalPrice', 'displayFee', 'displaySellerReceive', 'feeAmount', 'sellerReceivedAmount']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1']) {
        const fixture = structuredClone(fixtures.tradeHistoryBuy);
        const target = ['total', 'currentPage', 'totalPages'].includes(field) ? fixture : (fixture.items as Record<string, unknown>[])[0];
        target[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendMarketTrades('contract-player', 1, 'buy', 1, 2), /查询接口缺少数值字段/);
      }
    }
    for (const invalid of [undefined, null, 1]) {
      const fixture = structuredClone(fixtures.tradeHistoryBuy);
      (fixture.items as Record<string, unknown>[])[1].sellerName = invalid;
      payload = fixture;
      await assert.rejects(getBackendMarketTrades('contract-player', 1, 'buy', 1, 2), /查询接口缺少文本字段/);
    }
    for (const field of ['id', 'fromUserId', 'fromUserRealmId']) {
      for (const invalid of [1.5, Number.MAX_SAFE_INTEGER + 1, undefined, '1', null]) {
        const fixture = structuredClone(fixtures.pendingQueryFull) as unknown as Record<string, unknown>[];
        fixture[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendFriendRequests('contract-player', 10), /查询接口缺少数值字段/);
      }
    }
    for (const index of [0, 4, 6]) {
      for (const invalid of [undefined, null, 0, {}, []]) {
        const fixture = structuredClone(fixtures.pendingQueryFull) as unknown as Record<string, unknown>[];
        fixture[index].fromUserRealmName = invalid;
        payload = fixture;
        await assert.rejects(getBackendFriendRequests('contract-player', 10), /查询接口缺少文本字段/);
      }
    }
    for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
      const fixture = structuredClone(fixtures.blockedQueryFull) as unknown as Record<string, unknown>[];
      fixture[0].id = invalid;
      payload = fixture;
      await assert.rejects(getBackendBlocklist('contract-player', 8), /查询接口缺少数值字段/);
    }
    for (const invalid of [undefined, null, 0, {}, []]) {
      const fixture = structuredClone(fixtures.blockedQueryFull) as unknown as Record<string, unknown>[];
      fixture[0].blockedUserName = invalid;
      payload = fixture;
      await assert.rejects(getBackendBlocklist('contract-player', 8), /查询接口缺少文本字段/);
    }
    for (const invalid of [undefined, null, 0, 'invalid-date']) {
      const fixture = structuredClone(fixtures.blockedQueryFull) as unknown as Record<string, unknown>[];
      fixture[0].createdAt = invalid;
      payload = fixture;
      await assert.rejects(getBackendBlocklist('contract-player', 8), /查询接口(缺少文本字段|日期无效)/);
    }
    for (const invalid of [undefined, null, {}, '[]']) {
      payload = invalid;
      await assert.rejects(getBackendBlocklist('contract-player', 8), invalid === undefined ? /Response is missing data/ : /查询接口缺少列表/);
    }
    for (const [key, run, button, fields] of [
      ['historyQueryFullMemory', () => getBackendMemories('contract-player', 1), 'canShowStoryButton', ['label', 'text']],
      ['historyQueryFullStory', () => getBackendStory('contract-player', 1), 'canShowMemoryButton', ['label', 'value', 'flavor']]
    ] as [string, () => Promise<unknown>, string, string[]][]) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        payload = { ...fixtures[key], [button]: invalid };
        await assert.rejects(run(), /接口展示回执不完整/);
      }
      for (const field of fields) {
        for (const invalid of [undefined, null, 0, {}, []]) {
          const fixture = structuredClone(fixtures[key]);
          (fixture.items as Record<string, unknown>[])[0][field] = invalid;
          payload = fixture;
          await assert.rejects(run(), /接口展示回执不完整/);
        }
      }
      for (const invalid of [undefined, null, {}, '[]']) {
        payload = { ...fixtures[key], items: invalid };
        await assert.rejects(run(), /接口展示回执不完整/);
      }
    }
    for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '3']) {
      payload = { ...fixtures.historyQueryFullMemory, totalDays: invalid };
      await assert.rejects(getBackendMemories('contract-player', 1), /回忆接口展示回执不完整/);
    }
    for (const invalid of [null, 0, {}, []]) {
      const fixture = structuredClone(fixtures.historyQueryFullMemory);
      (fixture.items as Record<string, unknown>[])[1].subtext = invalid;
      payload = fixture;
      await assert.rejects(getBackendMemories('contract-player', 1), /回忆接口展示回执不完整/);
    }
    for (const field of ['canUseFifthLayerFeature', 'canUseSpar']) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        payload = { ...fixtures.socialAccessQueryFifth, [field]: invalid };
        await assert.rejects(getBackendFriendAccess('contract-player', 1), /查询接口缺少好友资格/);
        if (field === 'canUseFifthLayerFeature') await assert.rejects(getBackendSocialAccess('contract-player', 1), /查询接口缺少境界资格/);
      }
    }
    for (const invalid of [undefined, null, 0, {}, []]) {
      payload = { ...fixtures.socialAccessQueryMissingRealm, realmName: invalid };
      await assert.rejects(getBackendSocialAccess('contract-player', 1), /查询接口缺少文本字段/);
      await assert.rejects(getBackendFriendAccess('contract-player', 1), /查询接口缺少文本字段/);
    }
    for (const [field, message] of [['hasCompanion', '道侣状态'], ['userExists', '好友状态'], ['friendHasCompanion', '好友状态'], ['canProposeCompanion', '好友关系展示信息']]) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        const fixture = structuredClone(fixtures.friendPageFull);
        const target = field === 'hasCompanion' ? fixture : (fixture.list as Record<string, unknown>[])[0];
        target[field === 'friendHasCompanion' ? 'hasCompanion' : field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendFriends('contract-player', 1, 1, 5), new RegExp(message));
      }
    }
    for (const field of ['gameplay', 'lore']) {
      for (const invalid of [undefined, 0, {}, []]) {
        const fixture = structuredClone(fixtures.encyclopediaQueryItem);
        (fixture.lore as Record<string, unknown>)[field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendEncyclopediaDetail('contract-player', '道具', 1), /查询接口缺少文本字段/);
      }
    }
    for (const invalid of [undefined, null, 0, {}, []]) {
      const fixture = structuredClone(fixtures.encyclopediaQueryEquipment);
      (fixture.equipmentSet as Record<string, unknown>).name = invalid;
      payload = fixture;
      await assert.rejects(getBackendEncyclopediaDetail('contract-player', '装备', 1), /查询接口缺少文本字段/);
    }
    for (const field of ['lore', 'equipmentSet']) {
      for (const invalid of [undefined, 0, 'invalid', []]) {
        payload = { ...fixtures.encyclopediaQueryEquipment, [field]: invalid };
        await assert.rejects(getBackendEncyclopediaDetail('contract-player', '装备', 1), /查询接口返回格式不完整/);
      }
    }
    for (const invalid of [undefined, null, {}, '锤', [1], [null]]) {
      const fixture = structuredClone(fixtures.encyclopediaToolCategoriesFull);
      const directory = (fixture.items as Record<string, unknown>[]).find(row => row.category === '天工')!;
      directory.subCategories = invalid;
      payload = fixture;
      await assert.rejects(getBackendToolCategories('contract-player'), Array.isArray(invalid) ? /查询接口缺少文本字段/ : /查询接口缺少天工分类/);
    }
    payload = { ...fixtures.encyclopediaToolCategoriesFull, items: [] };
    await assert.rejects(getBackendToolCategories('contract-player'), /查询接口缺少天工分类/);
    for (const field of ['isOnLeave', 'isDeputy']) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        const fixture = structuredClone(fixtures.guildMemberQueryLast);
        (fixture.members as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildMembers('contract-player', 1, 99, 2), /宗门成员接口缺少职位状态/);
      }
    }
    for (const invalid of [undefined, null, 0, 'false', {}, []]) {
      payload = { ...fixtures.guildLogsFull, hasGuild: invalid };
      await assert.rejects(getBackendGuildLogs('contract-player', 1, 1, 5), /宗门日志接口返回格式不完整/);
      const fixture = structuredClone(fixtures.guildStoryRecordsFull);
      (fixture.records as Record<string, unknown>[])[0].isEffective = invalid;
      payload = fixture;
      await assert.rejects(getBackendGuildStorylineRecords('contract-player', 1), /宗门主线记录缺少有效状态/);
    }
    for (const invalid of [undefined, null, 0, 'false', {}, []]) {
      payload = { ...fixtures.socialAccessQueryGuild, canCreateOrApplyGuild: invalid };
      await assert.rejects(getBackendGuildAccess('contract-player', 1), /查询接口缺少宗门资格/);
    }
    for (const invalid of [undefined, null, 0, 'false', {}, []]) {
      const fixture = structuredClone(fixtures.feedbackPage1);
      (fixture.items as Record<string, unknown>[])[0].isReplied = invalid;
      payload = fixture;
      await assert.rejects(getBackendFeedbacks('contract-player', 1), /反馈接口缺少回复状态/);
      payload = { ...fixtures.feedbackDetail6, isReplied: invalid };
      await assert.rejects(getBackendFeedbackDetail('contract-player', 6), /反馈接口缺少回复状态/);
    }
    for (const wrongId of [0, 1, 7, Number.MAX_SAFE_INTEGER]) {
      payload = { ...fixtures.feedbackDetail6, id: wrongId };
      await assert.rejects(getBackendFeedbackDetail('contract-player', 6), /反馈详情返回对象不一致/);
    }
    payload = fixtures.feedbackDetail1;
    await assert.rejects(getBackendFeedbackDetail('contract-player', 6), /反馈详情返回对象不一致/);
    for (const invalid of [undefined, null, 0, {}, []]) {
      payload = { ...fixtures.feedbackDetail6, content: invalid };
      await assert.rejects(getBackendFeedbackDetail('contract-player', 6), /查询接口缺少文本字段/);
    }
    for (const wrongId of [0, 2, 3, Number.MAX_SAFE_INTEGER]) {
      payload = { ...fixtures.teamReportFull, id: wrongId };
      await assert.rejects(getBackendTeamBattleDetail('contract-player', 1), /战报详情返回对象不一致/);
    }
    payload = fixtures.teamReportNoMembers;
    await assert.rejects(getBackendTeamBattleDetail('contract-player', 1), /战报详情返回对象不一致/);
    for (const invalid of [null, 0, false, {}, []]) {
      const fixture = structuredClone(fixtures.itemDetailProjected);
      (fixture.entries as Record<string, unknown>[])[0].view = [{ kind: 'newline', text: invalid }];
      payload = fixture;
      await assert.rejects(getBackendItemDetail('contract-player', 1, { name: '道具' }), /物品详情展示投影无效/);
    }
    for (const block of [{ kind: 'newline' }, { kind: 'newline', text: '' }]) {
      const fixture = structuredClone(fixtures.itemDetailProjected);
      (fixture.entries as Record<string, unknown>[])[0].view = [block];
      payload = fixture;
      const result = await getBackendItemDetail('contract-player', 1, { name: '道具' });
      assert.deepEqual(result.entries[0].view, [block]);
    }
    
    
    
    
    
    
    
    
    
    for (const field of ['guildId', 'contributionAdded', 'prestigeAdded', 'dailyActivityAdded', 'weeklyActivityAdded', 'weeklyBonusSpiritStone', 'weeklyCheckinCount']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        payload = { ...fixtures.guildCheckinActualBonus, [field]: invalid };
        await assert.rejects(postBackendGuildCheckin('contract-player', 88, request), /宗门签到响应不完整/);
      }
    }
    for (const kind of ['level', 'vein', 'shop'] as const) {
      for (const field of ['guildId', 'level', 'spiritStoneCost', 'prestigeCost']) {
        for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
          payload = { ...fixtures[`guildUpgradeActual:${kind}`], [field]: invalid };
          await assert.rejects(postBackendGuildUpgrade('contract-player', 9, kind, request), /宗门升级响应不完整/);
        }
      }
      payload = { ...fixtures[`guildUpgradeActual:${kind}`], kind: 'other' };
      await assert.rejects(postBackendGuildUpgrade('contract-player', 9, kind, request), /宗门升级响应不完整/);
    }
    for (const field of ['id', 'perAmount', 'packetCount', 'claimedCount', 'remaining']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures.redPacketListQueryFull);
        (fixture.packets as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildRedPackets('contract-player', 1), /宗门红包字段不完整/);
      }
    }
    for (const field of ['currencyType', 'currencyName', 'remainingTimeText', 'expiresAt']) {
      for (const invalid of [undefined, 0, false, {}, []]) {
        const fixture = structuredClone(fixtures.redPacketListQueryFull);
        (fixture.packets as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildRedPackets('contract-player', 1), /宗门红包字段不完整/);
      }
    }
    for (const invalid of ['', 'not-a-date']) {
      const fixture = structuredClone(fixtures.redPacketListQueryFull);
      (fixture.packets as Record<string, unknown>[])[0].expiresAt = invalid;
      payload = fixture;
      await assert.rejects(getBackendGuildRedPackets('contract-player', 1), /宗门红包字段不完整/);
    }
    for (const invalid of [undefined, null, 'false', 0, {}, []]) {
      payload = { ...fixtures.redPacketListQueryFull, hasGuild: invalid };
      await assert.rejects(getBackendGuildRedPackets('contract-player', 1), /宗门红包数据不完整/);
    }
    for (const invalid of [null, false, 0, '红包', []]) {
      payload = { ...fixtures.redPacketListQueryFull, packets: [invalid] };
      await assert.rejects(getBackendGuildRedPackets('contract-player', 1), /宗门红包数据不完整/);
    }
    for (const field of ['id', 'packetCount', 'perAmount', 'status', 'claimedCount', 'recycled', 'recycleAmount']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures.senderPacketQueryFull);
        (fixture.packets as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildMyRedPackets('contract-player', 1), /红包接口数据不完整/);
      }
    }
    for (const field of ['currencyType', 'currencyName', 'statusText', 'canRecycle', 'expiresAt']) {
      for (const invalid of [undefined, 0, {}, []]) {
        const fixture = structuredClone(fixtures.senderPacketQueryFull);
        (fixture.packets as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildMyRedPackets('contract-player', 1), /红包接口数据不完整/);
      }
    }
    for (const invalid of [undefined, null, 'false', 0, {}, []]) {
      payload = { ...fixtures.senderPacketQueryFull, hasGuild: invalid };
      await assert.rejects(getBackendGuildMyRedPackets('contract-player', 1), /红包接口数据不完整/);
    }
    for (const invalid of [null, false, 0, '红包', []]) {
      payload = { ...fixtures.senderPacketQueryFull, packets: [invalid] };
      await assert.rejects(getBackendGuildMyRedPackets('contract-player', 1), /红包接口数据不完整/);
    }
    for (const target of ['roles', 'appointableRoles', 'members', 'kickableMembers']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures.roleDirectoryQueryLeader);
        const rows = target === 'appointableRoles'
          ? (fixture.members as Record<string, unknown>[])[1].appointableRoles as Record<string, unknown>[]
          : fixture[target] as Record<string, unknown>[];
        rows[0][target === 'roles' || target === 'appointableRoles' ? 'id' : 'userId'] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildRoleOptions('contract-player', 1), /宗门职位接口数据不完整/);
      }
    }
    for (const collection of ['members', 'kickableMembers']) {
      for (const field of ['userExists', 'isDeputy']) {
        for (const invalid of [undefined, null, 'false', 0, {}, []]) {
          const fixture = structuredClone(fixtures.roleDirectoryQueryLeader);
          (fixture[collection] as Record<string, unknown>[])[0][field] = invalid;
          payload = fixture;
          await assert.rejects(getBackendGuildRoleOptions('contract-player', 1), /宗门职位接口数据不完整/);
        }
      }
      for (const field of ['name', 'realmName', 'roleName']) {
        for (const invalid of [undefined, 0, false, {}, []]) {
          const fixture = structuredClone(fixtures.roleDirectoryQueryLeader);
          (fixture[collection] as Record<string, unknown>[])[0][field] = invalid;
          payload = fixture;
          await assert.rejects(getBackendGuildRoleOptions('contract-player', 1), /宗门职位接口数据不完整/);
        }
      }
    }
    for (const field of ['members', 'kickableMembers', 'roles']) {
      for (const invalid of [undefined, null, 0, false, {}, '列表', [null], [[]]]) {
        payload = { ...fixtures.roleDirectoryQueryLeader, [field]: invalid };
        await assert.rejects(getBackendGuildRoleOptions('contract-player', 1), /宗门职位接口数据不完整/);
      }
    }
    for (const forWrite of [false, true]) {
      const source = fixtures[forWrite ? 'autoRefreshWriteQuery:Fractional' : 'autoRefreshReadQuery:Fractional'];
      for (const field of ['enabled', 'isLeader', 'isViceLeader']) {
        for (const invalid of [undefined, null, 0, 'false', {}, []]) {
          payload = { ...source, [field]: invalid };
          await assert.rejects(getBackendGuildAutoRefresh('contract-player', 1, forWrite), /宗门自动刷新配置响应不完整/);
        }
      }
      for (const invalid of [undefined, null, '8', {}, 8, [null], ['8'], [-1], [24]]) {
        payload = { ...source, hours: invalid };
        await assert.rejects(getBackendGuildAutoRefresh('contract-player', 1, forWrite), /宗门自动刷新配置响应不完整/);
      }
    }
    for (const field of ['isLeader', 'isViceLeader']) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        payload = { ...fixtures['autoRefreshLeadershipQuery:1'], [field]: invalid };
        await assert.rejects(getBackendGuildLeadership('contract-player', 1), /宗门角色响应不完整/);
      }
    }
    for (const kind of ['daily', 'weekly'] as const) {
      const source = fixtures[`taskOverviewQuery:${kind}:11`];
      const run = () => kind === 'daily' ? getBackendGuildDailyTask('contract-player', 11) : getBackendGuildWeeklyTask('contract-player', 11);
      const fields = kind === 'daily' ? ['guildId', 'contributionPoints', 'dailyActivity', 'dailyActivityMax', 'dailyMiningCount', 'dailyExchangeCount', 'prestigeRemaining'] : ['guildId', 'contributionPoints', 'weeklyActivity', 'weeklyActivityMax', 'stipendThreshold', 'stipendPreviewAmount', 'stipendBaseAmount', 'stipendGuildLevel', 'weeklyCheckinCount', 'weeklyMiningCount', 'weeklyExchangeCount'];
      for (const field of fields) {
        for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
          payload = { ...source, [field]: invalid };
          await assert.rejects(run(), kind === 'daily' ? /宗门日常数据不完整/ : /宗门周常数据不完整/);
        }
      }
      for (const field of ['id', 'threshold']) {
        for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
          const fixture = structuredClone(source);
          (fixture.milestones as Record<string, unknown>[])[0][field] = invalid;
          payload = fixture;
          await assert.rejects(run(), kind === 'daily' ? /宗门日常里程碑数据不完整/ : /宗门周常里程碑数据不完整/);
        }
      }
    }
    for (const field of ['progress', 'target', 'activityReward']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures['taskOverviewQuery:weekly:11']);
        (fixture.weeklyTasks as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildWeeklyTask('contract-player', 11), /宗门周常任务数据不完整/);
      }
    }
    for (const field of ['guildId', 'veinLevel', 'miningQuota', 'remainingSeconds', 'settledHours', 'spiritStoneAdded', 'contributionAdded', 'dailyActivityAdded']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        payload = { ...fixtures.miningReceiptActualSettled, [field]: invalid };
        await assert.rejects(postBackendGuildMining('contract-player', 71, request), /宗门采矿响应不完整/);
      }
    }
    for (const field of ['started', 'capReached']) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        payload = { ...fixtures.miningReceiptActualSettled, [field]: invalid };
        await assert.rejects(postBackendGuildMining('contract-player', 71, request), /宗门采矿响应不完整/);
      }
    }
    for (const kind of ['worship', 'stipend'] as const) {
      const source = fixtures[`${kind}ReceiptActualFull`];
      const run = () => kind === 'worship' ? postBackendGuildWorship('contract-player', 71, '灵石', request) : postBackendGuildStipendClaim('contract-player', 71, request);
      const fields = kind === 'worship' ? ['guildId', 'cost', 'dailyActivityAdded', 'currentDailyActivity', 'contributionAdded'] : ['guildId', 'amount', 'weeklyActivity', 'guildLevel', 'baseAmount'];
      for (const field of fields) {
        for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
          payload = { ...source, [field]: invalid };
          await assert.rejects(run(), kind === 'worship' ? /祭祀祖师响应不完整/ : /宗门俸禄响应不完整/);
        }
      }
    }
    for (const field of ['levelMultiplier', 'activityMultiplier']) {
      for (const invalid of [undefined, null, '1.2', false, {}, []]) {
        payload = { ...fixtures.stipendReceiptActualFull, [field]: invalid };
        await assert.rejects(postBackendGuildStipendClaim('contract-player', 71, request), /宗门俸禄响应不完整/);
      }
    }
    for (const field of ['guildId', 'guildLevel', 'prestige', 'spiritStone', 'contributionPoints', 'teamMaxLevel', 'personalMaxLevel']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        payload = { ...fixtures['battlePreparationQuery:1'], [field]: invalid };
        await assert.rejects(getBackendGuildBattleTraining('contract-player', 1), /宗门战备响应不完整/);
      }
    }
    for (const collection of ['team', 'personal']) {
      for (const field of ['level', 'maxLevel', 'nextCostPrestige', 'nextCostSpiritStone', 'nextCostContribution']) {
        const invalidValues: unknown[] = [undefined, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []];
        if (field === 'level' || field === 'maxLevel') invalidValues.push(null);
        for (const invalid of invalidValues) {
          const fixture = structuredClone(fixtures['battlePreparationQuery:1']);
          (fixture[collection] as Record<string, unknown>[])[0][field] = invalid;
          payload = fixture;
          await assert.rejects(getBackendGuildBattleTraining('contract-player', 1), /宗门战备响应不完整/);
        }
      }
      for (const invalid of [null, false, 0, [], '战备']) {
        payload = { ...fixtures['battlePreparationQuery:1'], [collection]: [invalid] };
        await assert.rejects(getBackendGuildBattleTraining('contract-player', 1), /宗门战备响应不完整/);
      }
    }
    for (const [branch, key, fixtureKey] of [['团队', '攻', 'battlePreparationUpgradeTeam'], ['个人', '命', 'battlePreparationUpgradePersonal']] as const) {
      for (const field of ['newLevel', 'contributionPoints', 'prestige', 'spiritStone']) {
        for (const invalid of [undefined, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
          payload = { ...fixtures[fixtureKey], [field]: invalid };
          await assert.rejects(postBackendGuildBattleTraining('contract-player', 1, branch, key, request), /宗门战备升级响应不完整/);
        }
      }
    }
    for (const action of ['send', 'claim', 'recycle'] as const) {
      const source = fixtures[`packetMutationActual:${action}:contribution`];
      const run = () => action === 'send' ? sendBackendGuildRedPacket('contract-player', 1, { currencyType: 'contribution', packetCount: 5, perAmount: 100 }, request) : action === 'claim' ? claimBackendGuildRedPacket('contract-player', 2, 1, request) : recycleBackendGuildRedPacket('contract-player', 1, 1, request);
      for (const field of ['packetId', action === 'send' ? 'autoClaimedAmount' : action === 'claim' ? 'amount' : 'refundAmount']) {
        for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
          payload = { ...source, [field]: invalid };
          await assert.rejects(run(), action === 'send' ? /发红包响应不完整/ : action === 'claim' ? /领取红包响应不完整/ : /回收红包响应不完整/);
        }
      }
    }
    for (const field of ['milestoneId', 'threshold', 'currentPoints', 'spiritStone', 'contribution', 'prestige']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures['milestoneReceiptActual:single:daily_activity']);
        if (['spiritStone', 'contribution', 'prestige'].includes(field)) (fixture.rewards as Record<string, unknown>)[field] = invalid;
        else fixture[field] = invalid;
        payload = fixture;
        await assert.rejects(postBackendGuildMilestoneClaim('contract-player', 1, 1, request), /宗门里程碑领取响应不完整/);
      }
    }
    payload = { ...fixtures['milestoneReceiptActual:single:daily_activity'], milestoneId: 2 };
    await assert.rejects(postBackendGuildMilestoneClaim('contract-player', 1, 1, request), /宗门里程碑领取响应不完整/);
    for (const field of ['id', 'threshold']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures['milestoneReceiptActual:all:daily_activity']);
        (fixture.claimed as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(postBackendGuildMilestonesClaimAll('contract-player', 2, 'daily_activity', request), /宗门里程碑一键领取响应不完整/);
      }
    }
    for (const field of ['id', 'index', 'itemId', 'quantity', 'priceContribution']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures['shopPageQueryLinked:7']);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildShopPage('contract-player', 7), /宗门商店商品响应不完整/);
      }
    }
    for (const field of ['purchased', 'canExchange']) {
      for (const invalid of [undefined, null, 0, 'false', {}, []]) {
        const fixture = structuredClone(fixtures.shopPageQueryReady);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildShopPage('contract-player', 7), /宗门商店商品响应不完整/);
      }
    }
    for (const field of ['itemType', 'itemSubtype']) {
      for (const invalid of [undefined, 0, false, {}, []]) {
        const fixture = structuredClone(fixtures['shopPageQueryLinked:7']);
        (fixture.items as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildShopPage('contract-player', 7), /宗门商店商品响应不完整/);
      }
    }
    for (const path of [
      ['pendingApplications'], ['membership', 'guildId'], ['guild', 'level'], ['guild', 'leader', 'userId'],
      ...['spiritStone', 'spiritStoneCap', 'prestige', 'prestigeCap', 'viceLeaderCount', 'viceLeaderLimit', 'elderCount', 'elderLimit', 'memberCount', 'memberCapacity'].map(field => ['guild', field])
    ]) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures['guildHomeQueryActual:1']);
        let row = fixture;
        for (const field of path.slice(0, -1)) row = row[field] as Record<string, unknown>;
        row[path.at(-1)!] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildHome('contract-player', 1), /宗门主页缺少数值/);
      }
    }
    for (const path of [['guild', 'veinLevel'], ['guild', 'shopLevel'], ['unlockLevels', 'shop'], ['unlockLevels', 'viceLeader'], ['unlockLevels', 'elder'], ['storyline', 'stageIndex']]) {
      for (const invalid of [undefined, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures['guildHomeQueryActual:1']);
        (fixture[path[0]] as Record<string, unknown>)[path[1]] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildHome('contract-player', 1), /宗门主页缺少数值/);
      }
    }
    for (const field of ['toolName', 'typeName', 'gradeName', 'message']) {
      for (const invalid of [undefined, null, 0, false, {}, []]) {
        payload = { ...fixtures.professionToolReplaceActualFull, [field]: invalid };
        await assert.rejects(replaceBackendProfessionTool('contract-player', 1, '2', request), /替换职业工具响应不完整/);
      }
    }
    for (const field of ['toolId', 'userToolId', 'gradeLevel']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        payload = { ...fixtures.professionToolReplaceActualFull, [field]: invalid };
        await assert.rejects(replaceBackendProfessionTool('contract-player', 1, '2', request), /替换职业工具响应不完整/);
      }
    }
    
    
    
    
    // Older servers return the complete catalog without page metadata.
    payload = fixtures['recipeCatalogQuery:standard'];
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    for (const field of ['id', 'guildId', 'status', 'guildName', 'createdAt', 'guildNameText', 'statusText', 'createdDateText', 'canCancel']) {
      const base = fixtures['applicationQueryActual:1'];
      const invalidValues: unknown[] = [undefined, {}, []];
      if (['id', 'guildId'].includes(field)) invalidValues.push(null, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false);
      if (field === 'status') invalidValues.push(null, 1, '0', false);
      if (['guildName', 'guildNameText', 'statusText', 'createdDateText', 'createdAt'].includes(field)) invalidValues.push(1, false);
      if (field === 'createdAt') invalidValues.push('invalid-date');
      if (['guildNameText', 'statusText', 'createdDateText', 'canCancel'].includes(field)) invalidValues.push(null);
      if (field === 'canCancel') invalidValues.push('false', 0);
      for (const invalid of invalidValues) {
        const fixture = structuredClone(base);
        (fixture.applications as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildApplications('contract-player', 1), /宗门申请接口数据不完整/);
      }
    }
    for (const field of ['hasGuild', 'canReview', 'isDeputy', 'guildName', 'roleName', 'currentPage', 'totalPages', 'total', 'applications']) {
      const invalidValues: unknown[] = [undefined, {}];
      if (['hasGuild', 'canReview', 'isDeputy'].includes(field)) invalidValues.push(null, 0, [], 'false');
      if (['guildName', 'roleName'].includes(field)) invalidValues.push(0, false, []);
      if (['currentPage', 'totalPages', 'total'].includes(field)) invalidValues.push(null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, false, [], '1');
      if (field === 'currentPage') invalidValues.push(0);
      if (field === 'applications') invalidValues.push(null, false, 0);
      for (const invalid of invalidValues) {
        payload = { ...fixtures['reviewQueryActual:Leader'], [field]: invalid };
        await assert.rejects(getBackendGuildReview('contract-player', 1, 1), /宗门审核接口数据不完整/);
      }
    }
    for (const field of ['id', 'userId', 'userName', 'realmName', 'createdAt']) {
      const invalidValues: unknown[] = [undefined, {}, []];
      if (['id', 'userId'].includes(field)) invalidValues.push(null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false);
      if (field === 'id') invalidValues.push(0);
      if (['userName', 'realmName', 'createdAt'].includes(field)) invalidValues.push(1, false);
      if (field === 'createdAt') invalidValues.push('invalid-date');
      for (const invalid of invalidValues) {
        const fixture = structuredClone(fixtures['reviewQueryActual:Leader']);
        (fixture.applications as Record<string, unknown>[])[0][field] = invalid;
        payload = fixture;
        await assert.rejects(getBackendGuildReview('contract-player', 1, 1), /宗门审核接口数据不完整/);
      }
    }
    payload = fixtures['reviewQueryActual:Leader'];
    await assert.rejects(getBackendGuildReview('contract-player', 1, 0), /Invalid parameter page/);
    await assertTaskConfigContracts(fixtures, value => { payload = value; });
    await assertTaskRuntimeContracts(fixtures, value => { payload = value; });
    await assertTaskClearContracts(fixtures, value => { payload = value; });
    await assertConsumeContracts(fixtures, value => { payload = value; });
    await assertEmailDeleteContracts(fixtures, value => { payload = value; });
    await assertFriendAcceptContracts(fixtures, value => { payload = value; });
    await assertTitleOverviewContracts(fixtures, value => { payload = value; });
    await assertCavePageContracts(fixtures, value => { payload = value; }, () => lastRequestURL);
    await assertRandomFriendContracts(fixtures, value => { payload = value; });
    await assertAchievementOverviewContracts(fixtures, value => { payload = value; });
    await assertCombatAchievementContracts(fixtures, value => { payload = value; });
    await assertAttributePanelContracts(fixtures, value => { payload = value; });
    await assertEquippedOverviewContracts(fixtures, value => { payload = value; });
    await assertProfessionDashboardContracts(fixtures, value => { payload = value; });
    await assertSoulStateContracts(fixtures, value => { payload = value; });
    await assertArtifactOverviewContracts(fixtures, value => { payload = value; });
    await assertArtifactEquipContracts(fixtures, value => { payload = value; });
    await assertArtifactWashContracts(fixtures, value => { payload = value; });
    await assertArtifactLevelContracts(fixtures, value => { payload = value; });
    await assertArtifactGradeContracts(fixtures, value => { payload = value; });
    await assertArtifactUnequipContracts(fixtures, value => { payload = value; });
    await assertLootboxOpenContracts(fixtures, value => { payload = value; });
    await assertStorageBulkCapabilityContracts(fixtures, value => { payload = value; });
    await assertInventoryBagContracts(fixtures, value => { payload = value; });
    await assertStorageLockAssetContracts(fixtures, value => { payload = value; });
    await assertStorageLockContracts(fixtures, value => { payload = value; });
    await assertBattleTemplateContracts(fixtures, value => { payload = value; });
    for (const invalid of [undefined, null, false, 1, {}, [], 'unknown']) {
      payload = { ...fixtures['taskActionActual:step:Saved'], outcome: invalid };
      await assert.rejects(setBackendTaskSlotStep('contract-player', 1, 1, 1, '签到', request), /任务步骤设置响应不完整/);
      await assert.rejects(setBackendTaskSlotAlias('contract-player', 1, 1, '每日', request), /任务别名设置响应不完整/);
    }
    for (const invalid of [undefined, null, false, 1, {}, []]) {
      for (const field of ['alias', 'steps']) {
        if (field === 'steps' && Array.isArray(invalid)) continue;
        payload = { ...fixtures['taskActionActual:alias:Saved'], [field]: invalid };
        await assert.rejects(setBackendTaskSlotAlias('contract-player', 1, 1, '每日', request), /任务别名设置响应不完整/);
      }
      payload = { ...fixtures['taskActionActual:step:Saved'], steps: [invalid] };
      await assert.rejects(setBackendTaskSlotStep('contract-player', 1, 1, 1, '签到', request), /任务步骤设置响应不完整/);
      await assert.rejects(setBackendTaskSlotAlias('contract-player', 1, 1, '每日', request), /任务别名设置响应不完整/);
    }
    const lowercaseFixture = structuredClone(fixtures.dungeonWin);
    lowercaseFixture.battle = { winner: 'A', rounds: 2 };
    payload = lowercaseFixture;
    assert.equal((await challengeBackendDungeon('contract-player', 1, '桃花镇', request)).battle.winner, 'A');
    for (const field of ['dungeonId', 'won', 'experienceGained', 'spiritStoneGained', 'battle', 'drops']) {
      const fixture = structuredClone(fixtures.dungeonWin);
      delete fixture[field];
      payload = fixture;
      await assert.rejects(challengeBackendDungeon('contract-player', 1, '桃花镇', request), error => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, '秘境挑战响应不完整');
        assert.ok((error.cause as { invalidFields: string[] }).invalidFields.includes(field));
        return true;
      });
    }
    for (const invalid of [undefined, null, 'false', 0]) {
      const fixture = structuredClone(fixtures.tongtianChallenge);
      const battle = fixture.battle as { SideA: Record<string, unknown>[] };
      battle.SideA[0].Dead = invalid;
      payload = fixture;
      await assert.rejects(challengeBackendTongtianTower('contract-player', 1, 1, request), /unit.isDead/);
    }
    for (const [key, field, invalid] of [
      ['alchemyAccess', 'canUse', undefined], ['alchemyInGuide', 'currentStep', undefined],
      ['breakthrough', 'newRealm', undefined], ['breakthrough', 'unlockedRecipes', [1]],
      ['normalSettlement', 'vipUpgrade', 1],
      ['realmAccess', 'canUseSoulPath', undefined], ['guildHome', 'hasGuild', true],
      ['manualBattle', 'events', undefined]
    ] as const) {
      payload = { ...fixtures[key], [field]: invalid };
      const entry = cases.find(entry => entry.key === key);
      assert.ok(entry);
      await assert.rejects(entry.run(), error => error instanceof Error, `${key}: invalid ${field} must remain rejected`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
