import { Format, onResponse, useEvent } from 'alemonjs';
import { selects } from '@src/response/config';
import { useMessage } from '@src/utils/useMessage';
import { FormatGui } from '@src/utils/messageHelper';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();

  if (!/^[/#＃]?(?:宗门群订阅|取消宗门群订阅|师门群订阅|取消师门群订阅)$/.test((e.MessageText ?? '').trim())) {
    return next();
  }

  await message.send(
    FormatGui({
      isPrivate: e.isPrivate,
      bid: e.UserId,
      bar: false,
      content: Format.createMarkdown().addText('飞信已统一私聊投递，无需设置宗门或师门订阅群。私聊不可达时，仅在活跃群提醒查看。')
    })
  );
});
