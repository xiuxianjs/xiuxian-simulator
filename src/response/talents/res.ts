import { useMessage } from '@src/utils/useMessage';
import { parsePlayerTalents } from '@src/api/bot/talents';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const md = Format.createMarkdown();

  try {
    const result = await runRobotBusiness(e, 'talents.query', {}, parsePlayerTalents, next);

    if (result.handled) {
      return;
    }
    if (!result.data.granted) {
      md.addText('当前存档尚未发放天赋，老玩家将在后续更新中补发。');
    } else {
      result.data.talents.forEach(talent => {
        md.addBlockquote(createQuoteMarkdown([`【${talent.category}】${talent.name}`, talent.description, talent.enabled ? '自动生效中' : '暂未开启']));
        md.addNewline();
      });
    }
  } catch {
    md.addText('查询天赋失败，请稍后重试。');
  }
  void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '我的天赋', content: md, footer: [{ label: '我', command: '/我' }] }));
});
