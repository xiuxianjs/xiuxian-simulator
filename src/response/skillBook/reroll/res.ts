import { skillRerollRecoveryTips } from '@src/response/skillRerollRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { useMessage } from '@src/utils/useMessage';
import { EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import { parseSkillBookRerollPreview, parseSkillBookRerollConfirm, parseSkillBookRerollCancel } from '@src/api/bot/skill-book-reset-reroll';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const text = (e.MessageText || EMPTY_STRING).trim();

  const confirmMatch = text.match(/^(!|！|\/|#|＃)?确认换词\s+(\d+)$/);
  const mode = /^(!|！|\/|#|＃)?取消换词$/.test(text) ? 'cancel' : confirmMatch ? 'confirm' : 'preview';
  const rerollText = text.replace(/^(!|！|\/|#|＃)?换词\s*/, '').trim();
  const args = rerollText ? rerollText.split(/\s+/) : [];
  const [, parentNext] = useEvent();
  const failure = adviceRenderer(async (reply: RobotMiddlewareReply) => {
    const md = Format.createMarkdown();

    if (reply.heading) {
      md.addBold(reply.heading).addNewline();
    }
    if (reply.rawLines) {
      reply.rawLines.forEach((line, index) => {
        if (index) {
          md.addNewline();
        }
        md.addText(line);
      });
    } else {
      if (reply.quote) {
        md.addBlockquote(Format.createMarkdown().addText(reply.quote));
      }
      const blocks = reply.blocks?.length ? reply.blocks : [{ text: reply.text, quoted: false }];

      if (
        reply.blocks?.length &&
        blocks
          .filter(block => !block.quoted)
          .map(block => block.text)
          .join('') !== reply.text &&
        blocks.map(block => block.text).join('') !== reply.text
      ) {
        md.addText(reply.text);
      }
      for (const block of blocks) {
        if (block.quoted) {
          appendMiddlewareBlocks(md, [block]);
        } else if (/^\n+$/.test(block.text)) {
          for (const _ of block.text) {
            md.addNewline();
          }
        } else {
          md.addText(block.text);
          if (block.inlineButtons?.length) {
            addOptions(md, block.inlineButtons);
          }
        }
      }
    }
    const advice = [...reply.advice];

    for (const tip of skillRerollRecoveryTips(reply.rawLines?.join('\n') ?? reply.text)) {
      if (!advice.some(existing => existing.command === tip.command)) {
        advice.push({ command: tip.command, description: `${tip.label}：${tip.description}` });
      }
    }
    appendMiddlewareAdvice(md, advice);
    await message.send(FormatGui({ isPrivate, bid, title: '功法换词', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
  });
  const response = await runRobotBusiness(
    e,
    'skill-books.reroll',
    {
      mode,
      bookId: mode === 'cancel' ? null : mode === 'confirm' ? confirmMatch![2] : (args[FIRST_ARG_INDEX] ?? null),
      attrLabel: mode === 'preview' ? args.slice(1).join('').trim() || null : null
    },
    value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('换词响应不完整');
      }
      const row = value as Record<string, unknown>;

      if (row.mode !== mode || typeof row.bookId !== 'number' || !Number.isInteger(row.bookId) || row.bookId < 0) {
        throw new Error('换词响应模式或编号错误');
      }
      if (row.mode === 'cancel') {
        return { mode: 'cancel' as const, data: parseSkillBookRerollCancel(row.pending) };
      }
      if (row.mode === 'confirm') {
        return { mode: 'confirm' as const, bookId: row.bookId, data: parseSkillBookRerollConfirm(row.pending) };
      }

      return { mode: 'preview' as const, bookId: row.bookId, data: parseSkillBookRerollPreview(row.result) };
    },
    parentNext,
    failure
  ).catch(async () => {
    await failure({ title: '', heading: '', text: '功法换词结果未获完整确认，请先核对功法、原预览和换词符。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  if (response.data.mode === 'cancel') {
    const result = response.data.data;
    const md = Format.createMarkdown();

    md.addText(result.success ? result.message : `❌ ${result.message}`);

    void message.send(FormatGui({ isPrivate, bid, title: '功法换词', content: md }));

    return;
  }

  if (response.data.mode === 'confirm') {
    const result = response.data.data;
    const skillBookId = result.pending.userSkillBookId;
    const md = Format.createMarkdown();

    md.addText(result.success ? result.message : `❌ ${result.message}`);
    if (result.success && result.pending) {
      md.addNewline();
      md.addNewline();
      md.addText(`功法：【${result.pending.skillBookName}】【${result.pending.gradeName}】【${result.pending.realmName}】`);
      md.addNewline();
      md.addText(`已替换：${result.pending.sourceLabel} -> ${result.pending.targetLabel}`);
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '功法换词',
        content: md,
        footer: result.success ? [{ label: '查看功法', command: `/查看功法 ${skillBookId}` }] : undefined
      })
    );

    return;
  }

  const skillBookId = response.data.bookId;
  const result = response.data.data;
  const md = Format.createMarkdown();

  if (result.mode === 'list') {
    md.addBold('换词');
    md.addNewline();
    md.addText(`功法：【${result.skillBook.name}】【${result.skillBook.grade}】【${result.skillBook.realm}】`);
    md.addNewline();
    md.addText(`当前持有：换词符 ${result.ownedCount} 张`);
    md.addNewline();
    md.addNewline();
    md.addText('选择词条消耗换词符×1 · 取消不返还');
    md.addNewline();
    md.addText('可替换词条');
    md.addNewline();

    for (const attr of result.availableAttrs) {
      md.addBlockquote(
        addOptions(Format.createMarkdown().addText(`${attr.label}：${attr.currentText} / 上限 ${attr.maxText}`), [
          { label: attr.label, command: `/换词 ${skillBookId} ${attr.label}` }
        ])
      );

      md.addNewline();
    }

    if (!result.availableAttrs.length) {
      md.addText('当前没有可选择的词条，请核对当前已学功法与激活词条。');
      appendMiddlewareAdvice(md, skillRerollRecoveryTips('当前没有可替换的目标词条'));
    } else if (result.ownedCount === 0) {
      appendMiddlewareAdvice(md, skillRerollRecoveryTips('换词符不足'));
    }

    md.addNewline();
    md.addBlockquote(Format.createMarkdown().addText('优先从未激活词条池抽取；没有可用未激活词条时才使用已激活词条池。'));

    void message.send(FormatGui({ isPrivate, bid, title: '功法换词', content: md }));

    return;
  }

  const pending = result.pending;

  md.addBold('换词预览');
  md.addNewline();
  md.addText(`功法：【${pending.skillBookName}】【${pending.gradeName}】【${pending.realmName}】`);
  md.addNewline();
  md.addText('消耗：换词符×1（取消不返还）');
  md.addNewline();
  md.addText('预览有效期60秒');
  md.addNewline();
  md.addNewline();
  md.addText(`替换词条：${pending.sourceLabel} -> ${pending.targetLabel}`);
  md.addNewline();
  md.addText(`目标池：${pending.targetPool === 'zero' ? '未激活词条池' : '已激活词条池'}`);
  md.addNewline();
  if (pending.targetWasActive) {
    md.addBlockquote(Format.createMarkdown().addText('注意：目标词条当前已存在，确认后已激活词条数量会减少1条'));
  }
  md.addNewline();
  md.addText(`替换前：${pending.sourceLabel} ${pending.sourceCurrentText} / 上限 ${pending.sourceMaxText}`);
  md.addNewline();
  md.addText(`替换后：${pending.targetLabel} ${pending.targetCurrentText} / 上限 ${pending.targetMaxText}`);
  md.addNewline();
  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '功法换词',
      content: md,
      footer: [
        { label: '确认', command: `/确认换词 ${skillBookId}` },
        { label: '取消', command: '/取消换词' }
      ]
    })
  );
});
