import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export function companionRewardResponse(
  operation: 'companion.claim-daily' | 'companion.claim-month-card',
  title: string,
  decode: (value: unknown) => string[]
) {
  return onResponse(selects, async e => {
    const [message] = useMessage();
    const [, next] = useEvent();
    const render = async (lines: string[]) => {
      await message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid: e.UserId,
          title,
          content: Format.createMarkdown().addBlockquote(
            createQuoteMarkdown(lines, [
              { label: '代签到', command: '/道侣签到' },
              { label: '代领月卡', command: '/道侣月卡' }
            ])
          ),
          footer: [{ label: '我的道侣', command: '/我的道侣' }]
        })
      );
    };

    try {
      const response = await runRobotBusiness(e, operation, {}, decode, next, reply => render([reply.text]));

      if (!response.handled) {
        await render(response.data);
      }
    } catch (error) {
      logger.error(`${title}失败`, error);
      await render(['道侣代领结果暂时无法显示，请稍后重试；已结算的奖励不会重复发放。']);
    }
  });
}
