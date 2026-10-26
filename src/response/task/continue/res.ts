import { measureTransportStageSync } from '@src/utils/transportTiming';
import type { GameEvent } from '@src/types/event';
import { setRobotTaskInput } from '@src/api/bot/task-business-context';
import { normalizeTaskCommandText, toTaskInputRouteCommand } from '@src/response/task/common';
import type { Next } from 'alemonjs';

export default (event: GameEvent, next: Next) => measureTransportStageSync(
    'route.task-escape',
    () => {
      const text = normalizeTaskCommandText(event.MessageText);
      const match = text.match(/^(!|！|\/|#|＃)?任务\s+(.+)$/);

      if (!match) {
        return next();
      }
      const input = match[2] ?? '';

      setRobotTaskInput(event, input);
      // Exact routing selects an API only. The backend still owns whether this
      // input starts, advances or stops a task before it executes any business.
      event.MessageText = toTaskInputRouteCommand(input);

      return next();
    },
    event
  );
