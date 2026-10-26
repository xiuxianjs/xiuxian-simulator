import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { detailRecoveryTips } from '@src/response/detailRecovery';
import { useMessage } from '@src/utils/useMessage';
import { EMPTY_STRING } from '@src/constants/common';
import { parseRobotSkillDetail } from '@src/api/bot/skill-detail-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { extractArgs } from '@src/utils/commandParser';
import { FormatGui } from '@src/utils/messageHelper';
import { formatSkillBookDetail } from '@src/utils/skillBookHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const [, parentNext] = useEvent();
    const args = extractArgs(e.MessageText || EMPTY_STRING, /^(!|！|\/|#|＃)?查看功法\s*/);
    const response = await runRobotBusiness(
      e,
      'skill-books.detail',
      { bookId: args[0] ?? null },
      parseRobotSkillDetail,
      parentNext,
      adviceRenderer(async reply => {
        const md = Format.createMarkdown();

        md.addText(reply.text);
        if (reply.quote) {
          md.addBlockquote(Format.createMarkdown().addText(reply.quote));
        }
        appendMiddlewareBlocks(
          md,
          reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
        );
        appendMiddlewareAdvice(md, reply.advice);
        await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
      })
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };
    const md = formatSkillBookDetail(result.data.skillBook, result.data.skillBookId, result.data.proficiencyPoints);
    const view = result.data.skillBook.detailDisplay;
    const visibilityCommands = { SHOW: '/显示功法', HIDE: '/隐藏功法' } as const;
    const footer = [
      { label: '返回', command: '/我的功法' },
      { label: '升级', command: `/升级功法 ${result.data.skillBookId}` },
      { label: '换词', command: `/换词 ${result.data.skillBookId}` },
      ...(view.visibilityAction !== 'NONE'
        ? [
            {
              label: view.visibilityLabel!,
              command: `${visibilityCommands[view.visibilityAction]} ${result.data.skillBookId}`
            }
          ]
        : []),
      ...(view.canReset ? [{ label: '重制', command: `/重制功法 ${result.data.skillBookId}` }] : [])
    ];

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));
  } catch {
    const md = Format.createMarkdown();

    md.addText('查看功法详情失败，请稍后再试或联系运营。');
    appendMiddlewareAdvice(md, detailRecoveryTips('skill-books.detail', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});

export default response;
