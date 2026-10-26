import { useMessage } from '@src/utils/useMessage';
/**
 * 限时活动 - 任务列表
 * 指令：/活动任务
 */
import { parseBackendEventTasks } from '@src/api/bot/event-tasks-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { EVENT_FOOTER, EVENT_HEADER } from '@src/response/limitedEvent/nav';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();

  const [, parentNext] = useEvent();
  let taskGroups: ReturnType<typeof parseBackendEventTasks>;

  try {
    const response = await runRobotBusiness(e, 'limited-event.tasks', {}, parseBackendEventTasks, parentNext, async reply => {
      await message.send(
        FormatGui({ isPrivate, bid, title: '活动任务', header: EVENT_HEADER, content: Format.createMarkdown().addText(reply.text), footer: EVENT_FOOTER })
      );
    });

    if (response.handled) {
      return;
    }
    taskGroups = response.data;
  } catch {
    md.addText('查看活动任务失败，请稍后再试');
    await message.send(FormatGui({ isPrivate, bid, title: '活动任务', header: EVENT_HEADER, content: md, footer: EVENT_FOOTER }));

    return;
  }

  if (!taskGroups.length) {
    md.addText('当前没有进行中的限时活动任务');

    void message.send(FormatGui({ isPrivate, bid, title: '活动任务', header: EVENT_HEADER, content: md, footer: EVENT_FOOTER }));

    return;
  }

  for (const group of taskGroups) {
    md.addText(`📋 ${group.eventTitle} - ${group.subTitle}`);
    md.addNewline();

    for (const task of group.tasks) {
      const statusIcon = task.claimed ? '✅' : task.completed ? '🎁' : '⬜';
      const progress = `${task.currentValue}/${task.targetValue}`;

      md.addBlockquote(
        createQuoteMarkdown(
          [
            `${statusIcon} ${task.taskName}（${progress}）`,
            ...(task.taskDescription ? [task.taskDescription] : []),
            `奖励：${task.rewardTextParts.length > 0 ? task.rewardTextParts.join('、') : '无'}`
          ],
          task.canClaim ? [{ label: '领取', command: `/活动任务领取 ${task.taskId}` }] : []
        )
      );
    }

    md.addNewline();
  }

  void message.send(FormatGui({ isPrivate, bid, title: '活动任务', header: EVENT_HEADER, content: md, footer: EVENT_FOOTER }));
});
