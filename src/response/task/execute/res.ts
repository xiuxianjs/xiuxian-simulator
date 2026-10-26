import { taskRouteNumberText } from '@src/response/task/common';
import type { GameEvent } from '@src/types/event';
import { parseBackendTaskRuntimeAction } from '@src/api/bot/task-runtime-action';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendShortcut, sendPage } from '@src/response/task/views';
import { Format, useEvent } from 'alemonjs';

export default async (e: GameEvent) => {
  const [, parentNext] = useEvent();
  const feedback = (text: string): Promise<void> => {
    sendPage(e, '任务执行', Format.createMarkdown().addText(text));

    return Promise.resolve();
  };

  try {
    const response = await runRobotBusiness(
      e,
      'tasks.start',
      { slot: taskRouteNumberText(e.__route?.params?.slot) },
      value => {
        const data = parseBackendTaskRuntimeAction(value);

        if (data.outcome !== 'started' || !data.command) {
          throw new Error('任务运行状态机响应不完整');
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

    if (result.outcome === 'started' && result.command) {
      return sendShortcut(e, result.command);
    }
  } catch {
    await feedback('任务操作失败，请稍后再试。');
  }
};
