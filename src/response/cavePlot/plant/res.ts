import type { CavePlantOptions } from '@src/api/bot/cave-plant-options-query';
import { ownCaveInputError, ownCavePlantArguments } from '../input';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { parseCavePage, cavePageForPlot } from '../pagination';
import { useMessage } from '@src/utils/useMessage';
import { sendCaveCommandFallback } from '@src/api/bot/cave-command';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCavePlant } from '@src/api/bot/cave-robot-command';
import { presentBackendCavePlots } from '@src/response/cavePlot/info/res';
import { sendPlantSeedPromptPage, sendSelfCavePlotPage } from '@src/response/cavePlot/render';
import { selects } from '@src/response/config';
import { onResponse, useEvent, logger } from 'alemonjs';

function checkSeedSelection(options: CavePlantOptions, expectedPlotIndex: number): void {
  const prefix = expectedPlotIndex ? `/播种 ${expectedPlotIndex}` : '/播种';
  const changesTarget = options.options.some(option => {
    const parsed = ownCavePlantArguments(parseCavePage(`${prefix} ${option.seedName}`).text);

    return Number(parsed.plotIndex ?? 0) !== expectedPlotIndex || parsed.seedName !== option.seedName;
  });

  if (
    changesTarget ||
    options.plotIndex !== expectedPlotIndex ||
    !Number.isSafeInteger(options.remainingPlots) ||
    options.remainingPlots <= 0 ||
    options.options.some(option => !option.seedName.trim() || !Number.isSafeInteger(option.quantity) || option.quantity <= 0 || option.matureHours <= 0)
  ) {
    throw new Error('播种选项目标或库存响应不完整');
  }
}

const nextSelectionWarning = '播种回执已返回，下一轮播种选项未获完整确认，请先核对当前灵田。';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave.plant', { ...reply, title: reply.title || '播种灵种' }), 'footer'));
  const fallback = (result: { message: string; snapshotError: string | null }) => sendCaveCommandFallback(
      result,
      bid,
      isPrivate,
      message,
      '播种灵种',
      withBusinessRecovery('cave.plant', { title: '', heading: '', text: result.message + '\n' + (result.snapshotError ?? ''), buttons: [], advice: [] }).advice
    );

  try {
    const [, next] = useEvent();
    const { text, page } = parseCavePage(e.MessageText ?? '');
    const inputError = ownCaveInputError('plant', text);

    if (inputError) {
      await failure({ title: '', heading: '', text: inputError, buttons: [], advice: [] });

      return;
    }
    const args = ownCavePlantArguments(text);
    const response = await runRobotBusiness(
      e,
      'cave.plant',
      args,
      value => {
        let data: ReturnType<typeof parseRobotCavePlant>;

        try {
          data = parseRobotCavePlant(value);
        } catch (error) {
          const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
          const result = raw?.result && typeof raw.result === 'object' && !Array.isArray(raw.result) ? (raw.result as Record<string, unknown>) : null;

          if (raw?.mode !== 'plant' || result?.needsSeedSelection !== true) {
            throw error;
          }
          // Validate the original receipt independently of an unreadable next-step list.
          data = parseRobotCavePlant({ ...raw, result: { ...result, options: null } });
          if (data.mode === 'plant') {
            logger.warn('[播种] 下一轮选项不完整', error);
            data = { ...data, result: { ...data.result, snapshotError: data.result.snapshotError?.trim() ? data.result.snapshotError : nextSelectionWarning } };
          }
        }
        if (data.mode === 'select') {
          checkSeedSelection(data.options, Number(args.plotIndex ?? 0));
        }

        return data;
      },
      next,
      failure
    );

    if (response.handled) {
      return;
    }
    if (response.data.mode === 'select') {
      const { options, overview } = response.data;

      sendPlantSeedPromptPage({
        title: '播种灵种',
        bid,
        isPrivate,
        message,
        plots: presentBackendCavePlots(overview.plots),
        targetLabel: options.plotIndex > 0 ? `第${options.plotIndex}块灵田` : '全部空闲灵田',
        remainingPlots: options.remainingPlots,
        commandPrefix: options.plotIndex > 0 ? `/播种 ${options.plotIndex}` : '/播种',
        page,
        options: options.options
      });

      return;
    }

    const result = response.data.result;

    if (args.recipeName) {
      await sendMiddlewareReply(
        e,
        {
          title: '智能播种',
          heading: '',
          text: result.message + (result.snapshotError ? `\n${result.snapshotError}` : ''),
          buttons: [
            { label: '查看灵田', command: '/灵田' },
            { label: '查看丹方', command: '/丹方' }
          ],
          advice: []
        },
        'footer'
      );

      return;
    }
    const overview = result.overview;

    if (!overview || result.snapshotError) {
      await fallback({
        ...result,
        snapshotError: result.snapshotError?.trim() ? result.snapshotError : '灵田状态未获完整确认，请先查看当前状态，不重复原操作。'
      });

      return;
    }

    if (result.needsSeedSelection) {
      const options = result.options;

      try {
        if (!options) {
          throw new Error('播种选项缺失');
        }
        checkSeedSelection(options, 0);
      } catch (error) {
        logger.warn('[播种] 无法确认下一轮选项', error);
        await fallback({ message: result.message, snapshotError: nextSelectionWarning });

        return;
      }

      sendPlantSeedPromptPage({
        title: '播种灵种',
        bid,
        isPrivate,
        message,
        plots: presentBackendCavePlots(overview.plots),
        leadText: result.message,
        targetLabel: options.plotIndex > 0 ? `第${options.plotIndex}块灵田` : '全部空闲灵田',
        remainingPlots: options.remainingPlots,
        commandPrefix: options.plotIndex > 0 ? `/播种 ${options.plotIndex}` : '/播种',
        page,
        options: options.options
      });

      return;
    }

    sendSelfCavePlotPage({
      title: '播种灵种',
      bid,
      isPrivate,
      message,
      plots: presentBackendCavePlots(overview.plots),
      cultivationCostText: overview.cultivationCostText,
      leadText: result.message,
      page: cavePageForPlot(
        overview.plots.filter(plot => plot.plotState !== 'locked'),
        Number(args.plotIndex)
      )
    });
  } catch (error) {
    logger.error('播种灵种失败:', error);
    await fallback({ message: '播种灵种结果未获完整确认，请先核对当前灵田与原回执。', snapshotError: null });
  }
});
