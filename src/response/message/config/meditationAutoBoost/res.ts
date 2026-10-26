import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { Format, onResponse, useEvent } from 'alemonjs';
import App from '@src/response-apps/message/config/meditationAutoBoost/app';
import { selects } from '@src/response/config';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const match = (e.MessageText ?? '').trim().match(/^[!！/#＃]?配置闭关自动加速\s+(开启|关闭)$/);
  const quote = Format.createMarkdown();

  if (!match) {
    quote.addText('请使用：/配置闭关自动加速 [开启|关闭]');
  } else {
    try {
      const result = await App(e, next, match[1] === '开启');

      if (result.handled) {
        return;
      }
      quote.addText(`闭关自动加速已${result.data ? '开启' : '关闭'}。`);
      quote
        .addNewline()
        .addText(
          result.data ? '下次闭关自动使用灵石提升修炼效率，出关结算费用；灵石不足时按普通修炼计算。' : '下次开始闭关默认为普通闭关，仍可手动开启灵石加速。'
        );
      quote.addNewline().addText('本轮闭关不受影响。');
    } catch (error) {
      quote.addText(getCommandErrorMessage(error));
    }
  }
  quote.addNewline().addButton(markdownButtonLabel('我的设置'), { data: '/我的设置' });
  await message.send(
    FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '闭关自动加速', content: Format.createMarkdown().addBlockquote(quote) })
  );
});
