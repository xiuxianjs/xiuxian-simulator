/**
 * 任务面板参数解析
 * 将用户输入的指令参数解析为 Tab key
 */
import { TAB_REGISTRY } from './constants';

/**
 * 解析指令参数为 Tab key
 * @param input 用户输入的参数文本（如 "签到"、"checkin"、"活跃" 等）
 * @returns 匹配到的 Tab key，未匹配到返回 null
 */
export const parseTabKey = (input: string): string | null => {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();

  for (const tab of TAB_REGISTRY) {
    if (tab.key === normalized) {
      return tab.key;
    }

    for (const alias of tab.commandAlias) {
      if (alias.toLowerCase() === normalized) {
        return tab.key;
      }
    }
  }

  return null;
};
