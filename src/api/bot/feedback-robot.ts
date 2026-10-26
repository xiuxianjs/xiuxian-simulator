import { parseBackendFeedbackSubmit } from './feedback-submit';

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

/** 解析反馈ID参数 */
export function parseFeedbackId(messageText: string): number | null {
  const argsText = messageText.replace(/^(!|！|\/|#|＃)?(查看反馈)\s*/, '').trim();

  if (!argsText) {
    return null;
  }

  const feedbackId = parseInt(argsText);

  return isNaN(feedbackId) ? null : feedbackId;
}

/** 解析页数参数 */
export function parsePageNumber(messageText: string): number {
  const argsText = messageText.replace(/^(!|！|\/|#|＃)?(我的反馈)\s*/, '').trim();

  if (!argsText) {
    return 1;
  }

  const pageNum = parseInt(argsText);

  return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
}

/** 格式化反馈信息为显示文本 */
export function formatFeedbackInfo(feedback: any): string {
  let message = '';

  if (feedback.isReplied && feedback.reply) {
    message += '【反馈】\n';

    const categoryName = feedback['category.name'] ?? '未分类';

    message += `分类：${categoryName}\n`;
    message += `内容：${feedback.content}\n\n`;
    message += '【回复】\n';
    message += `内容：${feedback.reply}`;
  } else {
    message += `反馈信息id:${feedback.id}未收到回复`;
  }

  return message;
}

export function parseRobotFeedbackCompose(value: any) {
  if (value && Array.isArray(value.categories)) {
    const categories = value.categories.map((row: any) => {
      if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.name !== 'string') {
        throw new Error('反馈分类响应不完整');
      }

      return { id: row.id as number, name: row.name as string };
    });

    return { categories, result: null };
  }

  const result = parseBackendFeedbackSubmit(value);

  if (result.outcome !== 'submitted') {
    throw new Error('反馈提交响应不完整');
  }

  return { categories: [], result };
}
