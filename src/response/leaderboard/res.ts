import { commandCharacterLength, commandText } from '@src/utils/commandPrefix';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { mentionsRetiredFeature } from '@src/response/retiredFeatures';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { rankingFeedbackMarkdown, rankingFailureMarkdown } from './view';
import { useMessage } from '@src/utils/useMessage';
import { BUBBLE_LIMITS } from '@src/response/presentation/index';
import { selects } from '@src/response/config';
import { parseLeaderboardMenu } from '@src/api/bot/leaderboard-catalog';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
const tabs = [
  {
    label: '综合榜',
    groups: ['实力成长', '道友互动'],
    boards: [
      ['/战力排行榜', '战力榜'],
      ['/境界排行榜', '境界榜'],
      ['/主线排行榜', '个人主线榜'],
      ['/妖塔排行榜', '妖塔榜'],
      ['/同届新秀榜', '同届新秀榜'],
      ['/通天塔', '通天塔'],
      ['/灵石榜', '灵石榜'],
      ['/灵晶榜', '灵晶榜'],
      ['/珍宝楼商誉榜', '珍宝楼商誉榜'],
      ['/小店排行', '小店榜'],
      ['/宗门主线榜', '宗门主线榜'],
      ['/圣人排行榜', '圣人榜'],
      ['/人气排行榜', '人气榜']
    ]
  },
  {
    label: '玩法榜',
    groups: ['修仙百业', '竞技与活动', '其他'],
    boards: [
      ['/丹师排行榜', '丹师榜'],
      ['/锻造师榜', '锻造师榜'],
      ['/灵植师榜', '灵植师榜'],
      ['/宝录收藏榜', '宝录收藏榜'],
      ['/登天梯', '登天梯'],
      ['/凶兽排行', '凶兽榜'],
      ['/垂钓 积分榜', '钓仙会'],
      ['/灵脉宗门榜', '灵脉宗门榜'],
      ['/竞技周榜', '竞技周榜'],
      ['/杀神榜', '杀神榜']
    ]
  }
] satisfies { label: string; groups: string[]; boards: [string, string][] }[];

const namedCommands = new Set(tabs.flatMap(tab => tab.boards.map(([command]) => command)));
const pageSize = 12;

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const md = Format.createMarkdown();

  let menu: Awaited<ReturnType<typeof parseLeaderboardMenu>>;

  try {
    const [, parentNext] = useEvent();
    const response = await runRobotBusiness(
      e,
      'leaderboard.menu',
      {},
      parseLeaderboardMenu,
      parentNext,
      adviceRenderer(async reply => {
        rankingFeedbackMarkdown(reply, md);
        await message.send(FormatGui({ isPrivate, bid, title: '排行榜', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
      })
    );

    if (response.handled) {
      return;
    }
    menu = response.data;
  } catch (error) {
    rankingFailureMarkdown('leaderboard.menu', error instanceof Error ? error.message : '排行榜加载失败', md);
    void message.send(FormatGui({ isPrivate, bid, title: '排行榜', content: md }));

    return;
  }

  const active = new Map(
    menu.items
      .filter(
        item => !mentionsRetiredFeature(item.command) &&
          !mentionsRetiredFeature(item.label) &&
          commandCharacterLength(item.command) <= BUBBLE_LIMITS.commandCharacters
      )
      .map(item => [item.command, item])
  );
  const selection = /排行榜\s*(综合榜|玩法榜|2)(?:\s+(\d+))?$/u.exec(e.MessageText?.trim() ?? '');
  const tab = selection?.[1] === '玩法榜' || selection?.[1] === '2' ? tabs[1] : tabs[0];
  const items = tab.boards.flatMap(([command, label]) => {
    const item = active.get(command);

    return item ? [{ ...item, label }] : [];
  });

  for (const [command, item] of active) {
    if (!namedCommands.has(command) && tab.groups.includes(item.group)) {
      items.push(item);
    }
  }

  const total = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(total, Math.max(1, Number(selection?.[2] ?? 1)));

  // Match the activity hub: one quoted row per entry, with the action and description side by side.
  for (const item of items.slice((current - 1) * pageSize, current * pageSize)) {
    md.addBlockquote(
      Format.createMarkdown()
        .addButton(markdownButtonLabel(item.label), { data: commandText(item.command), autoEnter: false })
        .addText(` — ${item.description}`)
    );
  }

  if (items.length === 0) {
    md.addText('状态：暂无可用榜单');
  }

  await message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '排行榜',
      header: tabs.map(entry => ({ label: entry.label, selected: entry === tab, command: `/排行榜 ${entry.label}` })),
      content: md,
      nav: total > 1 ? { current, total, count: items.length, command: `/排行榜 ${tab.label} {page}` } : undefined
    })
  );
});
