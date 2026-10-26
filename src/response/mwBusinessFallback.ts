import { measureTransportStage, measureTransportStageSync, transportCheckpoint } from '@src/utils/transportTiming';
import { isRobotTaskCompatibilityBlocked, robotTaskPresentationEvent } from '@src/api/bot/task-business-context';
import compatibility from './mwBan';
import { logger, onResponse, useEvent, Format } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { selects } from './config';
import { sendMiddlewareReply } from './middlewareReply';
import mute from './mwMute';
import guide from './resGuide';
import playerEntry from './mw';
import { sendPage, sendShortcut } from './task/views';

export default onResponse(selects, (event: GameEvent) => measureTransportStage(
    'middleware.fallback.total',
    async () => {
      transportCheckpoint('middleware.fallback.enter', event);
      const result = event.__res;

      if (!result) {
        const [, next] = useEvent();

        next();

        return;
      }
      measureTransportStageSync(
        'middleware.receipt.consume',
        () => {
          delete event.__res;
        },
        event
      );
      if (!result.success || result.branch !== 'middleware') {
        logger.error('非正常业务兜底收到无效分支');

        return;
      }
      transportCheckpoint(`middleware.fallback.reason.${result.middleware.reason}`, event);
      const task = result.middleware.taskContinuation;

      if (result.middleware.reason === 'TASK' && task) {
        if ((task.outcome === 'started' || task.outcome === 'expected') && task.command) {
          sendShortcut(event, task.command, task.message);
        } else {
          sendPage(
            robotTaskPresentationEvent(event),
            '任务执行',
            Format.createMarkdown().addText(
              task.outcome === 'invalid_runtime' ? '当前任务已失效，请重新发送 /任务执行 <槽位>' : '当前没有进行中的任务，请先发送 /任务执行 <槽位>'
            )
          );
        }

        return;
      }
      if (result.middleware.reason === 'TASK_UNMATCHED') {
        if (isRobotTaskCompatibilityBlocked(event)) {
          compatibility(event);

          return;
        }
        const [, next] = useEvent();

        return next();
      }
      // The former local middleware runs here, after the API has decided its
      // branch. These handlers render the supplied result and perform no API call.
      if ((await measureTransportStage('middleware.mute', () => mute(event, result.middleware), event)) === false) {
        return;
      }
      if ((await measureTransportStage('middleware.guide', () => guide(event, result.middleware), event)) === false) {
        return;
      }
      if ((await measureTransportStage('middleware.player-entry', () => playerEntry(event, result.middleware), event)) === false) {
        return;
      }
      for (const reply of result.middleware.replies) {
        await measureTransportStage('middleware.reply.render', () => sendMiddlewareReply(event, reply), event);
      }
    },
    event
  )
);
