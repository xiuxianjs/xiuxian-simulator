import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGroupSubscriptionResult } from '@src/api/bot/group-subscription-business';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

type SubscriptionAction = 'enable' | 'disable';

const getAction = (messageText: string): SubscriptionAction | null => {
  const text = messageText.trim().replace(/^[!！/#＃]/, '');

  if (text === '开启群订阅') {
    return 'enable';
  }
  if (text === '关闭群订阅') {
    return 'disable';
  }

  return null;
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate === true || e.name === 'private.message.create';
  const action = getAction(e.MessageText ?? '');

  if (!action) {
    return parentNext();
  }

  const md = Format.createMarkdown();

  const response = await runRobotBusiness(
    e,
    action === 'enable' ? 'notifications.group-enable' : 'notifications.group-disable',
    {
      isPrivate,
      platform: String(e.Platform ?? ''),
      channelId: e.ChannelId ? String(e.ChannelId) : '',
      botId: e.BotId ?? null,
      targetScope: e.Target?.scope === 'channel' || e.SpaceId?.startsWith('GUILD:') ? 'channel' : 'group'
    },
    value => parseGroupSubscriptionResult(value, action),
    parentNext,
    async reply => {
      const content = Format.createMarkdown().addText(reply.text);

      await message.send(FormatGui({ isPrivate, bid, title: '我的设置', content }));
    }
  ).catch(async error => {
    logger.error('群订阅操作失败:', error);
    const content = Format.createMarkdown().addText(error instanceof Error ? error.message : '群订阅操作失败');

    await message.send(FormatGui({ isPrivate, bid, title: '我的设置', content }));

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }

  if (action === 'enable') {
    const result = response.data;

    md.addText(result.switched ? '已将订阅群切换至本群。' : '已在本群开启通知订阅。');
    md.addNewline();
    md.addText('通知优先发至本群，权限受限时可查看通知记录。');
  } else if (action === 'disable') {
    const disabled = response.data.disabled;

    md.addText(disabled ? '已关闭群通知订阅。' : '你当前未开启群通知订阅。');
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      mention: false,
      title: '我的设置',
      content: md,
      footer: [
        { label: '通知记录', command: '/我的通知' },
        { label: '我的设置', command: '/我的设置' }
      ]
    })
  );
});
