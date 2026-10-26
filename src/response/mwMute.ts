import { formatGameTime } from '@src/utils/gameTime';
import type { GameEvent } from '@src/types/event';
import type { RobotMiddlewareResult } from '@src/api/bot/middleware-entry';
import { useMessage } from '@src/utils/useMessage';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger } from 'alemonjs';

// Former pre-route mute middleware, now invoked after the business API returns.
// The backend already reserved the notice quota; never claim it a second time.
export default async (event: GameEvent, result: RobotMiddlewareResult): Promise<boolean> => {
  const mute = result.mute;

  if (result.reason !== 'MUTED' || !mute?.muted) {
    return true;
  }
  logger.info(`[禁言拦截] 用户 ${event.UserId}(uid:${event.uid}) 被禁言，解除时间: ${mute.muteUnlockTime}`);
  if (mute.claimed) {
    const [message] = useMessage(event);
    const md = Format.createMarkdown();

    md.addText(`你的修仙功能已被禁言，限制将于${formatGameTime(mute.muteUnlockTime)}解除。`);
    await message.send(FormatGui({ isPrivate: /private/.test(event.name), bid: event.UserId, title: '', content: md }));
  }

  return false;
};
