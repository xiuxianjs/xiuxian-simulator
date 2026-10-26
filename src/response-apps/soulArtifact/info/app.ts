import { getBackendSoulArtifactOverview, type SoulArtifactOverviewDisplayItem } from '@src/api/bot/soul-artifact-overview-queries';
import type { SoulArtifactOverviewPageCapability } from '@src/api/schemas/soul-artifact-overview-query';
import { logger } from 'alemonjs';

export type SoulArtifactInfoResult =
  | {
      code: 'EQUIPPED';
      data: { artifact: SoulArtifactOverviewDisplayItem; maxLevel: number };
      capabilities: SoulArtifactOverviewPageCapability[];
    }
  | { code: 'EMPTY'; data: { message: string } }
  | { code: 'NOT_EQUIPPED'; data: { message: string }; capabilities: SoulArtifactOverviewPageCapability[] }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<SoulArtifactInfoResult> {
  try {
    const facts = await getBackendSoulArtifactOverview(params.bid, params.uid, 'equipped');
    const artifacts = facts.items;

    if (!(facts.hasDisplayItems ?? artifacts.length > 0)) {
      return { code: 'EMPTY', data: { message: '你还没有本命物，可在 积分商店 或 珍宝楼 购买' } };
    }

    const equipped = facts.equippedInstanceId === null ? undefined : artifacts.find(a => a.instanceId === facts.equippedInstanceId);

    if (!equipped) {
      return { code: 'NOT_EQUIPPED', capabilities: facts.capabilities, data: { message: '当前未炼化本命物' } };
    }

    return { code: 'EQUIPPED', capabilities: facts.capabilities, data: { artifact: equipped, maxLevel: facts.maxLevel } };
  } catch (error) {
    logger.error('本命物信息查询失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }
}
