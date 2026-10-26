import { validateRobotSettingsOverview } from '@src/api/bot/settings-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
import type { GameEvent } from '@src/types/event';
import type { NotificationGroupSnapshot } from '@src/api/bot/notification-cache';
import type { GroupSubscriptionQueryData } from '@src/api/schemas/group-subscription-query';
import type { CodeResult } from '@src/types/result';
import { logger, type Next } from 'alemonjs';

export type MessageSettingsData = {
  subscription: GroupSubscriptionQueryData | null;
  groupSnapshot: NotificationGroupSnapshot | null;
  groupSnapshotUnavailable: boolean;
  dungeonBattleMode: 'auto' | 'manual';
  teamDungeonNoMental: boolean;
  meditationAutoBoost: boolean;
  autoApproveFriendTeam: boolean;
  hideProfile: boolean;
  confirmSpiritCrystal: number;
  confirmDaoCrystal: number;
  teamInviteEnabled: boolean;
  teamAutoAcceptInvite: 'none' | 'all' | 'friend' | 'companion';
};

export type MessageSettingsResult = CodeResult<'OK', 'LOAD_FAILED', MessageSettingsData>;

export default async function App(params: { event: GameEvent; next: Next; includeGroup?: boolean }): Promise<MessageSettingsResult | undefined> {
  try {
    // Preserve the original renderer coercions for historical stored values.
    const response = await runRobotBusiness(
      params.event,
      'settings.overview',
      { includeGroup: params.includeGroup ?? false },
      validateRobotSettingsOverview,
      params.next
    );

    if (response.handled) {
      return;
    }
    const overview = response.data;
    const config = overview.preferences as Omit<MessageSettingsData, 'subscription' | 'groupSnapshot' | 'groupSnapshotUnavailable'>;

    return {
      code: 'OK',
      data: {
        subscription: overview.subscription,
        groupSnapshot: overview.groupSnapshot,
        groupSnapshotUnavailable: overview.groupSnapshotUnavailable,
        dungeonBattleMode: config.dungeonBattleMode,
        teamDungeonNoMental: config.teamDungeonNoMental,
        meditationAutoBoost: config.meditationAutoBoost === true,
        autoApproveFriendTeam: config.autoApproveFriendTeam,
        hideProfile: config.hideProfile,
        confirmSpiritCrystal: config.confirmSpiritCrystal,
        confirmDaoCrystal: config.confirmDaoCrystal,
        teamInviteEnabled: config.teamInviteEnabled,
        teamAutoAcceptInvite: config.teamAutoAcceptInvite
      }
    };
  } catch (error) {
    logger.error(error);

    return { code: 'LOAD_FAILED' };
  }
}
