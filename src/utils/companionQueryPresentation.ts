import type { CompanionInfoQueryData } from '@src/api/schemas/companion-info-query';
import type { CompanionTasksQueryData } from '@src/api/schemas/companion-tasks-query';
import { MSG_COMPANION } from '@src/constants';

type CompanionInfoResult =
  | { code: 'ACCESS_DENIED'; data: { realmName: string } }
  | {
      code: 'NO_COMPANION';
      data: { message: string };
    }
  | {
      code: 'OK';
      data: {
        partnerName: string;
        partnerId: number;
        partnerRealm: string;
        intimacy: number;
        spiritBondLevel: string;
        tongxin: number;
        oathType: string;
        blessingPercent: number;
        dualCultivationExp: number;
        dailyDualCultivationUsed: number;
        dailyDungeonUsed: number;
        dailyGiftUsed: number;
        companionMessage: string;
        companionSince: string | null;
        anniversaryMessage: string | null;
      };
    };

export function presentCompanionInfo(result: CompanionInfoQueryData): CompanionInfoResult {
  if (!result.access.canUseFifthLayerFeature) {
    return { code: 'ACCESS_DENIED', data: { realmName: result.access.realmName ?? '未知' } };
  }
  if (!result.companion) {
    if (!result.noCompanionMessage) {
      throw new Error('道侣接口缺少空态信息');
    }

    return { code: 'NO_COMPANION', data: { message: result.noCompanionMessage } };
  }
  const info = result.companion;

  return { code: 'OK', data: { ...info, partnerName: info.displayPartnerName, partnerRealm: info.displayPartnerRealm } };
}

type TaskItem = {
  index: number;
  name: string;
  rewardDesc: string;
  completedCount: number;
  dailyLimit: number;
  earnedTongxin: number;
};

type CompanionTaskResult =
  | { code: 'LOCKED'; data: { realmName: string } }
  | {
      code: 'NO_COMPANION';
      data: { message: string };
    }
  | {
      code: 'AUTO_CLAIM_HINT';
      data: { message: string };
    }
  | {
      code: 'OK';
      data: { tasks: TaskItem[] };
    };

export function presentCompanionTasks(info: CompanionTasksQueryData, args: string): CompanionTaskResult {
  if (!info.access.canUseFifthLayerFeature) {
    return { code: 'LOCKED', data: { realmName: info.access.realmName ?? '未知' } };
  }

  if (!info.hasCompanion) {
    return {
      code: 'NO_COMPANION',
      data: { message: '你当前没有道侣，无法查看道侣任务' }
    };
  }

  if (args.startsWith('领取')) {
    return {
      code: 'AUTO_CLAIM_HINT',
      data: { message: MSG_COMPANION.TASK_AUTO_CLAIM_HINT }
    };
  }

  const tasks = info.tasks;
  const names = { dual_cultivation: '双修', dungeon: '一起秘境', gift: '赠送道具', care_farm: '照料灵田' };

  return {
    code: 'OK',
    data: {
      tasks: tasks.map((t, index) => ({
        index: index + 1,
        name: names[t.taskType],
        rewardDesc: t.rewardAmounts.map(amount => `+${amount}`).join('/'),
        completedCount: t.completedCount,
        dailyLimit: t.limit,
        earnedTongxin: t.earnedTongxin
      }))
    }
  };
}
