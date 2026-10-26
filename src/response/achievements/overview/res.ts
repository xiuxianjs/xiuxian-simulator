import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { achievementRecoveryTips } from '@src/response/achievementRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 成就总览
 * 指令：/成就、/我的成就
 * 展示各成就分类的达成情况与入口
 */
import App from '@src/response-apps/achievements/overview/app';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const result = await App({ event: e, next });

    if (!result) {
      return;
    }
    const md = Format.createMarkdown();

    if (result.code === 'INVALID_USER') {
      md.addText('请先踏入仙途');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.code !== 'OK') {
      md.addText('查询成就失败，请稍后再试。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.overview', '查询成就失败，请稍后再试。'));

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const { access, summary, categories, canClaimAll } = result.data;

    if (!access.canUseFifthLayerFeature) {
      sendFifthLayerLockedPage({ bid, isPrivate, message, title: '成就', realmName: access.realmName });

      return;
    }

    md.addText(`已达成：${summary.completedAchievements} / ${summary.totalAchievements}`);
    md.addNewline();
    md.addText(`完成率：${summary.completionRate}%`);
    md.addNewline();
    md.addNewline();

    const footer: GuiButton[] = [
      { label: '总览', selected: true, command: '/成就' },
      { label: '主线', command: '/成就 主线' },
      { label: '战力', command: '/成就 战力' },
      { label: '灵田', command: '/成就 灵田' },
      { label: '师门', command: '/成就 师门' }
    ];

    if (categories.length === 0) {
      md.addText('当前暂无成就分类配置。');
      appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.overview', '当前暂无成就分类配置。'));
    } else {
      md.addText('分类进度');
      md.addNewline();
      for (const category of categories) {
        md.addBlockquote(
          createQuoteMarkdown(
            [
              `${category.label}成就 · ${category.completed}/${category.total}（${category.completionRate}%）`,
              ...(category.hasClaimable ? [`待领取 ${category.claimableCount} 项`] : [])
            ],
            category.command ? [{ label: '查看', command: category.command }] : []
          )
        );
      }
    }

    if (canClaimAll) {
      footer.push({ label: '一键领取', command: '/一键领取成就' });
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '成就',
        content: md,
        footer
      })
    );
  } catch (error) {
    logger.error('查询成就总览失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询成就失败，请稍后再试。');
    appendMiddlewareAdvice(md, achievementRecoveryTips('achievements.overview', '查询成就失败，请稍后再试。'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
