import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
/**
 * 升级功法指令处理器
 * 指令格式: /升级功法 {功法ID} [次数]
 * 对指定已学习功法连续升级，直到材料或灵石不足，或属性全满
 */
import { EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import { parseSkillBookBatchUpgrade } from '@src/api/bot/skill-book-batch-upgrade';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  // 解析命令参数
  const messageText = (e.MessageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?升级功法\s*/, EMPTY_STRING).trim();
  const args = messageText ? messageText.split(/\s+/) : [];
  const skillBookIdStr = args[FIRST_ARG_INDEX];
  const countStr = args.length > 1 ? args[1] : undefined;

  const [, parentNext] = useEvent();
  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.batch-upgrade', reply), 'footer'));

  if (countStr === '节费') {
    const requested = Number(args[2] ?? '1');
    const token = args[3];
    const bookId = Number(skillBookIdStr);

    if (
      !Number.isSafeInteger(bookId) ||
      bookId < 1 ||
      !Number.isSafeInteger(requested) ||
      requested < 0 ||
      (token !== undefined && !/^[a-f0-9]{32}$/.test(token)) ||
      args.length > 4
    ) {
      await failure({ title: '', heading: '', text: '请核对功法编号和用符张数。', buttons: [], advice: [] });

      return;
    }
    const loaded = await runRobotBusiness<Record<string, unknown>>(
      e,
      'skill-books.upgrade-with-discount',
      { bookId, requested, token },
      value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('功法升级报价不完整');
        }

        return { ...value };
      },
      parentNext,
      failure
    ).catch(async () => {
      await failure({ title: '', heading: '', text: '功法升级结果暂不可确认，请查看当前功法。', buttons: [], advice: [] });

      return { handled: true as const };
    });

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;
    const quote = (data.discountQuote ?? data) as Record<string, unknown>;
    const uses = Array.isArray(quote.uses) ? quote.uses.map((entry: { amount: number }) => entry.amount) : [];
    const applied = data.outcome === 'upgraded';
    const available = Number(quote.available);
    const footer = applied
      ? [{ label: '查看功法', command: `/查看功法 ${bookId}` }]
      : [
          { label: '确认升级', command: `/升级功法 ${bookId} 节费 ${requested} ${String(quote.token)}` },
          ...(requested > 0 && uses.length > 0 ? [{ label: '不使用惜灵符', command: `/升级功法 ${bookId} 节费 0` }] : []),
          ...(requested === 0 && available > 0 ? [{ label: '使用惜灵符', command: `/升级功法 ${bookId} 节费 1` }] : [])
        ];
    const content = Format.createMarkdown().addText(String(quote.bookName));

    if (data.outcome === 'requote') {
      content.addNewline().addText('原报价已变化，本次未升级、未扣费。请确认当前报价。');
    }
    content.addNewline().addText(`原价 ${String(quote.baseCost)} 灵石 · 实付 ${String(quote.paidCost)} 灵石`);
    content.addNewline().addText(`功法经验 ${String(quote.requiredExp)}`);
    if (uses.length > 0) {
      content.addNewline().addText(`${applied ? '已用' : '将用'} ${uses.length} 张惜灵符，各抵 ${uses.join('／')} 灵石`);
    }
    if (!applied) {
      content.addNewline().addText('每次升级最多用一张，升级成功后才耗符。');
    } else {
      content.addNewline().addText(`已升级次数 ${String(data.upgradeCount)} · ${String(data.attribute)} +${String(data.growth)}`);
    }
    await message.send(FormatGui({ isPrivate, bid, title: applied ? '功法升级成功' : '功法升级报价', content, footer }));

    return;
  }

  if (
    args.length > 2 ||
    (skillBookIdStr !== undefined && (!/^\d+$/.test(skillBookIdStr) || !Number.isSafeInteger(Number(skillBookIdStr)) || Number(skillBookIdStr) < 1)) ||
    (countStr !== undefined && countStr !== '选择' && (!/^\d+$/.test(countStr) || !Number.isSafeInteger(Number(countStr)) || Number(countStr) < 1))
  ) {
    await failure({ title: '', heading: '', text: '参数错误：请核对功法实例编号及完整参数，不附多余文字。', buttons: [], advice: [] });

    return;
  }
  const response = await runRobotBusiness(
    e,
    'skill-books.batch-upgrade',
    { bookId: skillBookIdStr ?? null, count: countStr ?? null },
    value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('连续升级功法响应不完整');
      }
      const row = value as Record<string, unknown>;

      if (
        row.mode === 'choose' &&
        typeof row.bookId === 'string' &&
        /^\d+$/.test(row.bookId) &&
        Number.isSafeInteger(Number(row.bookId)) &&
        Number(row.bookId) > 0
      ) {
        return { mode: 'choose' as const, bookId: row.bookId };
      }
      if (row.mode !== 'execute') {
        throw new Error('连续升级功法响应不完整');
      }
      const result = parseSkillBookBatchUpgrade(row.result);

      if (
        result.outcome !== 'ok' ||
        !result.target ||
        result.successCount < 0 ||
        result.upgradeCount < 1 ||
        result.successCount > result.upgradeCount ||
        result.totalConsumedExp < 0 ||
        result.totalConsumedSpiritStone < 0 ||
        result.skillBookId < 1 ||
        result.target.id < 1
      ) {
        throw new Error('连续升级功法响应不完整');
      }

      return { mode: 'execute' as const, result: { ...result, target: result.target } };
    },
    parentNext,
    failure
  ).catch(async () => {
    await failure({ title: '', heading: '', text: '功法升级结果未获完整确认，请先核对等级、材料与原回执。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  if (response.data.mode === 'choose') {
    const md = Format.createMarkdown();

    md.addText(`选择功法【${response.data.bookId}】的连续升级次数。`);
    md.addNewline();
    md.addText('升级消耗经验道具与灵石；材料不足或属性全满时停止。');
    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '连续升级功法',
        content: md,
        footer: [
          ...[1, 5, 10].map(count => ({ label: `升级${count}次`, command: `/升级功法 ${response.data.bookId} ${count}` })),
          { label: '返回功法', command: '/我的功法' }
        ]
      })
    );

    return;
  }
  const result = { code: 'OK' as const, data: response.data.result };

  switch (result.code) {
    case 'OK': {
      const {
        target,
        successCount,
        totalConsumedExp,
        totalConsumedSpiritStone,
        lastUpgradeCount,
        attributeLines,
        stopReason,
        upgradeCount: actualUpgradeCount,
        skillBookId: resultSkillBookId
      } = result.data;

      // 构建结果消息
      const md = Format.createMarkdown();

      if (successCount > 0) {
        md.addBold(`✅ 【${target.name}+${lastUpgradeCount}】连续升级 ${successCount} 次`);
        md.addNewline();
        md.addText(`消耗经验: ${totalConsumedExp}`);
        md.addNewline();
        md.addText(`消耗灵石: ${totalConsumedSpiritStone}`);
        md.addNewline();

        if (attributeLines.length > 0) {
          md.addNewline();
          md.addText('📈 属性变化：');
          md.addNewline();

          for (const line of attributeLines) {
            md.addText(line);
            md.addNewline();
          }
        }
      } else {
        md.addBold(`❌ 【${target.name}】无法升级`);
        md.addNewline();
      }

      if (stopReason) {
        md.addNewline();
        md.addText(`停止原因：${stopReason}`);
      }

      const stopped = successCount < actualUpgradeCount;
      const recovery = withBusinessRecovery('skill-books.batch-upgrade', {
        title: '升级功法',
        heading: '',
        text: stopReason,
        buttons: [],
        advice: []
      });

      if (stopped) {
        appendMiddlewareAdvice(md, recovery.advice);
      }

      md.addNewline();

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '升级功法',
          content: md,
          footer: [
            ...(!stopped ? [{ label: '继续升级', command: `/升级功法 ${resultSkillBookId} ${actualUpgradeCount}` }] : recovery.buttons),
            { label: '我的功法', command: '/我的功法' }
          ]
        })
      );
    }
  }
});

export default response;
