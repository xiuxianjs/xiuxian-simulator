import { gameFixture } from './framework/fixture';
import { logger } from 'alemonjs';
import { startTransportEvent } from '../src/utils/transportTiming';
import {registerHooks} from 'node:module';
import {parseRobotSpar} from '../src/api/bot/spar';
import {parseBackendScarecrow} from '../src/api/bot/scarecrow';
import {parseRobberyRecords} from '../src/api/bot/robbery-records';
import {parseRobotShaQi,parseBackendKillGodRanking,parseRobotKillGodTitleClaim} from '../src/api/bot/shaqi-queries';
import {parseBackendEnemies} from '../src/api/bot/queries';
import {parseRobotBountyPublish} from '../src/api/bot/bounty-actions';
import {parseRobotBountyList} from '../src/api/bot/bounty-queries';
import {parseBackendBountyAccept,parseRobotBountyClaim} from '../src/api/bot/bounty-actions';
import {parseBackendPlayerShopVisit} from '../src/api/bot/player-shop-visit-query';
import {parseBackendShopList,parseBackendShopRanking} from '../src/api/bot/shop-queries';
import {parseBackendOwnPlayerShop} from '../src/api/bot/player-shop-own';
import {parseRobotMarketSell} from '../src/api/bot/market-sell-query';
import {parseRobotMarketMessage,parseRobotMarketPurchase} from '../src/api/bot/market-robot-query';
import {parseRobotMarketBrowse} from '../src/api/bot/market-robot-query';
import {parseMyMarketListings} from '../src/api/bot/my-market-listings';
import {parseMarketCredibility} from '../src/api/bot/market-credibility';
import {parseBackendMarketTrades} from '../src/api/bot/queries';
import {parseBackendSecretRealmChallenge,parseBackendSecretRealmClaim} from '../src/api/bot/guild-secret-realm-war';
import {parseBackendSecretRealmHome,parseBackendSecretRealmList,parseBackendSecretRealmView} from '../src/api/bot/guild-secret-realm-war';
import {parseBackendTianshuContent} from '../src/api/bot/tianshu-content';
import {parseBackendTianshiBaoluPanel} from '../src/api/bot/tianshi-baolu-panel';
import {parseTianshiBaoluCommand} from '../src/api/bot/tianshi-baolu-command';
import {parseBackendMemories,parseBackendStory} from '../src/api/bot/queries';
import {parseRobotActivityHub} from '../src/api/bot/activity-hub';
import {parseBackendNewcomerLoginView} from '../src/api/bot/newcomer-login-queries';
import {parseRobotNewcomerTaskReward} from '../src/api/bot/newcomer-activity';
import {parseRobotGlossaryApply,parseRobotGlossaryUpsert,parseRobotGlossaryDelete} from '../src/api/bot/glossary-actions-robot';
import {parseQueryParams,parseCategoryParams,parseRobotGlossaryView} from '../src/api/bot/glossary-robot-query';
import {parseRobotFeedbackCompose} from '../src/api/bot/feedback-robot';
import {parseBackendFeedbacks,parseBackendFeedbackDetail} from '../src/api/bot/queries';
import {parseRobotActivityPoints,parseRobotActivityClaim,parseRobotActivityClaimAll} from '../src/api/bot/activity-points-robot';
import {ImageCache} from '../src/utils/imageCdn';
import {parseBackendRechargeRights} from '../src/api/bot/recharge-rights-queries';
import {parseBackendVipPrivileges} from '../src/api/bot/vip-privileges-queries';
import {parseRobotMonthCardClaim} from '../src/api/bot/membership-claim';
import {parseBackendTeamMatchSnapshot} from '../src/api/bot/team-match-queries';
import {parseBackendTeamMatchCancel} from '../src/api/bot/team-match-cancel';
import {parseBackendTeamMatchStart} from '../src/api/bot/team-match-start';
import {parseNativeComebackOverview,parseNativeComebackClaim} from '../src/api/bot/native-comeback';
import {referralBindArguments,parseRobotReferralBind,parseRobotReferralClaim} from '../src/api/bot/referral-actions-robot-query';
import {parseRobotReferralCode,referralRuleDecoder,referralInviteesArguments,referralInviteesDecoder} from '../src/api/bot/referral-robot-query';
import {giftCodeArguments,parseRobotGiftCode,parseRobotGiftHub} from '../src/api/bot/gift-code-robot-query';
import {emailActionArguments,emailDeleteDecoder,emailClaimDecoder,parseEmailDeleteAll,parseEmailClaimAll} from '../src/api/bot/email-actions-robot-query';
import {emailListArguments,emailDetailArguments,emailDetailDecoder,parseRobotEmailList,parseRobotEmailDetail} from '../src/api/bot/email-robot-query';
import { dungeonChallengeArguments, parseRobotDungeonChallenge } from '../src/api/bot/dungeon-challenge-robot-query';
import { dungeonSweepArguments, parseRobotDungeonSweep, parseRobotDungeonFreeSweep } from '../src/api/bot/dungeon-sweep-robot-query';
import { dungeonCatalogArguments, dungeonDetailArguments, parseRobotDungeonCatalog, parseRobotDungeonDetail } from '../src/api/bot/dungeon-robot-query';
import { demonTowerChallengeArguments, parseRobotDemonTowerChallenge } from '../src/api/bot/demon-tower-challenge-robot-query';
import { demonTowerBuffArguments, parseRobotDemonTowerBuff, parseReset, parseSweep } from '../src/api/bot/demon-tower-actions';
import { parseDemonTowerInfo } from '../src/api/bot/demon-tower-info-query';
import { parseTowerRanking } from '../src/api/bot/tower-ranking-queries';
import { worldBossChallengeArguments, parseRobotWorldBossChallenge } from '../src/api/bot/world-boss-challenge-robot-query';
import { parseWorldBossClaimAll } from '../src/api/bot/world-boss-claim';
import { parseRobotWorldBossInfo, parseRobotWorldBossRanking, parseRobotWorldBossRewards } from '../src/api/bot/world-boss-robot-query';
import { competitionChallengeArguments, parseRobotCompetitionChallenge } from '../src/api/bot/competition-challenge-robot-query';
import { parseRobotCompetitionReward } from '../src/api/bot/competition-reward-robot-query';
import { competitionBetArguments, parseRobotCompetitionBet } from '../src/api/bot/competition-bets-robot-query';
import { parseRobotCompetitionMemberAdd, competitionMemberAddArguments } from '../src/api/bot/competition-member-add-robot-query';
import { parseRobotCompetitionTeamAction, competitionRemoveArguments, competitionAdjustArguments } from '../src/api/bot/competition-team-robot-query';
import { parseCompetitionHome, parseCompetitionBattleDetail, parseCompetitionPromotionTeams } from '../src/api/bot/competition-read-projections';
import { parseCompetitionBattles } from '../src/api/bot/competition-battle-queries';
import { parseCompetitionBets } from '../src/api/bot/competition-bets-query';
import { parseBackendGuildCompetitionKnockoutCandidates } from '../src/api/bot/competition-knockout-candidates-query';
import { parseGuildStorylineChallenge, parseGuildStorylineHome } from '../src/api/bot/guild-storyline-actions';
import { parseGuildStorylineRecords } from '../src/api/bot/queries';
import { parseGuildWorkflow } from '../src/api/bot/guild-workflow';
import { guildRedPacketSendArguments, parseRobotGuildRedPacketSend } from '../src/api/bot/guild-red-packet-send-robot-query';
import { parseGuildRedPackets } from '../src/api/bot/guild-red-packets-queries';
import { parseGuildMyRedPackets } from '../src/api/bot/guild-my-red-packets-queries';
import { parseGuildRedPacketSettlement } from '../src/api/bot/guild-red-packet-mutations';
import { parseRobotGuildShop, parseRobotGuildShopExchange } from '../src/api/bot/guild-shop-robot-query';
import { parseGuildHome } from '../src/api/bot/guild-home-query';
import { parseRobotGuildList } from '../src/api/bot/guild-directory-robot-query';
import { parseRobotGuildTraining } from '../src/api/bot/guild-training-robot-query';
import { parseRobotGuildUpgrade } from '../src/api/bot/guild-upgrade-robot-query';
import type { GuildUpgradeKind } from '../src/api/bot/guild-upgrade';
import { parseRobotGuildDissolve, parseRobotGuildImpeach } from '../src/api/bot/guild-leadership-end-robot-query';
import { parseRobotGuildCreate, parseRobotGuildApply } from '../src/api/bot/guild-membership-robot-query';
import { parseRobotGuildKick } from '../src/api/bot/guild-kick-robot-query';
import { parseRobotGuildLeave, parseRobotGuildLeaderLeave } from '../src/api/bot/guild-leave-robot-query';
import { parseGuildLeaveCancel } from '../src/api/bot/guild-leave-confirmation-cancel';
import { parseRobotGuildRoleAppoint, parseRobotGuildRoleResign } from '../src/api/bot/guild-role-action-robot-query';
import { parseGuildRoleOptions } from '../src/api/bot/guild-role-options-queries';
import { parseGuildLeadershipTransfer } from '../src/api/bot/guild-member-lifecycle';
import { parseRobotGuildApplicationCancel, parseRobotGuildApplicationDecision } from '../src/api/bot/guild-application-robot-query';
import { parseGuildMembers } from '../src/api/bot/queries';
import { parseGuildReview } from '../src/api/bot/guild-review-queries';
import { parseGuildLogs } from '../src/api/bot/queries';
import { parseGuildApplications } from '../src/api/bot/guild-application-queries';
import { parseRobotGuildAutoRefresh, guildAutoRefreshArguments } from '../src/api/bot/guild-auto-refresh-robot-query';
import { parseRobotGuildSetting } from '../src/api/bot/guild-settings-robot-query';
import { parseRobotGuildContentAction, type GuildContentAction } from '../src/api/bot/guild-content-action-robot-query';
import { parseRobotGuildContent, parseRobotGuildEssences } from '../src/api/bot/guild-content-robot-query';
import { parseRobotGuildWorship, parseRobotGuildMining } from '../src/api/bot/guild-activity-robot-query';
import { parseRobotGuildMilestoneClaim, parseRobotGuildMilestonesClaimAll, parseRobotGuildStipend } from '../src/api/bot/guild-claims-robot-query';
import { parseRobotGuildCheckin, parseRobotGuildDaily, parseRobotGuildWeekly } from '../src/api/bot/guild-daily-robot-query';
import { parseRobotLimitedEventCheckin } from '../src/api/bot/limited-event-robot-query';
import { parseRobotDailyCheckIn, parseRobotNewcomerCheckIn, parseRobotCelestialCheckIn } from '../src/api/bot/signin-robot-query';
import { parseCheckInHub, parseRobotNewcomerLogin } from '../src/api/bot/checkin-robot-query';
import { parseRobotTianjiaoLeaderboard, parseRobotTianjiaoRewards, parseRobotTianjiaoChallenge } from '../src/api/bot/tianjiao-robot-query';
import { parseRobotTowerChallenge, parseRobotTowerBatch, parseRobotTowerSweep } from '../src/api/bot/ranking-robot-query';
import { parseRobotFirstClaim, parseRobotMonthlyClaim } from '../src/api/bot/ranking-robot-query';
import { parseRobotTowerOverview, parseRobotFirstRewards, parseRobotMonthlyRewards } from '../src/api/bot/ranking-robot-query';
import { parseMasterClaimTitle } from '../src/api/bot/master-actions';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import axios from 'axios';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { getEventMiddlewareEntry, middlewareInputFromEvent, parseRobotMiddlewareResult } from '../src/api/bot/middleware-entry';
import { getEventBackendRobotIdentity } from '../src/api/bot/identity';
import { getEventAccessFacts } from '../src/api/bot/access-facts';
import { getBackendHomeOverview } from '../src/api/bot/player-overview';
import type { HomeOverviewData } from '../src/api/schemas/player-overview';
import type { GameEvent } from '../src/types/event';
import router from '../src/router';
import aggregateMiddleware from '../src/response/mwMiddleware';
import { requestRobotBusiness, parseRobotBusinessEnvelope, parseRobotBusinessResult } from '../src/api/bot/robot-business';
import { validateBackendAchievementOverview } from '../src/api/bot/achievement-overview-query';
import { validateBackendAchievementCategoryProjection } from '../src/api/bot/achievement-category-projection';
import { validateBackendCombatPowerAchievements } from '../src/api/bot/combat-power-achievement-query';
import { validateBackendAchievements } from '../src/api/bot/queries';
import { validateBackendAchievementClaim } from '../src/api/bot/achievement-claim';
import { validateGuardedAchievement } from '../src/api/bot/achievement-robot-query';
import { validateRobotPreference, validateRobotSettingsOverview } from '../src/api/bot/settings-robot-query';
import { validateBackendThemes } from '../src/api/bot/theme-queries';
import { validateBackendActivatedTheme, validateBackendDeactivatedTheme } from '../src/api/bot/theme-state';
import { validateBackendInkMode } from '../src/api/bot/theme-ink-mode';
import { validateBackendPlayerProfileAction } from '../src/api/bot/player-profile-action';
import { parseBackendPublicPlayerProfile } from '../src/api/bot/public-player-profile-query';
import { resolveRobotTarget } from '../src/utils/targetUid';
import { parseBackendFriends, parseBackendFriendRequests, parseBackendBlocklist } from '../src/api/bot/queries';
import { parseGuardedSocialQuery, parseGuardedSocialAction } from '../src/api/bot/social-robot-query';
import { parseBackendFriendSettings } from '../src/api/bot/friend-settings';
import { parseBackendRandomFriend } from '../src/api/bot/random-friend-queries';

import { parseBackendFriendWorkflow } from '../src/api/bot/social-workflows';
import { parseBackendFriendMutation } from '../src/api/bot/friend-request-actions';
import { parseBackendFriendReject } from '../src/api/bot/friend-request-reject';
import { parseBackendBlockUser } from '../src/api/bot/block-user-by-name';
import { parseBackendUnblock } from '../src/api/bot/blocklist-removal';

import { parseBackendTeamInfo } from '../src/api/bot/team-info-queries';
import { parseBackendTeams, parseBackendTeamBattleRecords, parseBackendTeamBattleDetail, parseBackendTeamPendingApplications } from '../src/api/bot/queries';
import { parseBackendTeamWorkflow } from '../src/api/bot/social-workflows';
import { parseBackendTeamInvitationInbox } from '../src/api/bot/team-invitation-inbox';
import { parseTeamCreated, parseTeamApplicationStatus, parseTeamAcknowledgement, requireTeamObject, parseTeamTargetMutation } from '../src/api/bot/team-actions';
import { parseMasterInfo } from '../src/api/bot/master-info-queries';
import { parseMasterRanking } from '../src/api/bot/queries';
import { parseMasterLineage } from '../src/api/bot/master-lineage-queries';
import { parseMasterTargetAction } from '../src/api/bot/master-actions';
import { parseMasterDecision } from '../src/api/bot/master-actions';
import { parseMasterAction } from '../src/api/bot/master-actions';
import { parseTeamRealmUpdate } from '../src/api/bot/team-realm-update';
import { parseRobotTeamApplicationCancel } from '../src/api/bot/team-application-cancel-result';

const event = (text = '/我的资料'): GameEvent => ({ name: 'message.create', UserId: 'player', MessageId: 'event-1', MessageText: text,
  Platform: 'onebot', BotId: 'bot', ChannelId: 'group', Target: { scope: 'group', targetId: 'group' } }) as GameEvent;
const receipt = 'a'.repeat(64);
const allowed = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } },
  replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: true, nativeComebackProcessed: false }, resourceSettlement: receipt };
const combinedEntry = { ...allowed, resourceSettlement: undefined };
const resource = { current: 10, cap: 100, regenIntervalMinutes: 5 };
const access = Object.fromEntries(['canUseSecondLayerFeature', 'canUseFifthLayerFeature', 'canUseSpar', 'canUseMeridian', 'canUseProfessionAndCave', 'canUseSoulArtifact', 'canUseSoulPath', 'canAdvanceSoulArtifact', 'canJoinAlchemyGuide', 'canUseRobberyLikePvp', 'canJoinMasterAsDisciple', 'canAcceptDisciple'].map(key => [key, true]));
const overview = {
  profile: { found: true, user: { id: 1, name: '测试', gender: 1, signature: '', experience: 10, qiValue: 10, mentalValue: 10, realmId: 1, createdAt: null, lastCheckInTime: null }, realm: null, title: null, themeConfig: null, foundationPrefix: null, mental: resource, qi: resource, access, homeView: { realmName: '炼气', experienceText: '10', qiRecoverText: '恢复中', mentalRecoverText: '恢复中', isEarlyStarter: false }, isNewcomer: false, canStoreGreenBottle: false, absenceDays: null, combatPower: 20 },
  notifications: [], atmosphere: { text: '原服务端文案', kind: 'ambience' }
} as HomeOverviewData;
const business = { success: true, branch: 'business', middleware: combinedEntry, data: overview };
const rejected = { success: false, branch: 'middleware', middleware: { ...combinedEntry, outcome: 'reject', reason: 'MUTED', entry: undefined } };
const muted = { ...rejected, success: true, middleware: { ...rejected.middleware, mute: { muted: true, claimed: false, muteUnlockTime: '明日' } } };
const handled = { success: true, branch: 'middleware', middleware: { ...combinedEntry, outcome: 'handled', reason: 'GUIDE', entry: undefined } };
type Call = { url: string; data?: string; headers: Record<string, string> };
const response = (data: unknown, status = 200) => ({ status, headers: {}, data: JSON.stringify(status === 200 ? { data } : { error: { code: 'NOT_FOUND', message: 'missing' } }) });
function transport(t: TestContext, answer: (call: Call) => object) {
  mockBackendConfig(t, { api_url: 'https://middleware.test', robot_auth_token: 'token' });
  const calls: Call[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (call: Call) => { calls.push(call); return answer(call); } }));
  return calls;
}

async function dispatchRouterEvent(e: GameEvent, next: () => Promise<void>, start = 2) {
  const run = async (index: number): Promise<void> => {
    if (index >= router.current.length) {
      return next();
    }
    const value = await router.current[index].handler();
    const handler = typeof value === 'function' ? value : value.current;
    let downstream: Promise<void> | undefined;
    const parentNext = () => { downstream = run(index + 1); return downstream; };
    await withEventContext(e, parentNext, () => handler(e, parentNext));
    await downstream;
  };
  // The first two regular handlers are task entries. The existing local
  // compatibility entry precedes the original public/business route scope.
  await run(start);
}

test('public routes stay public; matched home refusal uses one combined API and stops', async t => {
  const calls = transport(t, () => response(rejected));
  const publicEvent = event('/天书 参数');
  await dispatchRouterEvent(publicEvent, async () => { throw new Error('public escaped'); });
  assert.equal(calls.length, 0);
  const e = event();
  await dispatchRouterEvent(e, async () => { throw new Error('refusal called next'); });
  assert.equal(e.__res, undefined);
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/v2/robot/home-overview']);
  assert.equal(JSON.parse(calls[0].data!).messageText, e.MessageText);
  assert.ok(calls[0].headers['idempotency-key']);
});

test('all home aliases use one combined API; only handled middleware reaches parent res', async t => {
  let result: unknown = business;
  const calls = transport(t, () => response(result));
  for (const text of ['/我', '/我的资料', '/我的信息', '/我的编号', '/我的控制台', '/个人信息', '/个人资料', '/个人编号', '/个人控制台']) {
    const e = event(text);
    await dispatchRouterEvent(e, async () => { throw new Error('business escaped'); });
    assert.equal(e.__res, undefined);
    assert.equal(e.uid, 1);
  }
  assert.equal(calls.length, 9);
  result = muted;
  const mutedEvent = event();
  await dispatchRouterEvent(mutedEvent, async () => { throw new Error('mute escaped parent fallback'); });
  assert.equal(mutedEvent.__res, undefined);
  result = handled;
  const e = event();
  await dispatchRouterEvent(e, async () => { throw new Error('fallback escaped into legacy admission'); });
  assert.equal(e.__res, undefined, 'parent fallback must consume the branch');
  assert.equal(calls.length, 11);
  assert.ok(calls.every(call => call.url.endsWith('/robot/home-overview')));
});

test('unregistered result clears stale UID and reaches the original welcome fallback', async t => {
  const calls = transport(t, () => response({ success: true, branch: 'middleware', middleware: {
    outcome: 'allow', reason: 'UNREGISTERED', identity: { bid: 'player', account: { status: 'unregistered', playerId: null } },
    replies: [],
    contextWarnings: []
  } }));
  const e = { ...event(), uid: 99 };
  await dispatchRouterEvent(e, async () => { throw new Error('unregistered called next'); });
  assert.equal(e.uid, undefined);
  assert.equal(e.__res, undefined);
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/v2/robot/home-overview']);
});

test('actual merged Go HTTP response passes the robot parser without a settlement receipt', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessHTTPHomeReplayRejectAndAuth$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const match = output.match(/ROBOT_HOME_RESPONSE=(.+)/);
  assert.ok(match, 'Go combined home response missing');
  const result = parseRobotBusinessResult(JSON.parse(match[1]).data, 'player');
  assert.equal(result.success, true);
  assert.equal(result.branch, 'business');
  if (result.success && result.branch === 'business') {
    assert.equal(result.data.profile.user?.id, 1);
    assert.equal(result.middleware.entry?.resourcesSettled, true);
    assert.equal(result.middleware.resourceSettlement, undefined);
  }
});

test('combined result rejects contradictory branches and forged business identities', () => {
  assert.equal(parseRobotBusinessResult(business, 'player').branch, 'business');
  assert.equal(parseRobotBusinessResult(handled, 'player').branch, 'middleware');
  for (const invalid of [
    { ...business, branch: 'middleware' },
    { ...business, success: false },
    { ...handled, data: overview },
    { ...business, middleware: allowed },
    { ...business, data: { ...overview, profile: { ...overview.profile, user: { ...overview.profile.user, id: 2 } } } }
  ]) {
    assert.throws(() => parseRobotBusinessResult(invalid, 'player'));
  }
});

test('shared business envelope validates domain data only after admission allows business', () => {
  let decoded = 0;
  const decode = (data: unknown, uid: number) => {
    decoded++;
    assert.equal(uid, 1);
    assert.deepEqual(data, { items: ['example'] });
    return { items: ['example'], uid };
  };
  const result = parseRobotBusinessEnvelope({ ...business, data: { items: ['example'] } }, 'player', decode);
  assert.equal(result.success, true);
  if (result.success && result.branch === 'business') {
    assert.deepEqual(result.data, { items: ['example'], uid: 1 });
  }
  assert.equal(parseRobotBusinessEnvelope(rejected, 'player', decode).success, false);
  assert.equal(parseRobotBusinessEnvelope({ ...business, success: false, data: undefined }, 'player', decode).success, false);
  assert.equal(parseRobotBusinessEnvelope(muted, 'player', decode).branch, 'middleware');
  assert.equal(parseRobotBusinessEnvelope(handled, 'player', decode).branch, 'middleware');
  assert.equal(decoded, 1, 'rejected and middleware branches must not evaluate business data');
  assert.throws(() => parseRobotBusinessEnvelope({ ...business, data: undefined }, 'player', decode));
  for (const middleware of [
    { ...muted.middleware, mute: { muted: true, claimed: 'true', muteUnlockTime: '明日' } },
    { ...handled.middleware, guide: { action: 'step-3', presentation: { title: '引导', text: '正文' } } },
    { ...combinedEntry, entry: { ...combinedEntry.entry, maintenance: { disabled: false, reason: {} } } }
  ]) {
    assert.throws(() => parseRobotBusinessEnvelope({ ...muted, middleware }, 'player', decode));
  }
});

test('the existing router middleware is local and makes no game request', async t => {
  const calls = transport(t, () => { throw new Error('local middleware requested the backend'); });
  const e = event();
  let continued = 0;
  await withEventContext(e, () => {}, async () => {
    await aggregateMiddleware.current(e, async () => { continued++; });
  });
  assert.equal(continued, 1);
  assert.equal(calls.length, 0);
  assert.equal(e.uid, undefined);
});

test('explicit legacy API callers retain their identity and settlement contract', async t => {
  const calls = transport(t, call => response(call.url.endsWith('/middleware-entry') ? allowed : overview));
  const e = event();
  await withEventContext(e, () => {}, async () => {
      const [one, two] = await Promise.all([getEventMiddlewareEntry(e), getEventMiddlewareEntry(e)]);
      assert.equal(one, two);
      assert.equal((await getEventBackendRobotIdentity(e)).account.playerId, 1);
      assert.equal(e.uid, 1);
      assert.equal(getEventAccessFacts(e, 'player', 1)?.resourceSettlement, receipt);
      assert.deepEqual(await getBackendHomeOverview('player', e.uid), overview);
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/v1/robot/middleware-entry', '/api/v1/players/1/home-overview']);
  assert.equal(calls[1].headers['x-command-resource-receipt'], receipt);
  assert.deepEqual(JSON.parse(calls[0].data!), { messageText: '/我的资料', platform: 'onebot', botId: 'bot', channelId: 'group' });
  assert.ok(calls[0].headers['idempotency-key']);
});

test('original title routes use one combined request and only a handled branch calls parent next', async t => {
  const rows = [
    { text: '/我的称号', operation: 'titles.overview', args: {}, data: { moodText: '原心绪', titles: [] } },
    { text: '/佩戴称号 101', operation: 'titles.activate', args: { titleId: 101 }, data: { id: 101, title: '青云', isActive: true } },
    { text: '/卸下称号', operation: 'titles.deactivate', args: {}, data: { removed: true } }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'reject', 'muted', 'handled'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'reject' ? rejected : mode === 'muted' ? muted : handled;
      const e = { ...event(row.text), uid: 999 };
      await dispatchRouterEvent(e, async () => { throw new Error('title escaped the parent fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(e.uid, 1, `${row.text}/${mode}: ${JSON.stringify(calls)}`);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.operation}`]);
      const body = JSON.parse(calls[0].data!);
      assert.deepEqual(body.arguments, row.args);
      assert.equal(body.messageText, row.text);
      assert.equal(body.uid, undefined);
      assert.ok(calls[0].headers['idempotency-key']);
    }
  }
});

test('all achievement routes combine identity, access and business in one request', async t => {
  const access = { canUseFifthLayerFeature: true, realmName: '炼气五层' };
  const pagination = { currentPage: 2, totalPages: 2, total: 6 };
  const claim = { claimedCount: 1, claimed: [{ category: 'combat_power', categoryLabel: '战力', achievementName: '初境', issued: [] }] };
  const rows = [
    { text: '/成就', operation: 'achievements.overview', args: {}, data: { access, summary: { totalAchievements: 0, completedAchievements: 0, completionRate: 0 }, categories: [], totalClaimable: 0, canClaimAll: false } },
    { text: '/成就 主线', operation: 'achievements.category', args: { keyword: '主线' }, data: { access, validCategory: true, category: 'storyline', label: '主线', total: 0, completed: 0, claimableCount: 0, items: [] } },
    { text: '/所有成就 2', operation: 'achievements.all', args: { page: 2, pageSize: 5 }, data: { items: [], page: pagination } },
    { text: '/我的成就 2', operation: 'achievements.completed', args: { page: 2, pageSize: 5 }, data: { access, data: { items: [], page: pagination } } },
    { text: '/成就 战力', operation: 'achievements.combat-power', args: {}, data: { access, data: { currentPower: 0, totalCount: 0, completedCount: 0, claimableCount: 0, allCompleted: true, currentClaimable: null, nextTarget: null, items: [] } } },
    { text: '/成就 战力 领取', operation: 'achievements.claim-combat-power', args: {}, data: { access, data: claim } },
    { text: '/成就 战力 一键领取', operation: 'achievements.claim-combat-power', args: {}, data: { access, data: claim } },
    { text: '/一键领取成就', operation: 'achievements.claim-all', args: {}, data: { access, data: claim } },
    { text: '/成就 一键领取', operation: 'achievements.claim-all', args: {}, data: { access, data: claim } }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = { ...event(row.text), uid: 999 };
      await dispatchRouterEvent(e, async () => { throw new Error('achievement escaped parent fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(e.uid, 1, `${row.text}/${mode}: ${JSON.stringify(calls)}`);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.operation}`], `${row.text}/${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
    if ('access' in row.data && 'data' in row.data) {
      calls.length = 0;
      answer = { ...business, data: { access: { canUseFifthLayerFeature: false, realmName: '炼气四层' }, data: null } };
      await dispatchRouterEvent(event(row.text), async () => { throw new Error('locked achievement escaped'); });
      assert.equal(calls.length, 1);
    }
  }
});

test('actual Go achievement responses pass their robot business decoders', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessAchievementsAdmissionAccessAndClaims$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const decoders: Record<string, (value: unknown) => unknown> = {
    'achievements.overview': validateBackendAchievementOverview,
    'achievements.category': validateBackendAchievementCategoryProjection,
    'achievements.all': value => validateBackendAchievements(value, false),
    'achievements.completed': value => validateGuardedAchievement(value, value => validateBackendAchievements(value, true)),
    'achievements.combat-power': value => validateGuardedAchievement(value, validateBackendCombatPowerAchievements),
    'achievements.claim-all': value => validateGuardedAchievement(value, validateBackendAchievementClaim),
    'achievements.claim-combat-power': value => validateGuardedAchievement(value, validateBackendAchievementClaim)
  };
  const seen = new Set<string>();
  for (const match of output.matchAll(/ROBOT_ACHIEVEMENT_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const result = parseRobotBusinessEnvelope(JSON.parse(match[3]).data, match[2], decoders[match[1]]);
    if (result.branch === 'business') seen.add(match[1]);
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
});

const settingsPreferences = { dungeonBattleMode: 'auto', teamDungeonNoMental: false, autoApproveFriendTeam: false, hideProfile: false,
  confirmSpiritCrystal: 0, confirmDaoCrystal: 0, teamInviteEnabled: true, teamAutoAcceptInvite: 'none' };

test('all settings commands use one business request without a prefilled UID', async t => {
  const overview = { preferences: settingsPreferences, subscription: null, groupSnapshot: null };
  const rows = [
    { text: '/我的设置', operation: 'settings.overview', args: { includeGroup: true }, data: overview },
    { text: '/群订阅', operation: 'settings.overview', args: { includeGroup: true }, data: overview },
    { text: '/配置灵晶确认', operation: 'settings.overview', args: { includeGroup: false }, data: overview },
    { text: '/配置道晶确认', operation: 'settings.overview', args: { includeGroup: false }, data: overview },
    { text: '/配置灵晶确认 0', operation: 'settings.spirit-crystal-confirmation', args: { value: 0 }, data: { confirmSpiritCrystal: 0 } },
    { text: '/配置道晶确认 10000', operation: 'settings.dao-crystal-confirmation', args: { value: 10000 }, data: { confirmDaoCrystal: 10000 } },
    { text: '/配置灵晶确认 ' + '9'.repeat(400), operation: 'settings.spirit-crystal-confirmation', args: { value: null }, data: { confirmSpiritCrystal: null } },
    { text: '/配置秘境模式 手动', operation: 'settings.dungeon-battle-mode', args: { value: 'manual' }, data: { dungeonBattleMode: 'manual' } },
    { text: '/配置自动同意队伍邀请 仅好友', operation: 'settings.team-auto-accept-invite', args: { value: 'friend' }, data: { teamAutoAcceptInvite: 'friend' } },
    { text: '/配置组队精力 不消耗', operation: 'settings.team-dungeon-energy', args: { value: true }, data: { teamDungeonNoMental: true } },
    { text: '/配置好友自动审批进队 开启', operation: 'settings.friend-team-approval', args: { value: true }, data: { autoApproveFriendTeam: true } },
    { text: '/配置接受队伍邀请 关闭', operation: 'settings.team-invites', args: { value: false }, data: { teamInviteEnabled: false } },
    { text: '/配置信息隐藏 开启', operation: 'settings.hide-profile', args: { value: true }, data: { hideProfile: true } }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('settings escaped parent fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(e.uid, 1, row.text);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.operation}`], row.text);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  calls.length = 0;
  answer = { ...business, data: overview };
  const privateEvent = { ...event('/我的设置'), name: 'private.message.create' } as GameEvent;
  await dispatchRouterEvent(privateEvent, async () => { throw new Error('private settings escaped'); });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments, { includeGroup: false });
});

test('QQ group settings consumes supplied state without worker cache or platform probes', async t => {
  mockBackendConfig(t, { api_url: 'https://middleware.test', robot_auth_token: 'token', worker_token: 'worker' });
  let requests = 0;
  let workerRequests = 0;
  let clients = 0;
  t.mock.method(axios, 'create', () => {
    clients++;
    return {
      request: async () => {
        requests++;
        return response({ ...business, data: { preferences: settingsPreferences, subscription: null,
          groupSnapshot: { permission: { state: 'blocked', source: 'event', updatedAt: 1000 }, availability: null,
            member: { available: false, updatedAt: 1000 }, acquired: false, previous: '' } } });
      },
      post: async () => { workerRequests++; throw new Error('settings made a second cache request'); }
    };
  });
  const e = { ...event('/我的设置'), Platform: 'qq-bot' };
  await dispatchRouterEvent(e, async () => { throw new Error('QQ settings escaped'); });
  assert.equal(requests, 1);
  assert.equal(workerRequests, 0);
  assert.equal(clients, 1);
});

test('real Go settings receipts pass robot decoders for every action', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessSettingsIdentityMergeAndSnapshot$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const fields: Record<string, string> = { 'settings.hide-profile': 'hideProfile', 'settings.friend-team-approval': 'autoApproveFriendTeam',
    'settings.team-invites': 'teamInviteEnabled', 'settings.team-dungeon-energy': 'teamDungeonNoMental', 'settings.meditation-auto-boost': 'meditationAutoBoost',
    'settings.dungeon-battle-mode': 'dungeonBattleMode', 'settings.team-auto-accept-invite': 'teamAutoAcceptInvite',
    'settings.spirit-crystal-confirmation': 'confirmSpiritCrystal', 'settings.dao-crystal-confirmation': 'confirmDaoCrystal' };
  const seen = new Set<string>();
  for (const match of output.matchAll(/ROBOT_SETTINGS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const raw = JSON.parse(match[3]).data;
    const result = parseRobotBusinessEnvelope(raw, match[2], data => match[1] === 'settings.overview' ? validateRobotSettingsOverview(data) :
      validateRobotPreference(data, fields[match[1]], raw.data[fields[match[1]]], { operation: match[1] }));
    if (result.branch === 'business') seen.add(match[1]);
  }
  assert.deepEqual([...seen].sort(), [...Object.keys(fields), 'settings.overview'].sort());
  assert.throws(() => validateRobotSettingsOverview({ preferences: settingsPreferences, subscription: null }));
  assert.throws(() => validateRobotPreference({ hideProfile: 'true' }, 'hideProfile', true, {}));
});

test('real HTTP title transport sends one request per original route and never returns to old admission', async t => {
  const paths: string[] = [];
  let refused = false;
  const server = createServer(async (req, res) => {
    paths.push(req.url!);
    for await (const _chunk of req) { /* Count actual HTTP requests. */ }
    const data = req.url!.endsWith('titles.overview') ? { moodText: '原心绪', titles: [] }
      : req.url!.endsWith('titles.activate') ? { id: 101, title: '青云', isActive: true } : { removed: true };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: refused ? rejected : { ...business, data } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'test-token' });
  for (const text of ['/我的称号', '/佩戴称号 101', '/卸下称号']) {
    for (const reject of [false, true]) {
      refused = reject;
      paths.length = 0;
      await dispatchRouterEvent(event(text), async () => { throw new Error('title called next on a terminal branch'); });
      assert.equal(paths.length, 1);
      assert.match(paths[0], /^\/api\/v2\/robot\/business\/titles\./);
    }
  }
});

test('middleware errors and malformed replies never retry or call a compatibility endpoint', async t => {
  let status = 404;
  let data: unknown = allowed;
  const calls = transport(t, () => response(data, status));
  for (const nextStatus of [404, 501, 503]) {
    status = nextStatus;
    const e = event();
    await assert.rejects(getEventMiddlewareEntry(e));
    await assert.rejects(getEventMiddlewareEntry(e));
  }
  status = 200;
  data = { ...allowed, replies: [{ text: 'incomplete' }] };
  const e = event();
  await assert.rejects(getEventMiddlewareEntry(e), /响应不完整/);
  await assert.rejects(getEventMiddlewareEntry(e), /响应不完整/);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.url.endsWith('/robot/middleware-entry')));
  const noId = { ...event(), MessageId: '' } as GameEvent;
  await assert.rejects(getEventMiddlewareEntry(noId), /缺少唯一标识/);
  assert.equal(calls.length, 4);
});

test('private addresses travel in the aggregate body and result identity cannot be forged', () => {
  const e = { ...event(), name: 'private.message.create', ChannelId: undefined, Target: { BotId: 'private-bot', scope: 'direct', targetId: 'private-id' } } as GameEvent;
  assert.deepEqual(middlewareInputFromEvent(e), { messageText: '/我的资料', platform: 'onebot', botId: 'private-bot', privateTarget: { platform: 'onebot', BotId: 'private-bot', scope: 'direct', targetId: 'private-id' } });
  assert.throws(() => parseRobotMiddlewareResult({ ...allowed, identity: { bid: 'other', account: { status: 'registered', playerId: 1 } } }, 'player'), /响应不完整/);
  assert.throws(() => parseRobotMiddlewareResult({ ...allowed, outcome: '__proto__' }, 'player'), /响应不完整/);
  assert.throws(() => parseRobotMiddlewareResult({ ...allowed, resourceSettlement: undefined }, 'player'), /响应不完整/);
  assert.equal(parseRobotMiddlewareResult({ outcome: 'allow', reason: 'UNREGISTERED', identity: { bid: 'player', account: { status: 'unregistered', playerId: null } }, replies: [], contextWarnings: [] }, 'player').outcome, 'allow');
});


test('real HTTP home transport uses one request on success and stops on refusal or handled branch', async t => {
  const paths: string[] = [];
  let result: unknown = business;
  const server = createServer(async (req, res) => {
    paths.push(req.url!);
    for await (const _chunk of req) { /* Drain actual request. */ }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: result }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'test-token' });
  for (const branch of [business, rejected, muted, handled]) {
    result = branch;
    paths.length = 0;
    await dispatchRouterEvent(event(), async () => { throw new Error('combined branch escaped'); });
    assert.deepEqual(paths, ['/api/v2/robot/home-overview']);
  }
});

test('actual router never retries or calls another game API on combined transport failure', async t => {
  type Failure = 'unavailable' | 'invalid-json' | 'disconnect' | 'redirect' | 'invalid-data';
  let failure: Failure = 'unavailable';
  const paths: string[] = [];
  const server = createServer(async (req, res) => {
    paths.push(req.url!);
    for await (const _chunk of req) { /* Count actual received requests. */ }
    if (failure === 'disconnect') { req.socket.destroy(); return; }
    if (failure === 'redirect') {
      res.statusCode = 307;
      res.setHeader('Location', '/unexpected-follow-up');
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    if (failure === 'invalid-json') { res.end('{broken'); return; }
    if (failure === 'invalid-data') { res.end(JSON.stringify({ data: { ...business, data: {} } })); return; }
    res.statusCode = 503;
    res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'test unavailable' } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'test-token' });
  for (const mode of ['unavailable', 'invalid-json', 'disconnect', 'redirect', 'invalid-data'] as const) {
    failure = mode;
    paths.length = 0;
    for (const [text, path] of [
      ['/我的资料', '/api/v2/robot/home-overview'],
      ['/邀请码', '/api/v2/robot/business/referral.code'],
      ['/邀请人数奖励', '/api/v2/robot/business/referral.rules-count'],
      ['/邀请境界奖励', '/api/v2/robot/business/referral.rules-realm'],
      ['/邀请VIP奖励', '/api/v2/robot/business/referral.rules-vip'],
      ['/我的邀请', '/api/v2/robot/business/referral.invitees'],
      ['/绑定邀请码 tt-2', '/api/v2/robot/business/referral.bind'],
      ['/领取邀请奖励', '/api/v2/robot/business/referral.claim'],
      ['/回归奖励', '/api/v2/robot/business/native-comeback.overview'],
      ['/领取回归奖励', '/api/v2/robot/business/native-comeback.claim'],
      ['/匹配状态', '/api/v2/robot/business/team-match.snapshot'],
      ['/取消匹配', '/api/v2/robot/business/team-match.cancel'],
      ['/匹配主线 7-3', '/api/v2/robot/business/team-match.start-mainline'],
      ['/匹配秘境 5', '/api/v2/robot/business/team-match.start-dungeon'],
      ['/我的权益', '/api/v2/robot/business/membership.rights'],
      ['/我的特权', '/api/v2/robot/business/membership.privileges'],
      ['/一键领取月卡', '/api/v2/robot/business/membership.claim-month-card'],
      ['/交易上架','/api/v2/robot/business/market.sell'],
      ['/交易上架 道具 丹药','/api/v2/robot/business/market.sell'],
      ['/交易上架 道具 2 2 20','/api/v2/robot/business/market.sell'],
      ['/选购','/api/v2/robot/business/market.purchase'],
      ['/选购 10 2 确认','/api/v2/robot/business/market.purchase'],
      ['/交易下架','/api/v2/robot/business/market.cancel'],
      ['/交易下架 20','/api/v2/robot/business/market.cancel'],
      ['/珍宝楼','/api/v2/robot/business/market.browse'],
      ['/珍宝楼 搜索','/api/v2/robot/business/market.browse'],
      ['/我的上架','/api/v2/robot/business/market.my-listings'],
      ['/我的交易记录','/api/v2/robot/business/market.records'],
      ['/信誉分','/api/v2/robot/business/market.credibility'],
      ['/灵脉攻防战挑战 1 1','/api/v2/robot/business/secret-realm.challenge'],
      ['/灵脉攻防战领取奖励','/api/v2/robot/business/secret-realm.claim'],
      ['/灵脉攻防战','/api/v2/robot/business/secret-realm.home'],
      ['/灵脉攻防战列表','/api/v2/robot/business/secret-realm.list'],
      ['/灵脉攻防战查看 1','/api/v2/robot/business/secret-realm.view'],
      ['/天书','/api/v2/robot/business/tianshu.content'],
      ['/天师宝录','/api/v2/robot/business/tianshi-baolu.panel'],
      ['/我的故事','/api/v2/robot/business/personal-history.story'],
      ['/我的回忆','/api/v2/robot/business/personal-history.memories'],
      ['/我的活动','/api/v2/robot/business/activity.hub'],
      ['/新人狂欢','/api/v2/robot/business/newcomer-activity.overview'],
      ['/新人任务领取 21','/api/v2/robot/business/newcomer-activity.claim-task'],
      ['/申请词典编辑权限','/api/v2/robot/business/glossary.apply'],
      ['/录入词典 灵石 内容','/api/v2/robot/business/glossary.upsert'],
      ['/删除词典 灵石','/api/v2/robot/business/glossary.delete'],
      ['/词典','/api/v2/robot/business/glossary.query'],
      ['/词典分类 道具','/api/v2/robot/business/glossary.category'],
      ['/提交反馈','/api/v2/robot/business/feedback.compose'],
      ['/查看反馈 1','/api/v2/robot/business/feedback.detail'],
      ['/我的反馈','/api/v2/robot/business/feedback.mine'],
      ['/日常活跃','/api/v2/robot/business/activity-points.daily'],
      ['/周常活跃','/api/v2/robot/business/activity-points.weekly'],
      ['/领取日常活跃奖励 10','/api/v2/robot/business/activity-points.claim-daily'],
      ['/领取周常活跃奖励 10','/api/v2/robot/business/activity-points.claim-weekly'],
      ['/一键领取日常活跃奖励','/api/v2/robot/business/activity-points.claim-all-daily'],
      ['/一键领取周常活跃奖励','/api/v2/robot/business/activity-points.claim-all-weekly']
    ]) {
      paths.length = 0;
      const e = { ...event(text), MessageId: `bound-${mode}-${text}` };
      if (path.includes('/glossary.') || path.includes('/encyclopedia.') || path.endsWith('/activity.hub')) { await assert.rejects(() => dispatchRouterEvent(e, async () => { throw new Error('failure called next'); })); }
      else { await dispatchRouterEvent(e, async () => { throw new Error('failure called next'); }); }
      assert.equal(e.__res, undefined);
      assert.deepEqual(paths, [path], `${mode}: ${text}`);
    }
  }
});


test('robot home and combined business always call V2', async t => {
  mockBackendConfig(t, { api_url: 'https://middleware.test', robot_auth_token: 'token' });
  const calls = transport(t, call => response(call.url.endsWith('/home-overview')
    ? business
    : { ...business, data: { id: 101, title: '青云', isActive: true } }));
  await dispatchRouterEvent(event('/我的资料'), async () => { throw new Error('business escaped'); });
  await dispatchRouterEvent(event('/佩戴称号 101'), async () => { throw new Error('business escaped'); });
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), [
    '/api/v2/robot/home-overview',
    '/api/v2/robot/business/titles.activate'
  ]);
  assert.deepEqual(JSON.parse(calls[1].data!).arguments, { titleId: 101 });
});

test('theme routes directly consume one v2 API with every middleware branch', async t => {
  const list = { themes: [{ id: 12, name: '青云', source: 'system', config: '{"inkMode":"dark"}', isActive: true, sortOrder: 0 }],
    permission: { canCustomEdit: false, maxCustomSlots: 3 } };
  const rows = [
    { text: '/我的主题', operation: 'themes.overview', args: {}, data: list },
    { text: '/切换主题 12', operation: 'themes.activate', args: { themeId: 12 }, data: { outcome: 'activated', id: 12, name: '青云' } },
    { text: '/切换主题 1000000000000000000000', operation: 'themes.activate', args: { themeId: 1e21 }, data: { outcome: 'not_found', id: null, name: null } },
    { text: '/关闭主题', operation: 'themes.deactivate', args: {}, data: { removed: true } },
    { text: '/切换墨色模式 宣纸水墨', operation: 'themes.ink-mode', args: { mode: 'ink' }, data: { code: 'OK', mode: 'ink' } },
    { text: '/切换墨色模式 深底暗黑', operation: 'themes.ink-mode', args: { mode: 'dark' }, data: { code: 'NO_ACTIVE_THEME', mode: 'dark' } }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('theme escaped parent fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.operation}`]);
      const body = JSON.parse(calls[0].data!);
      assert.deepEqual(body.arguments, row.args);
      assert.equal(body.uid, undefined);
      assert.ok(calls[0].headers['idempotency-key']);
    }
  }
  for (const text of ['/切换主题', '/切换主题 0', '/切换墨色模式 不存在']) {
    calls.length = 0;
    await dispatchRouterEvent(event(text), async () => { throw new Error('invalid theme escaped'); });
    assert.equal(calls.length, 0, text);
  }
});

test('real combined Go theme results pass the same pure decoders as v1', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessThemesOwnershipReplayAndAdmission$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  for (const match of output.matchAll(/ROBOT_THEME_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const args = JSON.parse(match[2]);
    const raw = JSON.parse(match[3]).data;
    const result = parseRobotBusinessEnvelope(raw, raw.middleware.identity.bid, data => {
      if (match[1] === 'themes.overview') return validateBackendThemes(data);
      if (match[1] === 'themes.activate') return validateBackendActivatedTheme(data, args.themeId);
      if (match[1] === 'themes.deactivate') return validateBackendDeactivatedTheme(data);
      return validateBackendInkMode(data, args.mode);
    });
    if (result.branch === 'business') seen.add(match[1]);
  }
  assert.deepEqual([...seen].sort(), ['themes.activate', 'themes.deactivate', 'themes.ink-mode', 'themes.overview']);
});


test('profile edits use one API including business refusal feedback without a repeat-record request', async t => {
  const rows = [
    { text: '/改名 青云', action: 'rename', value: '青云', cleared: false },
    { text: '/改名', action: 'rename', value: '', cleared: false },
    { text: '/改名 a\nb', action: 'rename', value: 'a\nb', cleared: false },
    { text: '/改名 a b', action: 'rename', value: 'a b', cleared: false },
    { text: '/改性', action: 'gender', value: '', cleared: false },
    { text: '/改性 invalid', action: 'gender', value: 'invalid', cleared: false },
    { text: '/改性 男 女', action: 'gender', value: '男 女', cleared: false },
    { text: '/改性 male', action: 'gender', value: '男', cleared: false },
    { text: '/改性 female', action: 'gender', value: '女', cleared: false },
    { text: '/改性 女', action: 'gender', value: '女', cleared: false },
    { text: '/改签名 晴空', action: 'signature', value: '晴空', cleared: false },
    { text: '/改签名', action: 'signature', value: '', cleared: true }
  ];
  const feedback = { ...business, success: false, data: undefined, middleware: { ...combinedEntry,
    replies: [{ title: '', heading: '', text: '数量不足', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'failure', 'muted', 'handled', 'reject'] as const) {
      if (mode === 'business' && ['', 'a b', 'a\nb', 'invalid', '男 女'].includes(row.value) && row.action !== 'signature') continue;
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: { action: row.action, value: row.value, cleared: row.cleared } } :
        mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('profile escaped fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(calls.length, 1, row.text + ':' + mode);
      assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/profile.${row.action}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, { value: row.value });
    }
  }
});

test('real Go profile results retain false/business and successful action receipts', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessProfileActionsFeedbackReplayAndStock$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_PROFILE_ACTION_RESPONSE=([^|]+)\|(.+)/g)) {
    const raw = JSON.parse(match[2]).data;
    const action = match[1].slice('profile.'.length) as 'rename' | 'gender' | 'signature';
    const result = parseRobotBusinessEnvelope(raw, raw.middleware.identity.bid, data => validateBackendPlayerProfileAction(data, action));
    if (result.success && result.branch === 'business') seen.add(action);
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), ['gender', 'rename', 'signature']);
  assert.ok(failures >= 8);
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  let validationCases = 0;
  for (const match of output.matchAll(/ROBOT_PROFILE_VALIDATION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    answer = JSON.parse(match[3]).data;
    const { value } = JSON.parse(match[2]);
    const command = match[1] === 'profile.rename' ? '改名' : match[1] === 'profile.gender' ? '改性' : '改签名';
    calls.length = 0;
    const e = event('/' + command + (value ? ' ' + value : ''));
    await dispatchRouterEvent(e, async () => { throw new Error('profile validation must end without next'); });
    assert.equal(calls.length, 1, e.MessageText);
    assert.equal(new URL(calls[0].url).pathname, '/api/v2/robot/business/' + match[1]);
    assert.deepEqual(JSON.parse(calls[0].data!).arguments, { value });
    assert.equal(e.__res, undefined);
    validationCases++;
  }
  assert.equal(validationCases, 9);
  assert.throws(() => validateBackendPlayerProfileAction({ action: 'gender', value: '女', cleared: false }, 'rename'));
});


test('view-info resolves UID or mention inside its one v2 call', async t => {
  const cave = { relation: 'stranger', relationLabel: '陌生人', canViewAura: true, blockedByFormation: false, auraText: '灵气稀薄', summary: '' };
  const data = { found: true, hideProfile: true, profile: { uid: 2, name: '目标', activeTitle: '无', realmName: '炼气' }, cave };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const selector of ['uid', 'mention'] as const) {
    for (const mode of ['business', 'missing', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data } : mode === 'missing' ? { ...business, data: { found: false, hideProfile: false, profile: null } } :
        mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = { ...event(selector === 'uid' ? '/查看信息 2' : '/查看信息 @目标'),
        MessageMentions: [{ UserId: 'target', UserName: '目标', IsBot: false }] } as GameEvent;
      await dispatchRouterEvent(e, async () => { throw new Error('view-info escaped fallback'); });
      assert.equal(e.uid, 1);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/v2/robot/business/profile.view']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, { target: selector === 'uid' ? { uid: 2 } : { bid: 'target' } });
    }
  }
  calls.length = 0;
  let mentions = 0;
  assert.deepEqual(await resolveRobotTarget('/查看信息 2', { findOne: async () => { mentions++; throw new Error('numeric UID requested mentions'); } }), { uid: 2 });
  assert.equal(mentions, 0);
  assert.deepEqual(await resolveRobotTarget('/查看信息 @目标', { findOne: async () => ({ count: 1, data: { UserId: 'target' } }) }), { bid: 'target' });
  assert.equal(calls.length, 0, 'selector must not query target identity');
});

test('real combined public-profile results preserve privacy and target failure branches', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessPublicProfileTargetPrivacyAndAdmission$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  let visible = false;
  let hidden = false;
  let refused = false;
  for (const match of output.matchAll(/ROBOT_PUBLIC_PROFILE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const raw = JSON.parse(match[3]).data;
    const result = parseRobotBusinessEnvelope(raw, match[2], parseBackendPublicPlayerProfile);
    if (result.success && result.branch === 'business') {
      if (result.data.found && result.data.hideProfile) { hidden = true; assert.equal(result.data.detail, undefined); }
      if (result.data.found && !result.data.hideProfile) { visible = true; assert.ok(result.data.detail); }
    }
    if (!result.success && result.branch === 'business') refused = true;
  }
  assert.ok(visible && hidden && refused);
});


test('friend query and preference routes combine access and data in one API', async t => {
  const access = { canUseFifthLayerFeature: true, canUseSpar: true, realmName: '炼气五层' };
  const list = { total: 0, currentPage: 1, pageSize: 5, maxFriends: 30, myGender: 0, hasCompanion: false, list: [] };
  const settings = { canUseFifthLayerFeature: true, realmName: '炼气五层', isEnabled: true };
  const rows = [
    { text: '/我的好友', op: 'friends.overview', args: { page: 1, pageSize: 5 }, data: { access, data: list }, locked: { access: { ...access, canUseFifthLayerFeature: false }, data: null } },
    { text: '/好友申请', op: 'friends.requests', args: {}, data: { access, data: [] }, locked: { access: { ...access, canUseFifthLayerFeature: false }, data: null } },
    { text: '/黑名单', op: 'friends.blocklist', args: {}, data: { access, data: [] }, locked: { access: { ...access, canUseFifthLayerFeature: false }, data: null } },
    { text: '/好友设置', op: 'friends.settings', args: {}, data: settings, locked: { ...settings, canUseFifthLayerFeature: false } },
    { text: '/好友设置 开启', op: 'friends.settings-update', args: { enabled: true }, data: settings, locked: { ...settings, canUseFifthLayerFeature: false } },
    { text: '/好友设置 关闭', op: 'friends.settings-update', args: { enabled: false }, data: { ...settings, isEnabled: false }, locked: { ...settings, canUseFifthLayerFeature: false } },
    { text: '/随机好友', op: 'friends.random', args: {}, data: { access: { ok: true, realmName: '炼气五层' }, player: { uid: 3, name: '候选者', activeTitle: null, realmName: null } },
      locked: { access: { ok: false, realmName: '炼气四层' }, player: null } }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'locked', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' || mode === 'locked' ? { ...business, data: mode === 'business' ? row.data : row.locked } :
        mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('friend query escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], row.text);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real combined social query results pass legacy decoders and never decode locked lists', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessSocialQueriesAccessListsSettingsAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  const decoders: Record<string, (data: unknown) => unknown> = {
    'friends.overview': data => parseGuardedSocialQuery(data, parseBackendFriends),
    'friends.requests': data => parseGuardedSocialQuery(data, parseBackendFriendRequests),
    'friends.blocklist': data => parseGuardedSocialQuery(data, parseBackendBlocklist),
    'friends.settings': parseBackendFriendSettings, 'friends.settings-update': parseBackendFriendSettings,
    'friends.random': parseBackendRandomFriend
  };
  for (const match of output.matchAll(/ROBOT_SOCIAL_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const raw = JSON.parse(match[3]).data;
    const result = parseRobotBusinessEnvelope(raw, match[2], decoders[match[1]]);
    if (result.success && result.branch === 'business') seen.add(match[1]);
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
  const access = { canUseFifthLayerFeature: false, canUseSpar: false, realmName: '炼气四层' };
  let decoded = false;
  assert.equal(parseGuardedSocialQuery({ access, data: null }, () => { decoded = true; throw new Error('locked list decoded'); }).data, null);
  assert.equal(decoded, false);
  assert.throws(() => parseGuardedSocialQuery({ access, data: [] }, parseBackendBlocklist));
});

test('all friend mutation routes use one combined API including confirmation and failures', async t => {
  const access = { canUseFifthLayerFeature: true, canUseSpar: true, realmName: '炼气五层' };
  const mutation = { success: true, requestId: 41, targetName: '好友', fromUserName: '好友', message: '完成' };
  const workflow = { outcome: 'result', realmName: '炼气五层', targetId: '2', target: { id: 2, name: '好友' } };
  const rows = [
    { text: '/结交 2', op: 'friends.request', args: { targetUid: '2' }, data: { ...workflow, request: mutation }, workflow: true },
    { text: '/结交 @道友', mention: true, op: 'friends.request', args: { targetBid: 'friend' }, data: { ...workflow, request: mutation }, workflow: true },
    { text: '/删除好友 2', op: 'friends.remove', args: { targetUid: '2', confirmed: false }, data: { ...workflow, outcome: 'confirmation_required' }, workflow: true },
    { text: '/删除好友 2 确认', op: 'friends.remove', args: { targetUid: '2', confirmed: true }, data: { ...workflow, removal: { outcome: 'removed', realmName: '炼气五层' } }, workflow: true },
    { text: '/删除好友 @道友 确认', mention: true, op: 'friends.remove', args: { targetBid: 'friend', confirmed: true }, data: { ...workflow, removal: { outcome: 'companion', realmName: '炼气五层' } }, workflow: true },
    { text: '/同意结交 41', op: 'friends.accept', args: { requestId: '41' }, data: { access, data: mutation } },
    { text: '/拒绝结交 41', op: 'friends.reject', args: { requestId: '41' }, data: { access, data: { outcome: 'rejected', listed: true, fromUserName: '好友', realmName: '炼气五层' } } },
    { text: '/拉黑 好友', op: 'friends.block', args: { targetName: '好友' }, data: { access, data: { outcome: 'blocked', name: '好友', realmName: '炼气五层' } } },
    { text: '/取消拉黑 好友', op: 'friends.unblock', args: { exactName: '好友' }, data: { access, data: { outcome: 'removed', blockedUserId: 2, name: '好友', realmName: '炼气五层' } } },
    { text: '/取消拉黑 31tail', op: 'friends.unblock', args: { exactName: '31tail' }, data: { access, data: { outcome: 'removed', blockedUserId: 2, name: '31tail', realmName: '炼气五层' } } }
  ];
  const feedback = { success: false, branch: 'business', middleware: { ...combinedEntry, replies: [{ title: '', heading: '', text: '申请不存在', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'locked', 'failure', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      const locked = row.workflow ? { outcome: 'locked', realmName: '炼气四层', targetId: '', target: null } :
        { access: { ...access, canUseFifthLayerFeature: false }, data: null };
      answer = mode === 'business' || mode === 'locked' ? { ...business, data: mode === 'business' ? row.data : locked } :
        mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      if (row.mention) e.MessageMentions = [{ UserId: 'friend', UserKey: 'friend', IsMaster: false, IsBot: false }];
      await dispatchRouterEvent(e, async () => { throw new Error('friend mutation escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real friend action HTTP results pass v2 decoders with stopped failures and transaction receipts', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessSocialActionsTransactionsReplayAndAdmission$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  const decoders: Record<string, (data: unknown) => unknown> = {
    'friends.request': data => parseBackendFriendWorkflow(data, 'request'),
    'friends.remove': data => parseBackendFriendWorkflow(data, 'remove'),
    'friends.accept': data => parseGuardedSocialAction(data, parseBackendFriendMutation),
    'friends.reject': data => parseGuardedSocialAction(data, parseBackendFriendReject),
    'friends.block': data => parseGuardedSocialAction(data, parseBackendBlockUser),
    'friends.unblock': data => parseGuardedSocialAction(data, parseBackendUnblock)
  };
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_SOCIAL_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const raw = JSON.parse(match[3]).data;
    const result = parseRobotBusinessEnvelope(raw, match[2], decoders[match[1]]);
    if (result.success && result.branch === 'business') seen.add(match[1]);
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
  assert.ok(failures > 3);
});

test('team query routes use one combined API and keep middleware fallbacks', async t => {
  const actions = Object.fromEntries(['canApply', 'canInvite', 'canManageMembers', 'canReviewApplications', 'canUseTeamMail', 'canViewDungeon', 'canLeave', 'canDisband', 'canViewInvitations'].map(key => [key, false]));
  const team = { access: { ok: true, realmName: '炼气' }, team: { teamId: 8, exists: true, leaderName: '修士', memberCount: 1, maxMembers: 6, minRealmName: null, target: null,
    isMember: true, isLeader: true, ownMembershipLeader: true, actions, members: [{ userId: 1, name: '修士', isLeader: true, position: 1 }] } };
  const record = { id: 31, teamId: 8, leaderUserId: 1, battleMode: 'mainline', targetLabel: '关卡', battleResult: 'win', participantCount: 1, battleLogId: null, settledAt: '2026-10-07T00:00:00Z', members: [] };
  const rows = [
    { text: '/我的队伍', op: 'teams.overview', args: {}, data: team, alternate: { access: { ok: false, realmName: '一层' }, team: null } },
    { text: '/查看队伍', op: 'teams.overview', args: {}, data: team, alternate: { access: { ok: true, realmName: '炼气' }, team: null } },
    { text: '/队伍信息', op: 'teams.info', args: { teamId: '' }, data: team, alternate: { access: { ok: true, realmName: '炼气' }, team: null } },
    { text: '/队伍信息 8', op: 'teams.info', args: { teamId: '8' }, data: team, alternate: { ...team, team: { ...team.team, exists: false } } },
    { text: '/队伍列表 2', op: 'teams.list', args: { page: 2, pageSize: 5 }, data: { items: [{ id: 8, leaderName: '修士', memberCount: 1, maxMembers: 6, minRealmName: null }], total: 1, page: 2, pageSize: 5 }, alternate: { items: [], total: 0, page: 2, pageSize: 5 } },
    { text: '/队伍申请', op: 'teams.applications', args: {}, data: { leaderName: '修士', applications: [] }, alternate: { error: '你不是队长' } },
    { text: '/处理队伍申请', op: 'teams.applications', args: {}, data: { leaderName: '修士', applications: [] }, alternate: { error: '你还未加入队伍' } },
    { text: '/我的队伍申请', op: 'teams.my-applications', args: {}, data: { records: { isLeader: true, canUseSecondLayerFeature: true, realmName: '炼气', applications: [] }, pending: { leaderName: '修士', applications: [] } },
      alternate: { records: { isLeader: false, canUseSecondLayerFeature: false, realmName: '一层', applications: [] }, pending: null } },
    { text: '/我的队伍邀请', op: 'teams.invitations', args: {}, data: { access: { ok: true, realmName: '炼气' }, invitations: [{ id: 51, teamId: 9, leaderName: '队员', inviterName: null, createdAt: null }] }, alternate: { access: { ok: false, realmName: '一层' }, invitations: [] } },
    { text: '/队伍战斗记录', op: 'teams.battle-records', args: { page: 1, pageSize: 5 }, data: { items: [record], total: 1, page: 1, totalPages: 1 }, alternate: { items: [], total: 0, page: 1, totalPages: 0 } },
    { text: '/队伍战斗详情 31', op: 'teams.battle-detail', args: { recordId: '31' }, data: record, alternate: { found: false } }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'alternate', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' || mode === 'alternate' ? { ...business, data: mode === 'business' ? row.data : row.alternate } : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('team query escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real team query HTTP results preserve domain decoders, roles and invitation repair receipts', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessTeamQueriesRolesPrivacyExpiryAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  const decoders: Record<string, (data: unknown) => unknown> = {
    'teams.overview': parseBackendTeamInfo, 'teams.info': parseBackendTeamInfo, 'teams.list': parseBackendTeams,
    'teams.applications': value => value && typeof value === 'object' && 'error' in value ? value : parseBackendTeamPendingApplications(value),
    'teams.my-applications': value => parseBackendTeamWorkflow(value, 'applications'), 'teams.invitations': parseBackendTeamInvitationInbox,
    'teams.battle-records': parseBackendTeamBattleRecords,
    'teams.battle-detail': value => value && typeof value === 'object' && ('error' in value || 'found' in value) ? value : parseBackendTeamBattleDetail(value, Number((value as Record<string, unknown>).id))
  };
  for (const match of output.matchAll(/ROBOT_TEAM_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const raw = JSON.parse(match[3]).data;
    const result = parseRobotBusinessEnvelope(raw, match[2], decoders[match[1]]);
    if (result.success && result.branch === 'business') seen.add(match[1]);
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
});


test('team write routes use one API for transactions, failures and local fallbacks', async t => {
  const rows = [
    { text: '/队伍位置设置 2 3', op: 'teams.position', args: { targetUid: '2', position: '3' }, data: { outcome: 'updated' } },
    { text: '/队伍位置设置 @道友 3', mention: true, op: 'teams.position', args: { targetBid: 'member', position: '3' }, data: { outcome: 'updated' } },
    { text: '/转让队长 2', op: 'teams.leadership', args: { targetUid: '2' }, data: { outcome: 'transferred' } },
    { text: '/转让队长 @道友', mention: true, op: 'teams.leadership', args: { targetBid: 'member' }, data: { outcome: 'transferred' } },
    { text: '/取消队伍邀请 41', op: 'teams.invitation-cancel', args: { invitationId: '41' }, data: { outcome: 'cancelled' } },
    { text: '/队伍邀请拒绝 41', op: 'teams.invitation-reject', args: { invitationId: '41' }, data: { rejected: true } },
    { text: '/取消队伍申请', op: 'teams.application-cancel', args: { applicationId: '' }, data: { outcome: 'list', applications: [{ id: 21, leaderName: '队长', createdAt: '2026-10-07T00:00:00Z' }] } },
    { text: '/取消队伍申请 0', op: 'teams.application-cancel', args: { applicationId: '0' }, data: { outcome: 'no_pending', message: '您当前没有待审核的队伍申请' } },
    { text: '/取消队伍申请 21', op: 'teams.application-cancel', args: { applicationId: '21' }, data: { outcome: 'cancelled', leaderName: '队长' } },
    { text: '/取消队伍申请 22', op: 'teams.application-cancel', args: { applicationId: '22' }, data: { outcome: 'not_pending', message: '申请记录不存在或已处理' } }
  ];
  const feedback = { success: false, branch: 'business', middleware: { ...combinedEntry, replies: [{ title: '', heading: '', text: '你不是队长', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'failure', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      if (row.mention) e.MessageMentions = [{ UserId: 'member', UserKey: 'member', IsMaster: false, IsBot: false }];
      await dispatchRouterEvent(e, async () => { throw new Error('team action escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real team write HTTP responses pass robot decoders including controlled failures', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessTeamActionsTransactionsAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  const decoders: Record<string, (data: unknown) => unknown> = {
    'teams.position': value => parseBackendTeamWorkflow(value, 'position'),
    'teams.leadership': value => parseBackendTeamWorkflow(value, 'leadership'),
    'teams.invitation-cancel': value => { assert.equal((value as Record<string, unknown>).outcome, 'cancelled'); return value; },
    'teams.invitation-reject': value => { assert.equal((value as Record<string, unknown>).rejected, true); return value; },
    'teams.application-cancel': parseRobotTeamApplicationCancel
  };
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_TEAM_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const result = parseRobotBusinessEnvelope(JSON.parse(match[3]).data, match[2], decoders[match[1]]);
    if (result.success && result.branch === 'business') seen.add(match[1]);
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
  assert.ok(failures >= 3);
});


test('team application invalid inputs use one v2 and preserve backend admission priority', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessTeamApplyInvalidInputAdmissionAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const rows = [...output.matchAll(/ROBOT_TEAM_APPLY_VALIDATION=(.+)/g)].map(match => JSON.parse(match[1]));
  assert.equal(rows.length, 26);
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    calls.length = 0;
    answer = row.result;
    const e = event(row.text);
    await dispatchRouterEvent(e, async () => { throw new Error('team application escaped parent fallback'); });
    assert.equal(calls.length, 1, row.text);
    assert.equal(new URL(calls[0].url).pathname, '/api/v2/robot/business/teams.apply');
    assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.arguments);
    assert.equal(e.__res, undefined);
    assert.equal(e.uid, 1);
  }
});

test('team application transport and invalid DTO failures end without supplementary requests', async t => {
  let answer: ReturnType<typeof response>;
  const calls = transport(t, () => answer);
  for (const text of ['/加入队伍', '/加入队伍 8']) {
    for (const result of [response({}, 503), response({ ...business, data: {} })]) {
      calls.length = 0;
      answer = result;
      const e = event(text);
      await dispatchRouterEvent(e, async () => { throw new Error('team application failure called next'); });
      assert.equal(calls.length, 1);
      assert.equal(new URL(calls[0].url).pathname, '/api/v2/robot/business/teams.apply');
      assert.equal(e.__res, undefined);
    }
  }
});

test('team lifecycle routes use one API including automatic approval and admission branches', async t => {
  const team = { id: 8, leaderId: 1, members: [{ userId: 1, isLeader: true, position: 1 }] };
  const rows = [
    { text: '/邀请入队 2', op: 'teams.invite', args: { target: { uid: 2 } }, data: { status: 0 } },
    { text: '/邀请入队 @道友', mention: true, op: 'teams.invite', args: { target: { bid: 'member' } }, data: { status: 1 } },
    { text: '/队伍踢出 2', op: 'teams.kick', args: { target: { uid: 2 } }, data: { kicked: true } },
    { text: '/队伍踢出 @道友', mention: true, op: 'teams.kick', args: { target: { bid: 'member' } }, data: { kicked: true } },
    { text: '/邀请入队 未知', op: 'teams.invite', args: {}, data: { outcome: 'target_missing' } },
    { text: '/队伍踢出 未知', op: 'teams.kick', args: {}, data: { outcome: 'target_missing' } },
    { text: '/创建队伍', op: 'teams.create', args: {}, data: team },
    { text: '/离开队伍', op: 'teams.leave', args: {}, data: { left: true } },
    { text: '/解散队伍', op: 'teams.disband', args: {}, data: { disbanded: true } },
    { text: '/加入队伍 8', op: 'teams.apply', args: { teamId: '8' }, data: { id: 21, status: 0 } },
    { text: '/加入队伍 0008', op: 'teams.apply', args: { teamId: '8' }, data: { id: 21, status: 0 } },
    { text: '！加入队伍 8', op: 'teams.apply', args: { teamId: '8' }, data: { id: 21, status: 0 } },
    { text: '/加入队伍 8  ', op: 'teams.apply', args: { teamId: '8' }, data: { id: 21, status: 0 } },
    { text: '/加入队伍 8', op: 'teams.apply', args: { teamId: '8' }, data: { id: 21, status: 1 } },
    { text: '/队伍邀请同意 41', op: 'teams.invitation-accept', args: { invitationId: '41' }, data: team },
    { text: '/队伍同意 21', op: 'teams.application-approve', args: { applicationId: '21' }, data: team },
    { text: '/队伍拒绝 21', op: 'teams.application-reject', args: { applicationId: '21' }, data: { rejected: true } },
    { text: '/设置队伍境界门槛 炼气', op: 'teams.realm', args: { realmName: '炼气' }, data: { outcome: 'updated', realmId: 1 } },
    { text: '/设置队伍境界门槛 无', op: 'teams.realm', args: { realmName: null }, data: { outcome: 'cancel_noop', realmId: null } },
    { text: '/设置队伍境界门槛 取消', op: 'teams.realm', args: { realmName: null }, data: { outcome: 'cancel_noop', realmId: null } }
  ];
  const feedback = { success: false, branch: 'business', middleware: { ...combinedEntry, replies: [{ title: '', heading: '', text: '队伍申请不存在或已处理', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'failure', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      if (row.mention) e.MessageMentions = [{ UserId: 'member', UserKey: 'member', IsMaster: false, IsBot: false }];
      await dispatchRouterEvent(e, async () => { throw new Error('team lifecycle escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real lifecycle HTTP responses pass direct bot decoders and stopped failure envelopes', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessTeamCoreWritesLifecycleAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const decoders: Record<string, (data: unknown) => unknown> = {
    'teams.invite': value => parseTeamTargetMutation(value, true), 'teams.kick': value => parseTeamTargetMutation(value, false),
    'teams.create': parseTeamCreated, 'teams.apply': parseTeamApplicationStatus,
    'teams.leave': value => parseTeamAcknowledgement(value, 'left'),
    'teams.disband': value => parseTeamAcknowledgement(value, 'disbanded'),
    'teams.application-reject': value => parseTeamAcknowledgement(value, 'rejected'),
    'teams.invitation-accept': value => requireTeamObject(value, '接受队伍邀请'),
    'teams.application-approve': value => requireTeamObject(value, '同意队伍申请'),
    'teams.realm': parseTeamRealmUpdate
  };
  const seen = new Set<string>();
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_TEAM_CORE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const result = parseRobotBusinessEnvelope(JSON.parse(match[3]).data, match[2], decoders[match[1]]);
    if (result.success && result.branch === 'business') seen.add(match[1]);
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
  assert.ok(failures >= 4);
});


test('master queries and lifecycle use one game API for business and middleware branches', async t => {
  const info = { access: { allowed: true, realmName: '炼气' }, discipleSide: null, masterSide: null, discipleHistory: [] };
  const rank = { self: null, top: [], nearby: [] };
  const lineage = { root: { userId: 1, name: '修士', realmName: '炼气', relationStatus: null, disciples: [] } };
  const rows = [
    { text: '/我的师门', op: 'master.info', data: info },
    { text: '/师门', op: 'master.info', data: { ...info, access: { allowed: false, realmName: '一层' } } },
    { text: '/圣人榜', op: 'master.ranking', data: rank },
    { text: '/圣人排行榜 2', op: 'master.ranking', data: rank },
    { text: '/师谱', op: 'master.lineage', data: lineage },
    { text: '/申请出师', op: 'master.graduation-apply', data: { proposalId: 21, message: '已提交出师申请，等待师父确认' } },
    { text: '/叛离师门', op: 'master.rebel', data: { message: '已无损叛离师门，师父已连续10天未扶持' } }
  ];
  const feedback = { success: false, branch: 'business', middleware: { ...combinedEntry, replies: [{ title: '', heading: '', text: '尚未满足出师条件', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'failure', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('master route escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, {});
    }
  }
});

test('real master HTTP results pass direct robot parsers with history, qualification and replay', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessMasterQueriesGraduationRebelAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const decoders: Record<string, (data: unknown, uid: number) => unknown> = {
    'master.info': parseMasterInfo, 'master.ranking': parseMasterRanking, 'master.lineage': parseMasterLineage,
    'master.graduation-apply': parseMasterAction, 'master.rebel': parseMasterAction
  };
  const seen = new Set<string>();
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_MASTER_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const result = parseRobotBusinessEnvelope(JSON.parse(match[3]).data, match[2], decoders[match[1]]);
    if (result.success && result.branch === 'business') seen.add(match[1]);
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), Object.keys(decoders).sort());
  assert.ok(failures >= 3);
});


test('master approval list and decisions use one API and preserve stopped failures', async t => {
  const list = { outcome: 'list', received: [{ id: 31, fromUserId: 2, fromName: '徒弟', fromRealm: '炼气', createdAt: '2026-10-07T00:00:00Z' }] };
  const rows = [
    { text: '/同意拜师', op: 'master.binding-accept', args: { discipleArg: '' }, data: list },
    { text: '/同意拜师 2', op: 'master.binding-accept', args: { discipleArg: '2' }, data: { outcome: 'decided', message: '已收徒徒弟' } },
    { text: '/同意出师', op: 'master.graduation-accept', args: { discipleArg: '' }, data: list },
    { text: '/同意出师 2', op: 'master.graduation-accept', args: { discipleArg: '2' }, data: { outcome: 'decided', message: '已确认出师' } },
    { text: '/拒绝出师', op: 'master.graduation-reject', args: { discipleArg: '' }, data: { outcome: 'list', received: [] } },
    { text: '/拒绝出师 2', op: 'master.graduation-reject', args: { discipleArg: '2' }, data: { outcome: 'decided', message: '已拒绝出师申请' } }
  ];
  const feedback = { success: false, branch: 'business', middleware: { ...combinedEntry, replies: [{ title: '', heading: '', text: '没有来自该修士的出师申请', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'failure', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('master decision escaped fallback'); });
      assert.equal(e.uid, 1, row.text);
      assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real approval HTTP responses decode lists and decisions while failures never decode business data', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessMasterDecisionsListsTransactionsAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const seen = new Set<string>();
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_MASTER_DECISION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const result = parseRobotBusinessEnvelope(JSON.parse(match[3]).data, match[2], parseMasterDecision);
    if (result.success && result.branch === 'business') seen.add(match[1] + ':' + result.data.outcome);
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), ['master.binding-accept:decided', 'master.binding-accept:list', 'master.graduation-accept:decided', 'master.graduation-accept:list', 'master.graduation-reject:decided', 'master.graduation-reject:list']);
  assert.ok(failures >= 10);
  assert.throws(() => parseMasterDecision({ outcome: 'list', received: [{}] }));
  assert.throws(() => parseMasterDecision({ outcome: 'decided' }));
});


test('master interactions resolve mentions in one combined request and retain usage branches', async t => {
  const result = { outcome: 'result', targetUid: 2, message: '传功', rewardExperience: 3, virtueExperience: 5, virtueLevel: 1 };
  const rows = [
    { text: '/传功 2', op: 'master.teach', args: { targetArg: '2' }, data: result },
    { text: '/传功 @道友', mention: true, op: 'master.teach', args: { targetArg: '@道友', targetBid: 'disciple' }, data: result },
    { text: '/传功', op: 'master.teach', args: { targetArg: '' }, data: { outcome: 'usage' } },
    { text: '/赐福 2', op: 'master.bless', args: { targetArg: '2' }, data: { ...result, message: '赐福', rewardExperience: 1 } },
    { text: '/赐福 @道友', mention: true, op: 'master.bless', args: { targetArg: '@道友', targetBid: 'disciple' }, data: { ...result, message: '赐福' } },
    { text: '/赐福', op: 'master.bless', args: { targetArg: '' }, data: { outcome: 'usage' } },
    { text: '/赐丹 2', op: 'master.gift', args: { targetArg: '2' }, data: { ...result, message: '赠送筑基丹×1' } },
    { text: '/赐丹 @道友 培元丹', mention: true, op: 'master.gift', args: { targetArg: '@道友', targetBid: 'disciple', itemKey: 'peiyuan' }, data: { ...result, message: '赠送培元丹×2' } },
    { text: '/赐丹 2 筑基丹', op: 'master.gift', args: { targetArg: '2', itemKey: 'zhuji' }, data: { ...result, message: '赠送筑基丹×1' } },
    { text: '/逐出师门 2', op: 'master.expel', args: { targetArg: '2' }, data: { ...result, message: '已按挂机清退徒弟' } },
    { text: '/逐出师门 @道友', mention: true, op: 'master.expel', args: { targetArg: '@道友', targetBid: 'disciple' }, data: { ...result, message: '已按挂机清退徒弟' } },
    { text: '/逐出师门', op: 'master.expel', args: { targetArg: '' }, data: { outcome: 'usage' } }
  ];
  const feedback = { success: false, branch: 'business', middleware: { ...combinedEntry, replies: [{ title: '', heading: '', text: '今日互动已达上限', buttons: [], advice: [] }] } };
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of rows) {
    for (const mode of ['business', 'failure', 'muted', 'handled', 'reject'] as const) {
      calls.length = 0;
      answer = mode === 'business' ? { ...business, data: row.data } : mode === 'failure' ? feedback : mode === 'muted' ? muted : mode === 'handled' ? handled : rejected;
      const e = event(row.text);
      if (row.mention) e.MessageMentions = [{ UserId: 'disciple', UserKey: 'disciple', IsMaster: false, IsBot: false }];
      await dispatchRouterEvent(e, async () => { throw new Error('master interaction escaped fallback'); });
      assert.equal(e.uid, 1, row.text); assert.equal(e.__res, undefined);
      assert.deepEqual(calls.map(call => new URL(call.url).pathname), [`/api/v2/robot/business/${row.op}`], `${row.text} ${mode}`);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
});

test('real master interaction HTTP results decode reward facts, mentions and stopped failures', () => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessMasterTargetsInteractionsInventoryAndReplay$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const actions: Record<string, '传功' | '赐福' | '赐丹' | '逐出师门'> = { 'master.teach': '传功', 'master.bless': '赐福', 'master.gift': '赐丹', 'master.expel': '逐出师门' };
  const seen = new Set<string>();
  let failures = 0;
  for (const match of output.matchAll(/ROBOT_MASTER_TARGET_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)) {
    const result = parseRobotBusinessEnvelope(JSON.parse(match[3]).data, match[2], value => parseMasterTargetAction(value, actions[match[1]]));
    if (result.success && result.branch === 'business') {
      seen.add(match[1] + ':' + result.data.outcome);
      if (result.data.outcome === 'result' && match[1] === 'master.teach') assert.match(result.data.message, /基础修为奖励：3/);
    }
    if (!result.success && result.branch === 'business') failures++;
  }
  assert.deepEqual([...seen].sort(), Object.keys(actions).flatMap(op => [op + ':result', op + ':usage']).sort());
  assert.ok(failures >= 6);
  assert.throws(() => parseMasterTargetAction({ outcome: 'result', targetUid: null, message: '传功' }, '传功'));
});


test('master apply and title claim preserve one request across all result branches', async t => {
 const rows=[
  {text:'/拜师',op:'master.apply',args:{targetArg:''},data:{outcome:'usage'}},
  {text:'/拜师 2',op:'master.apply',args:{targetArg:'2'},data:{outcome:'result',targetUid:2,message:'已向师父发起拜师申请，等待对方同意'}},
  {text:'/拜师 @道友',mention:true,op:'master.apply',args:{targetArg:'@道友',targetBid:'master'},data:{outcome:'result',targetUid:2,message:'已向师父发起拜师申请，等待对方同意'}},
  {text:'/领取师门称号',op:'master.title-claim',args:{},data:{title:'桃李满天下'}}
 ];
 let answer:unknown;
 const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'请等待回应',buttons:[],advice:[]}]}};
 for(const row of rows) for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;
  answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);
  if(row.mention)e.MessageMentions=[{UserId:'master',UserKey:'master',IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('master apply escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('real master apply and title claim HTTP results decode success, usage and stopped failures',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMasterApplyTitleAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_MASTER_REMAINING_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],value=>match[1]==='master.apply'?parseMasterTargetAction(value,'拜师'):parseMasterClaimTitle(value));
  if(result.success&&result.branch==='business')seen.add(match[1]);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),['master.apply','master.title-claim']);assert.ok(failures>=7);
 assert.throws(()=>parseMasterClaimTitle({title:null}));
});


test('tower overview and both reward queries use one API including optional navigation',async t=>{
 const access={canUseFifthLayerFeature:true,realmName:'炼气九层',isOpen:true,openStartDay:2,openEndDay:28};
 const first={...access,userRank:2,maxRank:1999,hasClaimableReward:true,rewards:[{ranking:3,state:'CLAIMABLE',description:'首通奖励'}]};
 const monthly={...access,currentRank:2,bestRank:2,maxRank:1999,claimCount:0,bestClaimRank:null,claimStatus:'AVAILABLE',hasClaimableReward:true,rewards:[{id:1,rankingStart:1,rankingEnd:3,lingJing:2,spiritStone:4,state:'CLAIMABLE'}]};
 const view={isOpen:true,myRank:2,top3:[],nearby:[],sweepTargets:[],challengeCost:5,challengeTip:'挑战',rewardTip:'奖励'};
 const rows=[
  {text:'/通天塔',op:'ranking.overview',data:{view,tianjiaoVisible:true}},
  {text:'/查看通天塔',op:'ranking.overview',data:{view,tianjiaoVisible:false}},
  {text:'/查看通天塔 我的',op:'ranking.overview',data:{view:{...view,isOpen:false,message:'关闭'},tianjiaoVisible:true}},
  {text:'/首通排名奖励',op:'ranking.first-rewards',data:first},
  {text:'/首通排名奖励',op:'ranking.first-rewards',data:{...first,canUseFifthLayerFeature:false}},
  {text:'/首通排名奖励',op:'ranking.first-rewards',data:{...first,isOpen:false}},
  {text:'/月度排名奖励',op:'ranking.monthly-rewards',data:monthly},
  {text:'/月度排名奖励',op:'ranking.monthly-rewards',data:{...monthly,canUseFifthLayerFeature:false}},
  {text:'/月度排名奖励',op:'ranking.monthly-rewards',data:{...monthly,isOpen:false}}
 ];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'榜数据未初始化',buttons:[{label:'登天梯',command:'/登天梯'}],advice:[]}]}};
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('tower query escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
});

test('real tower query HTTP responses decode access, open windows, badges and navigation',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRankingQueriesStatesNavigationAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const decoders:Record<string,(value:unknown)=>unknown>={'ranking.overview':parseRobotTowerOverview,'ranking.first-rewards':parseRobotFirstRewards,'ranking.monthly-rewards':parseRobotMonthlyRewards};
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_RANKING_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],decoders[match[1]]);
  if(result.success&&result.branch==='business')seen.add(match[1]);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),Object.keys(decoders).sort());assert.equal(failures,2);
 assert.throws(()=>parseRobotTowerOverview({view:{},tianjiaoVisible:undefined}));
});


test('first and monthly reward claims retain one API for single, batch and bad arguments',async t=>{
 const rows=[
  {text:'/领取首通奖励',op:'ranking.claim-first',arg:'',data:{outcome:'batch',claimedCount:2,rewardTexts:['灵晶 x3']}},
  {text:'/领取首通奖励 全部',op:'ranking.claim-first',arg:'全部',data:{outcome:'batch',claimedCount:2,rewardTexts:[]}},
  {text:'/领取首通奖励 1',op:'ranking.claim-first',arg:'1',data:{outcome:'single',ranking:1,rewardTexts:['灵石 x5']}},
  {text:'/领取首通奖励 1 2',op:'ranking.claim-first',arg:'1 2',data:{outcome:'param_error'}},
  {text:'/领取月度奖励',op:'ranking.claim-monthly',arg:'',data:{outcome:'batch',claimedCount:2,rewardTexts:['灵晶 x6']}},
  {text:'/领取月度奖励 all',op:'ranking.claim-monthly',arg:'all',data:{outcome:'batch',claimedCount:2,rewardTexts:[]}},
  {text:'/领取月度奖励 1',op:'ranking.claim-monthly',arg:'1',data:{outcome:'single',claimedCount:1,rewardTexts:['灵石 x5']}},
  {text:'/领取月度奖励 0',op:'ranking.claim-monthly',arg:'0',data:{outcome:'param_error'}}
 ];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'奖励已领取',buttons:[],advice:[]}]}};
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('tower claim escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{claimArg:row.arg});
 }
});

test('real tower claim HTTP results decode original settlement and stopped failures',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRankingClaimsTransactionsAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_RANKING_CLAIM_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],match[1]==='ranking.claim-first'?parseRobotFirstClaim:parseRobotMonthlyClaim);
  if(result.success&&result.branch==='business')seen.add(match[1]+':'+result.data.code);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),['ranking.claim-first','ranking.claim-monthly'].flatMap(op=>['PARAM_ERROR','BATCH_SUCCESS','SUCCESS'].map(code=>op+':'+code)).sort());assert.equal(failures,5);
 assert.throws(()=>parseRobotFirstClaim({outcome:'single',rewardTexts:[]}));
 assert.throws(()=>parseRobotMonthlyClaim({outcome:'batch',claimedCount:0,rewardTexts:[]}));
});


test('tower challenges, batches and sweep branches each issue one combined API',async t=>{
 const challenge={success:true,message:'挑战成功',oldRank:20,newRank:19,rankImproved:true,experienceGained:15,baseExperience:15,experienceBonusText:'',reputationGained:20,battle:{Winner:'A',Rounds:1,SideA:[],SideB:[]}};
 const batch={startRank:20,finalRank:19,rounds:[challenge],winCount:1,lossCount:0,experienceGained:15,experienceBonusText:'',reputationGained:20,events:[{index:1,outcome:'completed',message:'挑战成功',displayText:'第1次挑战成功',needPotion:false}]};
 const view={isOpen:true,myRank:20,top3:[],nearby:[],sweepTargets:[],challengeCost:10,challengeTip:'挑战',rewardTip:'奖励'};
 const rows=[
  {text:'/挑战排名 19',op:'ranking.challenge',args:{rankArg:'19'},data:challenge},
  {text:'/挑战排名 错误',op:'ranking.challenge',args:{rankArg:''},data:{outcome:'param_error'}},
  {text:'/连续爬塔',op:'ranking.batch-challenge',args:{},data:batch},
  {text:'/一键挑战',op:'ranking.batch-challenge',args:{},data:batch},
  {text:'/扫荡排名',op:'ranking.sweep',args:{rankArg:'',countArg:'5'},data:{outcome:'list',view}},
  {text:'/扫荡排名 错误',op:'ranking.sweep',args:{rankArg:'',countArg:'5'},data:{outcome:'list',view}},
  {text:'/扫荡排名 21',op:'ranking.sweep',args:{rankArg:'21',countArg:'5'},data:{outcome:'sweep',data:{targetRank:21,sweepCount:5,qiSpent:50,experienceGained:75,baseExperience:75,experienceBonusText:'',reputationGained:100}}},
  {text:'/扫荡排名 21 0',op:'ranking.sweep',args:{rankArg:'21',countArg:'0'},data:{outcome:'sweep',data:{targetRank:21,sweepCount:5,qiSpent:50,experienceGained:75,baseExperience:75,experienceBonusText:'',reputationGained:100}}}
 ];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'元力不足',buttons:[{label:'服用元力丹',command:'/服用 元力丹 3'}],advice:[]}]}};
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('tower battle escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('real tower battle HTTP results decode settlements, lists and partial batches',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRankingBattlesSettlementListsAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const decoders:Record<string,(value:unknown)=>unknown>={'ranking.challenge':parseRobotTowerChallenge,'ranking.batch-challenge':parseRobotTowerBatch,'ranking.sweep':parseRobotTowerSweep};
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_RANKING_BATTLE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],decoders[match[1]]);
  if(result.success&&result.branch==='business')seen.add(match[1]);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),Object.keys(decoders).sort());assert.equal(failures,6);
 assert.throws(()=>parseRobotTowerBatch({startRank:1,finalRank:1,rounds:[],winCount:1,lossCount:0,experienceGained:0,experienceBonusText:'',reputationGained:0,events:[]}));
});


test('all tianjiao commands keep one API across business and fallback branches',async t=>{
 const board={isVisible:true,canChallenge:true,lockedMessage:'',requiredText:'',suggestedTarget:2,requiredRealmName:'炼气圆满',stageName:'炼气',stageLevel:1,myRank:null,attemptsLeft:10,entries:[]};
 const reward={isVisible:true,stageLevel:1,stageName:'炼气',configs:[],records:[],view:{lockedMessage:'',tiers:[],records:[],recordTotal:0}};
 const challenge={success:true,message:'占位成功',oldRank:null,newRank:2,directOccupy:true,rewardText:''};
 const rows=[...['登天梯','查看登天梯','天骄榜','查看天骄榜'].map(text=>({text:'/'+text,op:'tianjiao.leaderboard',args:{},data:board})),...['登天奖励','登天奖励记录','天骄奖励','天骄奖励记录'].map(text=>({text:'/'+text,op:'tianjiao.rewards',args:{},data:reward})),{text:'/登天挑战 2',op:'tianjiao.challenge',args:{rankArg:'2'},data:challenge},{text:'/天骄挑战 2',op:'tianjiao.challenge',args:{rankArg:'2'},data:challenge},{text:'/登天挑战 错误',op:'tianjiao.challenge',args:{rankArg:''},data:{outcome:'no_match'}}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'今日挑战次数已用完',buttons:[],advice:[]}]}};
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('tianjiao escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('real tianjiao HTTP results decode access, direct occupancy, rewards and failures',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTianjiaoAccessSettlementAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const decoders:Record<string,(value:unknown)=>unknown>={'tianjiao.leaderboard':parseRobotTianjiaoLeaderboard,'tianjiao.rewards':parseRobotTianjiaoRewards,'tianjiao.challenge':parseRobotTianjiaoChallenge};
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_TIANJIAO_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],decoders[match[1]]);
  if(result.success&&result.branch==='business')seen.add(match[1]);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),Object.keys(decoders).sort());assert.equal(failures,6);
 assert.throws(()=>parseRobotTianjiaoChallenge({success:false}));
});


test('unified and newcomer check-in aliases keep one combined API in all branches',async t=>{
 const rows=[{text:'/签到',op:'checkin.hub',data:{results:[]}},{text:'/一键签到',op:'checkin.hub',data:{results:[{name:'日常签到',status:'error',message:'失败'}]}},{text:'/初入仙途签到',op:'checkin.newcomer-login',data:{code:'OK',data:{claimDay:1,spiritCrystal:8,grantedItems:[]}}},{text:'/新人狂欢签到',op:'checkin.newcomer-login',data:{code:'ALL_CLAIMED'}},{text:'/初入仙途签到',op:'checkin.newcomer-login',data:{code:'NO_CLAIMABLE'}}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'领取失败',buttons:[],advice:[]}]}};
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('check-in escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
});

test('real combined check-in results decode partial receipts, rewards and failures',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCheckInSettlementPartialAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const decoders:Record<string,(value:unknown)=>unknown>={'checkin.hub':parseCheckInHub,'checkin.newcomer-login':parseRobotNewcomerLogin};
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_CHECKIN_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],decoders[match[1]]);
  if(result.success&&result.branch==='business')seen.add(match[1]);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),Object.keys(decoders).sort());assert.equal(failures,3);
 assert.throws(()=>parseRobotNewcomerLogin({code:'OK',data:{claimDay:8,spiritCrystal:0,grantedItems:[]}}));
});


test('standalone sign-ins keep one API including failure rituals and repeat feedback',async t=>{
 const rows=[{text:'/日常签到',op:'checkin.daily',data:{accumulatedDays:1,issued:[],ritualText:'寄语',repeatSuffix:''}},{text:'/新人签到',op:'checkin.newcomer',data:{accumulatedDays:1,expireDate:'2026-11-07',issued:[],ritualText:'寄语',repeatSuffix:''}},{text:'/登仙台签到',op:'checkin.celestial',data:{signedSlots:['全天'],issued:[],ritualText:'寄语',repeatSuffix:''}}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'签到失败',quote:'寄语',buttons:[],advice:[]}]}};
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:row.data}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('sign-in escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
 assert.throws(()=>parseRobotMiddlewareResult({...combinedEntry,replies:[{title:'',heading:'',text:'',quote:1,buttons:[],advice:[]}]},'player',false));
});

test('real standalone sign-in results decode original rewards, suffixes and quoted refusals',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStandaloneSignInRewardsRepeatAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const decoders:Record<string,(value:unknown)=>unknown>={'checkin.daily':parseRobotDailyCheckIn,'checkin.newcomer':parseRobotNewcomerCheckIn,'checkin.celestial':parseRobotCelestialCheckIn};
 const seen=new Set<string>();let failures=0;
 for(const match of output.matchAll(/ROBOT_SIGNIN_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],decoders[match[1]]);
  if(result.success&&result.branch==='business')seen.add(match[1]);
  if(!result.success&&result.branch==='business')failures++;
 }
 assert.deepEqual([...seen].sort(),Object.keys(decoders).sort());assert.equal(failures,10);
 assert.throws(()=>parseRobotDailyCheckIn({accumulatedDays:1,issued:[],ritualText:''}));
});


test('limited-event check-in keeps one API for success and rich refusal in all admission branches',async t=>{
 const receipt={results:[{eventTitle:'试炼',subTitle:'当前阶段',dayIndex:2,issued:[{type:'free_token',name:'仙缘',amount:3}]}]};
 const failure={success:false,branch:'business',middleware:{...combinedEntry,replies:[{title:'',heading:'',text:'今日已签到',blocks:[{text:'✅ 第2天：仙缘奖励',quoted:true}],buttons:[],advice:[]}]}};
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?{...business,data:receipt}:mode==='failure'?failure:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event('/活动签到');await dispatchRouterEvent(e,async()=>{throw new Error('event check-in escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/checkin.limited-event']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
 assert.throws(()=>parseRobotMiddlewareResult({...combinedEntry,replies:[{title:'',heading:'',text:'',blocks:[{text:'奖励',quoted:'yes'}],buttons:[],advice:[]}]},'player',false));
});

test('real event check-in HTTP receipts decode settlement, rich status and failed rollback',()=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEventCheckInStatesRewardsAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 let successes=0,failures=0,rich=0;
 for(const match of output.matchAll(/ROBOT_EVENT_CHECKIN_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)){
  const result=parseRobotBusinessEnvelope(JSON.parse(match[3]).data,match[2],parseRobotLimitedEventCheckin);
  if(result.success&&result.branch==='business')successes++;
  if(!result.success&&result.branch==='business'){failures++;if(result.middleware.replies[0].blocks?.length)rich++;}
 }
 assert.equal(successes,1);assert.equal(failures,4);assert.equal(rich,1);
 assert.throws(()=>parseRobotLimitedEventCheckin({results:[{eventTitle:'试炼',subTitle:'阶段',dayIndex:0,issued:[]}]}));
});


test('guild check-in and task pages keep one API including no-guild and repeat feedback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildDailyCheckinQueriesAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_DAILY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const decoders:Record<string,(value:unknown)=>unknown>={'guild.checkin':parseRobotGuildCheckin,'guild.daily':parseRobotGuildDaily,'guild.weekly':parseRobotGuildWeekly};
 let successes=0,failures=0;
 for(const row of receipts){const result=parseRobotBusinessEnvelope(row.result,'player',decoders[row.op]);if(result.success&&result.branch==='business')successes++;else if(!result.success&&result.branch==='business')failures++;}
 assert.equal(successes,5);assert.equal(failures,14);
 const rows=[{text:'/宗门签到',op:'guild.checkin'},{text:'/联盟签到',op:'guild.checkin'},{text:'/宗门日常',op:'guild.daily'},{text:'/宗门周常',op:'guild.weekly'}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild daily escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
 assert.throws(()=>parseRobotGuildCheckin({receipt:{},message:'签到成功'}));
});


test('guild claims preserve one API and original fallback for every alias and branch',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildClaimsSettlementPartialAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_CLAIMS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 for(const row of receipts){
  const decode=row.op==='guild.stipend-claim'?parseRobotGuildStipend:row.op==='guild.milestone-claim-all'?parseRobotGuildMilestonesClaimAll:(value:unknown)=>parseRobotGuildMilestoneClaim(value,(row.result.data?.receipt?.milestoneId??0));
  parseRobotBusinessEnvelope(row.result,'player',decode);
 }
 const single=receipts.find(r=>r.op==='guild.milestone-claim'&&r.result.success&&r.result.data.outcome==='result')!.result;
 const all=receipts.find(r=>r.op==='guild.milestone-claim-all'&&r.result.success)!.result;
 const stipend=receipts.find(r=>r.op==='guild.stipend-claim'&&r.result.success)!.result;
 const rows=[{text:'/领取宗门日活奖励 0001',op:'guild.milestone-claim',args:{milestoneArg:'0001'},data:single},
 {text:'/领取宗门周活奖励 1 尾部',op:'guild.milestone-claim',args:{milestoneArg:'1'},data:single},
 {text:'/领取宗门日活奖励',op:'guild.milestone-claim',args:{milestoneArg:''},data:{...business,data:{outcome:'usage'}}},
 ...['领取全部','一键领取'].flatMap(verb=>['日','周'].map(kind=>({text:`/${verb}宗门${kind}活奖励`,op:'guild.milestone-claim-all',args:{type:kind==='日'?'daily_activity':'weekly_activity'},data:all}))),
 {text:'/领取宗门俸禄',op:'guild.stipend-claim',args:{},data:stipend}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?row.data:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild claim escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildMilestoneClaim({outcome:'result',receipt:single.data.receipt,message:'ok'},99));
 assert.throws(()=>parseRobotGuildStipend({receipt:{},message:'ok'}));
});


test('guild worship and mining keep one API for guide, settlement and fallback branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildActivitySettlementGuideAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_ACTIVITY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const decoders:Record<string,(value:unknown)=>unknown>={'guild.worship':parseRobotGuildWorship,'guild.mining':parseRobotGuildMining};
 let successes=0,failures=0;
 for(const row of receipts){const result=parseRobotBusinessEnvelope(row.result,'player',decoders[row.op]);if(result.success&&result.branch==='business')successes++;else if(!result.success&&result.branch==='business')failures++;}
 assert.equal(successes,9);assert.equal(failures,8);
 const rows=receipts.filter(r=>r.result.success).map(row=>({op:row.op,data:row.result,text:row.op==='guild.mining'?'/宗门采矿':row.result.data.code==='GUIDE'?'/祭祀祖师':'/祭祀祖师 '+row.result.data.data.offer,args:row.op==='guild.mining'?{}:{offer:row.result.data.code==='GUIDE'?'':row.result.data.data.offer}}));
 rows.push({...rows.find(r=>r.op==='guild.mining')!,text:'/宗门挖矿'});
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?row.data:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild activity escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildWorship({code:'GUIDE',data:{offers:[]}}));
 assert.throws(()=>parseRobotGuildMining({receipt:{},message:'ok'}));
});


test('guild content and essence pages keep one API with original paging and fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildContentPagingRefreshAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_CONTENT_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 let successes=0,failures=0;
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',row.op==='guild.essences'?parseRobotGuildEssences:parseRobotGuildContent);if(result.success&&result.branch==='business')successes++;else if(!result.success&&result.branch==='business')failures++;}
 assert.equal(successes,13);assert.equal(failures,12);
 const rows=[{text:'/宗门公告',op:'guild.notice',args:{}},{text:'/宗门简介',op:'guild.intro',args:{}},
 ...['/宗门精华','/宗门精华 0','/宗门精华 错误','/宗门精华 99'].map(text=>({text,op:'guild.essences',args:{page:text.endsWith('99')?99:1}}))];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild content escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildContent({hasMembership:false,guildName:null,intro:null,notice:null}));
 assert.throws(()=>parseRobotGuildEssences({hasMembership:true,guildName:'青云',items:[],page:1,total:0}));
});


test('guild content writes preserve one API for usage, permission, writes and middleware branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildContentActionsPermissionsWritesAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_CONTENT_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 let successes=0,failures=0;
 for(const row of receipts){const result=parseRobotBusinessEnvelope(row.result,'player',value=>parseRobotGuildContentAction(value,row.op.slice(6) as GuildContentAction));if(result.success&&result.branch==='business')successes++;else if(!result.success&&result.branch==='business')failures++;}
 assert.equal(successes,11);assert.equal(failures,33);
 const commands=[{op:'guild.intro-set',command:'设置宗门简介'},{op:'guild.notice-set',command:'设置宗门公告'},{op:'guild.essence-add',command:'添加精华'},{op:'guild.essence-remove',command:'移除精华'}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of commands)for(const usage of [false,true])for(const mode of ['business','failure','muted','handled','reject'] as const){
  const remove=row.op==='guild.essence-remove';
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&(r.result.data.outcome==='usage')===usage)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event('/'+row.command+(usage?'':remove?' 0003':'  新内容  '));await dispatchRouterEvent(e,async()=>{throw new Error('guild content write escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,remove?{essenceId:usage?null:3}:{content:usage?null:'新内容'});
 }
 assert.throws(()=>parseRobotGuildContentAction({outcome:'result',receipt:{field:'intro',outcome:'permission_denied'},message:'bad'},'intro-set'));
 assert.throws(()=>parseRobotGuildContentAction({outcome:'result',receipt:{outcome:'added',id:null},message:'ok'},'essence-add'));
});


test('guild realm setting and rename preserve one API for usage, writes, errors and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildSettingsLookupRenameAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_SETTINGS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope(row.result,'player',value=>parseRobotGuildSetting(value,row.op==='guild.rename'?'rename':'min-realm'));if(result.success&&result.branch==='business')seen.add(row.op);}
 assert.equal(seen.size,2);
 const rows=[{op:'guild.min-realm',text:'/设置申请宗门最低境界',args:{searchTerm:null},usage:true},{op:'guild.min-realm',text:'/设置申请宗门最低境界 金丹',args:{searchTerm:'金丹'},usage:false},{op:'guild.min-realm',text:'/设置申请宗门最低境界 无',args:{searchTerm:'无'},usage:false},{op:'guild.rename',text:'/宗门改名',args:{name:null},usage:true},{op:'guild.rename',text:'/宗门改名 新青云',args:{name:'新青云'},usage:false}];
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&(r.result.data.outcome==='usage')===row.usage)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild setting escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildSetting({outcome:'result',receipt:{outcome:'denied',minRealmId:null,realmName:null},message:'bad'},'min-realm'));
});


test('guild automatic shop refresh keeps one API including CAS and leadership fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildAutoRefreshStatesCASAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_AUTO_REFRESH_RESPONSE=([^|]+)\|(.+)/g)].map(m=>JSON.parse(m[2]).data);
 let success=0,failures=0;for(const row of receipts){const result=parseRobotBusinessEnvelope(row,'player',parseRobotGuildAutoRefresh);if(result.success&&result.branch==='business')success++;else if(!result.success&&result.branch==='business')failures++;}
 assert.equal(success,7);assert.equal(failures,11);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const param of ['', '开启','关闭','20 8 12','8 8','24','8.5'])for(const mode of ['business','failure','muted','handled','reject'] as const){
  const args=guildAutoRefreshArguments(param);
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.success&&r.data.outcome===(args.mode==='view'?'view':'set')):mode==='failure'?receipts.find(r=>!r.success&&r.middleware.replies[0].buttons.length===4):mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event('/宗门商店自动刷新'+(param?' '+param:''));await dispatchRouterEvent(e,async()=>{throw new Error('guild auto refresh escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/guild.auto-refresh']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
 }
 assert.deepEqual(guildAutoRefreshArguments('20 8 12'),{mode:'hours',hours:[8,12,20]});
 assert.deepEqual(guildAutoRefreshArguments('8 8'),{mode:'invalid'});
 assert.throws(()=>parseRobotGuildAutoRefresh({outcome:'set',data:{outcome:'denied'}}));
});

test('guild logs and own applications preserve one API for paging, read errors and middleware branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildHistoryScopePagingAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_HISTORY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 let successes=0,failures=0;
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>row.op==='guild.logs'?parseGuildLogs(value):parseGuildApplications(value));if(result.success&&result.branch==='business')successes++;else if(!result.success&&result.branch==='business')failures++;}
 assert.equal(successes,9);assert.equal(failures,4);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.logs',text:'/宗门日志',args:{page:1}},{op:'guild.logs',text:'/宗门日志 99',args:{page:99}},{op:'guild.logs',text:'/宗门日志 0',args:{page:1}},{op:'guild.my-applications',text:'/我的申请',args:{}}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
 const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild history escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 answer=receipts.find(r=>r.op==='guild.logs'&&!r.result.success)!.result;
 calls.length=0;const invalid=event('/宗门日志 1 多余');await dispatchRouterEvent(invalid,async()=>{throw new Error('invalid guild logs escaped fallback');});
 assert.equal(invalid.__res,undefined);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/guild.logs']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page:1});
 assert.throws(()=>parseGuildApplications({hasGuild:false,guildName:null,guildNameText:'',applications:[{id:1}]}));
 assert.throws(()=>parseGuildLogs({hasGuild:true,guildName:'青云',logs:[],page:1,total:0}));
});


test('guild roster and review keep one API across membership, authority and middleware branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildRosterAuthorityProjectionAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_ROSTER_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const success=new Set<string>(),failure=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>row.op==='guild.members'?parseGuildMembers(value):parseGuildReview(value));if(result.success&&result.branch==='business')success.add(row.op);else if(!result.success&&result.branch==='business')failure.add(row.op);}
 assert.equal(success.size,2);assert.equal(failure.size,2);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.members',command:'宗门成员列表'},{op:'guild.review-applications',command:'宗门审核'}])for(const page of [1,99,0])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
 const e=event('/'+row.command+' '+page);await dispatchRouterEvent(e,async()=>{throw new Error('guild roster escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page:Math.max(1,page)});
 }
 answer=receipts.find(r=>r.op==='guild.members'&&!r.result.success)!.result;
 calls.length=0;const invalid=event('/宗门成员列表 1 多余');await dispatchRouterEvent(invalid,async()=>{throw new Error('invalid guild roster escaped fallback');});
 assert.equal(invalid.__res,undefined);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/guild.members']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page:1});
 answer=receipts.find(r=>r.op==='guild.review-applications'&&!r.result.success)!.result;
 calls.length=0;const invalidReview=event('/宗门审核 1 多余');await dispatchRouterEvent(invalidReview,async()=>{throw new Error('invalid guild review escaped fallback');});
 assert.equal(invalidReview.__res,undefined);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/guild.review-applications']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page:1});
 assert.throws(()=>parseGuildReview({hasGuild:true,canReview:true,applications:[]}));
 assert.throws(()=>parseGuildMembers({membershipStatus:'joined',members:[]}));
});


test('guild application mutations keep one API including target resolution and committed auto-rejection',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildApplicationActionsTransactionsAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_APPLICATION_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const success=new Set<string>(),failure=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>row.op==='guild.application-cancel'?parseRobotGuildApplicationCancel(value):parseRobotGuildApplicationDecision(value));if(result.success&&result.branch==='business')success.add(row.op);else if(!result.success&&result.branch==='business')failure.add(row.op);}
 assert.equal(success.size,3);assert.equal(failure.size,3);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.application-cancel',text:'/取消宗门申请',args:{applicationId:null},kind:'list'},{op:'guild.application-cancel',text:'/取消宗门申请 11',args:{applicationId:11},kind:'result'},{op:'guild.application-approve',text:'/宗门审核同意 2',args:{target:{uid:2}},kind:'result'},{op:'guild.application-reject',text:'/宗门审核拒绝 3',args:{target:{uid:3}},kind:'result'},{op:'guild.application-approve',text:'/宗门审核同意',args:{target:null},kind:'no_target'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&r.result.data.outcome===row.kind)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild application action escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildApplicationDecision({outcome:'result',message:'bad',receipt:{outcome:'auto_rejected'}}));
});


test('guild role options and transfer preserve one API for candidates, confirmation, commits and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildRoleOptionsTransferConfirmationAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_ROLE_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>row.op==='guild.role-options'?parseGuildRoleOptions(value):parseGuildLeadershipTransfer(value));if(result.success&&result.branch==='business')seen.add(row.op==='guild.role-options'?row.op:row.result.data.outcome);}
 assert.deepEqual([...seen].sort(),['candidates','confirmation_required','guild.role-options','transferred']);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.role-options',text:'/宗门改职',args:{},outcome:null},{op:'guild.leadership-transfer',text:'/宗主转让',args:{index:0},outcome:'candidates'},{op:'guild.leadership-transfer',text:'/宗主转让 1',args:{index:1},outcome:'confirmation_required'},{op:'guild.leadership-transfer',text:'/宗主转让 1',args:{index:1},outcome:'transferred'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&(!row.outcome||r.result.data.outcome===row.outcome))!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild role query escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseGuildRoleOptions({membershipStatus:'joined',members:[],roles:[]}));
 assert.throws(()=>parseGuildLeadershipTransfer({outcome:'candidates',message:'请选择',guildId:1,guildName:'青云',confirmationRequired:false}));
});


test('guild appointment and resignation preserve one API for usage, targets, confirmation and writes',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildRoleActionsHierarchyTargetsConfirmationAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_ROLE_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',(value,uid)=>row.op==='guild.role-appoint'?parseRobotGuildRoleAppoint(value):parseRobotGuildRoleResign(value,uid));if(result.success&&result.branch==='business')seen.add(row.op+':'+row.result.data.outcome);}
 assert.equal(seen.size,5);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.role-appoint',text:'/设置身份为',args:{roleName:null,targetUid:null},kind:'usage'},{op:'guild.role-appoint',text:'/设置身份为 长老 4',args:{roleName:'长老',targetUid:4},kind:'result'},{op:'guild.role-resign',text:'/卸任',args:{mode:'directory',targetUid:null},kind:'options'},{op:'guild.role-resign',text:'/卸任 1',args:{mode:'action',targetUid:1},kind:'confirmation'},{op:'guild.role-resign',text:'/卸任 2',args:{mode:'action',targetUid:2},kind:'result'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&r.result.data.outcome===row.kind)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild role action escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildRoleAppoint({outcome:'result',receipt:{outcome:'role_missing'},message:'bad'}));
 assert.throws(()=>parseRobotGuildRoleResign({outcome:'options',data:{membershipStatus:'not_joined'}},1));
});


test('guild exit, confirmation cancel and leader absence keep one API including errors and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildLeaveCancelAbsenceAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_LEAVE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>row.op==='guild.leave'?parseRobotGuildLeave(value):row.op==='guild.leave-cancel'?parseGuildLeaveCancel(value):parseRobotGuildLeaderLeave(value));if(result.success&&result.branch==='business')seen.add(row.op);}
 assert.equal(seen.size,3);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.leave',text:'/退出宗门',outcome:'confirmation_required'},{op:'guild.leave',text:'/退出宗门',outcome:'left'},{op:'guild.leave-cancel',text:'/取消退出宗门',outcome:null},{op:'guild.leader-leave',text:'/宗主请假',outcome:null}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&(!row.outcome||r.result.data.outcome===row.outcome))!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild leave escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
 assert.throws(()=>parseRobotGuildLeave({outcome:'other',message:'bad',guildId:1,guildName:'青云',confirmationRequired:false}));
 assert.throws(()=>parseGuildLeaveCancel({}));
 assert.throws(()=>parseRobotGuildLeaderLeave({message:'ok',receipt:{}}));
});


test('guild kick keeps one API for directory, target mutation, errors and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildKickDirectoryTargetsTransactionAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_KICK_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',parseRobotGuildKick);if(result.success&&result.branch==='business')seen.add(row.result.data.outcome);}
 assert.equal(seen.size,3);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{text:'/踢出成员',args:{mode:'directory',target:null},kind:'directory'},{text:'/踢出成员 2',args:{mode:'action',target:{uid:2}},kind:'result'},{text:'/踢出成员 999',args:{mode:'action',target:{uid:999}},kind:'no_target'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.result.success&&r.result.data.outcome===row.kind)!.result:mode==='failure'?receipts.find(r=>!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild kick escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/guild.kick']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildKick({outcome:'result',message:'bad',receipt:{outcome:'left',message:'bad',guildId:1,guildName:'青云',confirmationRequired:false}}));
 assert.throws(()=>parseRobotGuildKick({outcome:'directory',data:{}}));
});


test('guild create and apply keep one API for usage, writes, failures and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildMembershipCreateApplyAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_MEMBERSHIP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],bid:m[2],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,row.bid,value=>row.op==='guild.create'?parseRobotGuildCreate(value):parseRobotGuildApply(value));if(result.success&&result.branch==='business')seen.add(row.op+':'+row.result.data.outcome);}
 assert.equal(seen.size,4);
 let answer:any;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.create',text:'/创建宗门',args:{name:null},kind:'usage'},{op:'guild.create',text:'/创建宗门 青云',args:{name:'青云'},kind:'result'},{op:'guild.apply',text:'/加入宗门',args:{guildId:null},kind:'usage'},{op:'guild.apply',text:'/加入宗门 1',args:{guildId:1},kind:'result'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&r.result.data.outcome===row.kind)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  // Replay the same business DTO with this route fixture's authenticated actor.
  answer={...answer,middleware:{...answer.middleware,identity:{bid:'player',account:{status:'registered',playerId:1}}}};
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild membership escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 assert.throws(()=>parseRobotGuildCreate({outcome:'result',receipt:{guildId:0,name:'青云'}}));
 assert.throws(()=>parseRobotGuildApply({outcome:'result',receipt:{applicationId:1,guildId:1,guildName:'青云',levelName:'1级',memberCount:-1}}));
});


test('guild dissolve and impeachment preserve one API for confirmation, writes and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildLeadershipEndConfirmationTransactionsAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_LEADERSHIP_END_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],bid:m[2],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,row.bid,value=>row.op==='guild.dissolve'?parseRobotGuildDissolve(value):parseRobotGuildImpeach(value));if(result.success&&result.branch==='business')seen.add(row.op==='guild.dissolve'?row.result.data.outcome:row.result.data.receipt.outcome);}
 assert.equal(seen.size,5);
 let answer:any;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.dissolve',text:'/解散宗门',outcome:'confirmation_required'},{op:'guild.dissolve',text:'/解散宗门',outcome:'dissolved'},{op:'guild.impeach',text:'/弹劾宗主',outcome:'counted'},{op:'guild.impeach',text:'/弹劾宗主',outcome:'leader_removed'},{op:'guild.impeach',text:'/弹劾宗主',outcome:'counted_no_successor'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&(r.result.data.outcome??r.result.data.receipt.outcome)===row.outcome)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  answer={...answer,middleware:{...answer.middleware,identity:{bid:'player',account:{status:'registered',playerId:1}}}};
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild leadership escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
 assert.throws(()=>parseRobotGuildDissolve({outcome:'not_joined'}));
 assert.throws(()=>parseRobotGuildImpeach({receipt:{outcome:'unknown',message:'bad'},message:'bad'}));
});


test('guild upgrades keep one API for costs, rollback, caps, permission and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildUpgradesCostsCapsRollbackAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_UPGRADE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>parseRobotGuildUpgrade(value,row.op.replace('guild.upgrade-','') as GuildUpgradeKind));if(result.success&&result.branch==='business')seen.add(row.op);}
 assert.equal(seen.size,3);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of [{op:'guild.upgrade-level',text:'/提升宗门等级'},{op:'guild.upgrade-vein',text:'/提升宗门灵脉'},{op:'guild.upgrade-shop',text:'/提升宗门商店'}])for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success)!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild upgrade escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
 const valid=receipts.find(r=>r.op==='guild.upgrade-level'&&r.result.success)!.result.data;
 assert.throws(()=>parseRobotGuildUpgrade(valid,'shop'));
 assert.throws(()=>parseRobotGuildUpgrade({...valid,message:''},'level'));
});


test('guild training keeps one API for state, all training keys, failures and admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGuildTrainingStateCostsPermissionsRollbackAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GUILD_TRAINING_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
 const seen=new Set<string>();
 for(const row of receipts){const data=row.result.data;const result=parseRobotBusinessEnvelope<unknown>(row.result,'player',value=>parseRobotGuildTraining(value,data?.branch,data?.key));if(result.success&&result.branch==='business')seen.add(row.op==='guild.training-overview'?row.op:data.branch+data.key);}
 assert.equal(seen.size,11);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const cases=[{op:'guild.training-overview',text:'/宗门战备',args:{},branch:null,key:null},...(['团队','个人'] as const).flatMap(branch=>(branch==='团队'?['攻','守','血','速']:['攻','守','血','速','命','会']).map(key=>({op:'guild.training-upgrade',text:'/宗门战备 '+branch+' '+key,args:{branch,key},branch,key})))];
 for(const row of cases)for(const mode of ['business','failure','muted','handled','reject'] as const){
  calls.length=0;answer=mode==='business'?receipts.find(r=>r.op===row.op&&r.result.success&&(!row.branch||(r.result.data.branch===row.branch&&r.result.data.key===row.key)))!.result:mode==='failure'?receipts.find(r=>r.op===row.op&&!r.result.success)!.result:mode==='muted'?muted:mode==='handled'?handled:rejected;
  const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('guild training escaped fallback');});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 calls.length=0;answer=receipts.find(r=>r.op==='guild.training-overview'&&!r.result.success)!.result;
 const invalid=event('/宗门战备 团队 攻 多余');await dispatchRouterEvent(invalid,async()=>{throw new Error('invalid guild training escaped fallback');});
 assert.equal(invalid.__res,undefined);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/guild.training-overview']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 assert.throws(()=>parseRobotGuildTraining({team:[],personal:[]}));
 assert.throws(()=>parseRobotGuildTraining({branch:'个人',key:'守'},'个人','攻'));
});

test('guild home and directory keep one API including overflow, refusals and admission', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildDirectoryProjectionCorrectionAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_GUILD_DIRECTORY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[3]).data }));

  for (const row of receipts) {
    parseRobotBusinessEnvelope<unknown>(row.result, 'player', value => row.op === 'guild.home' ? parseGuildHome(value) : parseRobotGuildList(value));
  }
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  const cases = [
    { op: 'guild.home', text: '/我的宗门', args: {} },
    { op: 'guild.home', text: '/查看势力 管理', args: {} },
    { op: 'guild.list', text: '/宗门列表', args: { page: 1 } },
    { op: 'guild.list', text: '/宗门列表 99', args: { page: 99 } }
  ];

  for (const row of cases) {
    const rows = receipts.filter(r => r.op === row.op);

    for (const result of [...rows.map(r => r.result), muted, handled, rejected]) {
      calls.length = 0; answer = result;
      const e = event(row.text);

      await dispatchRouterEvent(e, async () => { throw new Error('guild directory escaped fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${row.op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  calls.length = 0; answer = receipts.find(r => r.op === 'guild.list' && !r.result.success)?.result ?? receipts.find(r => r.op === 'guild.list')!.result;
  const invalid = event('/宗门列表 1 多余');
  await dispatchRouterEvent(invalid, async () => { throw new Error('invalid guild directory escaped fallback'); });
  assert.equal(invalid.__res, undefined);
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/guild.list']);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments, { page: 1 });
  assert.throws(() => parseGuildHome({ hasGuild: false }));
  assert.throws(() => parseRobotGuildList({ result: null, redirected: true }));
});

test('guild shop page, refresh and exchange keep one API for all receipts and admission', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildShopTransactionsProjectionAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_GUILD_SHOP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[3]).data }));

  for (const row of receipts) {
    parseRobotBusinessEnvelope<unknown>(row.result, 'player', (value, uid) => row.op === 'guild.shop-exchange' ? parseRobotGuildShopExchange(value) : parseRobotGuildShop(value, row.op === 'guild.shop-refresh', uid));
  }
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  const cases = [
    { op: 'guild.shop', text: '/宗门商店', args: {} },
    { op: 'guild.shop-refresh', text: '/宗门商店 刷新', args: {} },
    { op: 'guild.shop-exchange', text: '/宗门商店兑换 1', args: { itemIndex: 1 } },
    { op: 'guild.shop-exchange', text: '/宗门商店兑换', args: { itemIndex: null } }
  ];

  for (const row of cases) {
    const rows = receipts.filter(r => r.op === row.op);

    for (const result of [...rows.map(r => r.result), muted, handled, rejected]) {
      calls.length = 0; answer = result;
      const e = event(row.text);

      await dispatchRouterEvent(e, async () => { throw new Error('guild shop escaped fallback'); });
      assert.equal(e.__res, undefined);
      assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${row.op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  assert.throws(() => parseRobotGuildShop({ items: [] }, false, 1));
  assert.throws(() => parseRobotGuildShop({ receipt: {} }, true, 1));
  assert.throws(() => parseRobotGuildShopExchange({ outcome: 'result', receipt: {} }));
});

test('guild red packet reads, claim and recycle keep one API through all domain and admission branches', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildRedPacketsReadSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_GUILD_RED_PACKETS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[3]).data }));
  const decode = (op: string, value: unknown) => op === 'guild.red-packets' ? parseGuildRedPackets(value) : op === 'guild.my-red-packets' ? parseGuildMyRedPackets(value) : parseGuildRedPacketSettlement(value, op === 'guild.red-packet-claim' ? '领取' : '回收');

  for (const row of receipts) { parseRobotBusinessEnvelope<unknown>(row.result, 'player', value => decode(row.op, value)); }
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  const cases = [
    { op: 'guild.red-packets', text: '/宗门红包', args: {} },
    { op: 'guild.red-packets', text: '/宗门红包 99', args: {} },
    { op: 'guild.my-red-packets', text: '/我发的红包 2', args: {} },
    { op: 'guild.red-packet-claim', text: '/领红包 1', args: { packetId: 1 } },
    { op: 'guild.red-packet-claim', text: '/领红包 0', args: { packetId: 0 } },
    { op: 'guild.red-packet-recycle', text: '/回收红包 11', args: { packetId: 11 } }
  ];

  for (const row of cases) {
    for (const result of [...receipts.filter(r => r.op === row.op).map(r => r.result), muted, handled, rejected]) {
      calls.length = 0; answer = result;
      const e = event(row.text);

      await dispatchRouterEvent(e, async () => { throw new Error('guild red packet escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${row.op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  calls.length = 0; answer = receipts.find(r => r.op === 'guild.red-packets' && !r.result.success)!.result;
  const invalid = event('/宗门红包 1 多余');
  await dispatchRouterEvent(invalid, async () => { throw new Error('invalid guild red packets escaped fallback'); });
  assert.equal(invalid.__res, undefined);
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/guild.red-packets']);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments, {});
  assert.throws(() => parseGuildRedPackets({ hasGuild: true, packets: [] }));
  assert.throws(() => parseGuildMyRedPackets({ hasGuild: true, packets: [] }));
  assert.throws(() => parseGuildRedPacketSettlement({ packetId: 1, message: 'ok' }, '领取'));
});

test('red packet send keeps one API for usage, invalid inputs, settlement and admission', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildRedPacketSendValidationTransactionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_GUILD_RED_PACKET_SEND_RESPONSE=([^|]+)\|(.+)/g)].map(m => JSON.parse(m[2]).data);

  for (const row of receipts) { parseRobotBusinessEnvelope(row, 'player', parseRobotGuildRedPacketSend); }
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  const commands = ['/发红包', '/发红包 灵石 5', '/发红包 金币 5 100', '/发红包 灵石 7 100', '/发红包 灵石 5 1', '/发红包 灵石 5.5 100', '/发红包 灵石 Infinity 100', '/发红包 灵石 0x5 1e2 多余', '/发红包 灵石 5 100', '/发红包 贡献点 5 100', '/发红包 spirits_crystal 5 100'];

  for (const command of commands) {
    for (const result of [...receipts, muted, handled, rejected]) {
      calls.length = 0; answer = result;
      const e = event(command);

      await dispatchRouterEvent(e, async () => { throw new Error('red packet send escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/guild.red-packet-send']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, guildRedPacketSendArguments(command.slice(1).split(/\s+/).slice(1)));
    }
  }
  assert.deepEqual(guildRedPacketSendArguments(['灵石', '0x5', '1e2']), { currency: '灵石', count: { text: '0x5', value: 5 }, amount: { text: '1e2', value: 100 } });
  assert.equal(guildRedPacketSendArguments(['灵石', 'Infinity', '100']).count!.value, null);
  assert.throws(() => parseRobotGuildRedPacketSend({ outcome: 'result', receipt: {} }));
});


test('guild storyline home, records and claim use one API for original Go outcomes and admission', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildStorylineHomeRecordsClaimsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_GUILD_STORYLINE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
  const cases = [
    { op: 'guild.storyline-home', text: '/宗门主线', args: {}, decode: parseGuildStorylineHome },
    { op: 'guild.storyline-records', text: '/宗门主线记录', args: {}, decode: parseGuildStorylineRecords },
    { op: 'guild.storyline-claim', text: '/领取宗门主线奖励', args: { stageIndex: null }, decode: (v: unknown, uid: number) => parseGuildWorkflow({ action: 'storyline_claim' }, uid, v) },
    { op: 'guild.storyline-claim', text: '/领取宗门主线奖励 2', args: { stageIndex: 2 }, decode: (v: unknown, uid: number) => parseGuildWorkflow({ action: 'storyline_claim', stageIndex: 2 }, uid, v) }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of cases) {
    for (const result of [...receipts.filter(r => r.op === row.op).map(r => r.result), muted, handled, rejected]) {
      parseRobotBusinessEnvelope<unknown>(result, 'player', row.decode);
      calls.length = 0; answer = result;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('storyline escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${row.op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  assert.throws(() => parseGuildStorylineHome({ home: {} }));
  assert.throws(() => parseGuildStorylineRecords({ guildName: '青云', records: [] }));
});


test('guild storyline challenge keeps battle outcomes, error repeat and admission within one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildStorylineChallengeSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_GUILD_STORYLINE_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => JSON.parse(m[2]).data);
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const command of ['/宗门主线挑战', '#宗门主线挑战', '！宗门主线挑战']) {
    for (const result of [...receipts, muted, handled, rejected]) {
      parseRobotBusinessEnvelope(result, 'player', parseGuildStorylineChallenge);
      calls.length = 0; answer = result;
      const e = event(command);
      await dispatchRouterEvent(e, async () => { throw new Error('storyline challenge escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/guild.storyline-challenge']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, {});
    }
  }
  assert.throws(() => parseGuildStorylineChallenge({ stageIndex: 4, reward: {} }));
  assert.throws(() => parseGuildStorylineChallenge({ stageIndex: 4, reward: { damageDealt: -1, bossHpBefore: 1, bossHpAfter: 0, stageCleared: true } }));
});


test('all six competition read entries combine admission and original queries in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionQueriesScopePhasesFailuresAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_COMPETITION_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
  const cases = [
    { op: 'competition.home', text: '/宗门大比', args: {}, decode: parseCompetitionHome },
    { op: 'competition.candidates', text: '/可挑战宗门列表', args: {}, decode: parseBackendGuildCompetitionKnockoutCandidates },
    { op: 'competition.promotion-teams', text: '/查看晋级赛队伍', args: {}, decode: parseCompetitionPromotionTeams },
    { op: 'competition.bets', text: '/查看押注记录', args: {}, decode: parseCompetitionBets },
    { op: 'competition.battles', text: '/宗门大比战斗记录', args: { pageText: '1' }, decode: parseCompetitionBattles },
    { op: 'competition.battles', text: '/宗门大比战斗记录 2', args: { pageText: '2' }, decode: parseCompetitionBattles },
    { op: 'competition.battle-detail', text: '/宗门大比战斗详情 1', args: { battleIdText: '1' }, decode: parseCompetitionBattleDetail },
    { op: 'competition.battle-detail', text: '/宗门大比战斗详情 0', args: { battleIdText: '0' }, decode: parseCompetitionBattleDetail }
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of cases) {
    for (const result of [...receipts.filter(r => r.op === row.op).map(r => r.result), muted, handled, rejected]) {
      parseRobotBusinessEnvelope<unknown>(result, 'player', row.decode);
      calls.length = 0; answer = result;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('competition query escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${row.op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  assert.throws(() => parseCompetitionHome({ view: {} }));
  assert.throws(() => parseCompetitionBattleDetail({ battleId: 1 }));
  assert.throws(() => parseCompetitionBets({ bets: [] }));
});


test('competition application and three team actions keep usage, writes, repeat and admission in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionTeamActionsPhasesPermissionsRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_COMPETITION_TEAM_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
  const cases = [
    { op: 'competition.apply', text: '/宗门大比报名', args: {}, usage: false },
    { op: 'competition.team-clear', text: '/清空宗门大比队伍', args: {}, usage: false },
    ...['/移除宗门大比成员', '/移除宗门大比成员 1', '/移除宗门大比成员 0', '/移除宗门大比成员 7', '/移除宗门大比成员 999999999999999999999999'].map(text => ({ op: 'competition.member-remove', text, args: competitionRemoveArguments(text), usage: true })),
    ...['/调整宗门大比位置', '/调整宗门大比位置 1', '/调整宗门大比位置 1 2', '/调整宗门大比位置 1 1', '/调整宗门大比位置 999999999999999999999999 1'].map(text => ({ op: 'competition.position-adjust', text, args: competitionAdjustArguments(text), usage: true }))
  ];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const row of cases) {
    const decode = (value: unknown) => row.usage ? parseRobotCompetitionTeamAction(value, true) : parseRobotCompetitionTeamAction(value);
    for (const result of [...receipts.filter(r => r.op === row.op).map(r => r.result), muted, handled, rejected]) {
      parseRobotBusinessEnvelope(result, 'player', decode);
      calls.length = 0; answer = result;
      const e = event(row.text);
      await dispatchRouterEvent(e, async () => { throw new Error('competition team action escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${row.op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, row.args);
    }
  }
  assert.throws(() => parseRobotCompetitionTeamAction({ outcome: 'usage' }));
  assert.throws(() => parseRobotCompetitionTeamAction({ outcome: 'result', receipt: {}, message: 'ok' }));
});


test('competition add-member unifies list, position selection, target identity and writes in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionMemberAddTargetsCandidatesTransactionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_COMPETITION_MEMBER_ADD_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => JSON.parse(m[2]).data);
  const commands = ['/添加宗门大比成员', '/添加宗门大比成员 p2', '/添加宗门大比成员 p99', '/添加宗门大比成员 2', '/添加宗门大比成员 2 3', '/添加宗门大比成员 2 0', '/添加宗门大比成员 @无目标 3', '/添加宗门大比成员 2 3 多余'];
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const command of commands) {
    const args = await competitionMemberAddArguments(command);
    for (const result of [...receipts, muted, handled, rejected]) {
      parseRobotBusinessEnvelope(result, 'player', parseRobotCompetitionMemberAdd);
      calls.length = 0; answer = result;
      const e = event(command);
      await dispatchRouterEvent(e, async () => { throw new Error('competition member add escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/competition.member-add']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, args);
    }
  }
  calls.length = 0;
  let mentionCalls = 0;
  const mention = { findOne: async () => { mentionCalls++; return { count: 1, data: { UserId: 'competition-add-2' } }; } };
  assert.deepEqual(await competitionMemberAddArguments('/添加宗门大比成员 @道友 3', mention), { mode: 'direct', target: { bid: 'competition-add-2' }, position: 3 });
  assert.equal(calls.length, 0);
  assert.deepEqual(await competitionMemberAddArguments('/添加宗门大比成员 2 3', mention), { mode: 'direct', target: { uid: 2 }, position: 3 });
  assert.equal(mentionCalls, 1);
  assert.throws(() => parseRobotCompetitionMemberAdd({ outcome: 'positions', targetUid: 2, availablePositions: [] }));
  assert.throws(() => parseRobotCompetitionMemberAdd({ outcome: 'list', data: {} }));
});


test('competition bet and follow-bet combine choices, writes and feedback in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionBetsTransactionsLimitsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_COMPETITION_BET_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const [op, commands] of [
    ['competition.bet', ['/押注宗门大比', '/押注宗门大比 9', '/押注宗门大比 9 300', '/押注宗门大比 9 0', '/押注宗门大比 9 ' + '9'.repeat(400)]],
    ['competition.follow-bet', ['/追投宗门大比', '/追投宗门大比 200', '/追投宗门大比 0', '/追投宗门大比 ' + '9'.repeat(400)]]
  ] as const) {
    for (const command of commands) {
      const args = competitionBetArguments(command, op === 'competition.follow-bet');
      for (const result of [...receipts.filter(r => r.op === op).map(r => r.result), muted, handled, rejected]) {
        parseRobotBusinessEnvelope(result, 'player', parseRobotCompetitionBet);
        calls.length = 0; answer = result;
        const e = event(command);
        await dispatchRouterEvent(e, async () => { throw new Error('competition bet escaped fallback'); });
        assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
        assert.deepEqual(calls.map(c => new URL(c.url).pathname), [`/api/v2/robot/business/${op}`]);
        assert.deepEqual(JSON.parse(calls[0].data!).arguments, args);
      }
    }
  }
  assert.throws(() => parseRobotCompetitionBet({ outcome: 'result', receipt: {}, message: 'ok' }));
  assert.throws(() => parseRobotCompetitionBet({ outcome: 'unknown' }));
});


test('competition reward claims use one API for settlement, feedback and middleware branches', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionRewardAllSeasonsRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_COMPETITION_REWARD_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => JSON.parse(m[2]).data);
  assert.ok(receipts.some(r => r.success));
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const result of [...receipts, muted, handled, rejected]) {
    parseRobotBusinessEnvelope(result, 'player', parseRobotCompetitionReward);
    calls.length = 0; answer = result;
    const e = event('/领取宗门大比奖励');
    await dispatchRouterEvent(e, async () => { throw new Error('competition reward escaped fallback'); });
    assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
    assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/competition.reward-claim']);
    assert.deepEqual(JSON.parse(calls[0].data!).arguments, {});
  }
  assert.throws(() => parseRobotCompetitionReward({message:'ok',receipt:{}}));
  assert.throws(() => parseRobotCompetitionReward({message:'ok',receipt:{code:'SPIRIT_STONE',changeAmount:12,beforeAmount:1,afterAmount:13,detail:''}}));
});


test('competition challenges combine usage, actual battle and middleware branches in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionChallengeSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_COMPETITION_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => JSON.parse(m[2]).data);
  assert.ok(receipts.some(r => r.success && r.data.receipt?.logId));
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const command of ['/挑战宗门', '/挑战宗门 2', '/挑战宗门 0', '/挑战宗门 ' + '9'.repeat(400), '/挑战宗门 2 多余']) {
    for (const result of [...receipts, muted, handled, rejected]) {
      parseRobotBusinessEnvelope(result, 'player', parseRobotCompetitionChallenge);
      calls.length = 0; answer = result;
      const e = event(command);
      await dispatchRouterEvent(e, async () => { throw new Error('competition challenge escaped fallback'); });
      assert.equal(e.__res, undefined); assert.equal(e.uid, 1);
      assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/v2/robot/business/competition.challenge']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments, competitionChallengeArguments(command));
    }
  }
  assert.throws(() => parseRobotCompetitionChallenge({outcome:'result',message:'ok',receipt:{}}));
  assert.throws(() => parseRobotCompetitionChallenge({outcome:'result',message:'ok',receipt:{message:'ok',won:true,remaining:-1}}));
});


test('three world boss query entries combine original facts and admission in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessWorldBossQueriesFactsFailuresAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_WORLD_BOSS_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({op:m[1],result:JSON.parse(m[2]).data}));
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const [op,text,decode] of [
    ['world-boss.info','/凶兽',parseRobotWorldBossInfo],
    ['world-boss.ranking','/凶兽排行',parseRobotWorldBossRanking],
    ['world-boss.rewards','/凶兽奖励',parseRobotWorldBossRewards]
  ] as const) {
    for (const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]) {
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('world boss query escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
    }
  }
  assert.throws(()=>parseRobotWorldBossInfo({config:{}}));
  assert.throws(()=>parseRobotWorldBossRanking({ranking:[]}));
  assert.throws(()=>parseRobotWorldBossRewards({tiers:[]}));
});


test('world boss claim combines settlement, partial failure and admission in one API', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessWorldBossClaimPartialSettlementAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_WORLD_BOSS_CLAIM_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>JSON.parse(m[2]).data);
  assert.ok(receipts.some(r=>r.success&&r.data.items.length>1));
  let answer: unknown;
  const calls = transport(t,()=>response(answer));
  for(const result of [...receipts,muted,handled,rejected]){
    parseRobotBusinessEnvelope(result,'player',parseWorldBossClaimAll);
    calls.length=0;answer=result;
    const e=event('/领取凶兽奖励');
    await dispatchRouterEvent(e,async()=>{throw new Error('world boss claim escaped fallback');});
    assert.equal(e.__res,undefined);assert.equal(e.uid,1);
    assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/world-boss.reward-claim']);
    assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
  }
  assert.throws(()=>parseWorldBossClaimAll({items:[],totalStone:1,totalCrystal:0}));
});


test('world boss single and all-attempt battles use one API for all branches',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessWorldBossChallengeAttemptsPartialAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_WORLD_BOSS_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>JSON.parse(m[2]).data);
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const command of ['/挑战凶兽','/挑战凶兽 全部','/挑战凶兽 一键','/挑战凶兽 打完','/挑战凶兽 剩余','/挑战凶兽 错误']){
    for(const result of [...receipts,muted,handled,rejected]){
      parseRobotBusinessEnvelope(result,'player',parseRobotWorldBossChallenge);
      calls.length=0;answer=result;
      const e=event(command);
      await dispatchRouterEvent(e,async()=>{throw new Error('world boss challenge escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/world-boss.challenge']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,worldBossChallengeArguments(command));
    }
  }
  assert.throws(()=>parseRobotWorldBossChallenge({outcome:'result',mode:'all',data:{}}));
});


test('demon tower information and ranking use one API including admission branches', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessDemonTowerQueriesV1ParityAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_DEMON_TOWER_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({op:m[1],result:JSON.parse(m[2]).data}));
  assert.ok(receipts.length >= 8);
  let answer: unknown;
  const calls = transport(t, () => response(answer));
  for (const [op,text,decode,args] of [
    ['demon-tower.info','/妖塔',parseDemonTowerInfo,{}],
    ['demon-tower.ranking','/妖塔排行榜',parseTowerRanking,{pageText:'1'}],
    ['demon-tower.ranking','/妖塔排行榜 附近',parseTowerRanking,{pageText:'1'}],
    ['demon-tower.ranking','/妖塔排行榜 0',parseTowerRanking,{pageText:'1'}],
    ['demon-tower.ranking','/妖塔排行榜 99',parseTowerRanking,{pageText:'99'}]
  ] as const) {
    for (const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]) {
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('tower query escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  assert.throws(()=>parseDemonTowerInfo({access:{ok:true,realmName:'筑基'},info:null}));
  assert.throws(()=>parseTowerRanking({access:{ok:false,realmName:null},leaderboard:{}}));
});


test('demon tower writes settle and handle admission with one game API',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessDemonTowerActionsSettlementRollbackAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_DEMON_TOWER_ACTION_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [op,text,args,decode] of [
    ['demon-tower.buff','/妖塔选buff', {selection:null},parseRobotDemonTowerBuff],
    ['demon-tower.buff','/妖塔选buff 生命 0', {selection:{buffKey:'生命',count:1}},parseRobotDemonTowerBuff],
    ['demon-tower.buff','/妖塔选buff atk 2', {selection:{buffKey:'atk',count:2}},parseRobotDemonTowerBuff],
    ['demon-tower.buff','/妖塔选buff HP', {selection:{buffKey:'HP',count:1}},parseRobotDemonTowerBuff],
    ['demon-tower.sweep','/妖塔扫荡',{},parseSweep],
    ['demon-tower.reset','/妖塔重置',{},parseReset]
  ] as const){
    for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('tower action escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  assert.deepEqual(demonTowerBuffArguments('/妖塔选buff 生命 '+ '9'.repeat(400)),{selection:{buffKey:'生命',count:null}});
  assert.throws(()=>parseRobotDemonTowerBuff({outcome:'result',data:{}}));
});


test('demon tower challenge combines real battle settlement, refusals and parent fallback in one API',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessDemonTowerChallengeSettlementRollbackAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_DEMON_TOWER_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>JSON.parse(m[2]).data);
  assert.ok(receipts.some(r=>r.success&&r.data.data?.success===false));
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [text,args] of [['/妖塔挑战',{stars:null}],['/妖塔挑战 3',{stars:3}],['/妖塔挑战 0',{stars:0}],['/妖塔挑战 12',{stars:1}]] as const){
    for(const result of [...receipts,muted,handled,rejected]){
      parseRobotBusinessEnvelope(result,'player',parseRobotDemonTowerChallenge);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('tower battle escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/demon-tower.challenge']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  assert.deepEqual(demonTowerChallengeArguments('妖塔挑战 3abc'),{stars:3});
  assert.throws(()=>parseRobotDemonTowerChallenge({outcome:'result',data:{}}));
});


test('dungeon catalog and detail preserve facts and use one API for all admission branches',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessDungeonQueriesV1ParityReadOnlyAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_DUNGEON_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
  assert.ok(receipts.length>=15);
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [op,text,args,decode] of [
    ['dungeon.catalog','/查看秘境',{pageText:'1'},parseRobotDungeonCatalog],
    ['dungeon.catalog','/秘境列表 2',{pageText:'2'},parseRobotDungeonCatalog],
    ['dungeon.catalog','/查看秘境 0',{pageText:'1'},parseRobotDungeonCatalog],
    ['dungeon.detail','/秘境详情',{name:null},parseRobotDungeonDetail],
    ['dungeon.detail','/秘境详情 桃花镇',{name:'桃花镇'},parseRobotDungeonDetail]
  ] as const){
    for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('dungeon query escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  assert.deepEqual(dungeonCatalogArguments('/查看秘境 '+'9'.repeat(400)),{pageText:'Infinity'});
  assert.deepEqual(dungeonDetailArguments('/秘境详情  桃花镇  '),{name:'桃花镇'});
  assert.throws(()=>parseRobotDungeonDetail({outcome:'result',data:{}}));
  assert.throws(()=>parseRobotDungeonCatalog({items:[]}));
});


test('dungeon sweeps preserve settlement and partial results with one API for every admission branch',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessDungeonSweepsSettlementPartialAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_DUNGEON_SWEEP_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
  assert.ok(receipts.length>=10);
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [op,text,args,decode] of [
    ['dungeon.sweep','/扫荡秘境 试炼 10',{mode:'sweep',dungeonName:'试炼',times:10},parseRobotDungeonSweep],
    ['dungeon.sweep','/扫荡秘境',{mode:'usage'},parseRobotDungeonSweep],
    ['dungeon.sweep','/扫荡秘境 试炼 2',{mode:'invalid-times'},parseRobotDungeonSweep],
    ['dungeon.sweep-free','/扫荡免费秘境',{},parseRobotDungeonFreeSweep]
  ] as const){
    for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('dungeon sweep escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  assert.deepEqual(dungeonSweepArguments('/其他指令'),{mode:'no_match'});
  assert.deepEqual(dungeonSweepArguments('/扫荡秘境 试炼'),{mode:'sweep',dungeonName:'试炼',times:1});
  assert.throws(()=>parseRobotDungeonSweep({outcome:'result',data:{}}));
  assert.throws(()=>parseRobotDungeonFreeSweep({sweptDungeons:[]}));
});


test('dungeon challenge preserves real team and battle outcomes with one API across admission branches',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessDungeonChallengeSettlementRollbackAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_DUNGEON_CHALLENGE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>JSON.parse(m[2]).data);
  assert.ok(receipts.some(r=>r.success&&r.data.outcome==='result'&&!r.data.data.won));
  assert.ok(receipts.some(r=>r.success&&r.data.outcome==='result'&&r.data.data.rewardsByUser.length===2));
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [text,args] of [['/秘境挑战 试炼',{mode:'challenge',dungeonName:'试炼'}],['/秘境挑战',{mode:'usage'}]] as const){
    for(const result of [...receipts,muted,handled,rejected]){
      parseRobotBusinessEnvelope(result,'player',parseRobotDungeonChallenge);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('dungeon challenge escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/dungeon.challenge']);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  assert.deepEqual(dungeonChallengeArguments('/其他指令'),{mode:'no_match'});
  assert.deepEqual(dungeonChallengeArguments('！秘境挑战  试炼  '),{mode:'challenge',dungeonName:'试炼'});
  assert.throws(()=>parseRobotDungeonChallenge({outcome:'result',data:{}}));
});


test('email list and detail preserve lifecycle results and use one API across admission branches',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEmailQueriesV1ParityReadLifecycleAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_EMAIL_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
  assert.ok(receipts.length>=20);
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [op,text,args,decode] of [
    ['emails.list','/我的邮件',{pageText:'1'},parseRobotEmailList],
    ['emails.list','/我的邮件 0',{pageText:'0'},parseRobotEmailList],
    ['emails.list','/我的邮件 2',{pageText:'2'},parseRobotEmailList],
    ['emails.detail','/查看邮件 1',{idText:'1',idValue:'1'},parseRobotEmailDetail],
    ['emails.detail','/查看邮件 不存在',{idText:'不存在',idValue:'NaN'},parseRobotEmailDetail]
  ] as const){
    for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const requestText=op==='emails.detail'&&result.success&&result.branch==='business'?`/查看邮件 ${result.data.id}`:text;
      const requestArgs=op==='emails.detail'?emailDetailArguments(requestText):args;
      const e=event(requestText);
      await dispatchRouterEvent(e,async()=>{throw new Error('email query escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,requestArgs);
    }
  }
  assert.deepEqual(emailListArguments('/我的邮件 '+'9'.repeat(400)),{pageText:'Infinity'});
  assert.deepEqual(emailDetailArguments('/查看邮件  0x10  '),{idText:'0x10',idValue:'16'});
  assert.deepEqual(emailDetailArguments('/查看邮件 1.5'),{idText:'1.5',idValue:'1.5'});
  assert.throws(()=>parseRobotEmailList({pageText:'1',data:{}}));
  assert.throws(()=>parseRobotEmailDetail({id:1}));
  const actual=receipts.find(r=>r.op==='emails.detail'&&r.result.success)!.result.data;
  assert.throws(()=>emailDetailDecoder(actual.id+1)(actual),/邮件详情返回对象不一致/);
  assert.equal(emailDetailDecoder(actual.id)(actual).emailId,actual.id);
});


test('email actions keep confirmations and partial commits with one API for every admission branch',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEmailActionsSettlementConfirmationPartialAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_EMAIL_ACTION_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
  assert.ok(receipts.length>=30);
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const op of ['emails.delete','emails.claim','emails.delete-all','emails.claim-all'] as const){
    for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
      const id=result.success&&result.branch==='business'?result.data.emailId??1:1;
      const text=op==='emails.delete'?`/删除邮件 ${id}`:op==='emails.claim'?`/领取邮件 ${id}`:op==='emails.delete-all'?'/一键删除邮件':'/一键领取邮件';
      const args=op==='emails.delete'||op==='emails.claim'?{emailId:id}:{};
      const decode=op==='emails.delete'?emailDeleteDecoder(id):op==='emails.claim'?emailClaimDecoder(id):op==='emails.delete-all'?parseEmailDeleteAll:parseEmailClaimAll;
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('email action escaped fallback');});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
    }
  }
  for(const [op,command] of [['emails.delete','删除邮件'],['emails.claim','领取邮件']] as const){
    answer=receipts.find(r=>r.op===op&&!r.result.success&&r.result.middleware.replies.at(-1).text==='请输入正确的邮件ID')!.result;
    calls.length=0;
    const e=event('/'+command+' NaN');
    await dispatchRouterEvent(e,async()=>{throw new Error('invalid email id escaped');});
    assert.equal(e.__res,undefined);assert.equal(e.uid,1);
    assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
    assert.deepEqual(JSON.parse(calls[0].data!).arguments,{emailId:null});
  }
  for(const command of ['删除邮件','领取邮件'] as const){
    assert.deepEqual(emailActionArguments('/'+command+' 0x10',command),{emailId:16});
    for(const id of ['NaN','Infinity','-1','1.5','9007199254740992',''])assert.deepEqual(emailActionArguments('/'+command+' '+id,command),{emailId:null});
    assert.deepEqual(emailActionArguments('！'+command+' 2',command),{emailId:2});
  }
  const claim=receipts.find(r=>r.op==='emails.claim'&&r.result.success)!.result.data;
  assert.throws(()=>emailClaimDecoder(claim.emailId+1)(claim));
  assert.throws(()=>emailDeleteDecoder(2)({emailId:1,deleted:true}));
  assert.throws(()=>parseEmailDeleteAll({deleted:2,total:1}));
  assert.throws(()=>parseEmailClaimAll({claimed:2,skipped:1,total:2}));
});


test('gift code hub and redeem keep fallback inside one API for all admission branches',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGiftCodesSettlementFallbackRemoteProtocolAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_GIFT_CODE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
  assert.ok(receipts.some(r=>r.result.success&&r.result.data.kind==='custom'));
  let answer:unknown;
  const { app, requests: calls } = await gameFixture(t, () => answer);
  await app.mount({ responseRouter: router });
  for(const [op,text,args,decode] of [
    ['gift-codes.hub','/兑换码',{},parseRobotGiftHub],
    ['gift-codes.redeem','/礼包码',{code:''},parseRobotGiftCode],
    ['gift-codes.redeem','/礼品码 li ve gift',{code:'LIVEGIFT'},parseRobotGiftCode],
  ] as const){
    for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=app.events.groupMessage({ text, userId: 'player', platform: 'qq-bot' }) as GameEvent;
      const run = await app.dispatch(e);
      assert.deepEqual(run.errors, []);
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>c.path),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(calls[0].body.arguments,args);
    }
  }
  assert.deepEqual(giftCodeArguments('/礼包码 a\tb\n c'),{code:'ABC'});
  assert.throws(()=>parseRobotGiftCode({outcome:'result',kind:'test',data:{message:'ok',rewardSummary:[1]}}));
  assert.throws(()=>parseRobotGiftCode({outcome:'result',kind:'other',data:{message:'ok'}}));
  assert.throws(()=>parseRobotGiftHub({outcome:'usage'}));
});


test('referral query handlers consume authoritative receipts through one v2 request and original fallback',async t=>{
  const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessReferralQueriesSyncReadProjectionAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
  const receipts=[...output.matchAll(/ROBOT_REFERRAL_QUERY_RESPONSE=([^|]+)\|([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
  assert.ok(receipts.some(r=>r.result.success));assert.ok(receipts.some(r=>!r.result.success));
  let answer:unknown;
  const calls=transport(t,()=>response(answer));
  for(const [op,text,decode] of [
    ['referral.code','/邀请码',parseRobotReferralCode],
    ['referral.rules-count','/邀请人数奖励',referralRuleDecoder('count')],
    ['referral.rules-count','/邀请奖励',referralRuleDecoder('count')],
    ['referral.rules-realm','/邀请境界奖励',referralRuleDecoder('realm_level')],
    ['referral.rules-vip','/邀请VIP奖励',referralRuleDecoder('vip_level')],
    ['referral.invitees','/我的邀请',referralInviteesDecoder(1)]
  ] as const){
    for(const result of [...receipts.filter(r=>r.op===op&&(op!=='referral.invitees'||r.args.page===1)).map(r=>r.result),muted,handled,rejected]){
      parseRobotBusinessEnvelope<unknown>(result,'player',decode);
      calls.length=0;answer=result;
      const e=event(text);
      await dispatchRouterEvent(e,async()=>{throw new Error('referral escaped fallback')});
      assert.equal(e.__res,undefined);assert.equal(e.uid,1);
      assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
      assert.deepEqual(JSON.parse(calls[0].data!).arguments,op==='referral.invitees'?{page:1}:{});
    }
  }
  for(const row of receipts.filter(r=>r.op==='referral.invitees'&&r.args.page!==1&&r.args.page!==1.5)){
    const text=row.args.page===null?'/我的邀请 9999999999999999999999':`/我的邀请 ${row.args.page}`;
    const args=referralInviteesArguments(text);
    if(row.args.page===0)assert.equal(args.page,null);
    calls.length=0;answer=row.result;
    await dispatchRouterEvent(event(text),async()=>{throw new Error('page escaped fallback')});
    assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/referral.invitees']);
    assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
  }
  assert.deepEqual(referralInviteesArguments('/我的邀请 1.5'),{page:null});
  assert.throws(()=>referralInviteesDecoder(2)({items:[],total:0,page:1,pageSize:5}),/分页响应不完整/);
});


test('referral writes combine admission, settlement and repeat feedback in one v2 request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessReferralActionsRewardsRollbackRepeatAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_REFERRAL_ACTION_RESPONSE=([^|]+)\|([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
 assert.ok(receipts.some(r=>r.result.success&&r.result.data.outcome==='result'));assert.ok(receipts.some(r=>!r.result.success));
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of receipts){
  const decode=row.op==='referral.bind'?parseRobotReferralBind:parseRobotReferralClaim;
  const text=row.op==='referral.bind'?`/绑定邀请码 ${row.args.code??''}`:'/领取邀请奖励';
  const args=row.op==='referral.bind'?referralBindArguments(text):{};
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope<unknown>(result,'player',decode);
   answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('referral write escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);
   assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);
   assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
  }
 }
 assert.deepEqual(referralBindArguments('/绑定邀请码  tt-2  '),{code:'tt-2'});
 assert.deepEqual(referralBindArguments('/绑定邀请码'),{code:null});
 assert.deepEqual(referralBindArguments('/绑定邀请码 TT-2'),{code:'TT-2'});
 assert.throws(()=>parseRobotReferralClaim({outcome:'result',message:'ok',data:{claimed:0,issued:[]}}),/响应不完整/);
});


test('native comeback overview aliases and claim consume one v2 API for every admission branch',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNativeComebackEntryOverviewClaimAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_NATIVE_COMEBACK_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 assert.ok(receipts.some(r=>r.result.success));assert.ok(receipts.some(r=>!r.result.success));
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const [op,text,decode] of [
  ['native-comeback.overview','/回归奖励',parseNativeComebackOverview],
  ['native-comeback.overview','/回归签到',parseNativeComebackOverview],
  ['native-comeback.claim','/领取回归奖励',parseNativeComebackClaim]
 ] as const){
  for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
   parseRobotBusinessEnvelope<unknown>(result,'player',decode);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('native comeback escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);
   assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
   assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
  }
 }
 assert.deepEqual(parseNativeComebackClaim({message:'ok',rewardSummary:['灵石×1',1,null]}),{message:'ok',rewardSummary:['灵石×1']});
 assert.deepEqual(parseNativeComebackClaim({message:'ok'}),{message:'ok',rewardSummary:[]});
 assert.throws(()=>parseNativeComebackOverview({enabled:true,rules:{smallSilentDays:15,largeSilentDays:30,expireDays:7},current:{}}),/响应不完整/);
});


test('team match raw input uses one API for real format refusals, successes and mute fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTeamMatchSnapshotStartCancelAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TEAM_MATCH_INPUT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,21);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('team match raw input escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.op);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('team match four routes consume original domain receipts with one v2 request across all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTeamMatch','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_TEAM_MATCH_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 assert.ok(receipts.some(r=>r.result.success));assert.ok(receipts.some(r=>!r.result.success));
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const [op,text,args,decode] of [
  ['team-match.snapshot','/匹配状态',{},parseBackendTeamMatchSnapshot],
  ['team-match.cancel','/取消匹配',{},parseBackendTeamMatchCancel],
  ['team-match.start-mainline','/匹配主线 7-3',{input:'7-3'},parseBackendTeamMatchStart],
  ['team-match.start-dungeon','/匹配秘境 5',{input:'5'},parseBackendTeamMatchStart]
 ] as const){
  for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
   parseRobotBusinessEnvelope<unknown>(result,'player',decode);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('team match escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);
   assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
   assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
  }
 }
 assert.equal(parseBackendTeamMatchSnapshot(null),null);
 assert.throws(()=>parseBackendTeamMatchSnapshot({targetLabel:'x',waitedSeconds:-1,timeoutSeconds:180,phase:'WAITING'}),/数据不完整/);
 assert.throws(()=>parseBackendTeamMatchCancel({cancelled:false,targetLabel:'x'}),/响应不完整/);
 assert.throws(()=>parseBackendTeamMatchCancel({cancelled:true,targetLabel:null}),/响应不完整/);
 assert.throws(()=>parseBackendTeamMatchStart({}),/响应不完整/);
});


test('membership three routes consume real query and grant receipts in one v2 request across every admission branch',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMembership','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_MEMBERSHIP_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 assert.ok(receipts.some(r=>r.result.success));assert.ok(receipts.some(r=>!r.result.success));
 t.mock.method(ImageCache.prototype,'getOrCreate',async()=>null);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const [op,text,decode] of [
  ['membership.rights','/我的权益',parseBackendRechargeRights],
  ['membership.privileges','/我的特权',parseBackendVipPrivileges],
  ['membership.claim-month-card','/一键领取月卡',parseRobotMonthCardClaim]
 ] as const){
  for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
   parseRobotBusinessEnvelope<unknown>(result,'player',decode);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('membership escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);
   assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);
   assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
  }
 }
 assert.throws(()=>parseRobotMonthCardClaim({beforeTotal:0,claim:null,status:null}),/响应不完整/);
 assert.throws(()=>parseRobotMonthCardClaim({beforeTotal:1,claim:null,status:null,statusError:'after commit read failed'}),/响应不完整/);
});


test('activity points six actions and all-claim aliases use one v2 request across every admission branch',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessActivityPoints','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_ACTIVITY_POINTS_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 assert.ok(receipts.some(r=>r.result.success));assert.ok(receipts.some(r=>!r.result.success));
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const type of ['daily','weekly'] as const){
  const label=type==='daily'?'日常':'周常';
  for(const [op,text,args,decode] of [
   [`activity-points.${type}`,`/${label}活跃`,{},(v:unknown)=>parseRobotActivityPoints(v,type)],
   [`activity-points.claim-${type}`,`/领取${label}活跃奖励 10`,{mode:'claim',requiredPoints:10},parseRobotActivityClaim],
   [`activity-points.claim-${type}`,`/领取${label}活跃奖励`,{mode:'usage'},parseRobotActivityClaim],
   [`activity-points.claim-all-${type}`,`/一键领取${label}活跃奖励`,{},parseRobotActivityClaimAll],
   [`activity-points.claim-all-${type}`,`/领取全部${label}活跃奖励`,{},parseRobotActivityClaimAll]
  ] as const){
   for(const result of [...receipts.filter(r=>r.op===op).map(r=>r.result),muted,handled,rejected]){
    parseRobotBusinessEnvelope<unknown>(result,'player',decode);answer=result;calls.length=0;const e=event(text);
    await dispatchRouterEvent(e,async()=>{throw new Error('activity escaped fallback')});
    assert.equal(e.__res,undefined);assert.equal(e.uid,1);
    assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);
   }
  }
 }
 assert.throws(()=>parseRobotActivityClaimAll({claimed:[],partial:false}),/响应不完整/);
});

test('feedback three actions use one v2 request across real receipts and every admission branch',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessFeedback','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_FEEDBACK_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 assert.ok(receipts.length>10);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of receipts){
  const id=row.result.data?.id??99;
  const text=row.op==='feedback.compose'?'/提交反馈':row.op==='feedback.mine'?'/我的反馈':`/查看反馈 ${id}`;
  const decode=row.op==='feedback.compose'?parseRobotFeedbackCompose:row.op==='feedback.mine'?parseBackendFeedbacks:(v:unknown)=>parseBackendFeedbackDetail(v,id);
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope<unknown>(result,'player',decode);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('feedback escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);
  }
 }
});

test('glossary query and category preserve exact and fuzzy routes with one v2 request across admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const receipts=[...output.matchAll(/ROBOT_GLOSSARY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
 assert.equal(receipts.length,12);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of receipts){
  const {keyword,category,page}=row.args;
  const text=row.op==='glossary.query'?`/词典${keyword?' '+keyword:''}${page===1?'':' p'+page}`:`/词典分类${category?' '+category:''}${page===1?'':' p'+page}`;
  const action=row.op==='glossary.category'?'category':keyword?'search':'browse';
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope(result,'player',v=>parseRobotGlossaryView(v,action),true);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('glossary escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);const parsed=row.op==='glossary.query'?parseQueryParams(text):parseCategoryParams(text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{keyword:'keyword' in parsed?parsed.keyword??'':'',category:'category' in parsed?parsed.category??'':'',page:parsed.page});
  }
 }
});

test('public glossary results allow unregistered and muted users without relaxing private business validation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_GLOSSARY_PUBLIC_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({bid:m[1],op:m[2],args:JSON.parse(m[3]),result:JSON.parse(m[4]).data}));assert.equal(rows.length,4);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  const action=row.op==='glossary.query'?'browse':'category';
  assert.throws(()=>parseRobotBusinessEnvelope(row.result,row.bid,v=>v));
  parseRobotBusinessEnvelope(row.result,row.bid,v=>parseRobotGlossaryView(v,action),true);
  answer=row.result;calls.length=0;const e:GameEvent={...event(action==='browse'?'/词典':'/词典分类'),UserId:row.bid};
  await dispatchRouterEvent(e,async()=>{throw new Error('public query called next')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,row.bid==='player'?1:undefined);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
  calls.length=0;await assert.rejects(()=>requestRobotBusiness(e,'titles.overview',{},v=>v));assert.equal(calls.length,1);
 }
});

test('glossary three writes preserve real outcomes and partial commits with one v2 request across admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_GLOSSARY_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));assert.ok(rows.length>30);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  const {reason,mode,keyword,content}=row.args;
  const text=row.op==='glossary.apply'?`/申请词典编辑权限 ${reason}`:row.op==='glossary.delete'?`/删除词典 ${keyword}`:mode==='help'?'/录入词典':`/录入词典 ${keyword}${mode==='write'?' '+content:''}`;
  const decode=row.op==='glossary.apply'?parseRobotGlossaryApply:row.op==='glossary.delete'?parseRobotGlossaryDelete:parseRobotGlossaryUpsert;
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope<unknown>(result,'player',decode);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('glossary write escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
  }
 }
});

test('encyclopedia public routes send links without identity admission or backend requests',async t=>{
 const calls=transport(t,()=>{throw new Error('encyclopedia link called backend')});
 for(const text of ['/图鉴','/图鉴 装备 武器','/图鉴详情 道具 1','/图鉴 本命物 p2','/图鉴详情']){
  calls.length=0;const e=event(text);
  await dispatchRouterEvent(e,async()=>{throw new Error('encyclopedia escaped public route')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,undefined);assert.equal(calls.length,0);
 }
});


test('newcomer activity overview and task claim use one v2 request for real receipts and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNewcomerActivity','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_NEWCOMER_ACTIVITY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));assert.ok(rows.length>15);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  if(row.args.taskConfigId!==undefined && row.args.taskConfigId!==null && !Number.isInteger(row.args.taskConfigId))continue;
  const text=row.op==='newcomer-activity.overview'?'/新人狂欢':row.args.taskConfigId===null?'/新人任务领取':`/新人任务领取 ${row.args.taskConfigId}`;
  const decode:(v:unknown)=>unknown=row.op==='newcomer-activity.overview'?parseBackendNewcomerLoginView:parseRobotNewcomerTaskReward;
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);
   await dispatchRouterEvent(e,async()=>{throw new Error('newcomer activity escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
  }
 }
});


test('activity hub composes catalog and menu visibility in one v2 request across real receipts and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessActivityHub','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ACTIVITY_HUB_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({scenario:m[1],result:JSON.parse(m[2]).data}));assert.ok(rows.length>=8);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){for(const result of [row.result,muted,handled,rejected]){
  parseRobotBusinessEnvelope(result,'player',parseRobotActivityHub);answer=result;calls.length=0;const e=event('/我的活动');
  await dispatchRouterEvent(e,async()=>{throw new Error('activity hub escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/activity.hub']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }}
});


test('personal story and memories use one v2 request across real narrative receipts and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPersonalHistory','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PERSONAL_HISTORY_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));assert.ok(rows.length>=8);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const story=row.op.endsWith('story');const decode:(v:unknown)=>unknown=story?parseBackendStory:parseBackendMemories;
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(story?'/我的故事':'/我的回忆');
   await dispatchRouterEvent(e,async()=>{throw new Error('personal history escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
  }
 }
});


test('books preserve public access and private admission with one real combined request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBooks','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BOOKS_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),bid:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=20);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  const publicRead=row.op==='tianshu.content';
  if(!publicRead&&!(Number.isSafeInteger(row.args.page)&&row.args.page>0&&typeof row.args.category==='string'&&row.args.category!=='unknown'))continue;
  const decode:(v:unknown)=>unknown=publicRead?parseBackendTianshuContent:parseBackendTianshiBaoluPanel;
  const label:Record<string,string>={all:'全部',equipment_set:'装备',skill_book:'功法',soul_artifact:'本命'};
  const text=publicRead?'/天书':`/天师宝录 ${label[row.args.category]} p${row.args.page}`;
  for(const result of publicRead?[row.result]:[row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope(result,row.bid,decode,publicRead);answer=result;calls.length=0;const e:GameEvent={...event(text),UserId:row.bid};
   await dispatchRouterEvent(e,async()=>{throw new Error('books escaped parent fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,row.bid==='player'?1:undefined);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,publicRead?{}:row.args);
  }
  if(publicRead&&row.bid!=='player'){
   calls.length=0;await assert.rejects(()=>requestRobotBusiness({...event('/我的称号'),UserId:row.bid},'titles.overview',{},v=>v));assert.equal(calls.length,1);
  }
 }
 for(const text of ['/天师宝录','天师宝录 p0','/天师宝录 装备 p2','/天师宝录 错误 p99'])assert.ok(parseTianshiBaoluCommand(text).page>=1);
});


test('secret realm home list and view preserve real receipts with one API across admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSecretRealmQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SECRET_REALM_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));assert.ok(rows.length>=20);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const kind=row.op.slice('secret-realm.'.length);const decode:(v:unknown)=>unknown=kind==='home'?parseBackendSecretRealmHome:kind==='list'?parseBackendSecretRealmList:parseBackendSecretRealmView;
  if([row.args.page,row.args.realmNo].some(v=>v&&String(Number(v)).includes('e')))continue;
  const text=kind==='home'?'/灵脉攻防战':kind==='list'?`/灵脉攻防战列表 ${row.args.page}`:row.args.realmNo===null?'/灵脉攻防战查看':`/灵脉攻防战查看 ${row.args.realmNo} ${row.args.page}`;
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('secret realm escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{...row.args,...kind==='view'&&row.args.realmNo==='0'?{realmNo:null}:{}});
  }
 }
 for(const alias of ['/灵脉攻防战','/秘境攻防','/秘境争霸']){answer=rows.find(r=>r.op==='secret-realm.home'&&r.result.success&&r.result.branch==='business')!.result;calls.length=0;await dispatchRouterEvent(event(alias),async()=>{throw new Error('alias escaped')});assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/secret-realm.home'));}
});


test('secret realm challenge and claim preserve real outcomes in one API across all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSecretRealmActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SECRET_REALM_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));assert.ok(rows.length>=40);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const challenge=row.op==='secret-realm.challenge';const decode:(v:unknown)=>unknown=challenge?parseBackendSecretRealmChallenge:parseBackendSecretRealmClaim;
  const text=challenge?`/灵脉攻防战挑战 ${row.args.realmNo} ${row.args.positionNo}`:'/灵脉攻防战领取奖励';
  for(const result of [row.result,muted,handled,rejected]){
   parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('secret realm action escaped fallback')});
   assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
  }
 }
});


test('market reads use one combined API and parent fallback across real domain and admission outcomes',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMarketQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_MARKET_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));assert.ok(rows.length>20);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  let text:string,args:Record<string,unknown>,decode:(v:unknown)=>unknown;
  if(row.op==='market.browse'){
   if(!['browse','guide'].includes(row.args.view))continue;
   const view=row.args.view;const order=row.args.sort==='latest'?'最新':row.args.sort==='price_desc'?'价格降序':'价格升序';
   if(view==='guide'){text='/珍宝楼 搜索';args={view};}
   else {if(!/^\d+$/.test(row.args.page))continue;const page=String(Math.max(1,Number(row.args.page)));text=row.args.keyword?`/珍宝楼 搜索 ${row.args.keyword} ${order} ${page}`:row.args.categoryType?`/珍宝楼 筛选 道具 ${order} ${page}`:`/珍宝楼 ${order} ${page}`;args={view,categoryType:row.args.categoryType??'',categorySubtype:'',keyword:row.args.keyword??'',sort:row.args.sort??'price_asc',page};}
   decode=v=>parseRobotMarketBrowse(v,view);
  }else if(row.op==='market.my-listings'){
   if(!Number.isSafeInteger(row.args.page)||row.args.page<1)continue;text=`/我的上架 ${row.args.page}`;args=row.args;decode=parseMyMarketListings;
  }else if(row.op==='market.records'){
   if(!['all','buy','sell'].includes(row.args.mode))continue;text=`/我的交易记录 ${row.args.mode==='buy'?'买':row.args.mode==='sell'?'卖':''} ${row.args.page}`;args=row.args;decode=parseBackendMarketTrades;
  }else{text='/信誉分';args={};decode=parseMarketCredibility;}
  for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('market escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
 for(const text of ['/交易所','/珍宝楼 搜索 玄铁','/珍宝楼 筛选','/珍宝楼 筛选 天工','/我的记录','/我的信誉']){const op=text.includes('记录')?'market.records':text.includes('信誉')?'market.credibility':'market.browse';answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('market alias escaped')});assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${op}`]);}
});


test('market purchase and cancel use one API for writes, usage, refusals and parent middleware',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMarketActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_MARKET_ACTION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=15);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const buy=row.op==='market.purchase',decode=buy?parseRobotMarketPurchase:parseRobotMarketMessage;let text=row.text,args=row.args;if(row.result.branch==='middleware'){text=buy?'/选购':'/交易下架';args=buy?{listingId:null,quantity:null,confirmed:false}:{listingId:null};}
  for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('market action escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
 for(const text of ['/选购 12*2','/选购 12x2 确认','/选购 12X2 确认','/选购 12×2 确认']){answer=rows.find(r=>r.result.data?.preview)!.result;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('purchase alias escaped')});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{listingId:12,quantity:2,confirmed:text.endsWith('确认')});}
});


test('market sell routes category selection, lists, hints, writes and refusal through one API',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessMarketSell','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_MARKET_SELL_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=20);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const mode=row.result.branch==='middleware'?'choose':row.args.mode;const text=row.result.branch==='middleware'?'/交易上架':row.text;const args=row.result.branch==='middleware'?{mode:'choose'}:row.args;const decode=(v:unknown)=>parseRobotMarketSell(v,mode,row.args.category??'');
  for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('sell escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/market.sell']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
 for(const text of ['/交易上架 道具 丹药2','/交易上架 装备2','/交易上架 材料 2','/交易上架 道具 丹药 2 1 20']){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('sell parser escaped')});assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/market.sell'));}
});


test('player shop routes retain one v2 request across business, refusal and parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPlayerShop','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PLAYER_SHOP_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=25);
 const commands:Record<string,string>={'player-shop.list':'/小店','player-shop.mine':'/我的小店','player-shop.ranking':'/小店排行','player-shop.rename':'/命名店铺','player-shop.description':'/店铺简介'};
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const decode:(v:unknown)=>unknown=row.op==='player-shop.list'?parseBackendShopList:row.op==='player-shop.mine'?parseBackendOwnPlayerShop:row.op==='player-shop.ranking'?parseBackendShopRanking:parseRobotMarketMessage;
 const text=row.text==='/小店'?commands[row.op]:row.text;
 const args=row.result.branch==='middleware'?(row.op==='player-shop.list'?{page:'1'}:row.op==='player-shop.rename'?{name:null}:row.op==='player-shop.description'?{description:null}:{}):row.args;
 for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('shop escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
});


test('shop visit resolves numeric and mentioned owners inside one v2 request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPlayerShopVisit','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SHOP_VISIT_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=16);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const text=row.result.branch==='middleware'?'/逛店':row.text;const args=row.result.branch==='middleware'?{mode:'usage',target:null,page:'1'}:row.args;
 for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',parseBackendPlayerShopVisit);answer=result;calls.length=0;const e=event(text);if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];await dispatchRouterEvent(e,async()=>{throw new Error('visit escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/player-shop.visit']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
 for(const text of ['/逛店 0','/逛店 9007199254740992','/逛店 0002','/逛店 2 0','/逛店 abc 2']){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('visit parser escaped')});assert.equal(calls.length,1);}
});


test('bounty list, accept and claim modes use one v2 request and original parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBounty','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BOUNTY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=35);
 const commands:Record<string,string>={'bounty.list':'/悬赏榜','bounty.accept':'/接赏','bounty.claim':'/领赏'};
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const decode:(v:unknown)=>unknown=row.op==='bounty.list'?parseRobotBountyList:row.op==='bounty.accept'?parseBackendBountyAccept:parseRobotBountyClaim;
 const text=row.result.branch==='middleware'?commands[row.op]:row.text;
 const args=row.result.branch==='middleware'?(row.op==='bounty.list'?{page:'1'}:row.op==='bounty.accept'?{bountyId:null}:{mode:'list',bountyId:null}):row.args;
 for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',decode);answer=result;calls.length=0;const e=event(text);await dispatchRouterEvent(e,async()=>{throw new Error('bounty escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
 for(const [text,args] of [['/悬赏榜 0',{page:'1'}],['/悬赏榜 '+ '1'+'0'.repeat(400),{page:'1'}],['/接赏 0001',{bountyId:'1'}],['/领赏 0001',{mode:'claim',bountyId:'1'}]] as const){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('bounty alias escaped')});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
});


test('bounty publish joins policy, mention resolution and mutation in one v2 request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBountyPublish','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BOUNTY_PUBLISH_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=24);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){const text=row.result.branch==='middleware'?'/悬赏':row.text;const args=row.result.branch==='middleware'?{mode:'usage',target:null,amount:null,maxCompletions:null}:row.args;
 for(const result of [row.result,muted,handled,rejected]){parseRobotBusinessEnvelope(result,'player',parseRobotBountyPublish);answer=result;calls.length=0;const e=event(text);if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];await dispatchRouterEvent(e,async()=>{throw new Error('publish escaped fallback')});assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/bounty.publish']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
 }
 for(const [text,args] of [['/悬赏 0002 01000 03',{mode:'publish',target:{uid:2},amount:'1000',maxCompletions:'3'}],['/悬赏 2 '+ '1'+'0'.repeat(400),{mode:'publish',target:{uid:2},amount:'Infinity',maxCompletions:null}],['/悬赏 0 1000',{mode:'publish',target:null,amount:'1000',maxCompletions:null}],['/悬赏 abc',{mode:'usage',target:null,amount:null,maxCompletions:null}]] as const){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('publish parser escaped')});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,args);}
});


test('PvP queries and kill-god claim use one v2 request and retain original parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPVP','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PVP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=20);
 const decoders:Record<string,(v:unknown)=>unknown>={'pvp.sha-qi':parseRobotShaQi,'pvp.enemies':parseBackendEnemies,'pvp.kill-god-ranking':parseBackendKillGodRanking,'pvp.kill-god-title-claim':parseRobotKillGodTitleClaim};
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  parseRobotBusinessEnvelope(result,'player',decoders[row.op]);answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('PvP escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
 }
});


test('robbery records and acknowledgement share one v2 call with original fallback and page clamps',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPVPRecords','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RECORDS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({page:Number(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=10);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  parseRobotBusinessEnvelope(result,'player',parseRobberyRecords);answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('records escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/pvp.records']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page:row.page});
 }
 for(const [text,page] of [['/打劫记录',1],['/打劫记录 0',1],['/打劫记录 0002',2],['/打劫记录 101',100],['/打劫记录 '+ '1'+'0'.repeat(400),100]] as const){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('page escaped')});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page});}
});


test('scarecrow exact route joins admission and practice in one v2 request',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessScarecrow','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SCARECROW_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=9);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  parseRobotBusinessEnvelope(result,'player',parseBackendScarecrow);answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('scarecrow escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/scarecrow.challenge']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});


test('spar exact route combines target resolution, admission, repeat and settlement in one v2 call',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSpar','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SPAR_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=22);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  parseRobotBusinessEnvelope(result,'player',parseRobotSpar);answer=result;calls.length=0;const e=event(row.text);if(row.args.targetBid)e.MessageMentions=[{UserId:row.args.targetBid,UserKey:row.args.targetBid,IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('spar escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/pvp.spar']);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});


test('robbery/counter exact routes resolve mentions, admit and settle in one v2 HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRobbery','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ROBBERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=25);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('robbery escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});


test('battle boards and log query keep one v2 HTTP and parent fallback across original views',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBattleQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BATTLE_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=32);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('battle query escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 for(const [text,op] of [['/战力排行榜 附近','leaderboard.battle'],['/区战力排行榜 我的','leaderboard.battle-region'],['/战力排行榜 榜首','leaderboard.battle']]){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('battle alias escaped')});assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,`/api/v2/robot/business/${op}`);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{page:'1'});}
});


test('realm/popularity boards and likes combine admission, target, repeat and original work in one v2 HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessOtherBoards','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_OTHER_BOARD_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('other leaderboard escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`]);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 for(const [text,op] of [['/境界排行榜 榜首','leaderboard.realm'],['/区境界排行榜 我的','leaderboard.realm-region'],['/人气排行榜 附近','leaderboard.popularity'],['/境界排行榜 0','leaderboard.realm'],['/人气排行榜 '+ '1'+'0'.repeat(400),'leaderboard.popularity']]){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('rank alias escaped')});assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,`/api/v2/robot/business/${op}`);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});}
});

test('flymail home/send/mute/unmute use one v2 HTTP and preserve parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessFlyMail','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_FLYMAIL_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'&&!r.text.includes('Infinity')))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);const bid=row.args.target?.bid??row.args.targetBid;e.MessageMentions=bid?[{UserId:bid,UserKey:bid,IsMaster:false,IsBot:false}]:[];
  await dispatchRouterEvent(e,async()=>{throw new Error('flymail escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('companion queries combine access and original reads in one v2 HTTP, with original parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('companion query escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
 for(const [text,page]of [['/赠礼记录 0','1'],['/赠礼记录 0002','2'],['/赠礼记录 '+'1'+'0'.repeat(400),'1']]){answer=muted;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('gift page escaped')});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{mode:'all',page});}
});

test('companion accept/reject/breakup join access, inbox, repeat and transactions in one v2 HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_ACTION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=35);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('companion action escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('companion dual cultivation/oath upgrade join access, preview, repeat and transactions in one v2 HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionCultivation','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_CULTIVATION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=20);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('companion action escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('companion shop joins admission, original preview, settlement and repeat in one v2 HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionShop','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_SHOP_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:'companion.shop-purchase',args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=25);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'&&!r.text.includes('null')))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('companion action escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('companion propose/gift join admission, target resolution and original command functions in one v2 HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCompanionCommands','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMPANION_COMMAND_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=45);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);if(row.args.targetBid)e.MessageMentions=[{UserId:row.args.targetBid,UserKey:row.args.targetBid,IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('companion action escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy reads join original access and queries in one v2 HTTP and preserve parent middleware fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=25);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy query escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy join and advancement join identity, access, repeat and mutation in one v2 HTTP with original parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyProgression','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=40);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy progression escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy guide end and condense combine original command and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyGuideActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=16);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy guide escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy refining combines expiry, repeat and original command in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyRefining','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=39);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy refining escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy condense combines settlement, repeat and tutorial in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyCondense','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy condense escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy craft combines recipe, overflow confirmation and session in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyCraft','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=27);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy craft escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('alchemy auto craft combines selection and settlement in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAlchemyAuto','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=50);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('alchemy auto craft escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('profession tools combine listing and replacement in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessProfessionTools','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=77);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('profession tools escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('profession dashboard combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessProfessionDashboard','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=33);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('profession dashboard escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('lingzhi guide combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLingzhiGuideV1AndState$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,33);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('lingzhi guide escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave logs combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveLogsV1AndReadOnly$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,37);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave logs escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave view combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveViewV1AndReadOnly$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,76);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave view escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave nearby combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveNearbyV1AndState$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,23);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave nearby escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave visit combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveVisitV1TargetsAndPrivacy$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,91);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('cave visit escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave cultivate combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveCultivateV1TransactionAndReceipt$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,91);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave cultivate escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave plant combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCavePlantV1TransactionsAndSelection$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,136);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave plant escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave actions combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveActionsV1StateAndReceipts$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,278);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave actions escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave social combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveSocialV1TargetsAndTransactions$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,206);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  if(row.args.ownerBid)e.MessageMentions=[{UserId:row.args.ownerBid,UserKey:row.args.ownerBid,IsMaster:false,IsBot:false}];
  await dispatchRouterEvent(e,async()=>{throw new Error('cave social escaped fallback')});
  assert.equal(e.__res,undefined);assert.equal(e.uid,1);assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});

test('cave formations combines original read and admission in one v2 HTTP with parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveFormationsV1LifecycleAndReadOnly$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,199);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('cave formations escaped fallback')});
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[`/api/v2/robot/business/${row.op}`],row.text);assert.equal(e.__res,undefined);assert.equal(e.uid,1,row.text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.args);
 }
});


test('skill visibility routes use one API for original mutations, refusals, usage and mute fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillVisibilityV1ParityReplayAndAdmission$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_VISIBILITY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,132);
 for(const op of ['skill-books.hide','skill-books.show']) {
  const original=rows.find(r=>r.op===op&&r.result.success&&r.result.branch==='business'&&r.arguments.bookId==='1');
  const command=op.endsWith('hide')?'隐藏功法':'显示功法';
  for(const text of ['＃'+command+' 0001','/'+command+' 1.5 extra','/'+command+' 1e2'])rows.push({...original,text,arguments:{bookId:text.includes('0001')?'0001':text.includes('1.5')?'1.5':'1e2'}});
 }
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill visibility escaped parent fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.op);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('learning one API preserves actual replacements, confirmations, failures and mute priority',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillLearn','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_LEARN=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,153);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('learning escaped parent fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.learn');
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('equipment equip combines admission, original transaction and refusal repeat into one API',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentEquip','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_EQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,144);
 for(const prefix of ['＃','!','！','#']){const row=rows.find(r=>r.text==='/装备 2'&&r.result.success&&r.result.branch==='business');rows.push({...row,text:prefix+'装备 2'});}
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('equipment escaped parent fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/equipment.equip');
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('equipment loadout preserves original outcomes with one API and parent middleware fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipment(UnequipOne|AutoEquip|Loadout)','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_LOADOUT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,132);
 for(const op of ['equipment.auto-equip','equipment.unequip-one'])for(const prefix of ['＃','!','！','#']){
  const row=rows.find(r=>r.op===op&&r.result.success&&r.result.branch==='business');rows.push({...row,text:prefix+row.text.slice(1)});
 }
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('equipment loadout escaped parent fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.op);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('equipment queries preserve aliases and one HTTP for business, refusal and parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_QUERIES=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,175);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>r.text!=='/我的鞋'&&r.text!=='无效指令'))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('equipment queries escaped parent fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.op);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
 for(const text of ['＃我的武器','!我的饰品','！我的法袍','#我的鞋子']) {
  const typeName=text.slice(3);const row=rows.find(r=>r.text==='/'+text.slice(1)&&r.result.success&&r.result.branch==='business');assert.ok(row);
  answer=row.result;calls.length=0;await dispatchRouterEvent(event(text),async()=>{throw new Error('alias escaped')});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{typeName});
 }
});


test('equipment decompose combines original writes, failures, numeric input and parent fallback in one HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentDecompose','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_DECOMPOSE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,200);
 for(const prefix of ['＃','!','！','#']){const row=rows.find(r=>r.text==='/分解装备 2'&&r.result.success&&r.result.branch==='business');rows.push({...row,text:prefix+'分解装备 2'});}
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('equipment decompose escaped parent fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/equipment.decompose');
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

// Exercise the installed framework's subscription continuation, rather than
// treating a subscription next as an ordinary route parent next.
import {expendSubscribeMount} from '../node_modules/alemonjs/lib/application/runtime/event-processor-subscribe.js';
import {getSubscribeList} from '../node_modules/alemonjs/lib/application/runtime/store.js';

test('equipment batch actual subscriptions use one API per event and route current middleware receipt to outer res',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEquipmentBatchDecompose','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EQUIPMENT_BATCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,132);
 let answer:object;const calls=transport(t,()=>answer);
 const clean=()=>{for(const select of ['message.create','private.message.create','interaction.create','private.interaction.create'] as const)getSubscribeList('mount',select).forEach(node=>{node.data.status='paused';});};
 t.after(clean);
 for(const row of rows.filter(r=>r.op==='equipment.batch-decompose-query'))for(const result of [row.result,muted,handled,rejected]){
  clean();answer=response(result);calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('batch query escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/equipment.batch-decompose-query');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
 for(const row of rows.filter(r=>r.op==='equipment.batch-decompose')){
  clean();const name=row.arguments.gradeId===null?'全部':row.arguments.gradeId==='1'?'一品':'三品';
  const preview=rows.find(r=>r.state==='ready'&&r.arguments.gradeName===name);answer=response(preview.result);calls.length=0;
  await dispatchRouterEvent(event(preview.text),async()=>{throw new Error('preview escaped')});assert.equal(calls.length,1);
  let selected:any;getSubscribeList('mount','message.create').forEach(node=>{if(node.data.status==='active'&&node.data.keys.UserId==='player'){selected=node;return true;}});assert.ok(selected,'preview must mount a real subscription');
  answer=row.v2Status===200?response(row.result):{status:row.v2Status,headers:{},data:JSON.stringify(row.v1)};
  calls.length=0;const e=event('确认分解');let downstream:Promise<void>|undefined;
  const invocation=new Promise<void>((resolve,reject)=>{
   const original=selected.data.current;
   selected.data.current=async(...args:any[])=>{try{await original(...args);await downstream;resolve();}catch(err){reject(err);throw err;}};
   expendSubscribeMount(e,e.name,()=>{downstream=dispatchRouterEvent(e,async()=>{throw new Error('confirmation escaped outer fallback')});});
  });
  if(row.v2Status!==200)await assert.rejects(invocation);else await invocation;
  assert.equal(calls.length,1,JSON.stringify(row.arguments));assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/equipment.batch-decompose');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);
  assert.equal(selected.data.status,'paused','confirmation must not reactivate itself after hook next');
 }
});


test('skill decompose preserves original refund and refusal branches in one HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillDecompose','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_DECOMPOSE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,86);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows){answer=row.result;calls.length=0;const e=event(row.text);await dispatchRouterEvent(e,async()=>{throw new Error('skill decompose escaped fallback')});assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.decompose');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);}
});


test('skill batch actual subscriptions use one API per event and route current middleware receipt to outer res',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchDecompose','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_BATCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
 let answer:object;const calls=transport(t,()=>answer);
 const clean=()=>{for(const select of ['message.create','private.message.create','interaction.create','private.interaction.create'] as const)getSubscribeList('mount',select).forEach(node=>{node.data.status='paused';});};
 t.after(clean);
 for(const row of rows.filter(r=>r.op==='skill-books.batch-decompose-query'))for(const result of [row.result,muted,handled,rejected]){
  clean();answer=response(result);calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('batch query escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.batch-decompose-query');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
 for(const row of rows.filter(r=>r.op==='skill-books.batch-decompose')){
  clean();const name=row.arguments.gradeId===null?'全部':row.arguments.gradeId==='1'?'下品':'上品';
  const preview=rows.find(r=>r.state===(name==='下品'?'large':'first')&&r.arguments.gradeName===name);answer=response(preview.result);calls.length=0;
  await dispatchRouterEvent(event(preview.text),async()=>{throw new Error('preview escaped')});assert.equal(calls.length,1);
  let selected:any;getSubscribeList('mount','message.create').forEach(node=>{if(node.data.status==='active'&&node.data.keys.UserId==='player'){selected=node;return true;}});assert.ok(selected,'preview must mount a real subscription');
  answer=row.v2Status===200?response(row.result):{status:row.v2Status,headers:{},data:JSON.stringify(row.v1)};
  calls.length=0;const e=event('确认分解');let downstream:Promise<void>|undefined;
  const invocation=new Promise<void>((resolve,reject)=>{
   const original=selected.data.current;
   selected.data.current=async(...args:any[])=>{try{await original(...args);await downstream;resolve();}catch(err){reject(err);throw err;}};
   expendSubscribeMount(e,e.name,()=>{downstream=dispatchRouterEvent(e,async()=>{throw new Error('confirmation escaped outer fallback')});});
  });
  if(row.v2Status!==200)await assert.rejects(invocation);else await invocation;
  assert.equal(calls.length,1,JSON.stringify(row.arguments));assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.batch-decompose');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);
  assert.equal(selected.data.status,'paused','confirmation must not reactivate itself after hook next');
 }
});

test('skill batch learning preview, confirmation and cancel keep one HTTP with current backend admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchLearn','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_BATCH_LEARN=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,66);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('batch learning escaped fallback')});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.batch-learn');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
 for(const [text,mode] of [['一键学习功法','preview'],['#一键学习功法 确认','execute'],['/一键学习功法 是','preview'],['！取消一键学习功法','cancel']]){
  answer=rows.find(r=>r.state==='first'&&r.mode===mode).result;calls.length=0;const e=event(text);
  await dispatchRouterEvent(e,async()=>{throw new Error('batch alias escaped')});assert.equal(calls.length,1,text);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{mode});
 }
 answer=JSON.parse([...output.matchAll(/ROBOT_ROUTE_VALIDATION=(.+)/g)][0][1]).result;calls.length=0;
 await dispatchRouterEvent(event('/一键学习功法 确认 多余'),async()=>{throw new Error('backend validation escaped')});
 assert.equal(calls.length,1,'backend now refuses extra arguments in the same business API');
});

test('learned and hidden books retain slot/page rendering after one HTTP and backend admission',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLearnedBooks','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LEARNED_BOOKS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,254);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('learned list escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.op);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('all three skill unequip exports preserve current backend admission and one HTTP per message',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillUnequip','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_UNEQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,147);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('unequip escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.unequip');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('proficiency usage, consumption and backend refusals each use one HTTP after exact route',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillProficiency','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_PROFICIENCY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,224);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('proficiency escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.proficiency');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('skill detail input, effects and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillDetail','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_DETAIL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,146);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.detail');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('skill switching list, confirmation and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillSwitch','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_SWITCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,126);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill switching escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.switch');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('skill batch upgrade selection, execution and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchUpgrade','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_BATCH_UPGRADE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,185);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.batch-upgrade');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('skill reset preview, confirmation, cancellation and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillReset','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_RESET=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,172);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.reset');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('skill reroll options, preview, confirmation, cancellation and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillReroll','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_REROLL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,228);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.reroll');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('skill wudao options and settlement and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillWudao','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_WUDAO=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,156);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.wudao');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storage lock/unlock category, instance and name and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageLock','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_LOCK=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,442);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul wash confirmation/cancellation and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulWashDecision','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_WASH_DECISION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,106);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul separation preview/execute and repeat branches and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulUnequip','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_UNEQUIP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,130);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill detail escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-artifacts.unequip');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('soul grade upgrade and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulGrade','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_GRADE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,217);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul grade escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-artifacts.grade-upgrade');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('soul level upgrade and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulUpgrade','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_UPGRADE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,235);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul grade escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-artifacts.upgrade');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('soul detail and info queries and backend refusals stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulOverview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,314);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul overview escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('soul wash preview, single-count refusal and middleware fallback stay inside one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulWashPreview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_WASH_PREVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,178);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul wash preview escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-artifacts.wash');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('realm overview and backend refusal use exactly one game HTTP and consume parent fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRealmOverview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_REALM_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,15);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('realm escaped fallback')});
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/realm.overview');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});




test('notification history page validation/refusals and parent fallback use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNotificationHistory','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_NOTIFICATION_HISTORY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('history escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/notifications.history');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('storage menu, props and materials use one HTTP including backend refusals and fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageBag','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_BAG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,495);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('storage escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('storage lootbox list, invalid page and configuration branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageLootboxes','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_LOOTBOXES=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,238);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('lootbox escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storage.lootboxes');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storage profession list, invalid page and eligibility branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageProfession','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_PROFESSION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,180);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('profession bag escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storage.profession-tools');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storage skill book list, invalid page and eligibility branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageSkillBooks','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_SKILL_BOOKS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,286);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('skill book bag escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storage.skill-books');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storage equipment list, invalid page and eligibility branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageEquipment','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_EQUIPMENT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,308);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('equipment bag escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storage.equipment');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storage soul artifact list, invalid page and configuration branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorageSoulArtifacts','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORAGE_SOUL_ARTIFACTS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,210);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul bag escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storage.soul-artifacts');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('leaderboard menu and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLeaderboardMenu','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LEADERBOARD_MENU=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,12);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('leaderboard menu escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/leaderboard.menu');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('task panel aliases and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTaskPanel','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TASK_PANEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,54);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('task panel escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/task-panel.view');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('group subscription toggles and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessGroupSubscription','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_GROUP_SUBSCRIPTION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,96);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);Object.assign(e,{isPrivate:row.arguments.isPrivate,Platform:row.arguments.platform,ChannelId:row.arguments.channelId,BotId:row.arguments.botId??undefined,Target:row.arguments.targetScope==='channel'?{scope:'channel'}:undefined});
  await dispatchRouterEvent(e,async()=>{throw new Error('group subscription escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('attribute panel aliases and admission branches use one game HTTP',async t=>{
 const assets=registerHooks({load(url,context,nextLoad){if(/\.(png|jpe?g|webp|svg|scss|css|ttf|woff2?)$/.test(url))return{format:'module',shortCircuit:true,source:`export default ${JSON.stringify(url)}`};return nextLoad(url,context)}});
 t.after(()=>assets.deregister());
 t.mock.method(ImageCache.prototype,'getOrCreate',async()=>null);
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessAttributePanel','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ATTRIBUTE_PANEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,21);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('attribute panel escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/attributes.panel');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('battle template operations and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBattleTemplates','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BATTLE_TEMPLATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,121);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('battle template escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.op);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul state aliases and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulPathState','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_STATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,110);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul state escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-path.state');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul supply directions and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulSupply','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_SUPPLY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,81);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul supply escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-path.supply');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul nurture directions and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulNurture','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_NURTURE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,104);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul nurture escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-path.nurture');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul confirmation tokens and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulConfirm','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_CONFIRM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,28);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-path.confirm');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul preview actions and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulPreview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_PREVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-path.'+row.action+'-preview');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('soul comparison and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSoulCompare','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SOUL_COMPARE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,13);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/soul-path.compare');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storyline ranking and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineRanking','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_RANKING=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,120);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/leaderboard.storyline');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storyline all chests and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineAllChests','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_ALL_CHESTS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,60);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.chests-claim-all');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storyline chapter chests and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChapterChests','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CHAPTER_CHESTS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,420);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.chests-claim');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storyline catalog and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineCatalog','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CATALOG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,160);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.catalog');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storyline sweep and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineSweep','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_SWEEP=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,630);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.sweep');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('storyline challenge and admission branches use one game HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChallenge','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CHALLENGE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,144);
 t.mock.timers.enable({apis:['setTimeout']});
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('soul confirm escaped fallback')});
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.challenge');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});


test('storyline choice actual subscribe phase uses one game HTTP and reaches outer fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChoice','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_CHOICE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,63);
 t.mock.timers.enable({apis:['setTimeout']});
 let answer:unknown;const calls=transport(t,()=>response(answer));
 const clear=()=>{const list=getSubscribeList('mount','message.create');list.resetCursor();while(list.popNext())list.removeCurrent();};
 t.after(clear);
 const defaultInitial=rows.find(r=>r.initial).initial;
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  clear();const start=event('/主线挑战 1-1');
  answer={success:true,branch:'business',middleware:combinedEntry,data:{...(row.initial??defaultInitial),sessionId:row.arguments.sessionId}};
  await dispatchRouterEvent(start,async()=>{throw new Error('choice setup escaped')});
  answer=result;calls.length=0;
  const e=event(row.text);e.MessageId='choice-event';
  let selected:any;getSubscribeList('mount','message.create').forEach(node=>{if(node.data.status==='active'&&node.data.keys.UserId==='player'){selected=node;return true;}});assert.ok(selected,'start must mount actual choice subscription');
  let downstream:Promise<void>|undefined;let fallback=0;
  const invocation=new Promise<void>((resolve,reject)=>{
   const original=selected.data.current;
   selected.data.current=async(...args:any[])=>{try{await original(...args);await downstream;resolve();}catch(err){reject(err);throw err;}};
   expendSubscribeMount(e,e.name,()=>{
    fallback++;assert.ok(e.__res,'subscribe must attach original choice event');
    downstream=dispatchRouterEvent(e,async()=>{throw new Error('choice escaped original fallback')});
   });
  });
  await invocation;
  assert.equal(selected.data.status,'paused','consumed subscription must stay cancelled');
  assert.equal(calls.length,1,row.state+' '+row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.choice');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);
  assert.equal(fallback,(result.success&&result.branch==='middleware')?1:0);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

import storylineForState from '../src/response/storyline/challenge/res';
import fallbackForState from '../src/response/mwBusinessFallback';
import {useSubscribe} from 'alemonjs';

test('storyline state timers use one combined HTTP, stop on refusals and retain the correct outer fallback event',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessStorylineState','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_STORYLINE_STATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,9);
 t.mock.timers.enable({apis:['setTimeout']});
 const originalTimer=globalThis.setTimeout;const timers:Array<{callback:()=>void;delay:number}>=[];
 t.mock.method(globalThis,'setTimeout',((callback:(...args:any[])=>void,delay?:number,...args:any[])=>{if(delay===31000||delay===3000)timers.push({callback:()=>callback(...args),delay});return originalTimer(callback,delay,...args);}) as typeof setTimeout);
 const clean=()=>{for(const select of ['message.create','private.message.create','interaction.create','private.interaction.create'] as const)getSubscribeList('mount',select).forEach(node=>{node.data.status='paused';});};t.after(clean);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  clean();timers.length=0;const e=event('/主线挑战 1-1');let nextCalls=0;let downstream:Promise<void>|undefined;
  answer={success:true,branch:'business',middleware:combinedEntry,data:{...(row.initial??rows[0].initial),sessionId:row.arguments.sessionId}};
  await withEventContext(e,()=>{nextCalls++;downstream=withEventContext(e,()=>{throw new Error('state escaped fallback')},()=>fallbackForState.current(e));},()=>storylineForState.current(e));
  const timer=timers.find(t=>t.delay===31000);assert.ok(timer);timers.length=0;calls.length=0;answer=result;
  timer.callback();await new Promise<void>(resolve=>setImmediate(resolve));await downstream;
  assert.equal(calls.length,1,row.state);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/storyline.state');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);
  assert.equal(nextCalls,result.success&&result.branch==='middleware'?1:0);assert.equal(e.__res,undefined);
  const pending=result.success&&result.branch==='business'&&!result.data.finished;
  assert.deepEqual(timers.map(t=>t.delay),pending?[3000]:[]);
 }
 // A subsequent timer belongs to the latest choice, not the original start.
 clean();timers.length=0;
 const row=rows[0],start=event('/主线挑战 1-1');let startNext=0;
 answer={success:true,branch:'business',middleware:combinedEntry,data:row.initial};
 await withEventContext(start,()=>{startNext++;},()=>storylineForState.current(start));
 let selected:any;getSubscribeList('mount','message.create').forEach(node=>{if(node.data.status==='active'&&node.data.keys.UserId==='player'){selected=node;return true;}});assert.ok(selected);
 const choice=event('普攻');choice.MessageId='choice-before-poll';let downstream:Promise<void>|undefined;let choiceNext=0;
 timers.length=0;
 const invocation=new Promise<void>((resolve,reject)=>{const original=selected.data.current;selected.data.current=async(...args:any[])=>{try{await original(...args);resolve();}catch(err){reject(err);throw err;}};expendSubscribeMount(choice,choice.name,()=>{choiceNext++;assert.ok(choice.__res);downstream=dispatchRouterEvent(choice,async()=>{throw new Error('choice timer escaped fallback')});});});
 await invocation;
 let competing=0;
 withEventContext(choice,()=>{},()=>{const [subscribe]=useSubscribe(['message.create']);subscribe.mount(()=>{competing++;},['UserId']);});
 const timer=timers.find(t=>t.delay===31000);assert.ok(timer);calls.length=0;answer=muted;
 timer.callback();await new Promise<void>(resolve=>setImmediate(resolve));await downstream;
 assert.equal(calls.length,1);assert.equal(choiceNext,1);assert.equal(startNext,0);assert.equal(competing,0,'middleware must bypass other subscriptions');assert.equal(choice.__res,undefined);assert.equal(start.__res,undefined);assert.equal(selected.data.status,'paused');
});

test('limited event query routes use one game HTTP across views, private guard and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLimitedEventQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LIMITED_EVENT_QUERY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>['overview','tasks','tokens'].includes(r.kind)))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e:GameEvent={...event(row.text),isPrivate:row.private};
  await dispatchRouterEvent(e,async()=>{throw new Error('limited event view escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.text+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/limited-event.'+row.kind);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
 const row=rows.find(r=>r.kind==='overview'&&r.state==='ready');answer=row.result;calls.length=0;
 await dispatchRouterEvent(event('/查看特殊活动'),async()=>{throw new Error('overview alias escaped fallback')});assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/limited-event.overview');
});

test('limited event write routes use one HTTP for success, input refusal and outer middleware branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLimitedEventWrites','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LIMITED_EVENT_WRITE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>['task-claim'].includes(r.kind)))for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('limited event write escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.text);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/limited-event.'+row.kind);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

import eventPaymentFallback from '../src/response/mwBusinessFallback';

test('weekly rebate claim routes use one HTTP for all days, input refusals and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessWeeklyRebateClaim','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_WEEKLY_REBATE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,154);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('weekly claim escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.input);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/recharge.weekly-rebate-claim');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('newcomer recharge claim routes use one HTTP for all days, input refusals and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNewcomerRechargeClaim','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_NEWCOMER_RECHARGE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,200);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('newcomer claim escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.input);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/recharge.newcomer-claim');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('first recharge claim routes use one HTTP for all days, input refusals and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessFirstRechargeClaim','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_FIRST_RECHARGE_CLAIM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,100);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('first recharge claim escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.input);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/recharge.first-claim');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('recharge information routes use one HTTP across eligibility, errors and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRechargeQueries','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RECHARGE_QUERY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,36);
 const commands:Record<string,string>={first:'/礼包奖励',newcomer:'/新人返利',weekly:'/周周返利'};
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(commands[row.kind]);
  await dispatchRouterEvent(e,async()=>{throw new Error('recharge query escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.kind);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/recharge.'+row.kind+'-info');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('recharge catalog route aggregates privacy, catalog and menu permissions in one HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRechargeCatalog','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RECHARGE_CATALOG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,18);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event('/充值');e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('catalog escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/recharge.catalog');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('normal payment create and background observations each use one HTTP and the original outer fallback',async t=>{
 const assets=registerHooks({load(url,context,nextLoad){if(/\.(png|jpe?g|webp|svg|scss|css|ttf|woff2?)$/.test(url))return{format:'module',shortCircuit:true,source:`export default ${JSON.stringify(url)}`};return nextLoad(url,context)}});t.after(()=>assets.deregister());
 t.mock.method(ImageCache.prototype,'getOrCreate',async()=>Buffer.from('payment-image'));
 const timers:Array<()=>void>=[];let cleared=false;
 t.mock.method(globalThis,'setInterval',((fn:()=>void,delay:number)=>{assert.equal(delay,10000);timers.push(fn);return {} as ReturnType<typeof setInterval>}) as typeof setInterval);
 t.mock.method(globalThis,'clearInterval',()=>{cleared=true;});
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNormalPayment','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const creates=[...output.matchAll(/ROBOT_NORMAL_PAYMENT_CREATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(creates.length,126);
 const observes=[...output.matchAll(/ROBOT_NORMAL_PAYMENT_OBSERVE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(observes.length,22);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of creates)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e:GameEvent={...event(row.input),isPrivate:row.private};
  await dispatchRouterEvent(e,async()=>{throw new Error('payment create escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.input);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/normal.payment-create');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);
 }
 const {default:eventPaymentForPoll}=await import('../src/response/recharge/pay/res');
 const checkout=creates.find(r=>r.state==='ready'&&r.private&&r.status===201).result;
 const pending=observes.find(r=>r.state==='PENDING'&&r.operation==='state').result;
 for(const row of observes)for(const result of [row.result,muted,handled,rejected]){
  timers.length=0;answer=checkout;const e:GameEvent={...event('/充值购买 1'),isPrivate:true};let nextCalls=0;let downstream:Promise<void>|undefined;
  await withEventContext(e,()=>{nextCalls++;assert.ok(e.__res);downstream=withEventContext(e,()=>{throw new Error('payment poll escaped fallback')},()=>eventPaymentFallback.current(e));},()=>eventPaymentForPoll.current(e));
  assert.equal(timers.length,1);const timer=timers[0];cleared=false;
  if(row.operation==='timeout'){answer=pending;for(let i=0;i<29;i++){calls.length=0;timer();await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(calls.length,1);}}
  calls.length=0;answer=result;timer();await new Promise<void>(resolve=>setImmediate(resolve));await downstream;
  assert.equal(calls.length,1,row.state+' '+row.operation);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/normal.payment-'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{orderNo:checkout.data.checkout.order.orderNo});
  assert.equal(nextCalls,result.success&&result.branch==='middleware'?1:0);assert.equal(e.__res,undefined);
  const ongoing=result.success&&result.branch==='business'&&['PENDING','PAID'].includes(result.data.order.status)&&!result.data.timedOut;
  assert.equal(cleared,!ongoing);
 }
});

test('world milestone routes aggregate realm, business and repeated failures into one HTTP',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessWorldMilestones','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_WORLD_MILESTONE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,32);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('world milestone escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.operation);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/world-milestones.'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('peiyuan cancel route uses one HTTP including missing pending and repeated refusal',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessPeiyuanCancel','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_PEIYUAN_CANCEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,14);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event('/取消培元丹');
  await dispatchRouterEvent(e,async()=>{throw new Error('peiyuan cancel escaped fallback')});
  assert.equal(calls.length,1,row.state);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/peiyuan.cancel');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('security center route uses one HTTP for private and public commands and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSecurityCenter','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SECURITY_CENTER=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,18);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event('/安全中心');e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('security center escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/account.security-center');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('login window route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLoginWindow','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LOGIN_WINDOW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,16);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event('/登录');e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('login window escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/account.login');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('set password route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSetPassword','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SET_PASSWORD=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,72);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.arguments.input);e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('set password escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/account.set-password');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('bind email route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessBindEmail','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_BIND_EMAIL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,72);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.arguments.input);e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('bind email escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/account.bind-email');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('verify email route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessVerifyEmail','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_VERIFY_EMAIL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,78);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.arguments.input);e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('verify email escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/account.verify-email');assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('email and account changes route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessEmailChange','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_EMAIL_CHANGE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,264);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.arguments.input);e.isPrivate=row.private;
  await dispatchRouterEvent(e,async()=>{throw new Error('email and account changes escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,1);
 }
});

test('tasks overview route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTasksOverview','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TASKS_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,13);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event('/任务');
  await dispatchRouterEvent(e,async()=>{throw new Error('tasks overview escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/tasks.overview');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,result.middleware.identity.account.playerId??undefined);
 }
});

test('task runtime actions route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTaskActions','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TASK_ACTIONS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,65);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.command);
  await dispatchRouterEvent(e,async()=>{throw new Error('task runtime actions escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,result.middleware.identity.account.playerId??undefined);
 }
});

test('task alias and clear route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTaskConfig','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TASK_CONFIG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,108);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.command);
  await dispatchRouterEvent(e,async()=>{throw new Error('task alias and clear escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.operation==='tasks.alias'?{slot:row.slot,alias:row.alias.trim().replace(/\s+/g,' ')}:row.arguments);assert.equal(e.__res,undefined);assert.equal(e.uid,result.middleware.identity.account.playerId??undefined);
 }
});

test('task settings route uses one HTTP for credentials, public refusal and all admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTaskSettings','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TASK_SETTINGS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,182);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const result of [row.result,muted,handled,rejected]){
  answer=result;calls.length=0;const e=event(row.command);
  await dispatchRouterEvent(e,async()=>{throw new Error('task settings escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.private);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/tasks.settings');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{slot:row.slot,step:row.step,content:row.content.trim().replace(/\s+/g,' ')});assert.equal(e.__res,undefined);assert.equal(e.uid,result.middleware.identity.account.playerId??undefined);
 }
});


test('public navigation routes use one HTTP and preserve public identity without supplemental APIs',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNavigation','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_NAVIGATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,26);
 const commands:Record<string,string[]>={'navigation.more':['/更多','/更多 修行','/更多 不存在','/更多 修行 2','/折叠','/扩展'],'navigation.help':['/帮助','/帮助 0','/帮助 1','/帮助 2','/帮助 3','/帮助 99','/help']};
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows.filter(r=>!r.fault))for(const command of commands[row.operation])for(const isPrivate of [false,true]){
  answer=row.result;calls.length=0;const e=event(command);e.UserId=row.bid;e.isPrivate=isPrivate;
  await dispatchRouterEvent(e,async()=>{throw new Error('public navigation escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+command);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});assert.equal(e.__res,undefined);assert.equal(e.uid,row.result.middleware.identity.account.playerId??undefined);
 }
});


test('registration routes use one HTTP for original outcomes and preserve region precedence',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRegistration','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_REGISTRATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,78);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const isPrivate of [false,true])for(const location of [{guild:row.region,channel:'channel',expected:row.region},{guild:undefined,channel:row.region,expected:row.region},{guild:'',channel:row.region,expected:''}]){
  answer=row.result;calls.length=0;const e=event(row.command);e.UserId=row.bid;e.isPrivate=isPrivate;e.GuildId=location.guild as string;e.ChannelId=location.channel;
  await dispatchRouterEvent(e,async()=>{throw new Error('registration escaped fallback')});
  assert.equal(calls.length,1,row.state+' '+row.command);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/account.register');assert.deepEqual(JSON.parse(calls[0].data!).arguments,{region:location.expected});assert.equal(e.__res,undefined);
 }
});

test('public entries retain their position before QQ guild compatibility middleware',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^(TestRobotBusinessNavigation|TestRobotBusinessRegistration|TestRobotBusinessBooksPublic|TestRobotBusinessGlossaryQueries)','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const navigation=[...output.matchAll(/ROBOT_NAVIGATION=(.+)/g)].map(m=>JSON.parse(m[1]));
 const registrations=[...output.matchAll(/ROBOT_REGISTRATION=(.+)/g)].map(m=>JSON.parse(m[1]));
 const books=[...output.matchAll(/ROBOT_BOOKS_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({operation:m[1],bid:m[3],result:JSON.parse(m[4]).data}));
 const glossary=[...output.matchAll(/ROBOT_GLOSSARY_PUBLIC_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({bid:m[1],operation:m[2],result:JSON.parse(m[4]).data}));
 const cases=[
  ...navigation.filter(r=>['guest','muted'].includes(r.state)).map(r=>({...r,command:r.operation==='navigation.more'?'/更多':'/帮助'})),
  ...registrations.filter(r=>['guest','muted','existing'].includes(r.state)&&['/踏入仙途','/我是 清风'].includes(r.command)).map(r=>({...r,operation:'account.register'})),
  ...books.filter(r=>r.operation==='tianshu.content').map(r=>({...r,command:'/天书'})),
  ...glossary.map(r=>({...r,command:r.operation==='glossary.query'?'/词典':'/词典分类'}))
 ];
 assert.equal(cases.length,26);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of cases)for(const tag of ['AT_MESSAGE_CREATE','DIRECT_MESSAGE_CREATE','MESSAGE_CREATE','GROUP_AT_MESSAGE_CREATE','C2C_MESSAGE_CREATE']){
  answer=row.result;calls.length=0;const e=event(row.command);Object.assign(e,{UserId:row.bid,Platform:'qq-bot',_tag:tag,GuildId:'guild',ChannelId:'channel',Target:{scope:'channel',targetId:'channel'}});
  await dispatchRouterEvent(e,async()=>{throw new Error('public entry escaped fallback')});
  assert.equal(calls.length,1,row.operation+' '+tag);assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);assert.equal(e.__res,undefined);assert.equal(e.isQQBotGuild,undefined);
 }
 // A normal game command still runs the original QQ guild restriction.
 calls.length=0;const e=event('/我的资料');Object.assign(e,{Platform:'qq-bot',_tag:'AT_MESSAGE_CREATE'});
 await dispatchRouterEvent(e,async()=>{throw new Error('normal game command escaped fallback')});assert.equal(calls.length,0);assert.equal(e.isQQBotGuild,true);
});

test('combined task projections preserve branch boundaries and reject runtime data', () => {
 const identity = combinedEntry.identity;
 const base = { identity, replies: [], contextWarnings: [] };
 const decode = () => { throw new Error('middleware branch decoded as business'); };
 for (const outcome of ['started', 'expected', 'not_running', 'invalid_runtime']) {
  const middleware = { ...base, outcome: 'handled', reason: 'TASK', taskContinuation: { outcome, ...(['started','expected'].includes(outcome) ? { command: '签到' } : {}) } };
  assert.equal(parseRobotBusinessEnvelope({ success: true, branch: 'middleware', middleware }, 'player', decode).branch, 'middleware');
  assert.throws(() => parseRobotMiddlewareResult(middleware,'player'));
 }
 for (const outcome of ['next','completed']) {
  const taskContinuation = { outcome, ...(outcome === 'next' ? { command: '我的资料' } : {}) };
  const middleware = { ...base, outcome: 'handled', reason: 'TASK_UNMATCHED', taskContinuation };
  assert.equal(parseRobotBusinessEnvelope({ success: true, branch: 'middleware', middleware }, 'player', decode).branch,'middleware');
  assert.equal(parseRobotBusinessEnvelope({ success: true, branch: 'business', middleware: { ...combinedEntry, taskContinuation }, data: 'ok' }, 'player', value => value).success,true);
 }
 const failed = { ...base, outcome: 'reject', reason: 'TASK_ERROR' };
 assert.equal(parseRobotBusinessEnvelope({ success: false, branch: 'middleware', middleware: failed }, 'player', decode).success,false);
 assert.throws(() => parseRobotBusinessEnvelope({ success: true, branch: 'middleware', middleware: failed }, 'player', decode));
 for (const taskContinuation of [
  null, {}, { outcome: 'next' }, { outcome: 'expected' }, { outcome: 'started', command: '' },
  { outcome: 'other' }, { outcome: 'next', command: 1 }, { outcome: 'next', command: '签到', message: 1 },
  { outcome: 'next', command: '签到', runtime: {} }, { outcome: 'next', command: '签到', uid: 1 },
  { outcome: 'next', command: '签到', steps: ['签到'] }, { outcome: 'not_running' }
 ]) {
  assert.throws(() => parseRobotBusinessEnvelope({ success: true, branch: 'business', middleware: { ...combinedEntry, taskContinuation }, data: 'bad' }, 'player', value => value));
 }
 for (const middleware of [
  { ...base, outcome: 'handled', reason: 'TASK' },
  { ...base, outcome: 'handled', reason: 'TASK_UNMATCHED' },
  { ...base, outcome: 'handled', reason: 'TASK', taskContinuation: { outcome: 'next', command: '签到' } },
  { ...base, outcome: 'handled', reason: 'TASK_UNMATCHED', taskContinuation: { outcome: 'expected', command: '签到' } },
  { ...failed, taskContinuation: { outcome: 'next', command: '签到' } },
  { ...base, outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'unregistered', playerId: null } }, taskContinuation: { outcome: 'not_running' } }
 ]) {
  assert.throws(() => parseRobotBusinessEnvelope({ success: true, branch: 'middleware', middleware }, 'player', decode));
 }
});


test('task escape carries original input through exact routing into one combined API', async t => {
 const output = execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTaskContinuationV1OrderAndReplay$','-v','-count=1'], { cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024 });
 const rows=[...output.matchAll(/ROBOT_TASK_CONTINUATION=(.+)/g)].map(m=>JSON.parse(m[1]));
 assert.equal(rows.length,60);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows) for(const prefix of ['/','#','！']) {
  answer=row.result;calls.length=0;const e=event(prefix+'任务 '+row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('task escaped normal fallback')},1);
  assert.equal(e.__res,undefined);
  const matched=row.input.includes('任务清空');
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/'+(matched?'tasks.clear':'tasks.continue')]);
  const body=JSON.parse(calls[0].data!);
  assert.equal(body.taskInput,row.input);assert.equal(body.messageText,matched?'/任务清空 2':'/'+row.input);assert.deepEqual(body.arguments,matched?{slot:'2'}:{});
 }
});

test('task unmatched, home, public and guild paths consume one context with no identity request',async t=>{
 const assets=registerHooks({load(url,context,nextLoad){if(/\.(png|jpe?g|webp|svg|scss|css|ttf|woff2?)$/.test(url))return{format:'module',shortCircuit:true,source:`export default ${JSON.stringify(url)}`};return nextLoad(url,context)}});t.after(()=>assets.deregister());
 let answer:unknown; const calls=transport(t,()=>response(answer));
 const taskNotice={outcome:'next',command:'我的资料'};
 const stopped={success:true,branch:'middleware',middleware:{identity:combinedEntry.identity,outcome:'handled',reason:'TASK',replies:[],contextWarnings:[],taskContinuation:{outcome:'not_running'}}};
 const unmatched={success:true,branch:'middleware',middleware:{...stopped.middleware,reason:'TASK_UNMATCHED',taskContinuation:taskNotice}};
 for(const [text,result,path] of [
  ['/任务 我的资料',business,'/api/v2/robot/home-overview'],
  ['/任务 每日',stopped,'/api/v2/robot/business/tasks.continue'],
  ['/任务 完全未知',unmatched,'/api/v2/robot/business/tasks.continue'],
  ['/任务 攻略',{success:true,branch:'business',middleware:{identity:combinedEntry.identity,outcome:'allow',reason:'ALLOWED',replies:[],contextWarnings:[],taskContinuation:taskNotice},data:{}},'/api/v2/robot/business/navigation.strategy'],
 ] as const) {
  answer=result; calls.length=0;const e=event(text);let escaped=0;
  await dispatchRouterEvent(e,async()=>{escaped++},1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[path]);
  assert.equal(JSON.parse(calls[0].data!).taskInput,text.slice('/任务 '.length));
  assert.equal(escaped,text.includes('完全未知')?1:0);assert.equal(e.__res,undefined);
 }
 for(const text of ['/任务 我的资料','/任务 任务清空 2']) {
  answer=unmatched;calls.length=0;const e={...event(text),Platform:'qq-bot',_tag:'AT_MESSAGE_CREATE'} as GameEvent;
  await dispatchRouterEvent(e,async()=>{throw new Error('guild task escaped compatibility')},1);
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/api/v2/robot/business/tasks.continue']);
  assert.equal(e.isQQBotGuild,true);assert.equal(e.__res,undefined);
 }
});


test('task transport and malformed responses end after one request without next or retry',async t=>{
 let answer:unknown;let status=200;
 const calls=transport(t,()=>response(answer,status));
 for(const text of ['/任务 每日','/任务 任务清空 2','/任务 我的资料'])for(const result of ['transport',null,{}, {success:true,branch:'middleware',middleware:{...combinedEntry,outcome:'handled',reason:'TASK_ERROR'}}]) {
  status=result==='transport'?500:200;answer=result;calls.length=0;const e=event(text);let escaped=0;
  await dispatchRouterEvent(e,async()=>{escaped++},1);
  assert.equal(calls.length,1);assert.equal(e.__res,undefined);assert.equal(escaped,0);
 }
});


test('backend route validation covers every prefix and whitespace including task cursor continuation',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchLearnRouteValidationAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_ROUTE_VALIDATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,36);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows) {
  answer=row.result;calls.length=0;
  const text=row.task?row.text.slice(0,row.text.length-row.input.length)+'任务 '+row.input:row.text;
  const e=event(text);
  await dispatchRouterEvent(e,async()=>{throw new Error('false route validation called next')},row.task?1:2);
  assert.equal(e.__res,undefined);assert.equal(calls.length,1,text);
  assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/skill-books.batch-learn');
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,{mode:'execute'});
  if(row.task) assert.equal(JSON.parse(calls[0].data!).taskInput,row.input);
 }
 const reply={title:'',heading:'',text:'',buttons:[],advice:[],rawLines:['原框架提示']};
 assert.equal(parseRobotBusinessEnvelope({success:false,branch:'business',middleware:{...combinedEntry,replies:[reply]}},'player',()=>{}).success,false);
 for(const raw of [null,[],[1]]) assert.throws(()=>parseRobotBusinessEnvelope({success:false,branch:'business',middleware:{...combinedEntry,replies:[{...reply,rawLines:raw}]}},'player',()=>{}));
 for(const patch of [{title:'额外标题'},{heading:'额外标题'},{text:'额外正文'},{blocks:[]},{quote:''},{buttons:[{label:'额外按钮',command:'/我'}]},{advice:[{command:'/我',description:'额外建议'}]}]) assert.throws(()=>parseRobotBusinessEnvelope({success:false,branch:'business',middleware:{...combinedEntry,replies:[{...reply,...patch}]}},'player',()=>{}));
});


test('all six remaining router gates use one business API including task and admission branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRouteSchemaRefusalAndTaskOrder$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SCHEMA_REFUSAL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,60);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const prefix of ['/','＃','！']) {
  answer=row.result;calls.length=0;const e=event(prefix+(row.task?'任务 ':'')+row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('schema result escaped original middleware fallback')},row.task?1:2);
  assert.equal(e.__res,undefined);assert.equal(calls.length,1,JSON.stringify([row.operation,row.input,row.task,row.muted]));
  assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);
  if(row.task)assert.equal(JSON.parse(calls[0].data!).taskInput,row.input);
 }
});

test('invalid scarecrow arguments reach one backend request and preserve task and mute order',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessScarecrowInvalidRouteTaskOrder$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SCARECROW_INVALID_ROUTE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,28);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const prefix of ['/','＃','！']) {
  answer=row.result;calls.length=0;const e=event(prefix+(row.task?'任务 ':'')+row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('invalid practice escaped middleware fallback')},row.task?1:2);
  assert.equal(e.__res,undefined);assert.equal(calls.length,1,JSON.stringify(row));
  assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/scarecrow.challenge');
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,row.arguments);
  if(row.task)assert.equal(JSON.parse(calls[0].data!).taskInput,row.input);
 }
});

test('command-only guild routes send invalid parameters through one API including task and mute branches',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCommandOnlyRefusalTaskAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_COMMAND_ONLY_REFUSAL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,84);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const prefix of ['/','＃','！']) {
  answer=row.result;calls.length=0;const e=event(prefix+(row.task?'任务 ':'')+row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('command-only result escaped fallback')},row.task?1:2);
  assert.equal(e.__res,undefined);assert.equal(calls.length,1,JSON.stringify([row.operation,row.input,row.task,row.muted]));
  assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,{});
  if(row.task)assert.equal(JSON.parse(calls[0].data!).taskInput,row.input);
 }
});

test('red packet invalid precise routes use one API before refusal or original mute fallback',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRedPacketInvalidRouteTaskAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RED_PACKET_INVALID_ROUTE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,72);
 let answer:unknown;const calls=transport(t,()=>response(answer));
 for(const row of rows)for(const prefix of ['/','＃','！']) {
  answer=row.result;calls.length=0;const e=event(prefix+(row.task?'任务 ':'')+row.input);
  await dispatchRouterEvent(e,async()=>{throw new Error('invalid packet escaped original fallback')},row.task?1:2);
  assert.equal(e.__res,undefined);assert.equal(calls.length,1,JSON.stringify([row.operation,row.input,row.task,row.muted]));
  assert.equal(new URL(calls[0].url).pathname,'/api/v2/robot/business/'+row.operation);
  assert.deepEqual(JSON.parse(calls[0].data!).arguments,{packetId:0});
  if(row.task)assert.equal(JSON.parse(calls[0].data!).taskInput,row.input);
 }
 for(const command of ['领红包','回收红包'])for(const token of ['0001','0','9007199254740993','9'.repeat(400)]) {
  answer=muted;calls.length=0;
  await dispatchRouterEvent(event('/'+command+' '+token),async()=>{throw new Error('numeric packet escaped fallback')});
  assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].data!).arguments,JSON.parse(JSON.stringify({packetId:Number(token)})));
 }
 const nonfiniteOutput=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessRedPacketNonFiniteWireRefusal$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
 const nonfinite=[...nonfiniteOutput.matchAll(/ROBOT_RED_PACKET_NONFINITE_ROUTE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(nonfinite.length,2);
 for(const row of nonfinite) {
  answer=row.result;calls.length=0;const e=event(row.text);
  await dispatchRouterEvent(e,async()=>{throw new Error('nonfinite packet called next')});
  assert.equal(calls.length,1);assert.equal(e.__res,undefined);assert.deepEqual(JSON.parse(calls[0].data!).arguments,{packetId:null});
 }
});


test('home local logger covers the V2 chain below the timing threshold without additional requests', async t => {
  const calls = transport(t, () => response(business));
  const logs: Array<{ stage?: string; commandKey?: string; eventTraceId?: string; requestId?: string; durationMs?: number }> = [];
  const collect = (_label: unknown, value: unknown) => {
    if (value && typeof value === 'object' && 'durationMs' in value) logs.push(value as typeof logs[number]);
  };
  t.mock.method(logger, 'info', collect);
  t.mock.method(logger, 'warn', collect);
  t.mock.method(logger, 'error', () => {});
  const e = event('/我的资料');
  startTransportEvent(e);
  await dispatchRouterEvent(e, async () => { throw new Error('home escaped'); });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/v2/robot/home-overview']);
  for (const stage of ['event.received', 'home.route.import', 'home.route.enter', 'home.task.compatibility', 'home.platform.compatibility', 'home.identity.input', 'home.api.input', 'api.client.create', 'api.sdk.prepare', 'api.http.wait', 'api.sdk.response', 'api.json.parse', 'api.sdk.envelope', 'home.response.validate', 'home.api.total', 'middleware.identity.seed', 'middleware.feature.track', 'home.branch.dispatch', 'home.view.model', 'home.bubble.build', 'home.handler', 'platform.send']) {
    assert.ok(logs.some(log => log.stage === stage), stage);
  }
  assert.ok(logs.every(log => log.commandKey === 'home.overview'));
  assert.equal(new Set(logs.map(log => log.eventTraceId)).size, 1);
  assert.equal(new Set(logs.map(log => log.requestId)).size, 1);
  assert.ok(logs.every(log => typeof log.durationMs === 'number' && log.durationMs >= 0));
});
