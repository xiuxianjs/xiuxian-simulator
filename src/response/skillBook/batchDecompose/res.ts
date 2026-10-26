import { parseRobotSkillBookBatchQuery, parseBackendSkillBookBatchDecompose } from '@src/api/bot/skill-book-batch-decompose';
import { runRobotBusiness } from '@src/response/robotBusiness';
import type { GameEvent } from '@src/types/event';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
/**
 * 一键分解功法指令处理器
 * 指令格式:
 *   /一键分解功法            → 展示选择提示与按钮
 *   /一键分解功法 全部        → 预览待分解内容，需确认
 *   /一键分解功法 <品级名>    → 预览待分解内容，需确认
 */
import { selects } from '@src/response/config';
import type { GuiButton } from '@src/utils/messageHelper';
import { FormatGui, createQuoteMarkdown } from '@src/utils/messageHelper';
import { Format, onResponse, useSubscribe, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const [subscribe] = useSubscribe(selects);
  const bid = e?.UserId;
  const [, parentNext] = useEvent();
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const feedbackFor = (event: GameEvent, operation: 'skill-books.batch-decompose-query' | 'skill-books.batch-decompose') => adviceRenderer(reply => sendMiddlewareReply(event, withBusinessRecovery(operation, reply), 'footer'));
  const feedback = feedbackFor(e, 'skill-books.batch-decompose-query');

  try {
    const rawText = String(e.MessageText ?? '').trim();
    const argPart = rawText.replace(/^(!|！|\/|#|＃)?一键分解功法\s*/, '').trim();

    const result = await runRobotBusiness(e, 'skill-books.batch-decompose-query', { gradeName: argPart }, parseRobotSkillBookBatchQuery, parentNext, feedback);

    if (result.handled) {
      return;
    }
    const query = result.data;

    if (!query.options.success || query.options.totalCount < 1 || (query.mode === 'preview' && (!query.preview.success || query.preview.processCount < 1))) {
      throw new Error('功法分解预览响应不完整');
    }
    if (
      query.mode === 'preview' &&
      query.selectedGrade.id > 0 &&
      (!query.preview.gradeBreakdown.length || query.preview.gradeBreakdown.some(grade => grade.id !== query.selectedGrade.id))
    ) {
      await feedback({ title: '', heading: '', text: '分解预览与确认品级范围不一致，请核对背包与品级配置后重新预览。', buttons: [], advice: [] });

      return;
    }
    const { totalCount } = query.options;
    const sortedGrades = query.options.gradeBreakdown.map(g => ({ id: g.id, name: g.gradeName, level: g.level, count: g.count }));

    if (query.mode === 'choose') {
      const footerRows: GuiButton[][] = [];

      footerRows.push([{ label: `全部 (${totalCount}本)`, command: '/一键分解功法 全部' }]);
      for (let i = 0; i < sortedGrades.length; i += 3) {
        const slice = sortedGrades.slice(i, i + 3);

        footerRows.push(slice.map(g => ({ label: `${g.name} (${g.count}本)`, command: `/一键分解功法 ${g.name}` })));
      }

      const md = Format.createMarkdown();

      md.addBold('一键分解功法');
      md.addNewline();
      md.addText('选择分解范围，每次最多分解300本。');
      md.addNewline();
      md.addText('💡 已锁定、已学习、使用中的功法不会被分解');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: footerRows }));

      return;
    }

    const selectedGrade = query.selectedGrade;
    const gradeId = selectedGrade.id === 0 ? null : String(selectedGrade.id);
    const previewResult = { data: { ...query.preview, estimatedItems: query.preview.estimatedItems.map(i => ({ name: i.name, amount: i.quantity })) } };

    const previewMd = Format.createMarkdown();

    previewMd.addBold('⚠️ 分解确认');
    previewMd.addNewline();
    previewMd.addText(`分解范围：${selectedGrade.name}`);
    previewMd.addNewline();
    previewMd.addText(`待分解总数：${previewResult.data.totalCount} 本`);
    previewMd.addNewline();
    previewMd.addNewline();
    previewMd.addText(`本次分解：${previewResult.data.processCount} 本；剩余：${previewResult.data.remainingCount} 本`);
    previewMd.addNewline();
    previewMd.addBold('范围内品级分布：');
    previewMd.addNewline();

    for (const gb of previewResult.data.gradeBreakdown) {
      previewMd.addText(`• ${gb.gradeName} ×${gb.count}`);
      previewMd.addNewline();
    }

    previewMd.addNewline();
    previewMd.addText(`预估总经验：${previewResult.data.totalExp}`);
    previewMd.addNewline();

    if (previewResult.data.estimatedItems.length > 0) {
      previewMd.addNewline();
      previewMd.addBold('预估获得：');
      previewMd.addNewline();
      for (const ei of previewResult.data.estimatedItems) {
        previewMd.addText(`• ${ei.name} x${ei.amount}`);
        previewMd.addNewline();
      }
    }

    previewMd.addNewline();
    previewMd.addText('确认有效期60秒');
    previewMd.addNewline().addText('确认时重新筛选当前品级范围；要保留的功法请先锁定');

    const confirmFooter = [
      { label: '确认分解', command: '确认分解' },
      { label: '取消', command: '取消' }
    ] satisfies GuiButton[];

    previewMd.addNewline().addBlockquote(createQuoteMarkdown(['请在60秒内回复【确认分解】或【取消】。'], confirmFooter));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: previewMd, keyboard: [confirmFooter] }));

    // 进入订阅等待确认
    const sub = subscribe.mount(
      async (event, next) => {
        const [msg] = useMessage();
        const choice = event.MessageText.trim();

        if (choice === '确认分解') {
          clearTimeout(timeout);

          const [, hookNext] = useEvent();
          const executeFeedback = feedbackFor(event, 'skill-books.batch-decompose');
          const result = await runRobotBusiness(
            event,
            'skill-books.batch-decompose',
            { gradeId },
            value => {
              const data = parseBackendSkillBookBatchDecompose(value);

              if (!data.success || data.decomposedCount < 1 || data.decomposedCount > 300) {
                throw new Error('功法分解结果无效');
              }

              return data;
            },
            () => {
              hookNext(true, true);
              subscribe.cancel(sub);
            },
            executeFeedback
          ).catch(async () => {
            await executeFeedback({ title: '', heading: '', text: '功法分解结果未获完整确认，请先核对背包、经验材料与原回执。', buttons: [], advice: [] });

            return { handled: true as const };
          });

          if (result.handled) {
            return;
          }

          const okMd = Format.createMarkdown();

          okMd.addBold('✅ 分解成功');
          okMd.addNewline();
          okMd.addText(`分解范围：${selectedGrade.name}`);
          if (result.data.remainingCount > 0) {
            okMd.addNewline().addText(`数量过多，本次已分解${result.data.decomposedCount}本，剩余${result.data.remainingCount}本可分解。`);
          }
          okMd.addNewline();
          okMd.addText(`分解数量：${result.data.decomposedCount} 本`);
          okMd.addNewline();
          okMd.addText(`总计折算经验：${result.data.totalExp}`);
          okMd.addNewline();

          if (result.data.items.length > 0) {
            okMd.addText('获得功法残页：');
            okMd.addNewline();

            for (const item of result.data.items) {
              okMd.addText(`• ${item.name} x${item.quantity}`);
              okMd.addNewline();
            }
          }

          const okFooter = [
            { label: '继续分解', command: `/一键分解功法 ${argPart}` },
            { label: '查看储物袋', command: '/储物袋 功法' }
          ];

          void msg.send(FormatGui({ isPrivate, bid, title: '', content: okMd, footer: okFooter }));

          return;
        }

        if (choice === '取消') {
          clearTimeout(timeout);
          const cancelMd = Format.createMarkdown();

          cancelMd.addText('已取消分解操作');
          appendMiddlewareAdvice(
            cancelMd,
            withBusinessRecovery('skill-books.batch-decompose-query', { title: '', heading: '', text: '已取消分解操作', buttons: [], advice: [] }).advice
          );
          cancelMd.addNewline();
          cancelMd.addText('💡 可以先锁定不想分解的功法，再使用一键分解');

          void msg.send(FormatGui({ isPrivate, bid, title: '', content: cancelMd, footer: [{ label: '分解预览', command: '/一键分解功法' }] }));

          return;
        }

        const hintMd = Format.createMarkdown();
        const hintFooter = [
          { label: '确认分解', command: '确认分解' },
          { label: '取消', command: '取消' }
        ];

        hintMd.addText('请回复【确认分解】或【取消】');

        void msg.send(FormatGui({ isPrivate, bid, title: '', content: hintMd, footer: [hintFooter] }));

        next();
      },
      ['UserId']
    );

    const timeout = setTimeout(() => {
      try {
        subscribe.cancel(sub);
        const timeoutMd = Format.createMarkdown();

        timeoutMd.addText('⏰ 确认超时，分解操作已自动取消');
        appendMiddlewareAdvice(
          timeoutMd,
          withBusinessRecovery('skill-books.batch-decompose-query', { title: '', heading: '', text: '确认超时', buttons: [], advice: [] }).advice
        );

        void message.send(FormatGui({ isPrivate, bid, title: '', content: timeoutMd, footer: [{ label: '分解预览', command: '/一键分解功法' }] }));
      } catch {
        /* ignore */
      }
    }, 60 * 1000);
  } catch {
    await feedback({ title: '', heading: '', text: '功法分解预览未获完整确认，请先核对背包与分解范围。', buttons: [], advice: [] });
  }
});

export default response;
