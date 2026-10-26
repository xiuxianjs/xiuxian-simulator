import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotDailyCheckIn } from '@src/api/bot/signin-robot-query';
import { selects } from '@src/response/config';
import { FormatGui, createQuoteMarkdown } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const render = async (displayMsg: string, ritualText: string) => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '签到',
        header: [
          { label: '日常', command: '/日常签到' },
          { label: '新人', command: '/新人签到' },
          { label: '登仙台', command: '/登仙台签到' },
          { label: '宗门', command: '/宗门签到' }
        ],
        content: Format.createMarkdown().addBlockquote(
          createQuoteMarkdown([displayMsg, ritualText].filter(Boolean), [{ label: '日历', command: '/签到日历 日常' }])
        )
      })
    );
  };

  try {
    const loaded = await runRobotBusiness(e, 'checkin.daily', {}, parseRobotDailyCheckIn, next, reply => render(reply.text, ''));

    if (loaded.handled) {
      return;
    }
    await render(loaded.data.data.message, loaded.data.data.ritualText ?? '');
  } catch {
    await render('日常签到失败，请稍后再试。', '');
  }
});
