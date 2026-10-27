import type { GameEvent } from '../../types/event';
import { measureTransportStageSync } from '../../utils/transportTiming';
import type { HomeOverviewData } from '../schemas/player-overview';
import { BackendAPIError, requestBackend, writeContext } from './client';
import { createBackendReadRequestContext, createBackendRequestContext } from './context';
import type { BackendRequestContext } from './context';
import { businessInputFromEvent, parseRobotMiddlewareResult, type RobotMiddlewareResult } from './middleware-entry';
import { validateHomeOverview } from './player-overview';
import { logger } from 'alemonjs';
import { parseOnboarding, type OnboardingView } from './onboarding';

export type RobotBusinessFollowup = { onboarding?: OnboardingView; onboardingPending?: boolean };

export type RobotBusinessResult<T = unknown> =
  | { success: false; branch: 'business' | 'middleware'; middleware: RobotMiddlewareResult }
  | { success: true; branch: 'middleware'; middleware: RobotMiddlewareResult }
  | ({ success: true; branch: 'business'; middleware: RobotMiddlewareResult; data: T } & RobotBusinessFollowup);

export type RobotBusinessOperation =
  | 'treasures.overview'
  | 'treasures.catalog'
  | 'treasures.preview'
  | 'treasures.confirm'
  | 'ancient-relics.overview'
  | 'spirit-vein.overview'
  | 'alchemy.v2'
  | 'black-box.overview'
  | 'black-box.history'
  | 'black-box.room'
  | 'black-box.reservation'
  | 'black-box.probe'
  | 'black-box.bid-preview'
  | 'black-box.bid'
  | 'onboarding.view'
  | 'onboarding.action'
  | 'onboarding.exit'
  | 'daily-fortune.claim'
  | 'forge.order-preview'
  | 'forge.order-create'
  | 'forge.orders'
  | 'forge.order-accept'
  | 'forge.order-cancel'
  | 'forge.overview'
  | 'forge.preview'
  | 'forge.confirm'
  | 'forge.advance'
  | 'forge.history'
  | 'forge.learn'
  | 'realm.breakthrough'
  | 'realm.promotion'
  | 'meditation.boost-options'
  | 'meditation.start'
  | 'meditation.end'
  | 'meridians.view'
  | 'meridians.pulse'
  | 'seclusion.command'
  | 'seclusion.end'
  | 'green-bottle.capacity'
  | 'green-bottle.store'
  | 'peiyuan.confirm'
  | 'mingwu.confirm'
  | 'lootboxes.open'
  | 'items.consume'
  | 'soul-artifacts.refine'
  | 'items.detail'
  | 'shops.list'
  | 'shops.purchase'
  | 'gacha.overview'
  | 'gacha.named'
  | 'tribulation.command'
  | 'tribulation.public'
  | 'account.register'
  | 'talents.query'
  | 'spirit-root.query'
  | 'spirit-root.materials'
  | 'spirit-root.preview'
  | 'spirit-root.feed'
  | 'spirit-root.promote'
  | 'guide.continue'
  | 'guide.skip'
  | 'tasks.continue'
  | 'navigation.strategy'
  | 'navigation.more'
  | 'navigation.help'
  | 'notifications.group-enable'
  | 'notifications.group-disable'
  | 'battle-templates.list'
  | 'battle-templates.save'
  | 'battle-templates.apply'
  | 'battle-templates.delete'
  | 'soul-path.choose-preview'
  | 'soul-path.switch-preview'
  | 'soul-path.advance-preview'
  | 'soul-path.reroll-preview'
  | 'soul-path.compare'
  | 'soul-path.confirm'
  | 'soul-path.nurture'
  | 'soul-path.supply'
  | 'soul-path.state'
  | 'attributes.panel'
  | 'task-panel.view'
  | 'limited-event.overview'
  | 'limited-event.shop'
  | 'limited-event.recharge'
  | 'limited-event.tasks'
  | 'limited-event.tokens'
  | 'limited-event.task-claim'
  | 'limited-event.recharge-claim'
  | 'limited-event.shop-buy'
  | 'limited-event.payment-create'
  | 'limited-event.payment-state'
  | 'limited-event.payment-timeout'
  | 'recharge.weekly-rebate-claim'
  | 'recharge.newcomer-claim'
  | 'recharge.first-claim'
  | 'recharge.first-info'
  | 'recharge.newcomer-info'
  | 'recharge.weekly-info'
  | 'recharge.catalog'
  | 'tasks.settings'
  | 'tasks.alias'
  | 'tasks.clear'
  | 'tasks.cancel'
  | 'tasks.skip'
  | 'tasks.start'
  | 'tasks.overview'
  | 'account.change-email'
  | 'account.change-account'
  | 'account.verify-email'
  | 'account.bind-email'
  | 'account.set-password'
  | 'account.login'
  | 'account.security-center'
  | 'peiyuan.cancel'
  | 'world-milestones.view'
  | 'world-milestones.claim-all'
  | 'sponsor.status'
  | 'sponsor.payment-create'
  | 'sponsor.payment-state'
  | 'sponsor.payment-timeout'
  | 'normal.payment-create'
  | 'normal.payment-state'
  | 'normal.payment-timeout'
  | 'storyline.state'
  | 'storyline.choice'
  | 'storyline.challenge'
  | 'storyline.sweep'
  | 'storyline.catalog'
  | 'storyline.chests-claim'
  | 'storyline.chests-claim-all'
  | 'leaderboard.storyline'
  | 'leaderboard.menu'
  | 'storage.soul-artifacts'
  | 'storage.equipment'
  | 'storage.skill-books'
  | 'storage.profession-tools'
  | 'storage.lootboxes'
  | 'storage.menu'
  | 'storage.props'
  | 'storage.materials'
  | 'notifications.history'
  | 'realm.overview'
  | 'soul-artifacts.wash'
  | 'soul-artifacts.detail'
  | 'soul-artifacts.info'
  | 'soul-artifacts.upgrade'
  | 'soul-artifacts.grade-upgrade'
  | 'soul-artifacts.unequip'
  | 'soul-artifacts.wash-confirm'
  | 'soul-artifacts.wash-cancel'
  | 'storage.lock'
  | 'storage.unlock'
  | 'skill-books.wudao'
  | 'skill-books.reroll'
  | 'skill-books.reset'
  | 'skill-books.batch-upgrade'
  | 'skill-books.switch'
  | 'skill-books.detail'
  | 'skill-books.proficiency'
  | 'skill-books.unequip'
  | 'skill-books.learned'
  | 'skill-books.hidden'
  | 'skill-books.batch-learn'
  | 'skill-books.batch-decompose-query'
  | 'skill-books.batch-decompose'
  | 'equipment.batch-decompose-query'
  | 'equipment.batch-decompose'
  | 'equipment.decompose'
  | 'equipment.equipped'
  | 'equipment.detail'
  | 'equipment.unequip-one'
  | 'equipment.auto-equip'
  | 'equipment.equip'
  | 'skill-books.decompose'
  | 'skill-books.learn'
  | 'skill-books.hide'
  | 'skill-books.show'
  | 'titles.overview'
  | 'titles.activate'
  | 'titles.deactivate'
  | 'achievements.overview'
  | 'achievements.category'
  | 'achievements.all'
  | 'achievements.completed'
  | 'achievements.combat-power'
  | 'achievements.claim-all'
  | 'achievements.claim-combat-power'
  | 'settings.overview'
  | 'settings.hide-profile'
  | 'settings.friend-team-approval'
  | 'settings.team-invites'
  | 'settings.team-dungeon-energy'
  | 'settings.meditation-auto-boost'
  | 'settings.dungeon-battle-mode'
  | 'settings.team-auto-accept-invite'
  | 'settings.spirit-crystal-confirmation'
  | 'settings.dao-crystal-confirmation'
  | 'themes.overview'
  | 'themes.activate'
  | 'themes.deactivate'
  | 'themes.ink-mode'
  | 'profile.rename'
  | 'profile.gender'
  | 'profile.signature'
  | 'profile.view'
  | 'profession.replace-tool'
  | 'profession.dashboard'
  | 'profession.lingzhi-guide'
  | 'cave.logs'
  | 'cave.view'
  | 'cave.nearby'
  | 'cave.visit'
  | 'cave.cultivate'
  | 'cave.plant'
  | 'cave.water'
  | 'cave.worm'
  | 'cave.weed'
  | 'cave.harvest'
  | 'cave.upgrade'
  | 'cave.accelerate'
  | 'cave.collaborate'
  | 'cave.steal'
  | 'cave-formations.list'
  | 'cave-formations.activate'
  | 'cave-formations.remove'
  | 'leaderboard.alchemy'
  | 'companion.propose'
  | 'companion.gift'
  | 'companion.shop-purchase'
  | 'companion.dual-cultivation'
  | 'companion.claim-daily'
  | 'companion.claim-month-card'
  | 'companion.upgrade-oath'
  | 'companion.accept'
  | 'companion.reject'
  | 'companion.breakup'
  | 'companion.info'
  | 'companion.tasks'
  | 'companion.gift-records'
  | 'flymail.home'
  | 'flymail.send'
  | 'flymail.reply'
  | 'flymail.guild-subscription'
  | 'flymail.master-subscription'
  | 'flymail.mute'
  | 'flymail.unmute'
  | 'leaderboard.realm'
  | 'leaderboard.realm-region'
  | 'leaderboard.popularity'
  | 'popularity.like'
  | 'leaderboard.battle'
  | 'leaderboard.battle-region'
  | 'battle.log'
  | 'pvp.robbery'
  | 'pvp.counter-attack'
  | 'pvp.spar'
  | 'scarecrow.challenge'
  | 'pvp.records'
  | 'pvp.pk-targets'
  | 'pvp.pk-hiding'
  | 'pvp.pk-hide'
  | 'pvp.pk-history'
  | 'pvp.pk-report'
  | 'pvp.pk-replay'
  | 'pvp.sha-qi'
  | 'pvp.enemies'
  | 'pvp.kill-god-ranking'
  | 'pvp.kill-god-title-claim'
  | 'bounty.publish'
  | 'bounty.list'
  | 'bounty.accept'
  | 'bounty.claim'
  | 'player-shop.visit'
  | 'player-shop.list'
  | 'player-shop.mine'
  | 'player-shop.ranking'
  | 'player-shop.rename'
  | 'player-shop.description'
  | 'market.sell'
  | 'market.purchase'
  | 'market.cancel'
  | 'market.browse'
  | 'market.my-listings'
  | 'market.records'
  | 'market.credibility'
  | 'secret-realm.challenge'
  | 'secret-realm.claim'
  | 'secret-realm.home'
  | 'secret-realm.list'
  | 'secret-realm.view'
  | 'tianshu.content'
  | 'tianshi-baolu.panel'
  | 'personal-history.story'
  | 'personal-history.memories'
  | 'activity.hub'
  | 'newcomer-activity.overview'
  | 'newcomer-activity.claim-task'
  | 'encyclopedia.browse'
  | 'encyclopedia.detail'
  | 'glossary.apply'
  | 'glossary.upsert'
  | 'glossary.delete'
  | 'glossary.query'
  | 'glossary.category'
  | 'feedback.compose'
  | 'feedback.detail'
  | 'feedback.mine'
  | 'activity-points.daily'
  | 'activity-points.weekly'
  | 'activity-points.claim-daily'
  | 'activity-points.claim-weekly'
  | 'activity-points.claim-all-daily'
  | 'activity-points.claim-all-weekly'
  | 'membership.rights'
  | 'membership.privileges'
  | 'membership.claim-month-card'
  | 'team-match.snapshot'
  | 'team-match.cancel'
  | 'team-match.start-mainline'
  | 'team-match.start-dungeon'
  | 'native-comeback.overview'
  | 'native-comeback.claim'
  | 'referral.bind'
  | 'referral.claim'
  | 'referral.code'
  | 'referral.rules-count'
  | 'referral.rules-realm'
  | 'referral.rules-vip'
  | 'referral.invitees'
  | 'gift-codes.hub'
  | 'gift-codes.redeem'
  | 'emails.delete'
  | 'emails.delete-all'
  | 'emails.claim'
  | 'emails.claim-all'
  | 'emails.list'
  | 'emails.detail'
  | 'dungeon.challenge'
  | 'dungeon.sweep'
  | 'dungeon.sweep-free'
  | 'dungeon.catalog'
  | 'dungeon.detail'
  | 'demon-tower.challenge'
  | 'demon-tower.buff'
  | 'demon-tower.reset'
  | 'demon-tower.sweep'
  | 'demon-tower.info'
  | 'demon-tower.ranking'
  | 'world-boss.challenge'
  | 'world-boss.reward-claim'
  | 'world-boss.info'
  | 'world-boss.ranking'
  | 'world-boss.rewards'
  | 'competition.challenge'
  | 'competition.reward-claim'
  | 'competition.bet'
  | 'competition.follow-bet'
  | 'competition.member-add'
  | 'competition.apply'
  | 'competition.member-remove'
  | 'competition.position-adjust'
  | 'competition.team-clear'
  | 'competition.home'
  | 'competition.candidates'
  | 'competition.promotion-teams'
  | 'competition.bets'
  | 'competition.battles'
  | 'competition.battle-detail'
  | 'guild.training-overview'
  | 'guild.training-upgrade'
  | 'guild.home'
  | 'guild.list'
  | 'guild.shop'
  | 'guild.shop-refresh'
  | 'guild.shop-exchange'
  | 'guild.storyline-challenge'
  | 'guild.storyline-home'
  | 'guild.storyline-records'
  | 'guild.storyline-claim'
  | 'guild.red-packet-send'
  | 'guild.red-packets'
  | 'guild.my-red-packets'
  | 'guild.red-packet-claim'
  | 'guild.red-packet-recycle'
  | 'guild.upgrade-level'
  | 'guild.upgrade-vein'
  | 'guild.upgrade-shop'
  | 'guild.dissolve'
  | 'guild.impeach'
  | 'guild.create'
  | 'guild.apply'
  | 'guild.kick'
  | 'guild.leave'
  | 'guild.leave-cancel'
  | 'guild.leader-leave'
  | 'guild.role-appoint'
  | 'guild.role-resign'
  | 'guild.role-options'
  | 'guild.leadership-transfer'
  | 'guild.application-cancel'
  | 'guild.application-approve'
  | 'guild.application-reject'
  | 'guild.members'
  | 'guild.review-applications'
  | 'guild.logs'
  | 'guild.my-applications'
  | 'guild.auto-refresh'
  | 'guild.min-realm'
  | 'guild.rename'
  | 'guild.intro-set'
  | 'guild.notice-set'
  | 'guild.essence-add'
  | 'guild.essence-remove'
  | 'guild.notice'
  | 'guild.intro'
  | 'guild.essences'
  | 'guild.worship'
  | 'guild.mining'
  | 'guild.checkin'
  | 'guild.daily'
  | 'guild.weekly'
  | 'guild.milestone-claim'
  | 'guild.milestone-claim-all'
  | 'guild.stipend-claim'
  | 'checkin.limited-event'
  | 'checkin.daily'
  | 'checkin.newcomer'
  | 'checkin.celestial'
  | 'checkin.hub'
  | 'checkin.view'
  | 'checkin.newcomer-login'
  | 'tianjiao.leaderboard'
  | 'tianjiao.rewards'
  | 'tianjiao.challenge'
  | 'ranking.challenge'
  | 'ranking.batch-challenge'
  | 'ranking.sweep'
  | 'ranking.claim-first'
  | 'ranking.claim-monthly'
  | 'ranking.overview'
  | 'ranking.first-rewards'
  | 'ranking.monthly-rewards'
  | 'master.apply'
  | 'master.title-claim'
  | 'master.teach'
  | 'master.teach-all'
  | 'master.bless-all'
  | 'master.gift-all'
  | 'cave.tend-all'
  | 'cave.companion-tend-all'
  | 'master.bless'
  | 'master.gift'
  | 'master.expel'
  | 'master.binding-accept'
  | 'master.graduation-accept'
  | 'master.graduation-reject'
  | 'master.info'
  | 'master.ranking'
  | 'master.lineage'
  | 'master.graduation-apply'
  | 'master.rebel'
  | 'teams.invite'
  | 'teams.kick'
  | 'teams.create'
  | 'teams.leave'
  | 'teams.disband'
  | 'teams.apply'
  | 'teams.invitation-accept'
  | 'teams.application-approve'
  | 'teams.application-reject'
  | 'teams.realm'
  | 'teams.position'
  | 'teams.leadership'
  | 'teams.invitation-cancel'
  | 'teams.invitation-reject'
  | 'teams.application-cancel'
  | 'teams.overview'
  | 'teams.info'
  | 'teams.list'
  | 'teams.applications'
  | 'teams.my-applications'
  | 'teams.invitations'
  | 'teams.battle-records'
  | 'teams.battle-detail'
  | 'friends.request'
  | 'friends.remove'
  | 'friends.accept'
  | 'friends.reject'
  | 'friends.block'
  | 'friends.unblock'
  | 'friends.overview'
  | 'friends.requests'
  | 'friends.blocklist'
  | 'friends.settings'
  | 'friends.settings-update'
  | 'friends.random';

// These exact entries live in publicXiuxian before the local game middleware.
export function isRobotPublicEntry(operation: RobotBusinessOperation): boolean {
  return (
    operation === 'account.register' ||
    operation === 'navigation.strategy' ||
    operation === 'navigation.more' ||
    operation === 'navigation.help' ||
    operation === 'glossary.query' ||
    operation === 'glossary.category' ||
    operation === 'tianshu.content'
  );
}

export async function requestRobotBusiness<T>(
  event: GameEvent,
  operation: RobotBusinessOperation,
  args: Record<string, unknown>,
  decode: (data: unknown, uid: number) => T,
  request?: BackendRequestContext
): Promise<RobotBusinessResult<T>> {
  const input = businessInputFromEvent(event);

  // Canonical group identity comes from the native platform target, even when
  // the platform's ChannelId is absent or represents a different channel.
  if (operation === 'daily-fortune.claim' && event.Target?.scope === 'group') {
    input.channelId = event.Target.targetId;
  }
  const result = await requestBackend(event.UserId, 'post_v2_robot_business_operation', {
    path: { operation },
    body: { ...input, arguments: args },
    ...writeContext(
      request ??
        (operation === 'checkin.view' ||
        operation === 'storyline.state' ||
        operation === 'limited-event.payment-state' ||
        operation === 'sponsor.payment-state' ||
        operation === 'normal.payment-state'
          ? createBackendReadRequestContext()
          : createBackendRequestContext(
              event,
              operation === 'limited-event.payment-timeout' || operation === 'sponsor.payment-timeout' || operation === 'normal.payment-timeout'
                ? operation
                : operation.startsWith('onboarding.')
                  ? operation
                  : undefined
            ))
    )
  });

  return parseRobotBusinessEnvelope(result, event.UserId, decode, isRobotPublicEntry(operation));
}

// All combined business APIs share branch validation; each API still validates
// its own business payload, using the identity resolved in this same request.
export function parseRobotBusinessEnvelope<T>(
  value: unknown,
  bid: string,
  decode: (data: unknown, uid: number) => T,
  publicRead = false
): RobotBusinessResult<T> {
  const invalid = (): never => {
    throw new BackendAPIError('机器人业务响应不完整', 'SDK_INVALID_RESPONSE');
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid();
  }
  const result = value as Record<string, unknown>;

  if (typeof result.success !== 'boolean' || !['business', 'middleware'].includes(String(result.branch))) {
    return invalid();
  }
  const middleware = parseRobotMiddlewareResult(result.middleware, bid, false, publicRead);

  if (middleware.resourceSettlement !== undefined) {
    return invalid();
  }
  if (!result.success) {
    if (
      result.data !== undefined ||
      !((result.branch === 'middleware' && middleware.outcome === 'reject') || (result.branch === 'business' && middleware.outcome === 'allow'))
    ) {
      return invalid();
    }

    return { success: false, branch: result.branch, middleware };
  }
  if (result.branch === 'middleware') {
    if (middleware.reason === 'TASK_ERROR' || (middleware.outcome === 'allow' && middleware.reason !== 'UNREGISTERED') || result.data !== undefined) {
      return invalid();
    }

    return { success: true, branch: 'middleware', middleware };
  }
  const uid = middleware.identity.account.playerId;

  if (middleware.outcome !== 'allow' || (uid === null && !publicRead)) {
    return invalid();
  }

  // Public entries may complete without an existing actor; identity.playerId stays null.
  const data = decode(result.data, uid ?? 0);
  const followup: RobotBusinessFollowup = {};

  if (result.onboardingPending !== undefined && result.onboardingPending !== false) {
    followup.onboardingPending = true;
  }
  if (result.onboarding !== undefined && !followup.onboardingPending) {
    try {
      const view = parseOnboarding(result.onboarding);

      if (view.status !== 'completed') {
        throw new Error('结算后的指引必须保持已完成状态');
      }
      followup.onboarding = view;
    } catch (error) {
      // The core result already validates. Never discard a committed receipt
      // or suggest replaying the write because optional guidance is malformed.
      logger.warn('[onboarding] 结算后的指引无法解析，保留实际业务回执', error);
      followup.onboardingPending = true;
    }
  }

  return { success: true, branch: 'business', middleware, data, ...followup };
}

export function parseRobotBusinessResult(value: unknown, bid: string): RobotBusinessResult<HomeOverviewData> {
  return parseRobotBusinessEnvelope(value, bid, (data, uid) => validateHomeOverview(data as HomeOverviewData, uid));
}

// One call, with neither a UID lookup nor a fallback to a second endpoint.
export async function getRobotHomeOverview(event: GameEvent): Promise<RobotBusinessResult<HomeOverviewData>> {
  const input = measureTransportStageSync(
    'home.api.input',
    () => ({
      body: businessInputFromEvent(event),
      ...writeContext(createBackendRequestContext(event))
    }),
    event
  );
  const result = await requestBackend(event.UserId, 'post_v2_robot_home_overview', input);

  return measureTransportStageSync('home.response.validate', () => parseRobotBusinessResult(result, event.UserId), event);
}
