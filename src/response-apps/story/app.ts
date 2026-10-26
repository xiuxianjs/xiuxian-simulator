import { getBackendStory } from '@src/api';
import { logger } from 'alemonjs';

export type StoryItem = {
  label: string;
  value: string;
  flavor: string;
};

export type StoryResult = { code: 'OK'; data: { items: StoryItem[]; name: string; canShowMemoryButton: boolean } } | { code: 'LOAD_FAILED' };

export default async function App(params: { uid: number; bid?: string }): Promise<StoryResult> {
  try {
    const remote = await getBackendStory(params.bid, params.uid);

    return { code: 'OK', data: remote };
  } catch (error) {
    logger.error('我的故事加载失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
