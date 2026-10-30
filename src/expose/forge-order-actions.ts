import { parseForgeHistory, parseForgeOrder, parseForgeOrderPreview, parseForgeOrders } from '../api/schemas/forge';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { forgeMaterialSchema, forgeRecipeSchema, forgeResultSchema } from './crafting-actions';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const material = list(forgeMaterialSchema);
const order = object(
  {
    ...fields(integer, 'id ownerId crafterId expiresAt fee spiritStoneCost'),
    ...fields(text, 'ownerName crafterName status name'),
    ...fields(boolean, 'canAccept canCancel refundPending'),
    materials: material,
    result: forgeResultSchema
  },
  ['refundPending', 'result']
);
const preview = object({
  token: confirmationReferenceSchema,
  ...fields(integer, 'expiresAt expGained crafterId fee lifetimeSeconds'),
  ...fields(boolean, 'tutorial assessmentNew'),
  crafterName: text,
  recipe: forgeRecipeSchema
});

export const forgeOrderActions = {
  preview_forge_order: observation<{ crafterId: number; recipeId: number; fee: number }>(
    '预览委托给指定匠师的原图纸、材料和灵石托管金额；不创建委托，确认必须使用原 r1_f 引用。',
    'forge.order-preview',
    object({ crafterId: id, recipeId: id, fee: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER } }),
    preview,
    input => `/委托锻造 ${input.crafterId} ${input.recipeId} ${input.fee}`,
    (data, input) => {
      const result = parseForgeOrderPreview(data);

      if (result.crafterId !== input.crafterId || result.recipe.id !== input.recipeId || result.fee !== input.fee) {
        throw new Error('锻造委托预览不匹配');
      }
      validateConfirmationReference(result.token, 'f');

      return result;
    }
  ),
  create_forge_order: mutation<{ reference: string }>(
    '使用原委托预览引用创建委托并托管材料和灵石；过期或状态变化时服务端拒绝，不得重新构造预览自动确认。',
    'forge.order-create',
    object({ reference: confirmationReferenceSchema }),
    order,
    input => `/确认锻造委托 ${input.reference}`,
    (data, _input, uid) => {
      const result = parseForgeOrder(data);

      if (result.ownerId !== uid) {
        throw new Error('锻造委托回执归属不匹配');
      }

      return result;
    },
    input => ({ token: input.reference }),
    input => validateConfirmationReference(input.reference, 'f')
  ),
  get_forge_orders: observation<{ page?: number }>(
    '分页查询本人作为委托人或匠师的委托，canAccept、canCancel 和 refundPending 以服务端当前状态为准。',
    'forge.orders',
    object({ page }, ['page']),
    object({ page: integer, hasMore: boolean, items: list(order) }),
    input => `/锻造委托 ${input.page ?? 1}`,
    parseForgeOrders,
    input => ({ page: input.page ?? 1 })
  ),
  accept_forge_order: mutation<{ orderId: number }>(
    '接取指定锻造委托并执行交付；服务端校验指定匠师、材料及期限，返回实际成品。',
    'forge.order-accept',
    object({ orderId: id }),
    order,
    input => `/接取锻造委托 ${input.orderId}`,
    (data, input, uid) => {
      const result = parseForgeOrder(data);

      if (result.id !== input.orderId || result.crafterId !== uid) {
        throw new Error('锻造委托回执不匹配');
      }

      return result;
    },
    input => input
  ),
  cancel_forge_order: mutation<{ orderId: number }>(
    '取消本人指定锻造委托；是否退款完成以 status 和 refundPending 为准，不将待退款当作已退款。',
    'forge.order-cancel',
    object({ orderId: id }),
    order,
    input => `/取消锻造委托 ${input.orderId}`,
    (data, input, uid) => {
      const result = parseForgeOrder(data);

      if (result.id !== input.orderId || result.ownerId !== uid) {
        throw new Error('锻造委托回执不匹配');
      }

      return result;
    },
    input => input
  ),
  get_forge_history: observation<{ page?: number }>(
    '分页查询本人锻造作品及当前拥有状态；exists 为 false 表示原成品已不存在。',
    'forge.history',
    object({ page }, ['page']),
    object({ page: integer, hasMore: boolean, items: list(object({ result: forgeResultSchema, owned: boolean, exists: boolean })) }),
    input => `/锻造作品 ${input.page ?? 1}`,
    parseForgeHistory,
    input => ({ page: input.page ?? 1 })
  )
};
