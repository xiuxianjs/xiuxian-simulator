import { commandText } from '@src/utils/commandPrefix';
import { activeFeatureText, mentionsRetiredFeature } from '@src/response/retiredFeatures';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { rankingFeedbackMarkdown, rankingFailureMarkdown } from './view';
import { useMessage } from '@src/utils/useMessage';
import { BUBBLE_LIMITS } from '@src/response/presentation/index';
/**
 * 统一排行榜入口
 * 指令：/排行榜
 * 列出所有排行榜类型，点击按钮进入对应排行榜
 */
import { selects } from '@src/response/config';
import { parseLeaderboardMenu } from '@src/api/bot/leaderboard-catalog';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  // 不到境界也能，只是不在气泡中显示出来。减少萌新干扰

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

  const groups = ['实力成长', '修仙百业', '道友互动', '竞技与活动', '其他'];
  const active = menu.items.filter(item => !mentionsRetiredFeature(item.command) && !mentionsRetiredFeature(item.label));
  const visible = groups.flatMap(group => active.filter(item => item.group === group));
  const total = Math.max(1, Math.ceil(visible.length / BUBBLE_LIMITS.homeTotalButtons));
  const pageSize = Math.ceil(visible.length / total);
  const requested = Number(e.MessageText?.trim().match(/排行榜\s*(\d+)$/u)?.[1] ?? 1);
  const page = Math.min(total, Math.max(1, requested));
  const shown = visible.slice((page - 1) * pageSize, page * pageSize);

  for (const group of groups) {
    const items = shown.filter(item => item.group === group);

    if (items.length === 0) {
      continue;
    }
    md.addBold(group);
    md.addNewline();
    for (const item of items) {
      md.addButton(markdownButtonLabel(`${item.label}`), { data: commandText(item.command) });
      md.addText(` — ${item.description}`);
      md.addNewline();
    }
    md.addNewline();
  }
  md.addText(activeFeatureText(menu.hint));

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '排行榜',
      content: md,
      nav: total > 1 ? { current: page, total, count: visible.length, command: '/排行榜 {page}' } : undefined
    })
  );
});
