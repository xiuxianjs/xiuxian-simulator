import { Format } from 'alemonjs';
import type { parseTreasureConfirmation, TreasurePreviewKind } from '@src/api/bot/treasures';
import { addOptions, createQuoteMarkdown } from '@src/utils/messageHelper';

type Confirmation = Pick<ReturnType<typeof parseTreasureConfirmation>, 'summary' | 'expiresAt' | 'confirmationRef'>;

// Only grade labels change here; the frozen server summary remains untouched.
const displayGrades = (line: string) => line.split(/(「[^」]*」)/u).map(part => part.startsWith('「') ? part : part.replace(/((?:星尘|晓月|纯阳|仙藏)\d+)阶/gu, '$1')
).join('');

export function buildTreasureConfirmationView(kind: TreasurePreviewKind | 'daily-pack-free', data: Confirmation) {
  const content = Format.createMarkdown();

  if (kind === 'explore') {
    content.addBlockquote(createQuoteMarkdown([data.summary[0]]));
  } else {
    const descriptions: string[] = [];
    const batch = kind === 'batch-upgrade' || kind === 'batch-promote';

    data.summary.forEach((line, index) => {
      if (index === 0 || (batch && (line.startsWith('「') || line.startsWith('合计提升')))) {
        content.addText(displayGrades(line)).addNewline();
      } else {
        descriptions.push(displayGrades(line));
      }
    });
    content.addNewline().addBlockquote(createQuoteMarkdown([
      ...descriptions,
      `有效至 ${data.expiresAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z')}`,
      '确认后按本次预览结算；重复确认只返回原操作结果。'
    ]));
  }
  content.addNewline();
  addOptions(content, [
    { label: '确认', command: `/${kind === 'daily-pack-free' ? '确认礼包' : '确认宝物'} ${data.confirmationRef}`, autoEnter: false },
    {
      label: '取消并返回',
      command: kind === 'daily-pack-free'
        ? '/充值 日礼包 30元全包'
        : kind === 'explore' || kind === 'select-mythic' ? '/上古遗珍' : kind === 'claimLease' ? '/我的权益 灵脉租契' : '/宝物',
      autoEnter: false
    }
  ]);

  return content;
}
