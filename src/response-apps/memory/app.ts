import { getBackendMemories } from '@src/api';
import { logger } from 'alemonjs';

export type MemoryItem = {
  label: string;
  text: string;
  subtext?: string;
};

export type MemoryResult =
  { code: 'OK'; data: { items: MemoryItem[]; totalDays: number; name: string; canShowStoryButton: boolean } } | { code: 'LOAD_FAILED' };

export default async function App(params: { uid: number; bid?: string }): Promise<MemoryResult> {
  try {
    const data = await getBackendMemories(params.bid, params.uid);

    return { code: 'OK', data };
  } catch (error) {
    logger.error('我的回忆加载失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
