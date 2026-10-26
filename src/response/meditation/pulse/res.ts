import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { parseMeridianPulse } from '@src/api/bot/meridian';
import { useMessage } from '@src/utils/useMessage';
/**
 * 冲脉指令处理器
 * 指令：/冲脉
 *
 * 自动对下一条未完成的经络进行冲脉
 * 每次消耗 10 真气，进度 +10，有概率跳脉直接完成
 */

import App from '@src/response-apps/meditation/pulse/app';
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

    void message.send(FormatGui({ isPrivate, bid, title: '冲脉', content: md }));
  };

  const business = await loadFinalBusiness(e, next, 'meridians.pulse', {}, parseMeridianPulse);

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
  const config = data.config;

  if (!data.success) {
    const repeatMsg = data.message;

    sendText(`❌ ${repeatMsg}`);

    return;
  }

  const md = Format.createMarkdown();
  const status = data.jumped && data.completed ? '🌟 跳脉成功' : data.completed ? (data.phase === 2 ? '✨ 淬脉完成' : '✨ 经络贯通') : '冲脉';

  md.addBlockquote(
    createQuoteMarkdown(
      [
        `${data.meridianName} · ${status}`,
        `进度：${data.progressBefore} → ${data.progressAfter}/${data.meridianRequiredProgress ?? config.QI_PER_MERIDIAN}`,
        ...(data.completed && data.description ? [`获得加成：${data.description}`] : []),
        `真气：-${config.PULSE_QI_COST} · 剩余 ${data.trueQiRemaining}`,
        `今日剩余：${data.dailyPulseRemaining}次`,
        `基础 ${data.basePulseRemaining}/${config.DAILY_PULSE_MAX} · 额外 ${data.extraPulseRemaining}/${config.DAILY_EXTRA_PULSE_MAX}`,
        ...(data.allCompleted ? ['✨ 已开放经脉全部圆满'] : data.phaseCompleted ? [`第${data.phase}期 ${data.phaseName}已圆满`] : []),
        ...(!data.allCompleted && !data.canPulse && data.pulseBlockedReason ? [data.pulseBlockedReason] : [])
      ],
      data.canPulse ? [{ label: '继续冲脉', command: '/冲脉' }] : []
    )
  );

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: `冲脉 · 第${data.phase}期 ${data.phaseName}`,
      content: md,
      footer: [
        { label: '经络', command: '/经络' },
        { label: '闭关', command: '/闭关' }
      ]
    })
  );
});
