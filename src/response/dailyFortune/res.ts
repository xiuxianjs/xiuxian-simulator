import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { Format, onResponse, useEvent } from 'alemonjs';
import { configureDailyFortune, dailyFortuneTarget, parseDailyFortune } from '@src/api/bot/daily-fortune';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { dailyFortuneContent } from './view';

export default onResponse(selects, async event => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const sendText = async (text: string, canDraw = false) => {
    const quote = Format.createMarkdown().addText(text);

    if (canDraw) {
      quote.addNewline().addButton(markdownButtonLabel('抽取今日机缘'), { data: '/每日机缘' });
    }
    await message.send(
      FormatGui({ bid: event.UserId, isPrivate: event.isPrivate ?? false, title: '每日机缘', content: Format.createMarkdown().addBlockquote(quote) })
    );
  };

  try {
    const text = (event.MessageText ?? '').trim().replace(/^[/#＃]/, '');

    if (text === '开启每日机缘' || text === '关闭每日机缘') {
      const enabled = text === '开启每日机缘';

      await configureDailyFortune(event, enabled);
      await sendText(
        enabled ? '本群已开启每日机缘。每个游戏角色每天可主动抽取一次，多个群共享领取次数，每日北京时间零点重置。' : '本群已关闭每日机缘。',
        enabled
      );

      return;
    }
    const target = dailyFortuneTarget(event);
    const loaded = await runRobotBusiness(event, 'daily-fortune.claim', { target }, parseDailyFortune, next, reply => sendText(reply.text));

    if (loaded.handled) {
      return;
    }
    await message.send(FormatGui({ bid: event.UserId, isPrivate: false, title: `每日机缘 · ${loaded.data.tier}`, content: dailyFortuneContent(loaded.data) }));
  } catch (error) {
    await sendText(getCommandErrorMessage(error));
  }
});
