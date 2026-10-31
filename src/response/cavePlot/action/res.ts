import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { caveAccelerationReceiptTips } from '@src/response/caveRecovery';
import { ownCaveInputError } from '../input';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { cavePageForPlot } from '../pagination';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { sendCaveCommandFallback } from '@src/api/bot/cave-command';
import { caveActionCommand, parseRobotCaveAction } from '@src/api/bot/cave-robot-command';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { presentBackendCavePlots } from '@src/response/cavePlot/info/res';
import { sendSelfCavePlotPage } from '@src/response/cavePlot/render';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const { operation, title, args } = caveActionCommand(e.MessageText ?? '');

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery(operation, { ...reply, title: reply.title || title }), 'footer'));
  const receiptAdvice = (text: string) => operation === 'cave.accelerate'
      ? caveAccelerationReceiptTips(text, args.count, args.accelerator).map(tip => ({ command: tip.command, description: `${tip.label}：${tip.description}` }))
      : [];
  const fallback = (result: { message: string; snapshotError: string | null }) => {
    const tips = [
      ...withBusinessRecovery(operation, { title: '', heading: '', text: result.message + '\n' + (result.snapshotError ?? ''), buttons: [], advice: [] })
        .advice,
      ...receiptAdvice(result.message)
    ];

    const advice = tips.filter((tip, index) => tips.findIndex(other => other.command === tip.command && other.description === tip.description) === index);

    return sendCaveCommandFallback(result, bid, isPrivate, message, title, advice);
  };

  const inputError = ownCaveInputError('action', e.MessageText ?? '');

  if (inputError) {
    await failure({ title: '', heading: '', text: inputError, buttons: [], advice: [] });

    return;
  }

  try {
    const [, next] = useEvent();
    const response = await runRobotBusiness(e, operation, args, parseRobotCaveAction, next, failure);

    if (response.handled) {
      return;
    }
    if (response.data.mode === 'preview') {
      const preview = response.data.preview;
      const md = Format.createMarkdown();

      if (!preview.found) {
        md.addText(preview.message);
        appendMiddlewareAdvice(
          md,
          withBusinessRecovery('cave.accelerate', {
            title: '',
            heading: '',
            text: preview.message,
            buttons: [],
            advice: []
          }).advice
        );
      } else {
        const quote = Format.createMarkdown().addText(`${preview.message} `);

        quote
          .addNewline()
          .addText(`灵肥 ${preview.lingfeiCount}份（可用 ${preview.maxLingfei}份） · 小绿瓶 ${preview.greenBottleCount}份（可用 ${preview.maxGreenBottle}份）`);
        if (preview.spiritStoneEnabled) {
          quote.addNewline().addText(`灵石：${preview.spiritStone}`);
          quote.addNewline().addText('人工加速后，本轮不触发变异');
          if (preview.stoneReason) {
            quote.addNewline().addText(preview.stoneReason);
          }
          if ((preview.maxSpiritStone ?? 0) > 0) {
            const hours = ((preview.stoneSecondsPerUse ?? 7200) / 3600).toLocaleString('zh-CN', { maximumFractionDigits: 2 });

            quote.addNewline().addButton(markdownButtonLabel(`加速最多${hours}小时 · ${preview.stoneCost}灵石`), { data: `/灵田加速 ${preview.plotIndex} 灵石 1` });
          }
          if (preview.canRipen) {
            quote.addNewline().addButton(markdownButtonLabel(`立即催熟 · ${preview.ripenCost}灵石`), { data: `/灵田加速 ${preview.plotIndex} 催熟 1` });
          }
          if (preview.ripenNextAt) {
            quote.addNewline().addText(`下次催熟：${formatGameTime(preview.ripenNextAt)}`);
          }
        }
        for (const [item, maxCount] of [
          ['灵肥', preview.maxLingfei ?? 0],
          ['小绿瓶', preview.maxGreenBottle ?? 0]
        ] as const) {
          if (maxCount > 0) {
            quote.addNewline().addButton(markdownButtonLabel(`使用${item}×1`), { data: `/灵田加速 ${preview.plotIndex} ${item} 1` });
            if (maxCount > 1) {
              quote.addText(' ').addButton(markdownButtonLabel(`使用${item}×${maxCount}`), { data: `/灵田加速 ${preview.plotIndex} ${item} ${maxCount}` });
            }
          }
        }
        if (!preview.spiritStoneEnabled && (preview.maxLingfei ?? 0) <= 0 && (preview.maxGreenBottle ?? 0) <= 0) {
          quote.addNewline().addText('暂无可用的加速道具');
        }
        md.addBlockquote(quote);
        if (preview.stoneReason) {
          appendMiddlewareAdvice(
            md,
            withBusinessRecovery('cave.accelerate', {
              title: '',
              heading: '',
              text: preview.stoneReason,
              buttons: [],
              advice: []
            }).advice
          );
        }
      }
      await message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '灵田加速',
          content: md,
          footer: [{ label: '灵田', command: '/灵田' }, ...(preview.found ? [{ label: '万宝楼', command: '/商店 万宝楼' }] : [])]
        })
      );

      return;
    }
    const result = response.data.result;
    const overview = result.overview;

    if (!overview || result.snapshotError) {
      await fallback({
        ...result,
        snapshotError: result.snapshotError?.trim() ? result.snapshotError : '灵田状态未获完整确认，请先查看当前状态，不重复原操作。'
      });

      return;
    }

    sendSelfCavePlotPage({
      title,
      bid,
      isPrivate,
      message,
      plots: presentBackendCavePlots(overview.plots),
      cultivationCostText: overview.cultivationCostText,
      leadText: result.message,
      treasureEffects: result.treasureEffects,
      advice: receiptAdvice(result.message),
      page: cavePageForPlot(
        overview.plots.filter(plot => plot.plotState !== 'locked'),
        Number(args.plotIndex)
      )
    });
  } catch (error) {
    logger.error(title + '失败:', error);
    await fallback({ message: title + '结果未获完整确认，请先核对当前灵田与原回执。', snapshotError: null });
  }
});
