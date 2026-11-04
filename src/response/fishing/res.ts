import { logger, onResponse, ResultCode, useEvent } from 'alemonjs';
import { parseFishingView } from '@src/api/bot/fishing';
import { createBackendReadRequestContext, createBackendRequestContext } from '@src/api/bot/context';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { buildBubble, errorBubble, type BubbleSection } from '@src/response/presentation';
import { useMessage } from '@src/utils/useMessage';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { parseFishingCommand } from './commands';
import { fishingBubble } from './view';
import { parseBackendNormalCheckout } from '@src/api/bot/sponsor-payment';
import { presentPaymentCheckout } from '@src/response/recharge/checkoutFlow';
import { SDKError } from '@src/api/core/error';

export default onResponse(selects, async event => {
  const [, next] = useEvent();
  const parsed = parseFishingCommand(event.MessageText ?? '');

  if (parsed === undefined) {
    next();

    return;
  }
  const [message] = useMessage();
  const send = async (body: Parameters<typeof message.send>[0]) => {
    const receipts = await message.send(body);

    if (!receipts.length || receipts.some(receipt => receipt.code !== ResultCode.Ok)) {
      throw new Error('垂钓消息未确认送达');
    }
  };
  const back = [{ label: '返回垂钓', command: '/垂钓', autoEnter: false }];
  let checkoutOrderNo: string | undefined;
  const recoverCheckout = () => send(errorBubble({ bid: event.UserId, isPrivate: isPrivateEvent(event), title: '垂钓 · 原订单待核对',
    reason: checkoutOrderNo
      ? `原订单 ${checkoutOrderNo} 的支付信息暂未核实，请查询或恢复此订单，不要重复购买。`
      : '支付请求结果尚未确认，请先在我的订单核对；如已有订单请继续原订单，不要重复购买。',
    actions: checkoutOrderNo ? [
      { label: '查询原订单', command: `/查询充值订单 ${checkoutOrderNo}`, autoEnter: false },
      { label: '恢复原订单', command: `/继续支付 ${checkoutOrderNo}`, autoEnter: false }
    ] : [{ label: '我的订单', command: '/我的订单', autoEnter: false }],
    footer: [{ label: '返回礼包', command: '/垂钓 礼包', autoEnter: false }] }));

  if ('error' in parsed) {
    await send(errorBubble({ bid: event.UserId, isPrivate: isPrivateEvent(event), title: '垂钓 · 未完成', reason: `说明：${parsed.error}`, footer: back }));

    return;
  }
  try {
    if (parsed.operation === 'fishing.pack-checkout') {
      if (!isPrivateEvent(event)) {
        await send(errorBubble({ bid: event.UserId, isPrivate: false, title: '垂钓 · 礼包支付', reason: '订单及支付详情仅支持私聊，请在私聊中购买。', footer: back }));

        return;
      }
      const result = await runRobotBusiness(
        event, parsed.operation, parsed.input, value => {
          const order = value && typeof value === 'object' ? (value as { order?: { orderNo?: unknown } }).order : undefined;

          if (typeof order?.orderNo === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(order.orderNo)) {
            checkoutOrderNo = order.orderNo;
          }

          return parseBackendNormalCheckout(value);
        }, next, undefined,
        createBackendRequestContext(event, parsed.operation),
        async error => {
          const details = error instanceof SDKError && error.details && typeof error.details === 'object'
            ? error.details as { orderNo?: unknown; recoverable?: unknown } : undefined;

          if (details?.recoverable !== true || typeof details.orderNo !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(details.orderNo)) {
            return false;
          }
          checkoutOrderNo = details.orderNo;
          await recoverCheckout();

          return true;
        }
      );

      if (!result.handled) {
        const checkout = result.data;

        const navigation = [{ label: '返回礼包', command: '/垂钓 礼包', autoEnter: false }, { label: '我的订单', command: '/我的订单', autoEnter: false }];

        await presentPaymentCheckout(event, checkout, next, async text => {
          await send(buildBubble({ bid: event.UserId, isPrivate: true, title: '垂钓 · 原订单待核对',
            sections: [{ lines: [text], actions: [
              { label: '查询原订单', command: `/查询充值订单 ${checkout.order.orderNo}`, autoEnter: false },
              { label: '恢复原订单', command: `/继续支付 ${checkout.order.orderNo}`, autoEnter: false }
            ] }], footer: navigation, bar: false }));
        }, navigation);
      }

      return;
    }
    const request = parsed.operation === 'fishing.query' ? createBackendReadRequestContext() : createBackendRequestContext(event, parsed.operation);
    const result = await runRobotBusiness(
      event,
      parsed.operation,
      parsed.input,
      parseFishingView,
      next,
      adviceRenderer(async reply => {
        const actions = (buttons: typeof reply.buttons) => buttons.map(button => ({ ...button, autoEnter: false }));
        const sections: BubbleSection[] = [
          { lines: [reply.heading, reply.text, reply.quote ?? '', ...(reply.rawLines ?? [])].filter(Boolean), actions: actions(reply.buttons) }
        ];

        for (const block of reply.blocks ?? []) {
          sections.push({ lines: [block.text], actions: actions(block.inlineButtons ?? []) });
        }
        for (const tip of reply.advice) {
          sections.push({ lines: [tip.description], actions: actions([{ label: tip.command, command: tip.command }]) });
        }
        await send(
          buildBubble({ bid: event.UserId, isPrivate: isPrivateEvent(event), title: reply.title || '垂钓 · 未完成', sections, footer: back, bar: false })
        );
      }),
      request
    );

    if (!result.handled) {
      await send(fishingBubble(result.data, event));
    }
  } catch (error) {
    logger.warn('[fishing] 垂钓请求或消息投递未确认', error);
    if (parsed.operation === 'fishing.pack-checkout') {
      await recoverCheckout();

      return;
    }
    const original = parsed.operation === 'fishing.confirm' ? parsed.input.ref : undefined;

    await send(
      errorBubble({
        bid: event.UserId,
        isPrivate: isPrivateEvent(event),
        title: '垂钓 · 结果待核对',
        reason: original
          ? '说明：原确认结果尚未核实，请重试同一引用或核对原操作；不要重新购买或重复扣料。'
            : parsed.operation === 'fishing.contest-claim'
              ? '说明：周赛领奖结果尚未核实，请查看该周原奖励状态，不要重新计算或重复领取。'
            : parsed.operation === 'fishing.start-current'
            ? '说明：开钓结果尚未核实，请先查看当前垂钓状态，不要重复开始。'
            : parsed.operation === 'fishing.stop-current'
              ? '说明：收杆结果尚未核实，请先查看当前垂钓状态，不要重复操作。'
              : parsed.operation === 'fishing.configure'
                ? '说明：设置或打窝结果尚未核实，请先查看当前设置与窝料状态，不要重复操作。'
            : parsed.operation === 'fishing.purchase'
              ? '说明：购买结果尚未核实，请先核对余额与已有物资，不要重复购买。'
              : '说明：请求暂未完成，请稍后重新查看；未取得原预览时不能确认。',
        actions: original ? [{ label: '重试原确认', command: `/垂钓 确认 ${original}`, autoEnter: false }] : undefined,
        footer: back
      })
    );
  }
});
