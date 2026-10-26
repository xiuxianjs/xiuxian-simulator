import { useMessage } from '@src/utils/useMessage';
import App from '@src/response-apps/message/config/enumPreferences/app';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;
  const messageText = e.MessageText || '';

  // 匹配"配置秘境模式"指令
  const modeMatch = messageText.match(/^(!|！|\/|#|＃)?配置秘境模式\s+(自动|手动)$/);

  if (modeMatch) {
    const modeText = modeMatch[2];
    const result = await App({
      event: e,
      next,
      action: {
        type: 'DUNGEON_BATTLE_MODE',
        mode: modeText === '自动' ? 'auto' : 'manual'
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

    if (result.data.type !== 'DUNGEON_BATTLE_MODE') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    md.addText(`秘境战斗模式已设置为：${result.data.mode === 'auto' ? '自动' : '手动'}`);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
