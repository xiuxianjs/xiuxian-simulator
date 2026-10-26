import { onResponse, useEvent } from 'alemonjs';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { parseAlchemyV2Reply } from '@src/api/bot/alchemy-v2';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { normalizeAlchemyCommand } from './commands';

// Navigation only: never retain a confirmation token or authoritative game state.
const previewTargets = new Map<string, { command: string; expires: number }>();

export default onResponse(selects, async event => {
  const [, next] = useEvent();
  const originalText = event.MessageText;

  event.MessageText = normalizeAlchemyCommand(originalText ?? '');

  try {
    const result = await runRobotBusiness(event, 'alchemy.v2', {}, parseAlchemyV2Reply, next);

    if (!result.handled) {
      const key = JSON.stringify([event.Platform, event.BotId, event.UserId, event.uid]);
      const command = event.MessageText ?? '';
      const preview = /^\/炼丹 预览 ([1-9]\d*) ([1-9]\d*)$/.exec(command);

      if (preview && Number(preview[2]) <= 1000) {
        previewTargets.delete(key);
        previewTargets.set(key, { command, expires: Date.now() + 30 * 60 * 1000 });
        if (previewTargets.size > 256) {
          previewTargets.delete(previewTargets.keys().next().value!);
        }
      }
      const target = previewTargets.get(key);

      if (target && target.expires <= Date.now()) {
        previewTargets.delete(key);
      } else if (target && /^\/炼丹 (?:天工|来源|对比|装备|卸下|补领天工|确认)(?:\s|$)/.test(command)) {
        // A craft receipt already has its authoritative next-preview action.
        if (!result.data.buttons.some(button => button.label === '再次预览')) {
          result.data.buttons = [
            { label: '返回原丹方预览', command: target.command },
            ...result.data.buttons.filter(button => button.label !== '返回丹方预览' && button.command !== target.command)
          ];
        }
      }
      await sendMiddlewareReply(event, result.data, 'footer');
    }
  } catch (error) {
    const confirmation = /^\/炼丹 确认 \S+$/.test(event.MessageText ?? '');

    await sendMiddlewareReply(
      event,
      {
        title: '炼丹',
        heading: '',
        text: confirmation ? '本次操作结果暂未确认。请重试原操作核对结果；若已完成，将返回原回执，不会重复扣料或扣款。' : getCommandErrorMessage(error),
        buttons: confirmation ? [{ label: '重试原操作', command: event.MessageText }] : [{ label: '返回炼丹', command: '/炼丹' }],
        advice: []
      },
      'footer'
    );
  } finally {
    event.MessageText = originalText;
  }
});
