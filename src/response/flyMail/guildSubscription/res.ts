import { Format, onResponse } from 'alemonjs';
import { selects } from '@src/response/config';
import { useMessage } from '@src/utils/useMessage';
import { FormatGui } from '@src/utils/messageHelper';

export default onResponse(selects, async e => {
  const [message] = useMessage();

  await message.send(
    FormatGui({
      isPrivate: e.isPrivate,
      bid: e.UserId,
      bar: false,
      content: Format.createMarkdown().addText('飞信已统一私聊投递，无需设置宗门或师门订阅群。私聊不可达时，仅在活跃群提醒查看。')
    })
  );
});
