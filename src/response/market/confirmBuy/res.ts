import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotMarketPurchase } from '@src/api/bot/market-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { withBusinessRecovery } from '@src/response/businessRecovery';

/**
 * 选购指令
 * - 指令格式：/选购 上架ID [数量] [确认]
 * - 兼容格式：/选购 上架ID*数量 [确认]
 * - 珍宝楼购买按钮直接触发
 * - 带"确认"参数时跳过二次确认直接购买
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const m = text.match(/选购\s+(\d+)(?:(?:\s+|[*xX×])(\d+))?(?:\s+(确认))?/);

  const [, next] = useEvent();
  const sendFailure = async (text: string, withBack = true) => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '珍宝楼',
        content: Format.createMarkdown().addText(text),
        header: withBack ? [{ label: '返回', command: '/珍宝楼' }] : undefined
      })
    );
  };
  let loaded;

  try {
    loaded = await runRobotBusiness(
      e,
      'market.purchase',
      {
        listingId: m ? Number(m[1]) : null,
        quantity: m ? (m[2] ? Number(m[2]) : 1) : null,
        confirmed: m?.[3] === '确认'
      },
      parseRobotMarketPurchase,
      next,
      async reply => {
        await sendFailure(reply.text, reply.buttons.length > 0);
      }
    );
  } catch (error) {
    await sendFailure(error instanceof Error ? error.message : '选购失败，请稍后再试');

    return;
  }
  if (loaded.handled) {
    return;
  }

  if ('preview' in loaded.data) {
    const data = loaded.data.preview;
    const confirmMd = Format.createMarkdown();

    if (data.overpriceWarning) {
      confirmMd.addText(data.overpriceWarning);
      confirmMd.addNewline();
    }

    if (data.shouldConfirm) {
      confirmMd.addText('⚠️ 大额购买提醒');
      confirmMd.addNewline();
    }

    confirmMd.addText(`将购买：${data.itemName} ×${data.quantity}`);
    confirmMd.addNewline();
    confirmMd.addText(`合计：${data.totalPrice} ${data.currencyName}`);
    confirmMd.addNewline();
    confirmMd.addText('确认购买？');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '珍宝楼',
        content: confirmMd,
        footer: [
          { label: '确认', command: `/选购 ${data.listingId} ${data.quantity} 确认` },
          { label: '取消', command: '/珍宝楼' }
        ]
      })
    );

    return;
  }

  const md = Format.createMarkdown();
  const displayMsg = loaded.data.message;

  md.addText(displayMsg);
  appendMiddlewareAdvice(
    md,
    withBusinessRecovery('market.purchase', {
      title: '',
      heading: '',
      text: displayMsg,
      buttons: [],
      advice: []
    }).advice
  );
  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '珍宝楼',
      content: md,
      header: [
        { label: '返回', command: '/珍宝楼' },
        { label: '交易记录', command: '/我的交易记录' }
      ]
    })
  );
});
