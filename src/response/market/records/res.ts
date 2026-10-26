import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendMarketTrades } from '@src/api/bot/queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/**
 * 解析指令参数
 * - 指令格式：
 *   - /我的交易记录
 *   - /我的交易记录 1
 *   - /我的交易记录 买 1
 *   - /我的交易记录 卖 1
 */
const parseQuery = (text: string): { mode: 'all' | 'buy' | 'sell'; page: number } => {
  const m = text.match(/(?:我的记录|我的交易记录)(?:\s*(买|卖))?(?:\s*(\d+))?/);
  const mode = m?.[1] === '买' ? 'buy' : m?.[1] === '卖' ? 'sell' : 'all';
  const pageRaw = m?.[2];
  const page = pageRaw ? Math.max(1, Number(pageRaw)) : 1;

  if (!Number.isFinite(page)) {
    return { mode, page: 1 };
  }

  return { mode, page: Math.floor(page) };
};

/**
 * 我的交易记录指令
 * - 默认按时间倒序
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const query = parseQuery(text);

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const mdErr = Format.createMarkdown();

    mdErr.addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: '交易记录', content: mdErr }));
  };
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'market.records', { mode: query.mode, page: String(query.page) }, parseBackendMarketTrades, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch (error) {
    logger.error('查看我的交易记录失败:', error);
    await sendFailure('查看我的交易记录失败，请稍后再试');

    return;
  }
  if (loaded.handled) {
    return;
  }

  const data = {
    ...loaded.data,
    title: query.mode === 'buy' ? '交易记录（买）' : query.mode === 'sell' ? '交易记录（卖）' : '交易记录',
    cmdPrefix: query.mode === 'buy' ? '/我的交易记录 买' : query.mode === 'sell' ? '/我的交易记录 卖' : '/我的交易记录'
  };
  const contentMd = Format.createMarkdown();

  if (data.rows.length === 0) {
    contentMd.addText('暂无交易记录');
    contentMd.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: data.title,
        content: contentMd,
        footer: [
          { label: '全部', selected: query.mode === 'all', command: '/我的交易记录' },
          { label: '买入记录', selected: query.mode === 'buy', command: '/我的交易记录 买' },
          { label: '卖出记录', selected: query.mode === 'sell', command: '/我的交易记录 卖' }
        ],
        header: [
          { label: '珍宝楼', command: '/珍宝楼' },
          { label: '小店', command: '/小店' }
        ]
      })
    );

    return;
  }

  data.rows.forEach(r => {
    const isBuy = r.role === 'buy';
    const action = isBuy ? '买入' : '卖出';
    const sellerName = r.seller?.name ?? String(r.sellerUserId);
    // 买家匿名：交易记录中不暴露买家身份
    const buyerName = '匿名';
    const partnerName = isBuy ? sellerName : buyerName;
    const time = formatGameTime(r.created_at);
    const currencyName = r.currencyName;
    const quantity = r.displayQuantity;
    const unitPriceAmount = r.displayUnitPrice;
    const totalPriceAmount = r.displayTotalPrice;
    const feeAmount = r.displayFee;
    const sellerReceivedAmount = r.displaySellerReceive;

    const typeLabel = r.itemCategoryLabel;

    contentMd.addText(`【${action}】【${typeLabel}】${r.itemName} ×${quantity}`);
    contentMd.addNewline();
    contentMd.addBlockquote(
      Format.createMarkdown()
        .addText(`对方：${partnerName}  单价：${unitPriceAmount} ${currencyName}`)
        .addNewline()
        .addText(`总价：${totalPriceAmount} ${currencyName}`)
    );

    if (!isBuy) {
      contentMd.addText(`  手续费：${feeAmount}  实得：${sellerReceivedAmount}`);
    }

    contentMd.addNewline();
    contentMd.addBlockquote(Format.createMarkdown().addText(`ID：${r.listingId}  时间：${time}`));
  });

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: data.title,
      header: [
        { label: '珍宝楼', command: '/珍宝楼' },
        { label: '小店', command: '/小店' }
      ],
      content: contentMd,
      nav: {
        current: data.currentPage,
        total: data.totalPages,
        count: data.total,
        command: `${data.cmdPrefix} {page}`
      },
      footer: [
        { label: '全部', selected: query.mode === 'all', command: '/我的交易记录' },
        { label: '买入记录', selected: query.mode === 'buy', command: '/我的交易记录 买' },
        { label: '卖出记录', selected: query.mode === 'sell', command: '/我的交易记录 卖' }
      ]
    })
  );
});
