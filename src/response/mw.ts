import { formatGameTime } from '@src/utils/gameTime';
import { sendRegistrationNamePrompt } from './start/namePrompt';
import type { GameEvent } from '@src/types/event';
import type { RobotMiddlewareResult } from '@src/api/bot/middleware-entry';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger } from 'alemonjs';
import { appendMiddlewareAdvice, sendMiddlewareReply } from './middlewareReply';
import { withBusinessRecovery } from './businessRecovery';

// Former player-entry middleware. It now consumes the completed entry result;
// identity, maintenance, feature eligibility and recovery are never re-requested.
export default async (event: GameEvent, result: RobotMiddlewareResult): Promise<boolean> => {
  if (result.reason === 'UNREGISTERED') {
    for (const reply of result.replies) {
      if (reply.buttons.some(button => button.command === '/我是')) {
        await sendRegistrationNamePrompt(event);
      } else {
        await sendMiddlewareReply(event, reply);
      }
    }

    return false;
  }
  const [message] = useMessage(event);
  const bid = event.UserId;
  const isPrivate = event.isPrivate ?? event.name.startsWith('private.');

  const entry = result.entry;

  if (!entry) {
    return true;
  }
  if (entry.maintenance.disabled) {
    for (const reply of result.replies.slice(0, -1)) {
      await sendMiddlewareReply(event, reply);
    }
    const rule = entry.maintenance;
    const md = Format.createMarkdown();

    md.addText('⚠️ 该功能维护中');
    md.addNewline();
    md.addText(`维护原因：${rule.reason ?? '功能维护中'}`);
    md.addNewline();
    md.addText(`预计恢复：${formatGameTime(rule.endTime)}`);
    md.addNewline();
    md.addText('请耐心等待恢复后再使用。');
    await message.send(FormatGui({ isPrivate, bid, title: '功能维护', content: md }));

    return false;
  }
  if (entry.processingError) {
    logger.error(`玩家入口领域处理未完成：${entry.processingError}`);
  }
  if (entry.featureGuard?.blocked) {
    // ENTRY_FAILED appends a generic terminal reply; retain earlier notices
    // and replace only that terminal reply with the original realm bubble.
    const notices = result.reason === 'ENTRY_FAILED' ? result.replies.slice(0, -1) : result.replies;

    for (const reply of notices) {
      await sendMiddlewareReply(event, reply);
    }
    const guard = entry.featureGuard;
    const md = Format.createMarkdown();

    md.addText(`${guard.reason ?? '当前境界尚未达到该功能要求'}；当前境界：${guard.realmName ?? '未知境界'}。`);
    const guidance = withBusinessRecovery('realm.overview', {
      title: '功能未解锁',
      heading: '',
      text: `境界条件未满足：${guard.reason ?? ''}`,
      buttons: [],
      advice: []
    });

    appendMiddlewareAdvice(md, guidance.advice);
    await message.send(FormatGui({ isPrivate, bid, title: '功能未解锁', content: md, footer: [{ label: '我的境界', command: '/我的境界' }] }));

    return false;
  }

  return true;
};
