import { parseCollectionLeaderboard, type CollectionLeaderboardEntry } from '@src/api/schemas/collection-leaderboard-query';
import { selects } from '@src/response/config';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { FormatGui } from '@src/utils/messageHelper';
import { formatNumber } from '@src/utils/formatHelper';
import { useMessage } from '@src/utils/useMessage';
import { listBubble } from '@src/response/presentation/index';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { logger, onResponse, useEvent } from 'alemonjs';
import { rankingFeedbackMarkdown } from './view';

type Board = {
  operation: Parameters<typeof runRobotBusiness>[1];
  home?: { label: string; command: string };
  guild?: boolean;
  score: (row: CollectionLeaderboardEntry) => string[];
};

const profession = (name: string) => (row: CollectionLeaderboardEntry) => [`等级：${name} ${row.level} 级`, `经验：${formatNumber(row.exp)}`];

const balanceFormat = new Intl.NumberFormat('zh-CN');
const wealth = (currency: string) => (row: CollectionLeaderboardEntry) => {
  if (row.hidden) {
    return ['状态：余额已隐藏'];
  }
  if (row.balance === undefined) {
    throw new Error('排行榜缺少余额');
  }

  return [`余额：${balanceFormat.format(BigInt(row.balance))} ${currency}`];
};

const boards: Record<string, Board> = {
  灵石榜: { operation: 'leaderboard.spirit-stone', score: wealth('灵石') },
  灵晶榜: { operation: 'leaderboard.spirit-crystal', score: wealth('灵晶') },
  锻造师榜: { operation: 'leaderboard.forge', home: { label: '我的锻造', command: '/我的锻造' }, score: profession('锻造') },
  宝录收藏榜: { operation: 'leaderboard.baolu', home: { label: '天师宝录', command: '/天师宝录' }, score: row => [`数量：已解锁 ${row.unlocked} 项`] },
  灵植师榜: { operation: 'leaderboard.herbalist', home: { label: '灵药师', command: '/灵药师' }, score: profession('灵植') },
  同届新秀榜: { operation: 'leaderboard.newcomers', home: { label: '查看主线', command: '/查看主线' }, score: row => [`星数：${row.score} 星`] },
  灵脉宗门榜: {
    operation: 'leaderboard.spirit-war',
    home: { label: '选择战场', command: '/灵脉攻防战列表 1' },
    guild: true,
    score: row => [`积分：${row.score} 分`]
  },
  宗门主线榜: {
    operation: 'leaderboard.guild-story',
    home: { label: '宗门主线', command: '/宗门主线' },
    guild: true,
    score: row => [`通关：${row.score} 关`, `进度：${row.progress / 100}%`]
  },
  竞技周榜: { operation: 'leaderboard.spar', home: { label: '登天梯', command: '/登天梯' }, score: row => [`战绩：独立胜场 ${row.score}`] },
  珍宝楼商誉榜: { operation: 'leaderboard.merchants', home: { label: '珍宝楼', command: '/珍宝楼' }, score: row => [`成交：${row.score} 位独立买家`] }
};

export default onResponse(selects, async e => {
  const text = e.MessageText?.trim().replace(/^[!！/#＃]\s*/u, '') ?? '';
  const match = text.match(/^([^\s\d]+)(?:\s*(\d+))?(?:\s+(\d+))?$/u);
  const [, title = '', requestedPage, requestedBattlefield] = match ?? [];
  const board = Object.hasOwn(boards, title) ? boards[title] : undefined;
  const [, next] = useEvent();

  if (!board || (requestedBattlefield && board.operation !== 'leaderboard.spirit-war')) {
    next();

    return;
  }

  const command = `/${title}`;
  const page = Math.min(5, Math.max(1, Number(requestedPage ?? 1)));
  const battlefield = requestedBattlefield === undefined ? undefined : Math.min(32768, Math.max(1, Number(requestedBattlefield)));
  const [message] = useMessage();
  const frame = {
    isPrivate: e.isPrivate ?? false,
    bid: e.UserId,
    title,
    footer: [...(board.home ? [board.home] : []), { label: '返回排行榜', command: '/排行榜' }]
  };

  try {
    const result = await runRobotBusiness(
      e,
      board.operation,
      { page, ...(battlefield === undefined ? {} : { battlefield }) },
      parseCollectionLeaderboard,
      next,
      adviceRenderer(async reply => {
        await message.send(FormatGui({ ...frame, content: rankingFeedbackMarkdown(reply), footer: [...reply.buttons, ...frame.footer] }));
      })
    );

    if (result.handled) {
      return;
    }

    const { items, self, page: current, total, totalPages, scope, battlefield: field } = result.data;

    await message.send(
      listBubble({
        ...frame,
        items: [
          ...(scope ? [{ lines: [`范围：${scope}`] }] : []),
          { lines: self ? [`排名：第 ${self.rank} 名`, ...board.score(self)] : ['状态：当前未上榜'], title: board.guild ? '本宗成绩' : '我的成绩' },
          ...items.map(row => ({ title: row.name || (board.guild ? `宗门${row.playerId}` : `道友${row.playerId}`), id: row.rank, lines: board.score(row) })),
          ...(items.length === 0 ? [{ lines: ['状态：暂无排行数据'] }] : [])
        ],
        nav: totalPages > 1 ? { current, total: totalPages, count: total, command: `${command} {page}${field ? ` ${field}` : ''}` } : undefined
      })
    );
  } catch (error) {
    logger.error(`查询${title}失败`, error);
    await message.send(listBubble({ ...frame, items: [{ lines: ['状态：排行榜暂不可用，请稍后再试'] }] }));
  }
});
