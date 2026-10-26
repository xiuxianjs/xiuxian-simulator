import { useMessage } from '@src/utils/useMessage';
/**
 * 煞气查看
 * 指令：/煞气
 *
 * 展示当前煞气值、称号、是否在杀神榜、消除途径
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotShaQi } from '@src/api/bot/shaqi-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '煞气',
        content: md,
        header: [
          { label: '悬赏榜', command: '/悬赏榜' },
          { label: '杀神榜', command: '/杀神榜' }
        ],
        footer: [
          { label: '记录', command: '/打劫记录' },
          { label: '悬赏', command: '/悬赏' },
          { label: '仇人', command: '/仇人' }
        ]
      })
    );
  };
  let result;

  try {
    result = await runRobotBusiness(e, 'pvp.sha-qi', {}, parseRobotShaQi, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch {
    await sendFailure('获取煞气信息失败');

    return;
  }
  if (result.handled) {
    return;
  }

  const info = result.data;
  const md = Format.createMarkdown();

  md.addText(`煞气：${info.shaQi}${info.onKillGodList ? ' · 已入杀神榜' : ''}`);
  md.addNewline();
  md.addText(`每日消散：${info.dailyDecayAmount}`);

  if (info.shaQi > 0) {
    md.addBlockquote(createQuoteMarkdown([`金盆×1 · 煞气-${info.jinpenReduceAmount}`], [{ label: '洗煞', command: '/消耗 金盆 1' }]));
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '煞气',
      header: [
        { label: '悬赏榜', command: '/悬赏榜' },
        { label: '杀神榜', command: '/杀神榜' }
      ],
      footer: [
        { label: '记录', command: '/打劫记录' },
        { label: '悬赏', command: '/悬赏' },
        { label: '仇人', command: '/仇人' }
      ],
      content: md
    })
  );
});
