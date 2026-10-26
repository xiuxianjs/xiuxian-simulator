import { measureTransportStage, transportCheckpoint } from '@src/utils/transportTiming';
import { onResponse, useEvent, Format } from 'alemonjs';
import { hasPendingRobotTaskInput } from '@src/api/bot/task-business-context';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from './robotBusiness';
import { sendPage } from './task/views';
import { selects } from './config';

export default onResponse(selects, (event: GameEvent) => measureTransportStage(
    'middleware.task-tail.total',
    async () => {
      transportCheckpoint('middleware.task-tail.enter', event);
      const [, next] = useEvent();

      if (!hasPendingRobotTaskInput(event)) {
        return next();
      }
      try {
        await runRobotBusiness(
          event,
          'tasks.continue',
          {},
          () => {
            throw new Error('任务终端动作不能返回业务分支');
          },
          next
        );
      } catch {
        sendPage(event, '任务执行', Format.createMarkdown().addText('任务操作失败，请稍后再试。'));
      }
    },
    event
  )
);
