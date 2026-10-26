import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendShopRanking } from '@src/api/bot/shop-queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
/** 共享导航 */
const SHOP_HEADER = [
  { label: '小店列表', command: '/小店' },
  { label: '我的小店', command: '/我的小店' },
  { label: '热度榜', command: '/小店排行' },
  { label: '珍宝楼', command: '/珍宝楼' }
];

/** 排名标识 */
const RANK_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉'
};

/**
 * 小店排行指令
 * - 指令格式：/小店排行
 * - 展示热度前20名的店铺
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '小店热度榜',
        content: md,
        footer: [{ label: '返回', command: '/小店' }]
      })
    );
  };

  try {
    const loaded = await runRobotBusiness(e, 'player-shop.ranking', {}, parseBackendShopRanking, next, async reply => {
      await sendFailure(reply.text);
    });

    if (loaded.handled) {
      return;
    }

    const ranking = loaded.data;
    const contentMd = Format.createMarkdown();

    if (ranking.length === 0) {
      contentMd.addText('暂无店铺上榜');
      contentMd.addNewline();
      contentMd.addBlockquote(Format.createMarkdown().addText('上架物品并完成交易即可获得热度'));

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '小店热度榜',
          header: SHOP_HEADER,
          content: contentMd,
          footer: [{ label: '我的小店', command: '/我的小店' }]
        })
      );

      return;
    }

    const token = (e.MessageText ?? '').trim().split(/\s+/).at(-1) ?? '';
    const totalPages = Math.max(1, Math.ceil(ranking.length / 5));
    const page = Math.min(/^\d+$/.test(token) ? Math.max(1, Number(token)) : 1, totalPages);

    ranking.slice((page - 1) * 5, page * 5).forEach(item => {
      const medal = RANK_MEDAL[item.rank] ?? `【${item.rank}】`;

      contentMd.addText(`${medal} 「${item.shopName}」 ${item.levelName}`);
      contentMd.addNewline();
      contentMd.addBlockquote(Format.createMarkdown().addText(`${item.ownerName}  热度：${item.heatScore}  成交：${item.totalSales}笔`));
    });

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '小店热度榜',
        header: SHOP_HEADER,
        content: contentMd,
        footer: [
          { label: '我的小店', command: '/我的小店' },
          { label: '小店列表', command: '/小店' },
          { label: '返回排行榜', command: '/排行榜' }
        ],
        nav: totalPages > 1 ? { current: page, total: totalPages, count: ranking.length, command: '/小店排行 {page}' } : undefined
      })
    );
  } catch {
    const md = Format.createMarkdown();

    md.addText('获取排行榜失败，请稍后再试');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '小店热度榜',
        content: md,
        footer: [{ label: '返回', command: '/小店' }]
      })
    );
  }
});
