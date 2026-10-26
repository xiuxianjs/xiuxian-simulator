import { useMessage } from '@src/utils/useMessage';
/**
 * 宗门商店自动刷新指令
 * - /宗门商店自动刷新      ：查看当前设置
 * - /宗门商店自动刷新 开启  ：开启自动刷新
 * - /宗门商店自动刷新 关闭  ：关闭自动刷新
 * - /宗门商店自动刷新 8 12 20：设置1-3个整点自动刷新
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { guildAutoRefreshArguments, parseRobotGuildAutoRefresh } from '@src/api/bot/guild-auto-refresh-robot-query';
import type { GuildShopAutoRefreshData } from '@src/api/schemas/guild-shop-auto-refresh';
import { formatGuildShopAutoRefreshHours } from '@src/response-apps/guild/autoRefreshShop/view';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/** 自动刷新指令正则 */
const AUTO_REFRESH_REG = /^(?:[!！/#＃])?宗门商店自动刷新(?:\s+(.+))?$/;

/** 自动刷新标题 */
const TITLE = '宗门商店自动刷新';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const rawText = (e.MessageText ?? '').trim();
  const match = rawText.match(AUTO_REFRESH_REG);

  if (!match) {
    return;
  }

  const param = (match[1] ?? '').trim();

  try {
    const loaded = await runRobotBusiness(e, 'guild.auto-refresh', guildAutoRefreshArguments(param), parseRobotGuildAutoRefresh, next, async reply => {
      const md = Format.createMarkdown().addText(reply.text);

      if (reply.buttons.length) {
        md.addNewline();
        md.addText('快捷设置：');
        addOptions(md, reply.buttons);
      }
      await message.send(FormatGui({ isPrivate, bid, title: TITLE, content: md }));
    });

    if (loaded.handled) {
      return;
    }
    if (loaded.data.outcome === 'view') {
      handleViewAutoRefresh(message, bid, isPrivate, loaded.data.state);

      return;
    }
    const md = Format.createMarkdown().addText(loaded.data.message);

    if (loaded.data.isLeader) {
      md.addNewline();
      addOptions(md, [{ label: '自动刷新', command: '/宗门商店自动刷新' }]);
    }
    void message.send(FormatGui({ isPrivate, bid, title: TITLE, content: md }));
  } catch (error) {
    await message.send(
      FormatGui({ isPrivate, bid, title: TITLE, content: Format.createMarkdown().addText(error instanceof Error ? error.message : '设置自动刷新失败') })
    );
  }
});

/**
 * 查询并展示当前自动刷新设置
 */
function handleViewAutoRefresh(message: ReturnType<typeof useMessage>[0], bid: string | undefined, isPrivate: boolean, state: GuildShopAutoRefreshData): void {
  const enabled = state.enabled;
  const hours = state.hours;

  // 构建状态文字
  let statusText: string;

  if (enabled && hours.length > 0) {
    statusText = `当前状态：已开启，${formatGuildShopAutoRefreshHours(hours)}自动刷新`;
  } else {
    statusText = '当前状态：未开启';
  }

  // 判断是否为宗主
  const leader = state.isLeader || state.isViceLeader;

  const md = Format.createMarkdown();

  md.addText(statusText);
  md.addNewline();
  md.addNewline();

  if (leader) {
    if (enabled) {
      // 开启状态：显示关闭和修改时间按钮

      addOptions(md, [
        { label: '关闭', command: '/宗门商店自动刷新 关闭' },
        { label: '改为 8 12 20', command: '/宗门商店自动刷新 8 12 20' }
      ]);
    } else {
      // 关闭状态：显示开启和时间快捷按钮

      addOptions(md, [
        { label: '开启', command: '/宗门商店自动刷新 开启' },
        { label: '8 12 20', command: '/宗门商店自动刷新 8 12 20' },
        { label: '8 20', command: '/宗门商店自动刷新 8 20' },
        { label: '12 20', command: '/宗门商店自动刷新 12 20' }
      ]);
    }
  }

  md.addText('参数说明：');
  md.addNewline();
  md.addText('  开启 - 启用自动刷新');
  md.addNewline();
  md.addText('  关闭 - 禁用自动刷新');
  md.addNewline();
  md.addText('  1-3个整点(0-23) - 设置每日自动刷新时间');
  md.addNewline();
  md.addText('  示例：/宗门商店自动刷新 8 12 20');
  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: TITLE,
      content: md
    })
  );
}
