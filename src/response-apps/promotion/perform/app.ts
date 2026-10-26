import { executeBackendPromotionCommand } from '@src/api/bot/promotion-command';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';
import { formatRealmRequirementDetails } from '@src/utils/realmRequirements';
import { tribulationPreparationPanel, type TribulationPanel } from '@src/response-apps/tribulation/app';

type RealmData = {
  name: string;
  spiritualPower: number;
  speed: number;
  magicAttack: number;
  physicalAttack: number;
  magicDefense: number;
  physicalDefense: number;
  experienceLimit: number;
};

type TribulationData = { name: string; totalLayers: number; passedLayers?: number; summary: string };

export type PromotionPerformResult =
  | { code: 'TRIBULATION'; data: TribulationPanel }
  | { code: 'CAP_REACHED'; data: { realmName: string } }
  | {
      code: 'SUCCESS';
      data: {
        message: string;
        tribulation?: { name: string; totalLayers: number; passedLayers: number };
        newRealm?: RealmData;
        unlockedRecipes: string[];
        masterStageMessages?: string[];
      };
    }
  | { code: 'FAILED'; data: { message: string; tribulation?: TribulationData; requirementLines: string[] }; uid: number }
  | { code: 'ERROR' };

export default async function App(params: {
  load?: () => ReturnType<typeof executeBackendPromotionCommand>;
  uid: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<PromotionPerformResult> {
  try {
    const command = params.load ? await params.load() : await executeBackendPromotionCommand(params.bid, params.uid, params.request);

    if (command.mode === 'preparation') {
      return { code: 'TRIBULATION', data: tribulationPreparationPanel(command.overview) };
    }
    const result = command.result;

    if (result.capReached) {
      return { code: 'CAP_REACHED', data: { realmName: result.capRealmName } };
    }
    if (!result.success) {
      const requirementLines = command.overview ? formatRealmRequirementDetails(command.overview.promotion, true) : [];

      return { code: 'FAILED', uid: params.uid, data: { message: result.message, tribulation: result.tribulation, requirementLines } };
    }

    return {
      code: 'SUCCESS',
      data: {
        message: result.message,
        tribulation:
          result.tribulation && result.tribulation.totalLayers > 0
            ? {
                name: result.tribulation.name,
                totalLayers: result.tribulation.totalLayers,
                passedLayers: result.tribulation.passedLayers
              }
            : undefined,
        newRealm: result.newRealm,
        unlockedRecipes: result.unlockedRecipes,
        masterStageMessages: result.masterStageMessages
      }
    };
  } catch (error) {
    logger.error('晋级失败:', error);

    return { code: 'ERROR' };
  }
}
