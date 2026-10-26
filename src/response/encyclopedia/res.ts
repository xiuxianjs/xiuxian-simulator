import { onResponse } from 'alemonjs';
import { selects } from '@src/response/config';
import { EncyclopediaFormatGui } from '@src/utils/encyclopediaMessage';
import { useMessage } from '@src/utils/useMessage';

/** /图鉴 [分类] [子分类]：公共查询入口，分类和资料由网页管理。 */
export default onResponse(selects, async e => {
  const [message] = useMessage();

  await message.send(EncyclopediaFormatGui({ text: e.MessageText ?? '', bid: e.UserId, isPrivate: e.isPrivate ?? false }));
});
