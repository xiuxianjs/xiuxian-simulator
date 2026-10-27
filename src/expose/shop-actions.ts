import { decodeShopPreview } from '../api/bot/shop-purchase';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { mutation } from './mutation';
import { boolean, fields, integer, object, text } from './schema';

const previewSchema = object({
  ...fields(integer, 'productId granted buyCount'),
  ...fields(text, 'shopCode name paid'),
  needsConfirmation: boolean
});
const settlementSchema = object({ ...fields(text, 'name paid'), ...fields(integer, 'granted buyCount') });

export const shopActions = {
  preview_shop_purchase: mutation<{ productId: number; count: number }>(
    '预览统一商店指定商品和份数，不扣款或发奖；返回原报价、服务端确认引用和有效期。商品编号来自 get_shop_products，即使 needsConfirmation=false 也须用返回引用确认本次 Expose 购买。',
    'shops.purchase',
    object({ productId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, count: { type: 'integer', minimum: 1, maximum: 2147483647 } }),
    object({ preview: previewSchema, reference: confirmationReferenceSchema, expiresAt: text }),
    input => `/购买 ${input.productId} ${input.count}`,
    (data, input) => {
      const row = data as Record<string, unknown> | null;
      const preview = decodeShopPreview(row?.preview);

      if (
        preview.productId !== input.productId ||
        preview.buyCount !== input.count ||
        typeof row?.reference !== 'string' ||
        typeof row.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(row.expiresAt))
      ) {
        throw new Error('商店预览与请求不匹配');
      }
      validateConfirmationReference(row.reference, 's');

      return { preview, reference: row.reference, expiresAt: row.expiresAt };
    },
    input => ({ mode: 'preview', productId: input.productId, count: input.count })
  ),
  confirm_shop_purchase: mutation<{ reference: string }>(
    '使用原商店预览的 s 类型引用确认购买，不能追加商品、数量或报价；服务端校验归属、5分钟有效期及原商品配置和折扣，并在同一事务保存结算回执。引用保留24小时，同引用跨消息重试不重复扣款或发奖。',
    'shops.purchase',
    object({ reference: confirmationReferenceSchema }),
    object({ reference: confirmationReferenceSchema, result: settlementSchema }),
    () => '/购买',
    (data, input) => {
      const row = data as { reference?: unknown; result?: { name?: unknown; paid?: unknown; granted?: unknown; buyCount?: unknown } } | null;
      const result = row?.result;

      if (
        row?.reference !== input.reference ||
        !result ||
        typeof result.name !== 'string' ||
        typeof result.paid !== 'string' ||
        !Number.isSafeInteger(result.granted) ||
        (result.granted as number) < 1 ||
        !Number.isSafeInteger(result.buyCount) ||
        (result.buyCount as number) < 1
      ) {
        throw new Error('商店购买结算响应不完整');
      }

      return row;
    },
    input => ({ mode: 'reference', reference: input.reference }),
    input => validateConfirmationReference(input.reference, 's')
  )
};
