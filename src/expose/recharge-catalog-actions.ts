import { ExposeError } from 'alemonjs';
import { parseRechargePeriodicPacks } from '../api/bot/recharge-periodic-packs';
import { observation } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

export const rechargeCatalogActions = {
  get_recharge_periodic_packs: observation<{ period: 'weekly' | 'monthly' }>(
    '私聊查询周礼包或月礼包商品、价格、限购及未完成订单；金额单位为分。查询不创建订单，不支付。',
    'recharge.periodic-packs',
    object({ period: { type: 'string', enum: ['weekly', 'monthly'] } }),
    object(
      {
        ...fields(text, 'period serverDate periodStart periodEnd resetsAt unresolvedOrderNo'),
        products: list(
          object(
            {
              ...fields(text, 'sku name unavailableReason label'),
              ...fields(integer, 'packageId priceAmount basePriceAmount creditedAmount limit successful pending remaining'),
              ...fields(boolean, 'isBundle available'),
              promotionTexts: list(text),
              rewardParts: list(object({ ...fields(text, 'kind name'), quantity: integer }))
            },
            ['packageId']
          )
        )
      },
      ['unresolvedOrderNo']
    ),
    input => `/充值 ${input.period === 'weekly' ? '周礼包' : '月礼包'}`,
    (data, input) => {
      const result = parseRechargePeriodicPacks(data);

      if (result.period !== input.period) {
        throw new Error('礼包周期回执不匹配');
      }

      return result;
    },
    (input, event) => {
      if (event.name !== 'private.message.create' || event.isPrivate === false || event.IsPrivate === false) {
        throw new ExposeError('FORBIDDEN', '周月礼包仅限私聊查询');
      }

      return { period: input.period };
    }
  )
};
