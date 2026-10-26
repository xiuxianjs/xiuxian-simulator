import type { GameEvent } from '@src/types/event';
import { parseBackendTaskRuntimeAction } from '@src/api/bot/task-runtime-action';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { renderOverview, sendShortcut, sendPage } from '@src/response/task/views';
import { Format, useEvent } from 'alemonjs';

export default async (e: GameEvent) => {
  const [, parentNext] = useEvent();
  const feedback = (text: string): Promise<void> => {
    sendPage(e, '任务设置', Format.createMarkdown().addText(text));

    return Promise.resolve();
  };

  try {
    const response = await runRobotBusiness(
      e,
      'tasks.overview',
      {},
      value => {
        const data = parseBackendTaskRuntimeAction(value);

        if (!(data.outcome === 'current' && data.command) && !data.page) {
          throw new Error('任务展示配置响应不完整');
        }

        return data;
      },
      parentNext,
      reply => feedback(reply.text)
    );

    if (response.handled) {
      return;
    }
    const result = response.data;

    if (result.outcome === 'current' && result.command) {
      return sendShortcut(e, result.command, `当前正在执行第${result.slot}个任务，请继续`);
    }
    const page = result.page!;

    renderOverview(e, page.config.slots, page.limits);
  } catch {
    await feedback('任务状态获取失败，请稍后再试。');
  }
};
