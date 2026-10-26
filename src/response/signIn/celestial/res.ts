import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCelestialCheckIn } from '@src/api/bot/signin-robot-query';
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
        content: Format.createMarkdown().addBlockquote(
          createQuoteMarkdown([displayMsg, ritualText].filter(Boolean), [{ label: '时段', command: '/签到日历 时段' }])
        ),
        footer: [
          {
            label: '我也要签到',
            command: '/登仙台签到'
          }
        ]
      })
    );
  };

  try {
    const loaded = await runRobotBusiness(e, 'checkin.celestial', {}, parseRobotCelestialCheckIn, next, reply => render(reply.text, ''));

    if (loaded.handled) {
      return;
    }
    await render(loaded.data.data.message, loaded.data.data.ritualText ?? '');
  } catch {
    await render('登仙台签到失败，请稍后再试。', '');
  }
});
