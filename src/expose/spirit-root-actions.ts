import { parseSpiritRootMutation, parseSpiritRootPreview } from '../api/bot/spirit-root';
import { spiritRoot } from './common-queries';
import { mutation } from './mutation';
import { fields, integer, object, text } from './schema';

const nonnegative = { type: 'integer' as const, minimum: 0, maximum: Number.MAX_SAFE_INTEGER };

export const spiritRootActions = {
  preview_spirit_root_feed: mutation<{ itemId: number; quantity: number }>(
    '预览指定灵药的灵根培养；返回请求/实际消耗数量、原品质和培养值，不消耗材料。当前尚未开放对应培养确认能力。',
    'spirit-root.preview',
    object({ itemId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, quantity: { type: 'integer', minimum: 1, maximum: 2147483647 } }),
    object({ ...fields(integer, 'itemId requested consumed pointsAdded before after quality stageTarget stageBefore stageAfter'), itemName: text }),
    input => `/灵根培养 ${input.itemId} ${input.quantity}`,
    (data, input) => {
      const result = parseSpiritRootPreview(data);

      if (result.itemId !== input.itemId || result.requested !== input.quantity) {
        throw new Error('灵根培养预览与请求不匹配');
      }

      return result;
    }
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
