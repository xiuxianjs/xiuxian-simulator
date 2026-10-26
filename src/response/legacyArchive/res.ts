import { Format, onResponse } from 'alemonjs';
import { archiveRow, getLegacyArchive, legacySections, type ArchiveRow } from '@src/api/bot/legacy-archive';
import { archiveItems, archivePage, archiveText, legacyProfileLines, parseLegacyCommand } from '@src/response-apps/legacyArchive/app';
import { FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();
  const sendError = (text: string) => message.send(
      FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '前世 · 旧版存档', content: Format.createMarkdown().addText(text), bar: false })
    );

  try {
    const { uid, section, page } = parseLegacyCommand(e.MessageText, e.UserId);
    const data = await getLegacyArchive(uid, section, page);
    const line = (text: string) => {
      md.addText(text);
      md.addNewline();
    };
    const itemBlock = (row: ArchiveRow, extra: string[] = []) => {
      const child = Format.createMarkdown();

      child.addText(archiveText(row.name));
      extra.forEach(text => {
        child.addNewline();
        child.addText(text);
      });
      if (Object.hasOwn(row, 'goods') && row.goods === null) {
        child.addNewline();
        child.addText('物品定义未留存');
      }
      md.addBlockquote(child);
    };
    let nav: ReturnType<typeof archivePage> | undefined;

    line(`旧UID：${uid}`);
    if (section === '资料') {
      const levels = archiveItems(await getLegacyArchive(uid, '境界'));

      legacyProfileLines(data, levels).forEach(line);
      if (typeof data.autograph === 'string' && data.autograph.length) {
        md.addBlockquote(Format.createMarkdown().addText(data.autograph));
      }
      line('当前生命：未留存（旧版临时血量不在存档中）');
    } else if (section === '境界') {
      const items = archiveItems(data);

      items.forEach(row => {
        const definition = archiveRow(row.definition) ? row.definition : {};

        itemBlock({ name: definition.name ?? `境界编号${archiveText(row.realm)}` }, [
          `类别：${({ 1: '炼气', 2: '炼体', 3: '神魂' } as Record<string, string>)[String(row.type)] ?? archiveText(row.type)}`,
          `积累：${archiveText(row.experience)} · 职业：${archiveText(row.career)}`
        ]);
      });
      if (!items.length) {
        line('没有留存境界记录。');
      }
    } else {
      const list = section === '装备' ? data.equipment : data;

      if (!archiveRow(list)) {
        throw new Error('旧版装备响应不完整。');
      }
      const items = archiveItems(list);

      if (section === '财富') {
        const currencies: Record<string, string> = { 1: '下品灵石', 2: '中品灵石', 3: '上品灵石', 4: '极品灵石', 5: '仙石' };

        items.forEach(row => line(`${currencies[String(row.grade)] ?? `品级${archiveText(row.grade)}`}：${archiveText(row.count)}`));
      } else {
        items.forEach(row => itemBlock(
            row,
            section === '本命' ? [`强化等级：${archiveText(row.grade)}`] : ['储物袋', '纳戒'].includes(section) ? [`数量：${archiveText(row.count)}`] : []
          )
        );
      }
      if (!items.length) {
        line('该分类没有留存记录。');
      }
      if (['装备', '功法', '储物袋', '纳戒'].includes(section)) {
        nav = archivePage(list);
      }
      if (section === '储物袋') {
        line(`容量等级：${archiveRow(data.capacity) ? archiveText(data.capacity.grade) : '未留存'}`);
      }
    }
    md.addBlockquote(Format.createMarkdown().addText('停服时的旧版资料，仅供回顾；不重算属性，不转移物品或发放奖励。'));
    const buttons: GuiButton[] = Object.keys(legacySections).map(label => ({ label, command: `/前世 ${uid} ${label}` }));

    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid: e.UserId,
        title: `前世 · ${section}`,
        content: md,
        footer: [buttons.slice(0, 4), buttons.slice(4)],
        ...(nav ? { nav: { ...nav, command: `/前世 ${uid} ${section} {page}` } } : {}),
        bar: false
      })
    );
  } catch (error) {
    await sendError(error instanceof Error ? error.message : '旧版资料加载失败，请稍后再试。');
  }
});
