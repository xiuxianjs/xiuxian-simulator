import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parseMyMarketListings } from '@src/api/bot/my-market-listings';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
/**
 * 我的上架列表指令
 * - 指令格式：/我的上架 [页码]
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText ?? '').trim();
  const m = text.match(/我的上架(?:\s*(\d+))?/);
  const page = m?.[1] ? Math.max(1, Number(m[1])) : 1;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的上架',
        content: md,
        header: [
          { label: '珍宝楼', command: '/珍宝楼' },
          { label: '小店', command: '/小店' }
        ],
        footer: [
          { label: '搜索', command: '/珍宝楼 搜索' },
          { label: '筛选', command: '/珍宝楼 筛选' },
          { label: '记录', command: '/我的交易记录' },
          { label: '上架', command: '/交易上架' }
        ]
      })
    );
  };
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'market.my-listings', { page }, parseMyMarketListings, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch (error) {
    logger.error('查看我的上架失败:', error);
    await sendFailure('查看我的上架失败，请稍后再试');

    return;
  }
  if (loaded.handled) {
    return;
  }

  const data = loaded.data;
  const contentMd = Format.createMarkdown();

  if (data.items.length === 0) {
    contentMd.addText('暂无上架物品');
    contentMd.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的上架',
        content: contentMd,
        header: [
          { label: '珍宝楼', command: '/珍宝楼' },
          { label: '小店', command: '/小店' }
        ],
        footer: [
          { label: '搜索', command: '/珍宝楼 搜索' },
          { label: '筛选', command: '/珍宝楼 筛选' },
          { label: '记录', command: '/我的交易记录' },
          { label: '上架', command: '/交易上架' }
        ]
      })
    );

    return;
  }

  data.items.forEach(it => {
    const totalPrice = it.totalPriceAmount;
    const typeLabel = it.itemCategoryLabel;
    const lockTag = it.lockTag;
    // 显示到期时间（优先 expiresAt，回退 createdAt）
    const time = it.expiresAt ? formatGameTime(it.expiresAt) : formatGameTime(it.createdAt);

    const lines = [`【${it.listingId}】【${typeLabel}】 ${it.itemName} ×${it.quantity}${lockTag}`];
    const extra = it.attributeView;

    if (extra?.attrText) {
      lines.push(`属性：${extra.attrText}`);
    }
    lines.push(`单价：${it.unitPriceAmount} ${it.currencyName}  总价：${totalPrice} ${it.currencyName}`, `时间：${time}`);
    contentMd.addBlockquote(createQuoteMarkdown(lines, [{ label: '下架', command: `/交易下架 ${it.listingId}` }]));
  });

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '我的上架',
      content: contentMd,
      nav: {
        current: data.pagination.currentPage,
        total: data.pagination.totalPages,
        command: '/我的上架 {page}'
      },
      header: [
        { label: '珍宝楼', command: '/珍宝楼' },
        { label: '小店', command: '/小店' }
      ],
      footer: [
        { label: '搜索', command: '/珍宝楼 搜索' },
        { label: '筛选', command: '/珍宝楼 筛选' },
        { label: '记录', command: '/我的交易记录' },
        { label: '上架', command: '/交易上架' }
      ]
    })
  );
});
