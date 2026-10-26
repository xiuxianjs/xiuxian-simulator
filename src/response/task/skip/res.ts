import type { GameEvent } from '@src/types/event';
import { parseBackendTaskRuntimeAction } from '@src/api/bot/task-runtime-action';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { renderOverview, sendShortcut, sendPage } from '@src/response/task/views';
import { Format, useEvent } from 'alemonjs';

export default async (e: GameEvent) => {
  const [, parentNext] = useEvent();
  const feedback = (text: string): Promise<void> => {
    sendPage(e, '任务跳过', Format.createMarkdown().addText(text));

    return Promise.resolve();
  };

  try {
    const response = await runRobotBusiness(
      e,
      'tasks.skip',
      {},
      value => {
        const data = parseBackendTaskRuntimeAction(value);

        if (data.outcome === 'not_running' && !data.page) {
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

    if (result.outcome === 'next' && result.command) {
      return sendShortcut(e, result.command, result.message);
    }
    if (result.outcome === 'not_running' && result.page) {
      return renderOverview(e, result.page.config.slots, result.page.limits);
    }
  } catch {
    await feedback('任务操作失败，请稍后再试。');
  }
};
