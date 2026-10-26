import { formatGameTime } from '@src/utils/gameTime';
import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
import { executeBackendSeclusionCommand } from '@src/api/bot/seclusion-command';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';

export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let soulNavigation = [{ label: '我的主页', command: '/我' }];
  const applyNavigation = (access: { canUseSoulPath: boolean }) => {
    soulNavigation = [...(access.canUseSoulPath ? [{ label: '元婴道途', command: '/元婴道途' }] : []), { label: '我的主页', command: '/我' }];
  };
  const text = (e.MessageText ?? '').trim();
  const send = (title: string, content: ReturnType<typeof Format.createMarkdown>, footer = soulNavigation) => {
    void message.send(FormatGui({ isPrivate, bid, title, content, footer }));
  };
  const startMatch = text.match(/探索秘境\s+(.+)\s+(\d+)$/);

  if (startMatch) {
    const dungeonName = startMatch[1]?.trim();
    const hours = Number(startMatch[2]);
    const md = Format.createMarkdown();

    if (!dungeonName) {
      md.addText('请选择秘境，例如：/探索秘境 桃花镇 4');
      send('探索秘境', md, []);

      return;
    }
    const business = await loadFinalBusiness(e, next, 'seclusion.command', { action: 'start', ...{ dungeonName, duration: hours } }, value => value);

    if (business.handled) {
      return;
    }
    const command = await executeBackendSeclusionCommand(bid, e.uid as number, 'start', { dungeonName, duration: hours }, undefined, business.load);

    applyNavigation(command.access);
    const result = command.result;

    if (result.code !== 'OK') {
      md.addText(result.data.message);
      send('探索秘境', md, [{ label: '查看探索秘境', command: '/探索秘境' }]);

      return;
    }
    const { dungeon, record } = result.data;

    md.addText('你整装出发，踏入秘境……').addNewline().addNewline();
    md.addText(`🏔️ 秘境：${dungeon.name}`).addNewline();
    md.addText(`⏱️ 此行：${record.duration} 小时`).addNewline();
    md.addText(`🔮 消耗精力：${record.spiritCost}`);
    if (record.endTime) {
      md.addNewline().addText(`📅 预计返程：${formatGameTime(record.endTime)}`);
    }
    md.addNewline().addNewline().addBlockquote(Format.createMarkdown().addText('探索途中，亦可修行').addNewline().addText('使用 /返程 可提前结束'));
    send('🧭 踏入秘境', md, [
      { label: '查看进度', command: '/探索秘境' },
      { label: '返程', command: '/返程' }
    ]);

    return;
  }
  const selected = text.match(/探索秘境\s+(.+)$/)?.[1]?.trim();

  if (selected) {
    const md = Format.createMarkdown();
    const business = await loadFinalBusiness(e, next, 'seclusion.command', { action: 'select', ...{ dungeonName: selected } }, value => value);

    if (business.handled) {
      return;
    }
    const command = await executeBackendSeclusionCommand(bid, e.uid as number, 'select', { dungeonName: selected }, undefined, business.load);

    applyNavigation(command.access);
    const result = command.result;

    if (result.code === 'IN_SECLUSION') {
      md.addText('你尚在秘境，继续前行或就此返程。');
      send('🧭 探索秘境', md, [
        { label: '查看进度', command: '/探索秘境' },
        { label: '返程', command: '/返程' }
      ]);

      return;
    }
    if (result.code !== 'OK') {
      md.addText(result.data.message);
      send('探索秘境', md, []);

      return;
    }
    const { status, dungeon } = result.data;

    md.addText(`选定秘境：${dungeon.name}`).addNewline().addText('此行探索多久：').addNewline();
    for (const option of dungeon.startOptions) {
      if (!option.available) {
        md.addText(`⛔ ${option.duration}h — ${option.reason ?? '当前不可用'}`).addNewline();
        continue;
      }
      const preview = option.preview;

      md.addText(
        `🕐 ${option.duration}h${option.duration === status.recommendedDuration ? ' · 推荐' : ''}${preview.experienceCapWarning ? ' · 修为将满' : ''} — 精力${option.spiritCost}`
      ).addNewline();
      md.addBlockquote(
        Format.createMarkdown().addText(
          `预计修为+${preview.projectedCreditedExperience ?? preview.experience} · 灵石+${preview.spiritStone} · 丹药与材料随探索寻获`
        )
      ).addNewline();
    }
    if (!status.startAvailable) {
      md.addBlockquote(Format.createMarkdown().addText(status.startReason ?? '当前无法探索秘境'));
    }
    const footer = dungeon.startOptions
      .filter(option => option.available && status.startAvailable)
      .map(option => ({ label: `${option.duration}h`, command: `/探索秘境 ${dungeon.name} ${option.duration}` }));

    send('🧭 整装出发', md, [...footer, ...soulNavigation]);

    return;
  }
  const md = Format.createMarkdown();
  const business = await loadFinalBusiness(e, next, 'seclusion.command', { action: 'view', ...{} }, value => value);

  if (business.handled) {
    return;
  }
  const command = await executeBackendSeclusionCommand(bid, e.uid as number, 'view', {}, undefined, business.load);

  applyNavigation(command.access);
  const result = command.result;

  if (result.code !== 'OK') {
    md.addText(result.data.message);
    send('探索秘境', md, []);

    return;
  }
  const status = result.data;

  if (status.inSeclusion && status.record) {
    const record = status.record;

    md.addText(`📍 探索中（${record.duration}小时）`).addNewline();
    if (record.dungeonName) {
      md.addText(`🏔️ ${record.dungeonName}`).addNewline();
    }
    if (record.isCompleted) {
      md.addText('✅ 此行已毕，返程领取战利品。');
    } else {
      md.addText(`已探索：${record.elapsedHours} 小时`)
        .addNewline()
        .addText(`剩余：约 ${record.remainingHours} 小时`)
        .addNewline()
        .addText(`当前可结算 ${record.settleableHours} 小时`);
    }
    send('🧭 探索秘境', md, status.canEnd ? [{ label: '返程', command: '/返程' }, ...soulNavigation] : soulNavigation);

    return;
  }
  md.addText('挑选秘境，整装出发。');
  if (!status.startAvailable) {
    md.addBlockquote(Format.createMarkdown().addText(status.startReason ?? '当前无法探索秘境'));
  }
  send('🧭 探索秘境', md, [{ label: '查看秘境', command: '/查看秘境' }, ...soulNavigation]);
});
