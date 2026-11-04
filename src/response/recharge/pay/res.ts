import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
/**
 * 充值购买
 * 指令：/充值购买 <套餐ID>
 */
import { BackendAPIError } from '@src/api/bot/client';
import { CheckoutPromotionDecodeError } from '@src/api/bot/sponsor-payment';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { NormalPackageListDecodeError, parseRobotNormalPaymentCreate } from '@src/api/bot/normal-payment';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

import { presentPaymentCheckout } from '../checkoutFlow';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = isPrivateEvent(e);

  if (!isPrivate) {
    await message.send(
      FormatGui({ isPrivate, bid, title: '充值购买', content: Format.createMarkdown().addText('充值购买仅支持私聊，请转到私聊后购买。'), bar: false })
    );

    return;
  }

  const [, parentNext] = useEvent();
  const feedback = async (text: string) => {
    await message.send(
      FormatGui({
        header: [
          { label: '返回权益', command: '/我的权益', autoEnter: false },
          { label: '我的订单', command: '/我的订单', autoEnter: false }
        ],
        isPrivate,
        bid,
        title: '充值购买',
        content: Format.createMarkdown().addText(text)
      })
    );
  };

  try {
    let created: ReturnType<typeof parseRobotNormalPaymentCreate>;

    try {
      const response = await runRobotBusiness(
        e,
        'normal.payment-create',
        { input: e.MessageText ?? '', private: isPrivate },
        parseRobotNormalPaymentCreate,
        parentNext,
        reply => feedback(reply.text)
      );

      if (response.handled) {
        return;
      }
      created = response.data;
    } catch (error) {
      if (error instanceof CheckoutPromotionDecodeError) {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '原订单待核对',
            content: Format.createMarkdown().addBlockquote(
              createQuoteMarkdown(
                [error.message],
                [
                  { label: '查询原订单', command: `/查询充值订单 ${error.orderNo}`, autoEnter: false },
                  { label: '恢复原订单', command: `/继续支付 ${error.orderNo}`, autoEnter: false }
                ]
              )
            ),
            footer: [{ label: '我的订单', command: '/我的订单', autoEnter: false }]
          })
        );

        return;
      }
      await feedback(
        error instanceof NormalPackageListDecodeError
          ? '⚠️ 充值购买异常，请稍后重试'
          : `❌ ${error instanceof BackendAPIError ? error.message : '创建订单失败'}`
      );

      return;
    }
    if (created.kind === 'packages') {
      const result = created;
      const md = Format.createMarkdown();

      for (const pkg of result.packages) {
        const quote = createQuoteMarkdown(
          [`${pkg.name} · ¥${pkg.yuan}${pkg.doubleAvailable ? ' · 首充双倍' : ''}`],
          [{ label: '购买', command: `/充值购买 ${pkg.id}`, autoEnter: false }]
        );

        if (pkg.grantSpiritMilk > 0) {
          quote.addNewline().addText(`道晶 ${pkg.grantSpiritMilk}`);
        }
        md.addBlockquote(quote);
      }
      if (!result.packages.length) {
        md.addText('暂无套餐上架');
      }
      await message.send(
        FormatGui({
          header: [
            { label: '返回权益', command: '/我的权益', autoEnter: false },
            { label: '我的订单', command: '/我的订单', autoEnter: false }
          ],
          isPrivate,
          bid,
          title: '充值',
          content: md,
          footer: [{ label: '全部套餐', command: '/充值', autoEnter: false }]
        })
      );

      return;
    }
    await presentPaymentCheckout(e, created.checkout, parentNext, feedback);
  } catch (err) {
    logger.error('[Pay] 充值购买异常', err);
    const md = Format.createMarkdown().addText('⚠️ 充值购买异常，请稍后重试');

    await message.send(
      FormatGui({
        header: [
          { label: '返回权益', command: '/我的权益', autoEnter: false },
          { label: '我的订单', command: '/我的订单', autoEnter: false }
        ],
        isPrivate,
        bid,
        title: '充值购买',
        content: md
      })
    );
  }
});
