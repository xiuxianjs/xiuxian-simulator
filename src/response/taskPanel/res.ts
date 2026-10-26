import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { sendTaskPanelSubscriptionReminder } from './subscriptionReminder';
import { measureTransportStage } from '@src/utils/transportTiming';
import { useMessage } from '@src/utils/useMessage';
/**
 * 任务面板指令入口
 * 展示任务面板文本与操作按钮
 */
import { parseRobotTaskPanel } from '@src/api/bot/task-panel-view';
import type { TaskPanelItemView } from '@src/api/schemas/task-panel-view';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { TAB_REGISTRY } from '@src/response/taskPanel/constants';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 构建 QQ 端文本消息
 * @param tabName Tab 名称
 * @param items 条目列表
 * @returns Format Markdown 对象
 */
const buildQQContent = (tabName: string, items: TaskPanelItemView[]): ReturnType<typeof Format.createMarkdown> => {
  const md = Format.createMarkdown();

  md.addText(tabName);
  md.addNewline();
  md.addNewline();

  if (items.length === 0) {
    md.addText('今日暂无待办');

    return md;
  }

  const statusIcon: Record<string, string> = {
    ACTIONABLE: '●',
    IN_PROGRESS: '●',
    COMPLETED: '✓',
    UNAVAILABLE: '○',
    ERROR: '▲'
  };

  for (const item of items) {
    const icon = statusIcon[item.status] ?? '○';

    const itemMd = Format.createMarkdown().addText(`${icon} ${item.label} — ${item.statusText}`);

    if (item.command) {
      itemMd.addNewline();
      itemMd.addButton(markdownButtonLabel(item.actionLabel ?? item.label), { data: item.command });
      for (const option of item.options ?? []) {
        itemMd.addText(' ');
        itemMd.addButton(markdownButtonLabel(option.label), { data: option.command });
      }
    }
    md.addBlockquote(itemMd);
  }

  return md;
};

const response = onResponse(selects, (e, next) => measureTransportStage(
    'route.task-panel',
    async () => {
      if (e.__res) {
        const [, parentNext] = useEvent();

        parentNext();

        return;
      }
      const text = String(e.MessageText ?? '')
        .trim()
        .replace(/^(!|！|\/|#|＃)\s*/, '');

      /** 匹配 "任务面板" 或 "修仙面板" 开头的指令 */
      const panelMatch = text.match(/^(?:任务面板|修仙面板)(?:\s+(.+))?$/);

      if (!panelMatch) {
        next();

        return;
      }

      const bid = e.UserId;
      const [message] = useMessage();
      const isPrivate = e.isPrivate ?? false;
      const [, parentNext] = useEvent();
      const response = await runRobotBusiness(e, 'task-panel.view', { tab: panelMatch[1] ?? '' }, parseRobotTaskPanel, parentNext, async reply => {
        const md = Format.createMarkdown().addText(reply.text);

        await message.send(FormatGui({ isPrivate, bid, title: '任务面板', content: md }));
      }).catch(async error => {
        logger.error('任务面板查询失败:', error);
        const md = Format.createMarkdown().addText(error instanceof Error ? error.message : '任务面板加载失败');

        await message.send(FormatGui({ isPrivate, bid, title: '任务面板', content: md }));

        return { handled: true as const };
      });

      if (response.handled) {
        return;
      }
      const { tabs, defaultTabKey, requestedTab } = response.data;
      const parsedKey = requestedTab || null;

      /** 过滤不可见的 Tab（visible !== false 的保留） */
      const hiddenTabKeys = new Set<string>(tabs.filter(t => t.visible === false).map(t => t.tabKey));
      const visibleTabRegistry = TAB_REGISTRY.filter(tab => tabs.some(row => row.tabKey === tab.key) && !hiddenTabKeys.has(tab.key));

      /** 解析目标 Tab（未匹配到则使用动态首 Tab） */
      let targetTabKey = parsedKey ?? defaultTabKey;

      /** 如果目标 Tab 被隐藏，回退到第一个可见 Tab */
      const targetTab = tabs.find(t => t.tabKey === targetTabKey);

      if (!targetTab || targetTab.visible === false) {
        const firstVisibleTab = tabs.find(t => t.visible !== false);

        targetTabKey = firstVisibleTab?.tabKey ?? '';
      }

      const currentTab = tabs.find(t => t.tabKey === targetTabKey && t.visible !== false);

      if (!currentTab) {
        const md = Format.createMarkdown();

        md.addText('未找到对应的任务面板 Tab');

        void message.send(FormatGui({ isPrivate, bid, title: '任务面板', content: md }));

        return;
      }

      /** 过滤可见条目 */
      const visibleItems = currentTab.items.filter(item => item.visible);

      {
        /** QQ 端：文本消息 */
        const md = buildQQContent(currentTab.tabName, visibleItems);
        const tabButtons = visibleTabRegistry.map(tab => {
          const name = tabs.find(row => row.tabKey === tab.key)?.tabName ?? tab.name;

          return { label: name, selected: tab.key === currentTab.tabKey, command: `/任务面板 ${tab.commandAlias[0]}` };
        });

        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '任务面板',
            header: tabButtons,
            content: md
          })
        );
        await sendTaskPanelSubscriptionReminder(e);
      }
    },
    e
  )
);

export default response;
