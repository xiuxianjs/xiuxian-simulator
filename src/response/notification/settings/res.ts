import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { Format, onResponse, useEvent } from 'alemonjs';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { playerNotificationCategories } from '@src/api/bot/notification-cache';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { getCommandErrorMessage } from '@src/utils/commandError';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const match = (e.MessageText ?? '').trim().match(/^[!！/#＃]?通知设置(?:\s+(\S+)\s+(开启|关闭))?$/);

  if (!match) {
    return next();
  }

  try {
    const identity = await runRobotBusiness(e, 'settings.overview', { includeGroup: false }, (_data, uid) => uid, next);

    if (identity.handled) {
      return;
    }
    let categories = await playerNotificationCategories(identity.data);

    if (match[1]) {
      const category = categories.find(item => item.id === match[1] || item.label === match[1]);

      if (!category) {
        throw new Error('通知分类不存在，请使用列表中的按钮。');
      }
      categories = await playerNotificationCategories(identity.data, category.id, match[2] === '开启');
      md.addText(`${category.label}通知已${match[2]}。`).addNewline();
    }
    md.addText('关闭后停止该分类的个人主动推送，通知记录仍保留。群公共通知由群管理设置控制。').addNewline();
    for (const item of categories) {
      const action = item.enabled ? '关闭' : '开启';
      const quote = Format.createMarkdown().addText(`${item.label} · ${item.enabled ? '已开启' : '已关闭'} `);

      quote.addButton(markdownButtonLabel(`${action}`), { data: `/通知设置 ${item.id} ${action}` });
      md.addBlockquote(quote);
    }
  } catch (error) {
    md.addText(getCommandErrorMessage(error));
  }
  await message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? false,
      bid: e.UserId,
      title: '通知设置',
      content: md,
      footer: [
        { label: '我的设置', command: '/我的设置' },
        { label: '通知记录', command: '/我的通知' }
      ]
    })
  );
});
