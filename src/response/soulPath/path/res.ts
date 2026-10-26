import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withoutSoulConfirmationActions } from '@src/response/soulPathRecovery';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parseSoulPathState } from '@src/api/bot/soul-path';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseSoulPathInput } from '@src/response-apps/soulPath/app';
import { selects } from '@src/response/config';
import { addSoulQuote, getCommandArgument, sendSoulGui } from '@src/response/soulPath/shared';
import type { GuiButton, GuiFooter } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();

  const [, parentNext] = useEvent();
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-path.state', withoutSoulConfirmationActions({ ...reply, title: reply.title || '元婴道途' })), 'footer')
  );
  const input = getCommandArgument(e.MessageText, '元婴道途') || getCommandArgument(e.MessageText, '道途详情');
  const requested = parseSoulPathInput(input);

  if (input && !requested) {
    await sendFailure({ title: '', heading: '', text: '道途名称无效。用法：/元婴道途 <玄法|炼体|御器>；不附名称则查看当前道途。', buttons: [], advice: [] });

    return;
  }
  const result = await runRobotBusiness(e, 'soul-path.state', {}, parseSoulPathState, parentNext, sendFailure).catch(async error => {
    logger.error('[元婴神魂] 面板加载失败:', error);
    await sendFailure({
      title: '',
      heading: '',
      text: '神魂查询结果未获完整确认，请核对当前状态，稍后重新查看；不据此判断道途或材料已消失。',
      buttons: [],
      advice: []
    });

    return { handled: true as const };
  });

  if (result.handled) {
    return;
  }
  const state = result.data;
  const selected = requested ?? state.pathKey;
  const selectedPath = selected ? state.paths.find(entry => entry.key === selected) : null;

  if (state.paths.length !== 3 || state.paths.some(path => path.nodes.length !== 3) || (selected && !selectedPath)) {
    await sendFailure({ title: '', heading: '', text: '神魂状态响应不完整，请重新查看当前面板，不据此判断节点已解锁或道途已变更。', buttons: [], advice: [] });

    return;
  }
  const pathTabs: GuiButton[] = state.paths.map(path => ({
    label: path.name,
    selected: Boolean(state.pathKey) && path.key === selected,
    command: state.pathKey ? `/元婴道途 ${path.name.replace('道', '')}` : `/选择道途 ${path.name.replace('道', '')}`
  }));

  for (const tab of pathTabs) {
    md.addButton(markdownButtonLabel(tab.label, tab.selected), { data: tab.command });
    md.addText(' ');
  }
  md.addNewline();
  if (state.panel.allComplete) {
    md.addBold('三道圆融');
    md.addNewline();
  }
  if (state.effectsMaintenance) {
    addSoulQuote(md, '维护中：战斗加成暂停，养成进度保留。');
  }
  if (!selected) {
    addSoulQuote(md, '首次立道免费 · 切换冷却7天');
    for (const path of state.paths) {
      md.addNewline();
      md.addBold(path.name);
      md.addNewline();
      addSoulQuote(md, path.nodes[0].description);
      addSoulQuote(md, `圆融：${path.nodes[2].description}`);
    }
  } else {
    const path = selectedPath!;
    const next = path.nodes.find(node => !node.unlocked);

    md.addBold(`${path.name} · ${path.stage}${path.active ? '（当前）' : ''}`);
    if (!path.active) {
      md.addText(' ');
      md.addButton(markdownButtonLabel('转修'), { data: `/切换道途 ${path.name.replace('道', '')}` });
    }
    md.addNewline();
    md.addText(`熟练 ${path.proficiency}`);
    md.addNewline();
    for (const node of path.nodes) {
      md.addNewline();
      md.addBold(`${node.unlocked ? '✓' : '○'} ${node.name}`);
      if (node.canAdvance && node.key === next?.key) {
        md.addText(' ');
        md.addButton(markdownButtonLabel('道途突破'), { data: '/道途突破' });
      }
      md.addNewline();
      addSoulQuote(md, node.description);
      if (!node.unlocked) {
        addSoulQuote(md, node.requirementText);
      }
    }
    md.addNewline();
    if (state.panel.switchCooldownActive && state.pathSwitchAvailableAt) {
      addSoulQuote(md, `转修冷却至 ${formatGameTime(state.pathSwitchAvailableAt)}`);
    }
    addSoulQuote(md, '感悟、熟练不扣除；仅当前道途生效。');
  }
  const footer: GuiFooter = [
    { label: '元婴神魂', command: '/元婴神魂' },
    { label: '道途印证', command: '/道途印证' }
  ];

  await message.send(sendSoulGui(e, '元婴道途', md, footer));
});
