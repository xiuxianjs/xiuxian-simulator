import { taskRouteNumberText } from '@src/response/task/common';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendPage, renderAliasOverview, renderOverview } from '@src/response/task/views';
import { validateBackendTaskConfigPage } from '@src/api/bot/task-config';
import { Format, useEvent } from 'alemonjs';

export default async (e: GameEvent) => {
  const [, parentNext] = useEvent();
  const feedback = (text: string): Promise<void> => {
    sendPage(e, '任务别名', Format.createMarkdown().addText(text));

    return Promise.resolve();
  };

  try {
    const response = await runRobotBusiness(
      e,
      'tasks.alias',
      { slot: taskRouteNumberText(e.__route?.params?.slot), alias: String(e.__route?.params?.alias ?? '') },
      value => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          !('mode' in value) ||
          typeof value.mode !== 'string' ||
          !['alias-overview', 'overview'].includes(value.mode) ||
          !('page' in value)
        ) {
          throw new Error('任务展示配置响应不完整');
        }

        return { mode: value.mode, page: validateBackendTaskConfigPage(value.page) };
      },
      parentNext,
      reply => feedback(reply.text)
    );

    if (response.handled) {
      return;
    }
    const { mode, page } = response.data;

    if (mode === 'alias-overview') {
      return renderAliasOverview(e, page.config.slots.slice(0, page.limits.slotCount));
    }
    renderOverview(e, page.config.slots, page.limits);
  } catch {
    await feedback('任务操作失败，请稍后再试。');
  }
};
