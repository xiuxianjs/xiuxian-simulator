import type { SoulArtifactDetail } from '@src/types/storage';
import { createQuoteMarkdown } from '@src/utils/messageHelper';
import type { FormatMarkDown } from 'alemonjs';

/** 按服务端投影排版本命物背包条目。 */
export function formatSoulArtifactItem(item: SoulArtifactDetail, md: FormatMarkDown): void {
  const lockIcon = item.isLocked === 1 ? '🔒' : '';
  const listedIcon = item.isLocked === 2 ? '📦' : '';
  const upgradedTag = item.hasUpgraded ? ' 已升品' : '';
  const baseInfo = `${lockIcon}${listedIcon}${item.name}（${item.gradeName}）Lv.${item.level} 洗涤${item.washCount}次${upgradedTag}`;
  const actions: { label: string; command: string }[] = [];

  if (item.canRefine) {
    actions.push({ label: '炼化', command: `/炼化 ${item.userSoulArtifactId}` });
  }
  if (item.lockAction === 'unlock') {
    actions.push({ label: '解锁', command: `/解锁 本命 ${item.userSoulArtifactId}` });
  } else if (item.lockAction === 'lock') {
    actions.push({ label: '锁定', command: `/锁定 本命 ${item.userSoulArtifactId}` });
  }

  actions.push({ label: '详情', command: `/本命物详情 ${item.userSoulArtifactId}` });
  md.addBlockquote(createQuoteMarkdown([` ${baseInfo}`], actions));
}
