import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { parseMeridianView } from '@src/api/bot/meridian';
import { useMessage } from '@src/utils/useMessage';
/**
 * 经络查看指令处理器
 * 指令：/经络
 *
 * 查看 20 条经络的进度及加成效果
 */

import App from '@src/response-apps/meditation/meridian/app';
import { createBackendRequestContext } from '@src/api';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';
export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const sendText = (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);

    void message.send(FormatGui({ isPrivate, bid, title: '经络', content: md }));
  };

  const business = await loadFinalBusiness(e, next, 'meridians.view', {}, parseMeridianView);

  if (business.handled) {
    return;
  }
  const uid = e.uid as number;
  const result = await App({ load: business.load, uid, bid, request: createBackendRequestContext(e) });

  if (result.code === 'LOAD_FAILED') {
    sendText(result.data.message);

    return;
  }

  const { data } = result;

  if (!data.success) {
    const failMsg = data.message;

    sendText(failMsg);

    return;
  }

  const config = data.config;
  const md = Format.createMarkdown();

  if (!data.allCompleted) {
    md.addBlockquote(
      createQuoteMarkdown(
        [
          `真气：${data.trueQi}`,
          `今日冲脉：${data.dailyPulseRemaining}次`,
          `基础 ${data.basePulseRemaining}/${config.DAILY_PULSE_MAX} · 额外 ${data.extraPulseRemaining}/${config.DAILY_EXTRA_PULSE_MAX}`
        ],
        [{ label: '服丹', command: '/服用 真灵丹 1' }]
      )
    );
  }

  if (data.allCompleted) {
    md.addBlockquote(createQuoteMarkdown(['✨ 已开放经脉全部圆满', `累计完成：${data.completedCount}/${config.TOTAL_COUNT}`]));
  } else {
    const current = data.current!;
    const phase = data.phases.find(item => item.phase === current.phase);

    md.addBlockquote(
      createQuoteMarkdown(
        [
          `◈ ${current.name}${current.category ? ` · ${current.category}` : ''} ${current.phaseIndex}/${phase?.totalCount}`,
          ...(current.description ? [`${current.phaseName}加成：${current.description}`] : []),
          `${data.progressBar} ${current.progress}/${current.requiredProgress}`,
          `消耗：${config.PULSE_QI_COST} 真气`,
          ...(!data.canPulse && data.pulseBlockedReason ? [data.pulseBlockedReason] : [])
        ],
        data.showPulseButton ? [{ label: '冲脉', command: '/冲脉' }] : []
      )
    );
    if (data.next) {
      md.addBlockquote(createQuoteMarkdown([`下一脉：${data.next.name} · ${data.next.phaseName}`, ...(data.next.description ? [data.next.description] : [])]));
    }
    for (const phase of data.phases) {
      md.addText(
        `${phase.unlocked ? (phase.completed ? '✓' : '◇') : '🔒'} 第${phase.phase}期 ${phase.name} ${phase.completedCount}/${phase.totalCount}`
      ).addNewline();
    }
  }

  const footerButtons = [{ label: '闭关', command: '/闭关' }];

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: data.allCompleted ? '经络 · 圆满' : `经络 · 第${data.currentPhase}期 ${data.currentPhaseName}`,
      content: md,
      footer: footerButtons
    })
  );
});
