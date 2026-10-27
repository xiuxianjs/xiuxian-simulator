import { ExposeError } from 'alemonjs';
import { parseConsumeResult, parseMingwuSelection, parsePeiyuanPending } from '../api/bot/consume';
import { parseGreenBottleCapacity } from '../api/bot/green-bottle-storage-capacity';
import { parseGreenBottleStore } from '../api/bot/green-bottle-store';
import { mutation } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const quantity = { type: 'integer' as const, minimum: 1, maximum: 2147483647 };

export const peiyuanPendingSchema = object(
  {
    snapshot: { type: 'string', minLength: 64, maxLength: 64 },
    quantity: integer,
    view: object({
      ...fields(text, 'headingText confirmPromptText'),
      ...fields(boolean, 'hasChanges showRollDetails'),
      changeLines: list(text),
      rollLines: list(text)
    })
  },
  ['snapshot']
);
const mingwu = object({
  ...fields(integer, 'quantity remainingCount'),
  guidanceText: text,
  books: list(object({ ...fields(integer, 'skillBookId proficiency'), ...fields(text, 'name statusText'), canSelect: boolean }))
});

export const itemActions = {
  consume_item: mutation<{ itemName: string; quantity: number }>(
    '按背包中的精确道具名称消耗库存，由服务端解释效果和数量。检查 outcome：rejected 未使用；peiyuan_pending 用原 snapshot 调用 get_peiyuan_confirmation，再以原 reference 确认或取消；mingwu_select 尚需选择。不能把待确认报告为已完成培养。',
    'items.consume',
    object({ itemName: { type: 'string', minLength: 1, maxLength: 64 }, quantity }),
    object(
      {
        outcome: { type: 'string', enum: ['consumed', 'rejected', 'formation_activated', 'tower_reset', 'peiyuan_pending', 'mingwu_select'] },
        message: text,
        remainingQuantity: integer,
        peiyuanPending: peiyuanPendingSchema,
        mingwuSelection: mingwu
      },
      ['remainingQuantity', 'peiyuanPending', 'mingwuSelection']
    ),
    input => `/消耗 ${input.itemName} ${input.quantity}`,
    data => {
      const result = parseConsumeResult(data);

      return {
        outcome: result.outcome,
        message: result.message,
        remainingQuantity: result.remainingQuantity,
        ...(result.outcome === 'peiyuan_pending' ? { peiyuanPending: parsePeiyuanPending(result.pending) } : {}),
        ...(result.outcome === 'mingwu_select' ? { mingwuSelection: parseMingwuSelection(result.pending) } : {})
      };
    },
    input => input,
    input => {
      if (/\s/u.test(input.itemName) || /^\d+$/u.test(input.itemName) || [...`/消耗 ${input.itemName} ${input.quantity}`].length > 80) {
        throw new ExposeError('INVALID_INPUT', '道具名称须使用现有指令支持的完整单个名称，且完整指令不得超过80字符');
      }
    }
  ),
  get_green_bottle_capacity: mutation(
    '查询当前角色溢出修为存储资格、每瓶修为成本和最大可存储量，不执行转换。',
    'green-bottle.capacity',
    object({}),
    object({ ...fields(integer, 'experienceCost maxAvailable'), canStore: boolean }),
    () => '/小绿瓶存储',
    parseGreenBottleCapacity
  ),
  store_green_bottles: mutation<{ count: number }>(
    '将溢出修为转换为小绿瓶，消耗和实际转换量由服务端决定；先查询容量，不能假设请求数量全部转换。',
    'green-bottle.store',
    object({ count: quantity }),
    object({ success: boolean, message: text, ...fields(integer, 'experienceCost converted remainingExp totalBottles') }, [
      'converted',
      'remainingExp',
      'totalBottles'
    ]),
    input => `/小绿瓶存储 ${input.count}`,
    parseGreenBottleStore
  )
};
