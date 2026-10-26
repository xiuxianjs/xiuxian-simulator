import { adviceRenderer } from '@src/response/feedbackRenderer';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { parseCavePage } from '../pagination';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveView } from '@src/api/bot/cave-command';
import type { CaveOverviewPlot } from '@src/api/schemas/cave-overview-query';
import { ownPlotActions } from '@src/response/cavePlot/capabilities';
import { sendSelfCavePlotPage } from '@src/response/cavePlot/render';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { selects } from '@src/response/config';
import { onResponse, useEvent, logger } from 'alemonjs';

type CavePlotPresentation = {
  plotIndex: number;
  plotState: 'cultivated' | 'unlockable' | 'locked';
  title: string;
  detail: string;
  actionLabel?: string;
  actionCommand?: string;
  actions: Array<{ label: string; command: string }>;
};

// Plot title, state description and command eligibility are authoritative Go
// display facts. The bot only selects its Markdown layout.
function plotPresentation(plot: CaveOverviewPlot): CavePlotPresentation {
  return {
    plotIndex: plot.plotIndex,
    plotState: plot.plotState,
    title: plot.title,
    detail: plot.detail,
    actionLabel: ownPlotActions(plot)[0]?.label,
    actionCommand: ownPlotActions(plot)[0]?.command,
    actions: ownPlotActions(plot)
  };
}

export function presentBackendCavePlots(plots: CaveOverviewPlot[]): CavePlotPresentation[] {
  return plots.map(plotPresentation);
}

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const { text, page } = parseCavePage(e.MessageText ?? '');

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave.view', { ...reply, title: reply.title || '洞府灵田' }), 'footer'));

  try {
    const [, next] = useEvent();
    const response = await runRobotBusiness(e, 'cave.view', {}, parseBackendCaveView, next, failure);

    if (response.handled) {
      return;
    }
    const { overview } = response.data;

    if (!overview) {
      throw new Error('洞府概览缺失');
    }

    sendSelfCavePlotPage({
      title: '我的灵田',
      bid,
      isPrivate,
      message,
      page,
      showOperations: /(?:我的灵田|灵田|我的洞府|洞府)\s+操作\s*$/.test(text),
      showManagement: /(?:我的灵田|灵田|我的洞府|洞府)\s+经营\s*$/.test(text),
      selectedPlotIndex: (() => {
        const match = text.match(/\s+地块\s+(\d+)\s*$/);

        return match ? Number(match[1]) : undefined;
      })(),
      plots: presentBackendCavePlots(overview.plots),
      cultivationCostText: overview.cultivationCostText,
      stasisFormation: overview.stasisFormation ?? undefined
    });
  } catch (error) {
    logger.error('洞府灵田查询失败:', error);
    await failure({ title: '', heading: '', text: '获取洞府灵田失败，请稍后重试。', buttons: [], advice: [] });
  }
});
