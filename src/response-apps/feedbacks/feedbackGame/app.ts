import { getBackendFeedbackCategories, submitBackendFeedback } from '@src/api/bot/feedback-submit';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { FeedbackSubmitResult } from '@src/api/schemas/feedback-submit';
import type { FeedbackCategoryQueryItem } from '@src/api/schemas/feedback-categories';
import { logger } from 'alemonjs';

/** 解析命令参数 */
export function parseCommand(messageText: string): { categoryId: number | null; content: string | null } {
  const argsText = messageText.replace(/^(!|！|\/|#|＃)?(提交反馈|反馈)\s*/, '').trim();

  if (!argsText) {
    return { categoryId: null, content: null };
  }

  const parts = argsText.split(/\s+/);
  const firstPart = parts[0];
  const categoryId = parseInt(firstPart);

  if (isNaN(categoryId)) {
    return { categoryId: null, content: argsText };
  }

  const content = parts.slice(1).join(' ').trim();

  return {
    categoryId: categoryId,
    content: content || null
  };
}

export async function getEnabledCategories(bid: string | undefined): Promise<FeedbackCategoryQueryItem[]> {
  try {
    return await getBackendFeedbackCategories(bid);
  } catch (error) {
    logger.error('获取分类列表失败:', error);

    return [];
  }
}

export async function validateCategory(bid: string | undefined, categoryId: number): Promise<FeedbackCategoryQueryItem | null> {
  const categories = await getEnabledCategories(bid);

  return categories.find(category => category.id === categoryId) ?? null;
}

export const MAX_DAILY_PENDING = 3;

export const FEEDBACK_VALIDATION_MESSAGES: Partial<Record<FeedbackSubmitResult['outcome'], string>> = {
  empty: '内容不能为空',
  too_short: '内容长度不能少于10个字符',
  too_long: '内容长度不能超过200个字符',
  not_meaningful: '请输入有意义的内容，不能全是数字或特殊字符',
  sensitive: '内容包含违规词汇，请修改后重试'
};

export async function submitFeedback(
  bid: string | undefined,
  categoryId: number,
  content: string,
  request?: BackendRequestContext
): Promise<FeedbackSubmitResult> {
  // Original category lookup catches invalid/non-finite SQL input as not found.
  if (!Number.isFinite(categoryId) || categoryId < 0 || categoryId >= 9223372036854775808) {
    return { outcome: 'category_unavailable', feedbackId: null, pendingCount: null };
  }

  return await submitBackendFeedback(bid, categoryId, content, request);
}
