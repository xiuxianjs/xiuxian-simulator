import { acquirePlatformDeliveryLease, readPlatformAvailability, storePlatformDeliveryReceipt } from '@src/api/bot/notification-cache';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, type Events } from 'alemonjs';
import { createHash, randomUUID } from 'crypto';
import { assertNotificationReceipt, readNotificationChannel, withNotificationTimeout } from './channel';
import type { LifecycleEvent } from './lifecycle';

const pending = new Set<string>();

type WelcomeEvent = LifecycleEvent | Events['notice.create' | 'private.notice.create'];

/** 只回复适配器支持且带真实事件标识的欢迎/授权事件。 */
export async function sendNotificationWelcome(event: WelcomeEvent, send: (data: ReturnType<typeof FormatGui>) => Promise<unknown>): Promise<void> {
  const friend = event.name === 'private.friend.add';
  const joined = event.name === 'guild.join';
  const permission = event.Notice?.type === 'message-permission' && event.Notice.enabled;

  if (event.Platform !== 'qq-bot' || (!friend && !joined && !permission) || !event.MessageId || !event.BotId || !event.Target) {
    return;
  }
  const target = { ...event.Target, platform: event.Platform, BotId: event.BotId };

  if ((await readPlatformAvailability(target))?.available === false) {
    return;
  }
  if (permission && (await readNotificationChannel(target))?.state !== 'allowed') {
    return;
  }
  const key = `welcome:${createHash('sha256')
    .update(JSON.stringify([event.Platform, event.BotId, event.name, event.MessageId]))
    .digest('hex')}`;

  if (pending.has(key) || !(await acquirePlatformDeliveryLease(key, randomUUID()))) {
    return;
  }
  // 服务端租约防止其他进程同时回复；本地集合保护当前进程。
  if (pending.has(key)) {
    return;
  }
  pending.add(key);
  try {
    const data = buildNotificationWelcome(event);
    const result = await withNotificationTimeout(() => send(data));

    assertNotificationReceipt(result);
    await storePlatformDeliveryReceipt(key, { route: target.scope === 'group' ? 'group' : 'private', reason: 'sent' });
  } finally {
    pending.delete(key);
  }
}

/** 统一生成实际发送的气泡，便于布局验证。 */
export function buildNotificationWelcome(event: WelcomeEvent): ReturnType<typeof FormatGui> {
  const friend = event.name === 'private.friend.add';
  const joined = event.name === 'guild.join';
  const target = event.Target;
  const quote = Format.createMarkdown();

  if (friend) {
    quote.addText('欢迎来到修仙世界。').addNewline();
    quote.addText('初来乍到可踏入仙途，已有角色可查看主页。').addNewline();
    quote
      .addButton(markdownButtonLabel('踏入仙途'), { data: '/踏入仙途' })
      .addText(' ')
      .addButton(markdownButtonLabel('我的主页'), { data: '/我' })
      .addText(' ')
      .addButton(markdownButtonLabel('帮助'), { data: '/修仙帮助' })
      .addButton(markdownButtonLabel('登录'), { data: '/登录' });
  } else if (joined) {
    quote.addText('道友们好，接下来由我来陪大家一起修行、闯秘境、争夺机缘！').addNewline().addNewline();
    quote.addText('请群主点击机器人头像，在设置中开启：').addNewline();
    quote.addText('① 接收群内全部消息').addNewline();
    quote.addText('② 允许群内主动发言').addNewline();
    quote.addText('虾仁夺宝（打劫）是游戏主要的修为获取方式之一！推荐开启接收全部消息，获得完整体验。').addNewline();
    quote
      .addButton(markdownButtonLabel('帮助'), { data: '/修仙帮助' })
      .addText(' ')
      .addButton(markdownButtonLabel('踏入仙途'), { data: '/踏入仙途' })
      .addText(' ')
      .addButton(markdownButtonLabel('我的设置'), { data: '/我的设置' })
      .addText(' ')
      .addButton(markdownButtonLabel('登录'), { data: '/登录' });
  } else {
    quote.addText(target?.scope === 'group' ? '本群已允许接收机器人主动消息。' : '本次私聊已允许接收机器人主动消息。').addNewline();
    quote.addText('后续通知将按现有设置投递。').addNewline();
    quote
      .addButton(markdownButtonLabel('我的设置'), { data: '/我的设置' })
      .addText(' ')
      .addButton(markdownButtonLabel('我的通知'), { data: '/我的通知' })
      .addButton(markdownButtonLabel('登录'), { data: '/登录' });
  }
  const content = Format.createMarkdown().addBlockquote(quote);

  return FormatGui({
    isPrivate: target?.scope === 'c2c',
    bid: event.UserId,
    mention: false,
    bar: false,
    title: friend ? '修仙 · 欢迎道友' : joined ? '修仙 · 入群指引' : '修仙 · 通知通道',
    content
  });
}
