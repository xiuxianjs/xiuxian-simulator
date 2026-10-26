import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { achievementRecoveryTips } from '@src/response/achievementRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseCommandPage } from '@src/utils/commandPage';
import App from '@src/response-apps/achievements/allAchievements/app';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/**
 * 所有成就功能
 * 支持分页查询所有成就列表
 * 指令格式：/所有成就 [页数]
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const page = parseCommandPage(e.MessageText, '所有成就');
    const result = await App({ event: e, next, page, pageSize: 5 });

    if (!result) {
      return;
    }
    const md = Format.createMarkdown();

    if (result.code !== 'OK') {
      md.addText('查询成就列表失败，请稍后再试。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.all', '查询成就列表失败，请稍后再试。'));

      void message.send(FormatGui({ isPrivate, bid, title: '所有成就', content: md }));

      return;
    }

    const { items, page: pageData } = result.data;

    if (pageData.total === 0) {
      md.addText('暂无成就数据。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.all', '暂无成就数据。'));

      void message.send(FormatGui({ isPrivate, bid, title: '所有成就', content: md }));

      return;
    }

    if (pageData.currentPage > pageData.totalPages) {
      md.addText(`页数超出范围，共有 ${pageData.total} 个成就，总共 ${pageData.totalPages} 页。`);
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.all', '页数超出'));

      void message.send(FormatGui({ isPrivate, bid, title: '所有成就', content: md }));

      return;
    }

    if (!items.length) {
      md.addText('本页暂无成就记录');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.all', '本页无记录'));
    }

    for (const item of items) {
      md.addBlockquote(createQuoteMarkdown([`【${item.displayIndex}】${item.name}`, item.description].filter(Boolean)));
    }

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '所有成就',
        content: md,
        nav: { current: pageData.currentPage, total: pageData.totalPages, count: pageData.total, command: '/所有成就 {page}' }
      })
    );
  } catch {
    const md = Format.createMarkdown();

    md.addText('查询成就列表失败，请稍后再试。');
    appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.all', '查询成就列表失败，请稍后再试。'));

    void message.send(FormatGui({ isPrivate, bid, title: '所有成就', content: md }));
  }
});
