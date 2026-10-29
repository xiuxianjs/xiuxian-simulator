import { parseRobotActivityHub } from '../api/bot/activity-hub';
import { observation } from './mutation';
import { boolean, number, object, text } from './schema';

export const activityActions = {
  get_activity_hub: observation(
    '查询活动中心中的限时活动数量、宗门活动阶段、灵脉攻防状态与入口可见性；可见不代表具备参与资格。',
    'activity.hub',
    object({}),
    object(
      {
        limitedEvent: object({ activeCount: number }),
        guildCompetition: object({ phase: text }),
        guildSecretRealmWar: object(
          {
            phase: text,
            activeStartAt: text,
            activeEndAt: text,
            maxAttackPerWeek: number,
            remainingAttackCount: number,
            guild: object({ name: text, outputBonusPct: number, occupation: object({ source: text, top: number, high: number, low: number, total: number }) }, [
              'occupation'
            ])
          },
          ['guild']
        ),
        access: object({ hasGuild: boolean, canAccessOverseasIsland: boolean }),
        overseasIsland: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'UNKNOWN'] },
        overseasIslandRequiredRealm: text,
        newcomerVisible: boolean,
        giftCodesVisible: boolean
      },
      ['overseasIsland', 'overseasIslandRequiredRealm']
    ),
    () => '/个人活动',
    parseRobotActivityHub
  )
};
