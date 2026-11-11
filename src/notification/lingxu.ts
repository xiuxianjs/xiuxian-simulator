import { getLingxuPushDestination } from '@src/api/bot/notification-relay';
import { buildBubble } from '@src/response/presentation/bubble';
import type { NotificationDelivery } from '@src/types/notification';
import type { DataEnums } from 'alemonjs';
import { deliverPlayerNotification } from './service';

const viewJournal = { label: '查看行记', command: '/灵墟洞天 行记', autoEnter: false };

export function lingxuNoticeData(summary: unknown, fallback: DataEnums[]): DataEnums[] {
  if (summary && typeof summary === 'object') {
    const { time, lines } = summary as { time?: unknown; lines?: unknown };

    if (
      typeof time === 'string' &&
      /^\d{2}-\d{2} \d{2}:\d{2}(?:–(?:\d{2}-\d{2} )?\d{2}:\d{2})?$/.test(time) &&
      Array.isArray(lines) &&
      lines.length > 0 &&
      lines.length <= 5 &&
      lines.every(line => typeof line === 'string' && /^(?:经历|结果|掉落|损失|收获)：[^\r\n]{1,181}$/.test(line))
    ) {
      return buildBubble({ title: '灵墟洞天 · 行记推送', sections: [{ title: time, lines }], footer: [viewJournal], bar: false }).format.value;
    }
  }

  // Legacy events do not have the group-safe projection. Their text is only
  // used by private delivery, while group delivery gets a fixed journal link.
  return fallback.length
    ? fallback
    : buildBubble({ title: '灵墟洞天 · 行记推送', sections: [{ lines: ['说明：有新的洞天行记。'] }], footer: [viewJournal], bar: false }).format.value;
}

export async function deliverLingxuNotification(
  userId: number,
  bid: string,
  queuedAt: string | undefined,
  summary: unknown,
  legacy: DataEnums[],
  enabled: boolean
): Promise<NotificationDelivery> {
  if (!enabled) {
    return { route: 'history', reason: 'proactive_disabled' };
  }
  // Older relay versions omit occurredAt. Do not guess a delivery destination.
  if (!queuedAt) {
    throw new Error('洞天推送缺少入队时间');
  }
  const preference = await getLingxuPushDestination(userId, queuedAt);

  if (preference.mode === 'off') {
    return { route: 'history', reason: 'proactive_disabled' };
  }
  if (preference.mode === 'group') {
    return deliverPlayerNotification(userId, bid, lingxuNoticeData(summary, []), enabled, {
      exactGroup: preference.target,
      async authorize(target) {
        const current = await getLingxuPushDestination(userId, queuedAt);

        return (
          current.mode === 'group' &&
          current.target.platform === target.platform &&
          current.target.BotId === target.BotId &&
          current.target.scope === target.scope &&
          current.target.targetId === target.targetId
        );
      }
    });
  }

  return deliverPlayerNotification(userId, bid, lingxuNoticeData(summary, legacy), enabled, {
    privateOnly: true,
    async authorize() {
      return (await getLingxuPushDestination(userId, queuedAt)).mode === 'private';
    }
  });
}
