import { validFishingReference } from '@src/api/bot/fishing';
import { fishingBubble } from './view';
import type { Next } from 'alemonjs';
import { ResultCode } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { useMessage } from '@src/utils/useMessage';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotMarketSell } from '@src/api/bot/market-sell-query';
import { buildBubble, errorBubble, type BubbleAction } from '@src/response/presentation';
import { createBackendReadRequestContext, createBackendRequestContext } from '@src/api/bot/context';

const kg = (g: number) => `${Math.trunc(g / 1000)}.${String(g % 1000).padStart(3, '0')} kg`;
const manual = (label: string, command: string): BubbleAction => ({ label, command, autoEnter: false });

/** Preserve the original market workflow while keeping catch IDs as strings. */
export async function handleFishingMarketSell(event: GameEvent, next: Next): Promise<boolean> {
  const match = /^\s*[/#＃!！]?交易上架\s+(?:鱼类|渔获|fish)(\d+)?(?:\s+(.*?))?\s*$/.exec(event.MessageText ?? '');

  if (!match) { return false; }
  const [message] = useMessage();
  const common = { bid: event.UserId, isPrivate: isPrivateEvent(event) };
  const footer = [manual('返回渔获', '/储物袋 渔获'), manual('我的上架', '/我的上架')];
  const send = async (body: Parameters<typeof message.send>[0]) => {
    const receipts = await message.send(body);

    if (!receipts.length || receipts.some(receipt => receipt.code !== ResultCode.Ok)) { throw new Error('鱼交易消息未确认送达'); }
  };
  const parts = match[2]?.split(/\s+/).filter(Boolean) ?? [];
  const page = Number(match[1] ?? 1);
  const catchId = parts[0];
  const reference = catchId === '确认' ? parts[1] : undefined;
  const price = parts[1] === undefined ? undefined : Number(parts[1]);
  const valid =
    [...(event.MessageText ?? '')].length <= 80 &&
    Number.isSafeInteger(page) &&
    page >= 1 &&
    page <= 2147483647 &&
    (catchId !== '确认' || (parts.length === 2 && reference !== undefined && validFishingReference(reference, 'z'))) &&
    parts.length <= 2 &&
    (!catchId || catchId === '确认' || /^[A-Za-z0-9_.:-]{1,40}$/.test(catchId)) &&
    (reference !== undefined
      ? validFishingReference(reference, 'z')
      : parts[1] === undefined || (/^[1-9]\d*$/.test(parts[1]) && Number.isSafeInteger(price) && price! <= 100000000));

  if (!valid) {
    await send(
      errorBubble({
        ...common,
        title: '交易上架 · 未完成',
        reason: '说明：/交易上架 鱼类[页码]，或 /交易上架 鱼类 完整鱼编号 [整尾灵晶单价]；数量固定1。',
        footer
      })
    );

    return true;
  }
  const mode = reference ? 'confirm' : catchId ? 'start' : 'list';
  const args = reference
    ? { mode, reference }
    : catchId
      ? { mode, category: 'fish', catchId, firstNumber: price ?? null, secondNumber: null }
      : { mode, category: 'fish', subtype: '', page: String(page) };

  try {
    const response = await runRobotBusiness(
      event,
      'market.sell',
      args,
      (data, uid) => parseRobotMarketSell(data, mode, 'fish', uid),
      next,
      async reply => {
        await send(
          buildBubble({
            ...common,
            title: reply.title || '交易上架 · 未完成',
            sections: [{ lines: [reply.text], actions: reply.buttons.map(button => manual(button.label, button.command)) }],
            footer
          })
        );
      },
      reference || (catchId && price !== undefined) ? createBackendRequestContext(event, 'market.sell.fish') : createBackendReadRequestContext()
    );

    if (response.handled) { return true; }
    const data = response.data;

    if (data.mode === 'confirm' || (data.mode === 'start' && data.fishConfirmation)) {
      const confirmation = data.fishConfirmation!;

      await send(fishingBubble(confirmation, event, confirmation.confirmationRef ? `/交易上架 鱼类 确认 ${confirmation.confirmationRef}` : undefined));

      return true;
    }
    if (data.mode === 'list') {
      if (data.page.items.length > 5) { throw new Error('鱼上架列表超过约定页大小'); }
      await send(
        buildBubble({
          ...common,
          title: '交易上架 - 鱼类',
          sections: data.page.items.length
            ? data.page.items.map(item => ({
                title: item.name,
                id: item.catchId,
                lines: [
                  `数量：${item.quantity}尾 · 境界：${item.realm}`,
                  `重量：${kg(item.weightG!)}`,
                  ...(item.priceRange ? [`可挂区间：${item.priceRange.min}~${item.priceRange.max} 灵晶`] : [])
                ],
                actions: [manual('上架', `/交易上架 鱼类 ${item.catchId}`)]
              }))
            : [{ lines: ['状态：暂无可上架的鱼。'] }],
          nav: { current: page, total: Math.max(1, data.page.totalPages), count: data.page.total, command: '/交易上架 鱼类{page}', autoEnter: false },
          footer
        })
      );

      return true;
    }
    if (data.mode !== 'start' || !catchId || !data.range.fixedQuantity || data.range.maxListingQuantity !== 1) { throw new Error('鱼单尾交易规则不匹配'); }
    const range = data.range;
    const referenceText = range.referencePrice >= range.minPrice && range.referencePrice <= range.maxPrice ? `（参考价 ${range.referencePrice} 灵晶）` : '';
    const actions: BubbleAction[] = [];

    for (const [label, amount] of [
      ['最低价', range.minPrice],
      ['最高价', range.maxPrice],
      ['参考价', range.referencePrice]
    ] as const) {
      const command = `/交易上架 鱼类 ${catchId} ${amount}`;

      if (amount >= range.minPrice && amount <= range.maxPrice && !actions.some(action => action.command === command)) { actions.push(manual(label, command)); }
    }
    await send(
      buildBubble({
        ...common,
        title: '交易上架',
        sections: [
          {
            title: data.itemName ?? '原渔获',
            id: catchId,
            lines: [
              ...(data.weightG === undefined ? [] : [`重量：${kg(data.weightG)}`]),
              '数量：1尾',
              ...(data.listingId
                ? [...(data.message ? [data.message] : []), `上架ID：${data.listingId}`]
                : [`单价区间：${range.minPrice}~${range.maxPrice} 灵晶${referenceText}`, '说明：可修改快捷指令里的单价。'])
            ],
            actions: data.listingId ? [] : actions
          }
        ],
        footer
      })
    );
  } catch {
    await send(
      errorBubble({ ...common, title: '交易上架 · 结果待核对', reason: '说明：本次市场结果尚未核实，请查看我的上架；不要重新选择另一尾鱼代替原操作。', footer })
    );
  }

  return true;
}
