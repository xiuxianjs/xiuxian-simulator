import type { GameEvent } from '@src/types/event';
import { parseBackendTaskRuntimeCancel } from '@src/api/bot/task-runtime-cancel';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendPage } from '@src/response/task/views';
import { Format, useEvent } from 'alemonjs';

export default async (e: GameEvent) => {
  const [, parentNext] = useEvent();
  const feedback = (text: string): Promise<void> => {
    sendPage(e, '任务取消', Format.createMarkdown().addText(text));

    return Promise.resolve();
  };

  try {
    const response = await runRobotBusiness(e, 'tasks.cancel', {}, parseBackendTaskRuntimeCancel, parentNext, reply => feedback(reply.text));

    if (response.handled) {
      return;
    }
    await feedback('当前连锁任务已取消');
  } catch {
    await feedback('任务操作失败，请稍后再试。');
  }
};
