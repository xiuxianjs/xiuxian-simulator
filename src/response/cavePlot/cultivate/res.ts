import { ownCaveInputError } from '../input';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { cavePageForPlot } from '../pagination';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveCommand, sendCaveCommandFallback } from '@src/api/bot/cave-command';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { caveCultivateArguments } from '@src/api/bot/cave-robot-command';
import { presentBackendCavePlots } from '@src/response/cavePlot/info/res';
import { sendSelfCavePlotPage } from '@src/response/cavePlot/render';
import { selects } from '@src/response/config';
import { onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave.cultivate', { ...reply, title: reply.title || '开垦灵田' }), 'footer')
  );
  const fallback = (result: { message: string; snapshotError: string | null }) => sendCaveCommandFallback(
      result,
      bid,
      isPrivate,
      message,
      '开垦灵田',
      withBusinessRecovery('cave.cultivate', { title: '', heading: '', text: result.message + '\n' + (result.snapshotError ?? ''), buttons: [], advice: [] })
        .advice
    );

  const inputError = ownCaveInputError('cultivate', e.MessageText ?? '');

  if (inputError) {
    await failure({ title: '', heading: '', text: inputError, buttons: [], advice: [] });

    return;
  }

  try {
    const [, next] = useEvent();
    const args = caveCultivateArguments(e.MessageText?.trim() ?? '');
    const response = await runRobotBusiness(e, 'cave.cultivate', args, parseBackendCaveCommand, next, failure);

    if (response.handled) {
      return;
    }
    const result = response.data;
    const overview = result.overview;

    if (!overview || result.snapshotError) {
      await fallback({
        ...result,
        snapshotError: result.snapshotError?.trim() ? result.snapshotError : '灵田状态未获完整确认，请先查看当前状态，不重复原操作。'
      });

      return;
    }

    sendSelfCavePlotPage({
      title: '开垦灵田',
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
    logger.error('开垦灵田失败:', error);
    await fallback({ message: '开垦灵田结果未获完整确认，请先核对当前灵田与原回执。', snapshotError: null });
  }
});
