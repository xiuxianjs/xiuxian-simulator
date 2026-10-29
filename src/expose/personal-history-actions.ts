import { parseBackendMemories, parseBackendStory } from '../api/bot/queries';
import { observation } from './mutation';
import { boolean, integer, list, object, text } from './schema';

export const personalHistoryActions = {
  get_personal_story: observation(
    '查询当前角色的个人故事；返回服务端生成的统计叙述和展示内容。',
    'personal-history.story',
    object({}),
    object({ name: text, canShowMemoryButton: boolean, items: list(object({ label: text, value: text, flavor: text })) }),
    () => '/我的故事',
    parseBackendStory
  ),
  get_personal_memories: observation(
    '查询当前角色的个人回忆，包括游戏天数和服务端记录的关键节点；这不是战斗日志。',
    'personal-history.memories',
    object({}),
    object({ name: text, totalDays: integer, canShowStoryButton: boolean, items: list(object({ label: text, text, subtext: text }, ['subtext'])) }),
    () => '/我的回忆',
    parseBackendMemories
  )
};
