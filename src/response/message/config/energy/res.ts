import { useMessage } from '@src/utils/useMessage';
import App from '@src/response-apps/message/config/teamPreferences/app';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;
  const messageText = e.MessageText || '';
  const teamMentalMatch = messageText.match(/^(!|！|\/|#|＃)?配置组队精力\s+(消耗|不消耗)$/);

  if (teamMentalMatch) {
    const result = await App({
      event: e,
      next,
      action: {
        type: 'TEAM_DUNGEON_NO_MENTAL',
        enabled: teamMentalMatch[2] === '不消耗'
      }
    });

    if (!result) {
      return;
    }
    const md = Format.createMarkdown();

    if (result.code !== 'OK') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.data.type !== 'TEAM_DUNGEON_NO_MENTAL') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    md.addText(`组队精力已设置为：${result.data.enabled ? '不消耗' : '消耗'}`);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
