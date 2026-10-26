import { getBackendSoulArtifactOverview, type SoulArtifactOverviewDisplayItem } from '@src/api/bot/soul-artifact-overview-queries';
import { logger } from 'alemonjs';

export type SoulArtifactDetailResult =
  | { code: 'OK'; data: SoulArtifactOverviewDisplayItem & { maxLevel: number } }
  | { code: 'NOT_FOUND'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; instanceId: number }): Promise<SoulArtifactDetailResult> {
  try {
    const facts = await getBackendSoulArtifactOverview(params.bid, params.uid);
    const artifact = facts.items.find(item => item.instanceId === params.instanceId);

    if (!artifact) {
      return { code: 'NOT_FOUND', data: { message: '未找到该本命物，可能已不存在或不属于你' } };
    }

    return { code: 'OK', data: { ...artifact, maxLevel: facts.maxLevel } };
  } catch (error) {
    logger.error('本命物详情查询失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }
}
