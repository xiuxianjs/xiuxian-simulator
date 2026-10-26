import { Format, onResponse } from 'alemonjs';
import { selects } from '@src/response/config';
import { battleMemoryPage } from '@src/utils/battleMemoryMessage';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const match = (e.MessageText ?? '').match(/^[/#＃!！]?战斗回忆翻页\s+([\da-f-]+)\s+(\d+)$/i);
  const page = match ? battleMemoryPage(match[1], Number(match[2]), e.UserId) : undefined;

  await message.send(
    page ??
      FormatGui({
        isPrivate: e.isPrivate,
        bid: e.UserId,
        title: '战斗回忆',
        content: Format.createMarkdown().addText('此分页已失效或不可访问，请从原战报的回忆链接查看。'),
        bar: false
      })
  );
});
