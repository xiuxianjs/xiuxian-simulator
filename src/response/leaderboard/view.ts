import { Format } from 'alemonjs';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { leaderboardRecoveryTips } from '@src/response/leaderboardRecovery';

export function rankingFeedbackMarkdown(reply: RobotMiddlewareReply, md = Format.createMarkdown()) {
  md.addText(reply.text);
  if (reply.quote) {
    md.addBlockquote(Format.createMarkdown().addText(reply.quote));
  }
  appendMiddlewareBlocks(
    md,
    reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
  );
  appendMiddlewareAdvice(md, reply.advice);

  return md;
}

export function rankingFailureMarkdown(operation: string, text: string, md = Format.createMarkdown()) {
  md.addText(text);
  appendMiddlewareAdvice(md, leaderboardRecoveryTips(operation, text));

  return md;
}

export const RANKING_LIMIT = 50;
export const RANKING_PAGE_SIZE = 10;

export function rankingView(text: string) {
  const token = text.trim().match(/(?:排行榜|圣人榜)\s*(\d+|榜首|附近|我的)?$/)?.[1] ?? '';
  const requested = /^\d+$/.test(token) ? Number(token) : 1;
  const page = Number.isSafeInteger(requested) ? Math.min(5, Math.max(1, requested)) : 1;

  // 旧“附近/我的”指令兼容到榜首，默认不再切换个人附近。
  return { page };
}

export function rankingSelfText(self?: { rank: number } | null): string | null {
  return self && Number.isInteger(self.rank) && self.rank >= 1 && self.rank <= RANKING_LIMIT ? `我的排名：第${self.rank}名` : null;
}
