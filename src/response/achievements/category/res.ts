import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { achievementRecoveryTips, achievementProgressTips } from '@src/response/achievementRecovery';
import { useMessage } from '@src/utils/useMessage';
import App from '@src/response-apps/achievements/category/app';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const keyword = (e.MessageText ?? '').replace(/^(!|！|\/|#|＃)?成就\s+/u, '').trim();

  try {
    const result = await App({ event: e, next, keyword });

    if (!result) {
      return;
    }
    const md = Format.createMarkdown();

    if (result.code === 'INVALID_USER') {
      md.addText('请先踏入仙途');
    } else if (result.code === 'INVALID_CATEGORY') {
      md.addText('未找到对应成就分类，可使用 /成就 查看全部分类。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.category', '未找到对应成就分类，可使用 /成就 查看全部分类。'));
    } else if (result.code !== 'OK') {
      md.addText('查询成就分类失败，请稍后再试。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.category', '查询成就分类失败，请稍后再试。'));
    } else if (!result.data.access.canUseFifthLayerFeature) {
      sendFifthLayerLockedPage({ bid, isPrivate, message, title: '成就分类', realmName: result.data.access.realmName });

      return;
    } else {
      const { label, total, completed, items, claimableCount } = result.data;

      md.addText(`${label}成就：${completed} / ${total}`);
      md.addNewline();
      md.addNewline();

      if (items.length === 0) {
        md.addText('当前分类暂无成就配置。');
        appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.category', '当前分类暂无成就配置。'));
      } else {
        for (const [index, item] of items.entries()) {
          md.addBlockquote(
            createQuoteMarkdown(
              [
                `【${index + 1}】${item.name}${item.completed ? ' ✅' : ''}`,
                item.description,
                item.progressText,
                ...(item.rewardText ? [`奖励：${item.rewardText}`] : [])
              ].filter(Boolean)
            )
          );
        }
      }

      if (items.some(item => !item.completed)) {
        appendMiddlewareAdvice(md, achievementProgressTips(result.data.category ?? ''));
      }

      const footer: GuiButton[] = [
        { label: '总览', command: '/成就' },
        { label: '主线', selected: label === '主线', command: '/成就 主线' },
        { label: '战力', selected: label === '战力', command: '/成就 战力' },
        { label: '灵田', selected: label === '灵田', command: '/成就 灵田' }
      ];

      if (claimableCount > 0) {
        md.addNewline();
        md.addText(`当前有 ${claimableCount} 个成就可一键领取。`);
        footer.push({ label: '一键领取', command: '/一键领取成就' });
      }

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '成就分类',
          content: md,
          footer
        })
      );

      return;
    }

    void message.send(FormatGui({ isPrivate, bid, title: '成就分类', content: md }));
  } catch (error) {
    logger.error('查询成就分类失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询成就分类失败，请稍后再试。');
    appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.category', '查询成就分类失败，请稍后再试。'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
