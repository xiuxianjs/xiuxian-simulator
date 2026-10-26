import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { achievementRecoveryTips } from '@src/response/achievementRecovery';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parseCommandPage } from '@src/utils/commandPage';
import App from '@src/response-apps/achievements/myAchievements/app';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/**
 * 我的成就功能
 * 支持分页查询用户获得的成就记录
 * 指令格式：/我的成就 [页数]
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const page = parseCommandPage(e.MessageText, '我的成就');
    const result = await App({ event: e, next, page, pageSize: 5 });

    if (!result) {
      return;
    }
    if (result.code === 'LOCKED') {
      sendFifthLayerLockedPage({ bid, isPrivate, message, title: '我的成就', realmName: result.data.realmName });

      return;
    }
    const md = Format.createMarkdown();

    if (result.code === 'INVALID_USER') {
      md.addText('请先踏入仙途');

      void message.send(FormatGui({ isPrivate, bid, title: '我的成就', content: md }));

      return;
    }

    if (result.code !== 'OK') {
      md.addText('查询成就记录失败，请稍后再试。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.completed', '查询成就记录失败，请稍后再试。'));

      void message.send(FormatGui({ isPrivate, bid, title: '我的成就', content: md }));

      return;
    }

    const { items, page: pageData } = result.data;

    if (pageData.total === 0) {
      md.addText('您还没有获得任何成就。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.completed', '您还没有获得任何成就。'));

      void message.send(FormatGui({ isPrivate, bid, title: '我的成就', content: md }));

      return;
    }

    if (pageData.currentPage > pageData.totalPages) {
      md.addText(`页数超出范围，您共有 ${pageData.total} 个成就，总共 ${pageData.totalPages} 页。`);
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.completed', '页数超出'));

      void message.send(FormatGui({ isPrivate, bid, title: '我的成就', content: md }));

      return;
    }

    if (!items.length) {
      md.addText('本页暂无成就记录');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.completed', '本页无记录'));
    }

    for (const item of items) {
      md.addBlockquote(
        createQuoteMarkdown([item.name, item.description, ...(item.completedAt ? [`完成：${formatGameTime(item.completedAt)}`] : [])].filter(Boolean))
      );
    }

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的成就',
        content: md,
        nav: { current: pageData.currentPage, total: pageData.totalPages, count: pageData.total, command: '/我的成就 {page}' }
      })
    );
  } catch {
    const md = Format.createMarkdown();

    md.addText('查询成就记录失败，请稍后再试。');
    appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.completed', '查询成就记录失败，请稍后再试。'));

    void message.send(FormatGui({ isPrivate, bid, title: '我的成就', content: md }));
  }
});
