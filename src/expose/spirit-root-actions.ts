import { parseSpiritRootMutation, parseSpiritRootPreview } from '../api/bot/spirit-root';
import { spiritRoot } from './common-queries';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { mutation } from './mutation';
import { fields, integer, object, text } from './schema';

const nonnegative = { type: 'integer' as const, minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const previewSchema = object({
  ...fields(integer, 'itemId requested consumed pointsAdded before after quality stageTarget stageBefore stageAfter'),
  itemName: text
});

function feedPreview(data: unknown) {
  const result = parseSpiritRootPreview(data);

  if (
    result.itemId < 1 ||
    result.requested < 1 ||
    result.consumed < 1 ||
    result.consumed > result.requested ||
    result.pointsAdded < 1 ||
    result.after - result.before !== result.pointsAdded
  ) {
    throw new Error('灵根培养预览数量或变化不完整');
  }

  return result;
}
export const spiritRootActions = {
  preview_spirit_root_feed: mutation<{ itemId: number; quantity: number }>(
    '预览指定灵药的灵根培养，不消耗材料；返回原品质、培养值、请求及实际消耗数量和服务端引用。核对原预览后把 reference 原样交给 confirm_spirit_root_feed，预览5分钟有效，引用保留24小时供已结算重试。',
    'spirit-root.preview',
    object({ itemId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, quantity: { type: 'integer', minimum: 1, maximum: 1000000 } }),
    object({ ...(previewSchema.type === 'object' ? previewSchema.properties : {}), reference: confirmationReferenceSchema, expiresAt: text }),
    input => `/灵根培养 ${input.itemId} ${input.quantity}`,
    (data, input) => {
      const result = feedPreview(data);
      const row = data as Record<string, unknown>;

      if (
        result.itemId !== input.itemId ||
        result.requested !== input.quantity ||
        typeof row.reference !== 'string' ||
        typeof row.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(row.expiresAt))
      ) {
        throw new Error('灵根培养引用预览与请求不匹配');
      }
      validateConfirmationReference(row.reference, 'r');

      return { ...result, reference: row.reference, expiresAt: row.expiresAt };
    },
    input => ({ ...input, withReference: true })
  ),
  confirm_spirit_root_feed: mutation<{ reference: string }>(
    '按服务端原引用确认灵根培养，仅提交 reference，不补齐最新材料或改用最新规则；品质、进度、材料与原培养效果变化时拒绝。查看实际 feed 消耗与增长，原引用跨消息重试返回同一结算回执，不重复扣料。',
    'spirit-root.feed',
    object({ reference: confirmationReferenceSchema }),
    object({ view: spiritRoot, feed: previewSchema, message: text }),
    input => `/灵根确认培养 ${input.reference}`,
    data => {
      const result = parseSpiritRootMutation(data);
      const row = data as Record<string, unknown>;

      return { ...result, feed: feedPreview(row.feed) };
    },
    input => ({ reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'r')
  ),
  promote_spirit_root: mutation<{ expectedQuality: number; expectedCultivation: number }>(
    '将已满足条件的灵根晋品；expectedQuality/expectedCultivation 必须来自最近读取的灵根原状态，过期状态由服务端拒绝。不会代为培养补齐材料。',
    'spirit-root.promote',
    object({ expectedQuality: nonnegative, expectedCultivation: nonnegative }),
    object({ view: spiritRoot, message: text }),
    input => `/灵根晋品 ${input.expectedQuality} ${input.expectedCultivation}`,
    parseSpiritRootMutation
  )
};
