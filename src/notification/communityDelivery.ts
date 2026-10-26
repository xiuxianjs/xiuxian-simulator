import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { getBackendConfig } from '@src/api/bot/config';
import { createHash, randomUUID } from 'crypto';
import { Format, getConfigValue, logger } from 'alemonjs';
import {
  claimCommunityNotification,
  finishCommunityNotification,
  readCommunitySettings,
  readPlatformAvailability,
  queueCommunityNotification,
  readPlatformDeliveryReceipt,
  storePlatformDeliveryReceipt,
  type CommunityBatch
} from '@src/api/bot/notification-cache';
import { getAppConfig } from '@src/utils/appConfig';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { notificationChannel, refreshNotificationPermission } from './channel';
import { requireCommunityBotAdministrator } from './community';
import type { LifecycleEvent } from './lifecycle';

export async function queueCommunityWelcome(event: LifecycleEvent): Promise<void> {
  if (event.Platform !== 'qq-bot' || event.name !== 'member.add' || !event.Target || !event.MemberId || !event.BotId) {
    return;
  }
  const target = { ...event.Target, platform: event.Platform, BotId: event.BotId };
  const state = await readPlatformAvailability(target, event.MemberId);
  const occurredAt = Number.isSafeInteger(event.OccurredAt) && (event.OccurredAt ?? 0) > 0 ? event.OccurredAt : undefined;

  if (state?.available !== true || (occurredAt && state.updatedAt > occurredAt)) {
    return;
  }
  await queueCommunityNotification(target, 'welcome', event.MemberId, occurredAt ?? state.updatedAt);
}

const welcomeScenes = ['山门风铃轻响，又有道友踏云而来。', '云间传来脚步声，仙途又添一位同行人。', '洞府外清风拂过，一段新的相逢就此开始。'];

/** 平台事件批次不进入玩家游戏历史，不猜测成员的私聊目标。 */
export function buildCommunityBatch(batch: CommunityBatch) {
  const members = [...new Set(batch.items)];
  const count = members.length;
  const quote = Format.createMarkdown();

  if (batch.kind === 'welcome') {
    // A member joining the group may already have a character. Welcome the
    // actual members without guessing their game identity or character gender.
    // Event-based selection stays stable across retries and Redis set ordering.
    const scene = createHash('sha256').update(batch.eventId).digest().readUInt32BE(0) % welcomeScenes.length;

    quote
      .addText(count === 1 ? welcomeScenes[scene] : `今日山门热闹，迎来 ${count} 位道友。`)
      .addNewline()
      .addNewline();
    if (count === 1) {
      quote.addText('欢迎 ');
    }
    members.forEach((id, index) => {
      if (index > 0) {
        quote.addText(' ');
      }
      quote.addMention(id);
    });
    quote.addText(count === 1 ? '，愿你在此结识同道，共赴仙途。' : '').addNewline();
    if (count > 1) {
      quote.addNewline().addText('仙途漫漫，往后便有同道同行。').addNewline();
    }
    quote.addNewline();
    addOptions(quote, [
      { label: '踏入仙途', command: '/踏入仙途' },
      { label: '我的主页', command: '/我' },
      { label: '玩法大厅', command: '/我的活动' }
    ]);
  } else {
    quote.addText(`收到 ${count} 条加群申请事件，请管理员在 QQ 群管理中核实与处理。`).addNewline();
    quote.addText('事件记录不代表申请仍待审核；不会自动审批。').addNewline();
    quote.addButton(markdownButtonLabel('申请记录'), { data: '/加群申请记录' });
  }

  return FormatGui({
    mention: false,
    bar: false,
    title: batch.kind === 'welcome' ? (count === 1 ? '仙途来客' : '同道相逢') : '修仙 · 加群申请',
    content: Format.createMarkdown().addBlockquote(quote)
  }).format.value;
}

async function deliverBatch(batch: CommunityBatch) {
  const settings = await readCommunitySettings(batch.target);

  if (getAppConfig()?.close_proactive_message || !(batch.kind === 'welcome' ? settings.welcomeEnabled : settings.requestReminders)) {
    return false;
  }
  if ((await readPlatformAvailability(batch.target))?.available === false) {
    return false;
  }
  const permission = await refreshNotificationPermission(batch.target);

  // 新接口未确认允许时不猜测主动发送能力；未知状态稍后重试。
  if (permission?.state === 'blocked') {
    return false;
  }
  if (permission?.state !== 'allowed') {
    throw new Error('群主动消息权限暂时无法确认');
  }
  if (permission.retryAt && permission.retryAt > Date.now()) {
    throw new Error('群通知通道仍在失败冷却中');
  }
  let items = [...new Set(batch.items)];

  if (batch.kind === 'welcome') {
    const members = await Promise.all(items.map(id => readPlatformAvailability(batch.target, id)));

    items = items.filter((_, index) => members[index]?.available === true);
  } else {
    await requireCommunityBotAdministrator(batch.target);
  }
  if (items.length === 0) {
    return false;
  }
  try {
    await notificationChannel.send(batch.target, buildCommunityBatch({ ...batch, items }), permission);
  } catch (error) {
    await notificationChannel.recordFailure(batch.target);
    throw error;
  }

  return true;
}

let running = false;
let pending = false;

export async function dispatchCommunityNotifications(): Promise<void> {
  pending = true;
  if (running) {
    return;
  }
  running = true;
  try {
    while (pending) {
      pending = false;
      const values = getConfigValue() ?? {};
      const config = { ...values['qq-bot'], ...values['@alemonjs/qq-bot'] };
      const botIds = config.bots ? Object.keys(config.bots) : config.app_id ? [String(config.app_id)] : [];
      const backend = getBackendConfig();
      const selectedBotIds = backend.channelMode ? botIds.filter(id => id === backend.channelBotId) : botIds;

      if (backend.channelMode && selectedBotIds.length === 0) {
        throw new Error('渠道通知机器人未在 QQ 平台配置中启用');
      }

      for (const botId of selectedBotIds) {
        const consumer = `node.community:${randomUUID()}`;

        while (true) {
          const batch = await claimCommunityNotification(botId, consumer);

          if (!batch) {
            break;
          }
          try {
            if (!(await readPlatformDeliveryReceipt(batch.eventId))) {
              const sent = await deliverBatch(batch);

              if (sent) {
                await storePlatformDeliveryReceipt(batch.eventId, { route: 'group', reason: 'sent' });
              }
            }
            await finishCommunityNotification(batch.eventId, consumer, false);
          } catch (error) {
            logger.warn('群平台通知等待重试', error instanceof Error ? error.message : '未知错误');
            await finishCommunityNotification(batch.eventId, consumer, true);
          }
        }
      }
    }
  } finally {
    running = false;
  }
}
