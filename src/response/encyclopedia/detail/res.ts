import { onResponse } from 'alemonjs';
import { selects } from '@src/response/config';
import { EncyclopediaFormatGui } from '@src/utils/encyclopediaMessage';
import { useMessage } from '@src/utils/useMessage';

/** 保留旧 /图鉴详情 <分类> <编号>，转为直接打开网页条目。 */
export default onResponse(selects, async e => {
  const [message] = useMessage();

  await message.send(EncyclopediaFormatGui({ text: e.MessageText ?? '', detail: true, bid: e.UserId, isPrivate: e.isPrivate ?? false }));
});
