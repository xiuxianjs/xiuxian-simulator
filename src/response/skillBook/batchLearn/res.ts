import { withBusinessRecovery } from '@src/response/businessRecovery';
import { skillInventoryRecoveryTips } from '@src/response/skillInventoryRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
/**
 * 一键学习功法指令处理器
 * 指令格式: /一键学习功法
 *          /一键学习功法 确认
 *          /取消一键学习功法
 * 自动学习储物袋中所有未锁定、未学习的功法
 * 跳过：已有同技能的已学/使用中功法（避免需要确认替换的冲突）
 */
import { CONFIRM_KEYWORD, EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import { parseRobotSkillBookBatchLearn } from '@src/api/bot/skill-book-batch-learn';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const [, parentNext] = useEvent();
  const rawText = (e.MessageText || EMPTY_STRING).trim();
  const isCancel = /^(!|！|\/|#|＃)?取消一键学习功法$/.test(rawText);

  const messageText = rawText.replace(/^(!|！|\/|#|＃)?一键学习功法\s*/, EMPTY_STRING).trim();
  const args = messageText ? messageText.split(/\s+/) : [];
  const isConfirm = args[FIRST_ARG_INDEX] === CONFIRM_KEYWORD;

  const feedback = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.batch-learn', reply), 'footer'));

  if (!isCancel && (args.length > 1 || (args.length === 1 && !isConfirm))) {
    await feedback({
      title: '',
      heading: '',
      text: '参数错误：一键学习功法仅接受无参数预览或单独的“确认”；取消请使用 /取消一键学习功法，不附其他文字。',
      buttons: [],
      advice: []
    });

    return;
  }
  const response = await runRobotBusiness(
    e,
    'skill-books.batch-learn',
    { mode: isCancel ? 'cancel' : isConfirm ? 'execute' : 'preview' },
    value => {
      const data = parseRobotSkillBookBatchLearn(value);

      if (
        isCancel ||
        data.mode !== (isConfirm ? 'execute' : 'preview') ||
        data.selection.candidates.length === 0 ||
        (data.mode === 'preview'
          ? data.results.length !== 0
          : data.results.length !== data.selection.candidates.length ||
            data.results.some((row, index) => row.userSkillBookId !== data.selection.candidates[index].userSkillBookId || (row.success && !row.skillBook)))
      ) {
        throw new Error('一键学习功法结果不完整');
      }

      return data;
    },
    parentNext,
    feedback
  ).catch(async () => {
    await feedback({ title: '', heading: '', text: '一键学习功法结果未获完整确认，请先核对已学列表、秘籍背包与原回执。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const { mode, selection, results } = response.data;
  const learnList = selection.candidates.map(({ name, skillType }) => ({ name, skillType }));
  const skippedConflicts = selection.skippedConflicts.map(({ name, skillType }) => ({ name, skillType }));
  const successList: Array<{ name: string; skillType: string }> = [];
  const failList: Array<{ name: string; skillType: string; reason: string }> = [];

  for (const row of results) {
    if (row.success && row.skillBook) {
      successList.push(row.skillBook);
    } else {
      failList.push({ name: row.skillBook?.name ?? '未知功法', skillType: row.skillBook?.skillType ?? '未知', reason: row.message });
    }
  }
  const result =
    mode === 'preview'
      ? { code: 'PREVIEW' as const, data: { learnList, skippedConflicts } }
      : { code: 'OK' as const, data: { successList, failList, skippedConflicts } };

  switch (result.code) {
    case 'PREVIEW': {
      const { learnList, skippedConflicts } = result.data;
      const md = Format.createMarkdown();

      md.addBold('⚠️ 一键学习确认');
      md.addNewline();
      md.addNewline();
      md.addText(`预计学习 ${learnList.length} 本功法：`);
      md.addNewline();

      for (const item of learnList) {
        md.addText(`• 【${item.name}】${item.skillType}`);
        md.addNewline();
      }

      if (skippedConflicts.length > 0) {
        md.addNewline();
        md.addText(`⏭ 将跳过 ${skippedConflicts.length} 本同技能功法`);
        md.addNewline();
      }

      md.addNewline();
      md.addText('确认后学习所选范围内的功法');
      md.addNewline().addText('确认时重新筛选 · 跳过已有同技能功法 · 取消不撤销已学结果');

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '一键学习功法',
          content: md,
          footer: [
            { label: '确认学习', command: '/一键学习功法 确认' },
            { label: '取消', command: '/取消一键学习功法' },
            { label: '核对已学功法', command: '/我的功法' }
          ]
        })
      );

      return;
    }

    case 'OK': {
      const { successList, failList, skippedConflicts } = result.data;

      // 构建结果消息
      const md = Format.createMarkdown();

      if (successList.length > 0) {
        md.addBold(`✅ 成功学习 ${successList.length} 本功法`);
        md.addNewline();

        for (const item of successList) {
          md.addText(`• 【${item.name}】${item.skillType}`);
          md.addNewline();
        }
      } else {
        md.addBold(failList.length ? '本次未成功学习功法' : '没有新功法可学习');
        md.addNewline();
      }

      if (skippedConflicts.length > 0) {
        md.addNewline();
        md.addText(`⏭ 跳过 ${skippedConflicts.length} 本（已有同技能功法）：`);
        md.addNewline();

        // 合并同名同类型的跳过项，显示为 ×N
        const skippedMap = new Map<string, number>();
        const skippedOrder: string[] = [];

        for (const item of skippedConflicts) {
          const key = `${item.name}|${item.skillType}`;
          const prev = skippedMap.get(key) ?? 0;

          if (prev === 0) {
            skippedOrder.push(key);
          }
          skippedMap.set(key, prev + 1);
        }

        for (const key of skippedOrder) {
          const [name, skillType] = key.split('|');
          const count = skippedMap.get(key)!;

          md.addText(`• 【${name}】${skillType}${count > 1 ? ` ×${count}` : ''}`);
          md.addNewline();
        }
      }

      if (failList.length > 0) {
        md.addNewline();
        md.addText(`❌ 失败 ${failList.length} 本：`);
        md.addNewline();

        for (const item of failList) {
          md.addText(`• 【${item.name}】${item.reason}`);
          md.addNewline();
        }
      }

      if (failList.length || skippedConflicts.length) {
        appendMiddlewareAdvice(
          md,
          skillInventoryRecoveryTips('skill-books.batch-learn', skippedConflicts.length ? '已有同技能功法，批量学习部分完成' : '批量学习存在失败结果')
        );
      }
      md.addNewline();

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '一键学习功法',
          content: md,
          footer: [
            { label: '查看我的功法', command: '/我的功法' },
            { label: '储物袋', command: '/我的储物袋 功法' }
          ]
        })
      );
    }
  }
});

export default response;
