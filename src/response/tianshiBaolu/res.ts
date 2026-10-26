import { useMessage } from '@src/utils/useMessage';
/**
 * 天师宝录 - 个人向图鉴加成
 * 指令：/天师宝录 [装备|功法|本命|全部] [p页码]
 */
import { parseTianshiBaoluCommand } from '@src/api/bot/tianshi-baolu-command';
import { parseBackendTianshiBaoluPanel } from '@src/api/bot/tianshi-baolu-panel';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

const buildCategoryCommand = (label: string) => `/天师宝录 ${label}`;
const categoryFooter = [
  { label: '全部', command: buildCategoryCommand('全部') },
  { label: '装备', command: buildCategoryCommand('装备') },
  { label: '功法', command: buildCategoryCommand('功法') },
  { label: '本命', command: buildCategoryCommand('本命') }
];
const baseFooter = [...categoryFooter];

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();
  const parsed = parseTianshiBaoluCommand(e.MessageText ?? '');
  let loaded;
  const sendFailure = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '天师宝录', content: md.addText(text), footer: baseFooter }));

  try {
    loaded = await runRobotBusiness(
      e,
      'tianshi-baolu.panel',
      { category: parsed.category, page: parsed.page },
      parseBackendTianshiBaoluPanel,
      next,
      async reply => {
        await sendFailure(reply.text);
      }
    );
  } catch (error) {
    logger.error('[天师宝录] 查询失败:', error);
    await sendFailure('查看天师宝录失败，请稍后再试');

    return;
  }

  if (loaded.handled) {
    return;
  }
  const navCommand = parsed.category === 'all' ? '/天师宝录 p{page}' : `/天师宝录 ${parsed.categoryLabel} p{page}`;

  const { rows, totalCount, unlockedCount, newUnlockCount, filteredCount, totalBonusText, page, totalPages } = loaded.data;
  const currentTitle = parsed.category === 'all' ? '天师宝录' : `天师宝录 - ${parsed.categoryLabel}`;
  const totalBonusParts = totalBonusText === '暂无加成' ? [] : totalBonusText.split('、');

  const categoryCount = totalPages > 1 ? '' : `（${filteredCount}项）`;

  md.addText(`总进度：${unlockedCount}/${totalCount}，当前分类：${parsed.categoryLabel}${categoryCount}`);
  if (newUnlockCount > 0) {
    md.addText(`，本次点亮或恢复 ${newUnlockCount} 项`);
  }
  md.addNewline();
  md.addText('已点亮的收藏加成永久保留。');
  md.addNewline();
  md.addText('全宝录累计加成（所有已点亮条目）：');
  md.addNewline();
  if (!totalBonusParts.length) {
    md.addText('暂无加成');
  } else {
    for (let i = 0; i < totalBonusParts.length; i += 4) {
      md.addText(totalBonusParts.slice(i, i + 4).join('、'));
      md.addNewline();
    }
  }
  md.addNewline();
  md.addNewline();

  if (!rows.length) {
    md.addText('当前分类暂无可收录的宝录条目。');
  } else {
    for (const row of rows) {
      md.addText(`${row.unlocked ? '✅' : '⬜'}【${row.typeName}】${row.name}`);
      md.addNewline();
      md.addBlockquote(
        Format.createMarkdown()
          .addText(`条件：${row.condition}`)
          .addNewline()
          .addText(`${row.unlocked ? '已点亮加成' : '点亮后增加'}：${row.bonusText}`)
      );
    }
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: currentTitle,
      content: md,
      footer: baseFooter.map(button => ({ ...button, selected: button.label === parsed.categoryLabel })),
      nav: totalPages > 1 ? { current: page, total: totalPages, count: filteredCount, command: navCommand } : undefined
    })
  );
});
