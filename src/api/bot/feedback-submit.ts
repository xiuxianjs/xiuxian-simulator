import type { FeedbackCategoryQueryItem } from '../schemas/feedback-categories';
import type { FeedbackSubmitResult } from '../schemas/feedback-submit';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export async function getBackendFeedbackCategories(bid: string | undefined): Promise<FeedbackCategoryQueryItem[]> {
  if (!bid?.trim()) {
    throw new Error('反馈查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_feedback_categories');

  if (!Array.isArray(data)) {
    throw new Error('反馈分类响应不完整');
  }

  return data.map(value => {
    if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.id) || value.id <= 0 || typeof value.name !== 'string') {
      throw new Error('反馈分类响应不完整');
    }

    return { id: value.id, name: value.name };
  });
}

export async function submitBackendFeedback(
  bid: string | undefined,
  categoryId: number,
  content: string,
  request?: BackendRequestContext
): Promise<FeedbackSubmitResult> {
  if (!bid?.trim()) {
    throw new Error('反馈提交缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_feedback', { body: { categoryId, content }, ...context });

  return parseBackendFeedbackSubmit(data);
}
export function parseBackendFeedbackSubmit(data: any): FeedbackSubmitResult {
  const outcomes = ['submitted', 'category_unavailable', 'empty', 'too_short', 'too_long', 'not_meaningful', 'sensitive', 'daily_limit'];

  if (!data || typeof data !== 'object' || Array.isArray(data) || !outcomes.includes(data.outcome)) {
    throw new Error('反馈提交响应不完整');
  }
  const validID =
    data.outcome === 'submitted'
      ? typeof data.feedbackId === 'number' && Number.isSafeInteger(data.feedbackId) && data.feedbackId > 0
      : data.feedbackId === null;
  const validCount =
    data.outcome === 'daily_limit'
      ? typeof data.pendingCount === 'number' && Number.isSafeInteger(data.pendingCount) && data.pendingCount >= 3
      : data.pendingCount === null;

  if (!validID || !validCount) {
    throw new Error('反馈提交响应不完整');
  }

  return { outcome: data.outcome, feedbackId: data.feedbackId, pendingCount: data.pendingCount };
}
