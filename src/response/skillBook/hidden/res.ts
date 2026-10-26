import { withBusinessRecovery } from '@src/response/businessRecovery';
import { skillInventoryRecoveryTips } from '@src/response/skillInventoryRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { EMPTY_STRING, FIRST_ARG_INDEX, MIN_PAGE } from '@src/constants/common';
import { parseRobotLearnedBooks } from '@src/api/bot/learned-books-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { formatSkillBookListItem } from '@src/utils/skillBookHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const [, parentNext] = useEvent();

  const messageText = (e.MessageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?我的隐藏功法\s*/, EMPTY_STRING).trim();
  const args = messageText ? messageText.split(/\s+/) : [];
  const failed = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.hidden', { ...reply, title: reply.title || '我的隐藏功法' }), 'footer')
  );

  const response = await runRobotBusiness(e, 'skill-books.hidden', { page: args[FIRST_ARG_INDEX] ?? null }, parseRobotLearnedBooks, parentNext, failed).catch(
    async () => {
      await failed({ title: '', heading: '', text: '隐藏列表未获完整确认，请先核对当前显示状态与原反馈。', buttons: [], advice: [] });

      return { handled: true as const };
    }
  );

  if (response.handled) {
    return;
  }
  const result = { data: response.data.page };

  const { items, total, totalPages, currentPage } = result.data;
  const md = Format.createMarkdown();

  if (total === 0) {
    md.addText('暂无隐藏功法');

    appendMiddlewareAdvice(md, skillInventoryRecoveryTips('skill-books.hidden', '暂无隐藏功法'));
  } else if (items.length === 0) {
    md.addText('❌ 页码超出范围');
    md.addNewline();
    md.addNewline();
    md.addText(`共 ${total} 本隐藏功法 · ${totalPages} 页`);
    appendMiddlewareAdvice(md, skillInventoryRecoveryTips('skill-books.hidden', '页码超出范围'));
  } else {
    items.forEach(item => {
      md.addText(formatSkillBookListItem(item, item.id));

      addOptions(md, [
        { label: '显示', command: `/显示功法 ${item.id}` },
        { label: '查看', command: `/查看功法 ${item.id}` }
      ]);
    });
  }

  const nav =
    total > 0 ? { current: items.length === 0 ? MIN_PAGE : currentPage, total: totalPages, count: total, command: '/我的隐藏功法 {page}' } : undefined;

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '我的隐藏功法',
      header: [{ label: '我的功法', command: '/我的功法' }],
      content: md,
      nav
    })
  );
});

export default response;
