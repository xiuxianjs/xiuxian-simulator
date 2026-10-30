import { parseBackendFeedbackDetail, parseBackendFeedbacks } from '../api/bot/queries';
import { observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const feedback = object({ id: integer, content: text, isReplied: boolean, feedbackTime: text });

export const feedbackActions = {
  get_feedback_categories: observation(
    '查询反馈分类，不提交反馈。服务端分类查询失败时可能返回空列表，空列表不能确认没有配置分类。',
    'feedback.compose',
    object({}),
    object({ categories: list(object({ id: integer, name: text })) }),
    () => '/提交反馈',
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('反馈分类回执不完整');
      }
      const categories = (data as Record<string, unknown>).categories;

      if (
        !Array.isArray(categories) ||
        categories.some(
          category => !category ||
            typeof category !== 'object' ||
            Array.isArray(category) ||
            !Number.isSafeInteger(category.id) ||
            category.id < 1 ||
            typeof category.name !== 'string'
        )
      ) {
        throw new Error('反馈分类回执不完整');
      }

      return { categories };
    },
    () => ({ mode: 'menu', categoryId: null, content: '' })
  ),
  get_my_feedback: observation<{ page?: number }>(
    '分页查询当前玩家提交的反馈及回复状态，反馈内容可能包含玩家的个人信息。',
    'feedback.mine',
    object({ page }, ['page']),
    object({ feedbacks: list(feedback), ...fields(integer, 'total currentPage totalPages') }),
    input => `/我的反馈 ${input.page ?? 1}`,
    data => {
      const result = parseBackendFeedbacks(data);

      return { ...result, feedbacks: result.feedbacks.map(item => ({ ...item, feedbackTime: item.feedbackTime.toISOString() })) };
    },
    input => ({ page: input.page ?? 1 })
  ),
  get_feedback_detail: observation<{ feedbackId: number }>(
    '查看当前玩家的反馈详情和回复；服务端校验归属，不能查询其他玩家的反馈。',
    'feedback.detail',
    object({ feedbackId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({ id: integer, content: text, isReplied: boolean, feedbackTime: text, reply: text, categoryName: text }, ['reply', 'categoryName']),
    input => `/查看反馈 ${input.feedbackId}`,
    (data, input) => {
      const result = parseBackendFeedbackDetail(data, input.feedbackId);

      return { ...result, feedbackTime: result.feedbackTime.toISOString(), categoryName: result['category.name'] };
    },
    input => ({ feedbackId: input.feedbackId })
  )
};
